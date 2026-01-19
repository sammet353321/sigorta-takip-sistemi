import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase keys missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function connectToWhatsApp() {
    // Start Time for New Messages Only
    const startTime = Math.floor(Date.now() / 1000);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`WhatsApp v${version.join('.')} kullanılıyor. Güncel mi? ${isLatest}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        generateHighQualityLinkPreview: true,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n--- WHATSAPP QR KODU ---\n');
            qrcode.generate(qr, { small: true });
            console.log('\nLütfen okutun...\n');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Bağlantı kapandı. Yeniden bağlanılıyor...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Bağlantısı Başarılı!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- GROUP MANAGEMENT HANDLER ---
    const groupChannel = supabase
        .channel('bot-group-management')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_groups' },
            async (payload) => {
                const newGroup = payload.new as any;
                
                // If it's already a WA group (has JID) or explicitly NOT a WA group, skip
                if (newGroup.group_jid || newGroup.is_whatsapp_group === false) return;
                
                // If is_whatsapp_group is NULL or TRUE (default intention from admin panel?)
                // Let's assume if created from admin panel without JID, it needs to be created on WA
                
                console.log('Yeni Grup Oluşturma İsteği:', newGroup.name);
                
                try {
                    // Create WA Group (with just the bot initially)
                    // Note: WA requires at least one participant to create a group.
                    // We can't add anyone yet because we don't have members.
                    // So we wait? Or we need members to create group.
                    // Baileys groupCreate(subject, participants)
                    
                    // Strategy: We can't create an empty group.
                    // So we'll wait for the first member to be added to this group in 'chat_group_members' handler below?
                    // OR we require admin to provide at least one phone number when creating group?
                    
                    // Better Strategy: Update DB to mark as "pending_creation" and wait for first member?
                    // For simplicity, let's assume we can't create it YET until a member is added.
                    // So we'll handle creation in the MEMBER insert handler if group has no JID.
                } catch (e) {
                    console.error('Grup oluşturma hatası:', e);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_group_members' },
            async (payload) => {
                const newMember = payload.new as any;
                
                try {
                    // 1. Get Group Info
                    const { data: group } = await supabase
                        .from('chat_groups')
                        .select('*')
                        .eq('id', newMember.group_id)
                        .single();
                    
                    if (!group) return;

                    const memberPhone = newMember.phone;
                    const memberJid = `${memberPhone}@s.whatsapp.net`;

                    // CASE A: Group exists on WA
                    if (group.group_jid) {
                        console.log(`Gruba Üye Ekleniyor: ${group.name} -> ${memberPhone}`);
                        await sock.groupParticipantsUpdate(
                            group.group_jid, 
                            [memberJid],
                            'add'
                        );
                    } 
                    // CASE B: Group needs to be created (First member!)
                    else {
                         console.log(`İlk üye eklendi, WhatsApp Grubu kuruluyor: ${group.name}`);
                         
                         // Create Group with this member
                         console.log(`WhatsApp Grubu Oluşturuluyor: "${group.name}" - Üye: ${memberJid}`);
                         
                         const groupInfo = await sock.groupCreate(group.name, [memberJid]);
                         console.log('✅ Grup Başarıyla Kuruldu! ID:', groupInfo.id);

                         // Update DB with JID
                         const { error: updateError } = await supabase
                            .from('chat_groups')
                            .update({ 
                                group_jid: groupInfo.id,
                                is_whatsapp_group: true 
                            })
                            .eq('id', group.id);
                        
                         if (updateError) console.error('Grup ID veritabanına yazılamadı:', updateError);

                    }

                } catch (e) {
                    console.error('❌ Grup/Üye işlemi hatası:', e);
                }
            }
        )
        .subscribe((status) => {
            console.log('Grup Yönetimi Kanalı Durumu:', status);
        });

    // --- SYNC GROUPS ON STARTUP ---
    async function syncGroups() {
        console.log('🔄 Başlangıç Grup Senkronizasyonu Başlıyor...');
        
        // Find groups that are marked as WA group but have no JID
        const { data: pendingGroups } = await supabase
            .from('chat_groups')
            .select('*, chat_group_members(*)')
            .is('group_jid', null)
            .eq('is_whatsapp_group', true);

        if (pendingGroups && pendingGroups.length > 0) {
            console.log(`${pendingGroups.length} adet kurulmamış grup bulundu.`);
            
            for (const group of pendingGroups) {
                if (group.chat_group_members && group.chat_group_members.length > 0) {
                    const firstMember = group.chat_group_members[0];
                    const memberJid = `${firstMember.phone}@s.whatsapp.net`;
                    
                    try {
                        console.log(`Geçmiş Grup Kuruluyor: "${group.name}"`);
                        const groupInfo = await sock.groupCreate(group.name, [memberJid]);
                        console.log('✅ Grup Kuruldu:', groupInfo.id);

                        await supabase
                            .from('chat_groups')
                            .update({ group_jid: groupInfo.id })
                            .eq('id', group.id);

                        // Add other members if any
                        if (group.chat_group_members.length > 1) {
                            const otherMembers = group.chat_group_members.slice(1).map((m: any) => `${m.phone}@s.whatsapp.net`);
                            if (otherMembers.length > 0) {
                                await sock.groupParticipantsUpdate(groupInfo.id, otherMembers, 'add');
                            }
                        }

                    } catch (e) {
                        console.error(`Grup kurulamadı (${group.name}):`, e);
                    }
                } else {
                    console.log(`Grup "${group.name}" için üye yok, atlanıyor.`);
                }
            }
        } else {
            console.log('✅ Tüm gruplar senkronize.');
        }
    }

    // Run sync after connection
    syncGroups();

    // --- OUTBOUND MESSAGE HANDLER ---
    supabase
        .channel('bot-outbound-v2')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
                const newMsg = payload.new as any;
                
                if (newMsg.direction !== 'outbound' || newMsg.status !== 'pending') return;

                console.log('Gönderilecek Mesaj Yakalandı:', newMsg.id);

                try {
                    // Define targetPhone FIRST
                    let targetPhone = newMsg.sender_phone;
                    
                    // If phone not in message, try to find user's phone
                    if (!targetPhone && newMsg.user_id) {
                        const { data: user } = await supabase
                            .from('users')
                            .select('phone')
                            .eq('id', newMsg.user_id)
                            .single();
                        targetPhone = user?.phone;
                    }

                    if (!targetPhone) {
                        console.error('Hedef telefon bulunamadı:', newMsg.id);
                        await supabase.from('messages').update({ status: 'failed' }).eq('id', newMsg.id);
                        return;
                    }

                    // Check if it's a GROUP Message (via chat_groups table)
                    let targetJid = '';

                    // PRIORITY: If group_id is present, send to GROUP JID
                    if (newMsg.group_id) {
                        const { data: groupData } = await supabase
                            .from('chat_groups')
                            .select('group_jid')
                            .eq('id', newMsg.group_id)
                            .single();
                        
                        if (groupData && groupData.group_jid) {
                            targetJid = groupData.group_jid;
                        } else {
                            console.warn(`Grup ID (${newMsg.group_id}) var ama JID bulunamadı. Kişiye gönderiliyor...`);
                        }
                    }

                    // Fallback / Standard: Use sender_phone if no group JID resolved
                    if (!targetJid) {
                        if (targetPhone.includes('@')) {
                            // Already a JID (Group or specific format)
                            targetJid = targetPhone;
                        } else {
                             // Clean Phone (Standard User)
                             const cleanPhone = targetPhone.replace(/\D/g, '');
                             targetJid = `${cleanPhone}@s.whatsapp.net`;
                        }
                    }

                    console.log('Mesaj Gönderiliyor -> ', targetJid, 'Tip:', newMsg.type);

                    if (newMsg.type === 'image' && newMsg.media_url) {
                         await sock.sendMessage(targetJid, { 
                             image: { url: newMsg.media_url },
                             caption: newMsg.content || ''
                         });
                    } else {
                         await sock.sendMessage(targetJid, { text: newMsg.content || '' });
                    }
                    
                    console.log('Mesaj Gönderildi:', targetJid);

                    await supabase.from('messages').update({ status: 'sent' }).eq('id', newMsg.id);

                } catch (error) {
                    console.error('Mesaj gönderme hatası:', error);
                    await supabase.from('messages').update({ status: 'failed' }).eq('id', newMsg.id);
                }
            }
        )
        .subscribe();

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return; 

            // --- FILTER: Only New Messages ---
            const messageTimestamp = (typeof msg.messageTimestamp === 'number') 
                ? msg.messageTimestamp 
                : (msg.messageTimestamp as any)?.low;

            if (messageTimestamp && messageTimestamp < startTime) return;
            // ---------------------------------

            const remoteJid = msg.key.remoteJid || '';
            const isGroup = remoteJid.endsWith('@g.us');
            const participant = msg.key.participant || remoteJid; // In groups, sender is participant. In private, it's remoteJid.

            // Clean Phone Number of SENDER
            let senderPhoneRaw = isGroup ? participant : remoteJid;
            let senderPhone = senderPhoneRaw.replace(/\D/g, '');
            
            // Group ID (if group)
            let groupJid = isGroup ? remoteJid : null;

            // WhatsApp Name
            const senderName = msg.pushName || `+${senderPhone}`; 
            
            console.log(`Yeni Mesaj: ${senderName} (${senderPhone}) [${isGroup ? 'GRUP: ' + groupJid : 'ÖZEL'}]`);

            // --- GROUP LOGIC ---
            let dbGroupId = null;

            if (isGroup && groupJid) {
                // 1. Check/Create Group in DB
                const { data: existingGroup } = await supabase
                    .from('chat_groups')
                    .select('id')
                    .eq('group_jid', groupJid)
                    .maybeSingle();

                if (existingGroup) {
                    dbGroupId = existingGroup.id;
                } else {
                    // Fetch Group Metadata for Name
                    let groupName = 'WhatsApp Grubu';
                    try {
                        const metadata = await sock.groupMetadata(groupJid);
                        groupName = metadata.subject || groupName;
                    } catch (e) { console.error('Grup bilgisi alınamadı', e); }

                    const { data: newGroup } = await supabase
                        .from('chat_groups')
                        .insert({
                            name: groupName,
                            group_jid: groupJid,
                            is_whatsapp_group: true
                        })
                        .select()
                        .single();
                    
                    if (newGroup) dbGroupId = newGroup.id;
                }

                // 2. Add Member to Group in DB if not exists
                if (dbGroupId) {
                    const { error } = await supabase
                        .from('chat_group_members')
                        .upsert({
                            group_id: dbGroupId,
                            phone: senderPhone,
                            name: senderName
                        }, { onConflict: 'group_id, phone', ignoreDuplicates: true });
                }
            }
            // -------------------

            // 1. Identify User (Tali)
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('phone', senderPhone)
                .maybeSingle();
            
            const userId = user?.id || null;

            // 2. Handle Content & Auto-Reply
            let messageType = 'text';
            let content = '';
            let mediaUrl = null;

            if (msg.message.conversation || msg.message.extendedTextMessage?.text) {
                content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                // --- AUTO REPLY LOGIC ---
                // Only reply if it's an exact match (case insensitive)
                const upperContent = content.trim().toUpperCase();
                let autoReplyText = '';

                if (upperContent === 'DASK') {
                    autoReplyText = `*DASK İÇİN GEREKLİ BİLGİLER:*\n\n- TC KİMLİK NO\n- DOĞUM TARİHİ\n- AÇIK ADRES\n- M2 (BRÜT)\n- İNŞA YILI\n- KAÇ KATLI / KAÇINCI KAT`;
                } else if (upperContent === 'KONUT') {
                    autoReplyText = `*KONUT SİGORTASI İÇİN GEREKLİ BİLGİLER:*\n\n- TC KİMLİK NO\n- DOĞUM TARİHİ\n- AÇIK ADRES\n- M2\n- İNŞA YILI\n- KAÇ KATLI / KAÇINCI KAT\n- VARSA ÖZEL İSTENEN TEMİNAT`;
                } else if (upperContent === 'TSS') {
                    autoReplyText = `*TAMAMLAYICI SAĞLIK (TSS) İÇİN GEREKLİ BİLGİLER:*\n\n- TC KİMLİK NO\n- DOĞUM TARİHİ\n- VARSA İSTENEN ÖZEL HASTANE`;
                } else if (upperContent === 'ÖSS') {
                    autoReplyText = `*ÖZEL SAĞLIK (ÖSS) İÇİN GEREKLİ BİLGİLER:*\n\n- TC KİMLİK NO\n- DOĞUM TARİHİ\n- LİMİTLİ Mİ / LİMİTSİZ Mİ?\n- İSTENEN HASTANE AĞI?`;
                } else if (upperContent === 'İŞYERİ') {
                    autoReplyText = `*İŞYERİ SİGORTASI İÇİN GEREKLİ BİLGİLER:*\n\n- TC KİMLİK NO\n- DOĞUM TARİHİ\n- AÇIK ADRES\n- M2\n- İNŞA YILI\n- KAÇ KATLI / KAÇINCI KAT\n- FAALİYET KONUSU\n- EMTİA VAR MI?\n- İSTENEN TEMİNATLAR`;
                }

                if (autoReplyText) {
                    const replyJid = isGroup ? groupJid : remoteJid;
                    if (replyJid) {
                        await sock.sendMessage(replyJid, { text: autoReplyText }, { quoted: msg });
                        console.log('Otomatik Yanıt Gönderildi:', upperContent);
                    }
                }
                // ------------------------

            } 
            else if (msg.message.imageMessage) {
                messageType = 'image';
                content = msg.message.imageMessage.caption || '';
                
                try {
                    const buffer = await downloadMediaMessage(
                        msg,
                        'buffer',
                        { },
                        { 
                            logger: pino({ level: 'silent' }),
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );

                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const { data, error } = await supabase
                        .storage
                        .from('whatsapp-media')
                        .upload(fileName, buffer, { contentType: 'image/jpeg' });

                    if (!error) {
                        const { data: { publicUrl } } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
                        mediaUrl = publicUrl;
                    }
                } catch (err) {
                    console.error('Resim işleme hatası:', err);
                }
            }

            // 3. Save to DB with group_id
            const { error } = await supabase.from('messages').insert({
                user_id: userId,
                sender_phone: senderPhone,
                sender_name: senderName,
                direction: 'inbound',
                type: messageType,
                content: content,
                media_url: mediaUrl,
                wa_message_id: msg.key.id,
                status: 'delivered',
                group_id: dbGroupId // SAVE GROUP ID
            });

            if (error) console.error('DB Insert Error:', error);
            else console.log('Mesaj kaydedildi.');

        } catch (error) {
            console.error('Message upsert error:', error);
        }
    });
}

connectToWhatsApp();
