import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// --- WhatsApp Client ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
    console.log('\nLütfen bu QR kodunu WhatsApp uygulamanızla okutun.\n');
});

client.on('ready', () => {
    console.log('WhatsApp Bot Hazır! Mesaj bekleniyor...');
});

client.on('message', async (msg) => {
    try {
        const senderNumber = msg.from.split('@')[0];
        console.log(`Mesaj geldi: ${senderNumber} - ${msg.body}`);

        // 1. Check if sender is a registered user (Sub Agent)
        // In a real app, we would match phone number to user.
        // For this demo, we'll try to find a user with this phone or email containing the number
        // OR we just assign it to a default 'Tali' user for testing.
        
        // Let's assume the sender is 'ahmet@hotmail.com' (id: fixed or search)
        // For now, let's hardcode 'ahmet@hotmail.com' ID for demo purposes
        // Or better: search user by metadata phone number if exists.
        
        // Demo: Get the first sub_agent found or specific one
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'ahmet@hotmail.com')
            .single();
            
        const userId = user?.id;

        if (!userId) {
            msg.reply('Sistemde kayıtlı değilsiniz. Lütfen yöneticinizle iletişime geçin.');
            return;
        }

        // 2. Handle Image/Document
        if (msg.hasMedia) {
            msg.reply('Belge alınıyor, lütfen bekleyin...');
            
            const media = await msg.downloadMedia();
            const buffer = Buffer.from(media.data, 'base64');
            const fileName = `whatsapp/${userId}/${Date.now()}.${media.mimetype.split('/')[1] || 'jpg'}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, buffer, {
                    contentType: media.mimetype
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                msg.reply('Belge yüklenirken hata oluştu.');
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            // Create Quote Request
            await supabase.from('teklifler').insert({
                ilgili_kisi_id: userId,
                durum: 'bekliyor',
                kart_bilgisi: publicUrl,
                notlar: `[WhatsApp'tan Gelen Belge]\n${msg.body || ''}`,
                plaka: '', // Will be filled by employee or OCR later
                tc_vkn: '',
                belge_no: ''
            });

            msg.reply('✅ Belgeniz sisteme yüklendi ve teklif isteği oluşturuldu! Çalışanlarımız inceleyip size dönecektir.');
        } 
        // 3. Handle Text
        else if (msg.body) {
            // Simple keyword analysis
            const lowerBody = msg.body.toLowerCase();
            
            if (lowerBody.includes('merhaba') || lowerBody.includes('selam')) {
                msg.reply('Merhaba! Ben Sigorta Asistanı. Ruhsat fotoğrafı atarak veya "34ABC123" gibi plaka yazarak teklif isteyebilirsiniz.');
            } 
            else if (msg.body.length > 5 && (msg.body.match(/\d/) || msg.body.match(/[A-Z]/))) {
                // Assume it might be plate or info
                await supabase.from('teklifler').insert({
                    ilgili_kisi_id: userId,
                    durum: 'bekliyor',
                    notlar: `[WhatsApp Mesajı]\n${msg.body}`,
                    plaka: msg.body.substring(0, 15), // Basic truncation
                    tc_vkn: '',
                    belge_no: ''
                });
                msg.reply('✅ Bilgilerinizle yeni bir teklif talebi açıldı.');
            }
            else {
                msg.reply('Anlaşılmadı. Lütfen ruhsat fotoğrafı gönderin veya açık bir şekilde plaka/bilgi yazın.');
            }
        }

    } catch (error) {
        console.error('Message handler error:', error);
        msg.reply('Bir hata oluştu.');
    }
});

client.initialize();
