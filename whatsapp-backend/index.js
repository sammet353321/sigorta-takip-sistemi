require('dotenv').config();
const express = require('express');
const db = require('./src/Database');
const SessionManager = require('./src/SessionManager');

const app = express();
const port = process.env.PORT || 3004;

// Active sessions: userId -> SessionManager
const sessions = new Map();

// --- SERVER ---
app.get('/', (req, res) => res.send('WhatsApp Backend v3 (Optimized)'));
app.listen(port, () => console.log(`Server running on port ${port}`));

// --- LISTENERS ---
db.client
    .channel('whatsapp-backend-v3')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' }, 
    async (payload) => {
        const session = payload.new;
        if (!session) return;

        const userId = session.user_id;
        
        // 1. Start / Scan
        if (session.status === 'scanning') {
            // If already managing this user, check if we need to restart
            let manager = sessions.get(userId);
            
            if (!manager) {
                manager = new SessionManager(userId);
                sessions.set(userId, manager);
            }

            // Only start if not already initializing or connected
            // But if 'scanning' is requested, it usually means user clicked "QR Code" again
            // So we should probably force restart if not already doing so
            if (!manager.isInitializing && !manager.sock?.user) {
                manager.start();
            }
        }

        // 2. Disconnect
        if (session.status === 'disconnected') {
            const manager = sessions.get(userId);
            if (manager) {
                await manager.stop();
                sessions.delete(userId);
            }
        }
    })
    .subscribe();

// --- GROUP & MESSAGE LISTENERS ---
db.client
    .channel('whatsapp-groups')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups' }, 
    async (payload) => {
        const group = payload.new;
        if (!group) return; // Delete event?

        // Find active session (Assume single user for now or find owner)
        // In multi-tenant, we need to know which user owns this group.
        // For now, take the first active session.
        const manager = sessions.values().next().value;
        if (!manager) return;

        // 1. CREATE GROUP
        if (group.status === 'creating') {
            console.log('Creating group:', group.name);
            const res = await manager.createGroup(group.name, []); // Participants empty initially
            
            if (res.success) {
                // Update DB with real WA ID and active status
                // BUT: We can't change ID easily if it's primary key.
                // So we delete the temp row and insert new one with WA ID?
                // OR we have a separate 'wa_group_id' column.
                
                // Hack: Update the current row to 'active' and store wa_id if column exists.
                // Since we use 'id' as primary key which is UUID in Supabase but JID in WA.
                // We should probably delete the temp UUID row and insert the WA JID row.
                
                await db.client.from('chat_groups').delete().eq('id', group.id);
                await db.client.from('chat_groups').insert({
                    id: res.gid, // WA JID
                    name: group.name,
                    is_whatsapp_group: true,
                    status: 'active',
                    created_by: group.created_by
                });
            } else {
                await db.client.from('chat_groups').update({ status: 'failed' }).eq('id', group.id);
            }
        }

        // 2. DELETE GROUP
        if (group.status === 'deleting') {
            console.log('Deleting/Leaving group:', group.id);
            await manager.deleteGroup(group.id);
            // Finally delete from DB
            await db.client.from('chat_groups').delete().eq('id', group.id);
        }
    })
    .subscribe();

// --- MESSAGE LISTENER ---
db.client
    .channel('whatsapp-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
    async (payload) => {
        const msg = payload.new;
        if (msg.status === 'pending' && msg.direction === 'outbound') {
            let manager;
            // 1. Try to find the specific session for this user
            if (msg.user_id) {
                manager = sessions.get(msg.user_id);
            }

            // 2. Fallback: Take the first available session (legacy behavior)
            if (!manager) {
                manager = sessions.values().next().value;
            }

            if (manager) {
                const target = msg.group_id || msg.sender_phone;
                await manager.sendMessage(target, msg.content);
                await db.client.from('messages').update({ status: 'sent' }).eq('id', msg.id);
            } else {
                console.log(`No active session found to send message ${msg.id}`);
            }
        }
    })
    .subscribe();

console.log('Backend v3 initialized and listening for changes...');

// --- RESTORE ACTIVE SESSIONS ---
(async () => {
    try {
        const { data: sessionsData } = await db.client
            .from('whatsapp_sessions')
            .select('*')
            .eq('status', 'connected');

        if (sessionsData && sessionsData.length > 0) {
            console.log(`Found ${sessionsData.length} active sessions. Restoring...`);
            for (const s of sessionsData) {
                const manager = new SessionManager(s.user_id);
                sessions.set(s.user_id, manager);
                // Start in reconnect mode
                manager.start(true).catch(err => {
                    console.error(`Failed to restore session for ${s.user_id}:`, err);
                });
            }
        }
    } catch (error) {
        console.error('Error restoring sessions:', error);
    }
})();
