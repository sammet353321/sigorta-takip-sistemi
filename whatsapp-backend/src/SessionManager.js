const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const db = require('./Database');

class SessionManager {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.baseAuthPath = path.join('auth_info_baileys');
        this.currentAuthPath = null;
        this.isInitializing = false;
        this.isDisconnecting = false;
        this.reconnectAttempts = 0;
    }

    async start(isReconnect = false) {
        if (this.isInitializing) return;
        this.isInitializing = true;
        this.isDisconnecting = false;

        console.log(`[${this.userId}] Starting session... (Reconnect: ${isReconnect})`);

        try {
            // Determine auth path
            if (!this.currentAuthPath || !isReconnect) {
                this.cleanupOldSessions();
                const timestamp = Date.now();
                this.currentAuthPath = path.join(this.baseAuthPath, `session-${this.userId}-${timestamp}`);
                console.log(`[${this.userId}] New auth path: ${this.currentAuthPath}`);
            }

            // Create dir if not exists
            if (!fs.existsSync(this.currentAuthPath)) {
                fs.mkdirSync(this.currentAuthPath, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(this.currentAuthPath);
            const { version } = await fetchLatestBaileysVersion();

            // Unique browser description to avoid conflict on same WA account
            // Adding a random component to ensure uniqueness even if user ID prefix is same (unlikely but safe)
            const browserId = `${this.userId.substring(0, 5)}-${Math.floor(Math.random() * 1000)}`;

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'error' }), // Only errors
                printQRInTerminal: true, // Enable terminal QR for debugging
                auth: state,
                browser: ['Sigortam Panel', 'Chrome', `v-${browserId}`], // Unique browser per user
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
                emitOwnEvents: true,
                retryRequestDelayMs: 500
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log(`[${this.userId}] QR Generated`);
                    const dataUrl = await qrcode.toDataURL(qr);
                    await db.updateSession(this.userId, { 
                        qr_code: dataUrl, 
                        status: 'scanning' 
                    });
                }

                if (connection === 'open') {
                    console.log(`[${this.userId}] Connected`);
                    this.reconnectAttempts = 0;
                    const userJid = this.sock.user.id;
                    const phone = jidNormalizedUser(userJid).split('@')[0];
                    
                    await db.updateSession(this.userId, { 
                        status: 'connected', 
                        qr_code: null, 
                        phone_number: phone 
                    });
                    await this.syncGroups();
                    this.isInitializing = false;
                }

                if (connection === 'close') {
                    this.isInitializing = false; // Reset init flag on close
                    const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    console.log(`[${this.userId}] Connection closed. Code: ${statusCode}, Reconnect: ${shouldReconnect}`);

                    if (this.isDisconnecting) {
                        console.log(`[${this.userId}] Intentional disconnect. Stopping.`);
                        await this.stop();
                        return;
                    }

                    // Handle 401/405 specifically
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 405) {
                        console.log(`[${this.userId}] Critical error (401/405). Cleaning up and restarting...`);
                        this.cleanupFiles();
                        this.reconnectAttempts = 0;
                        setTimeout(() => this.start(false), 1000); // Restart as fresh session
                        return;
                    }

                    if (shouldReconnect) { // Removed retry limit for robustness
                        this.reconnectAttempts++;
                        const delay = Math.min(this.reconnectAttempts * 2000, 10000); // Backoff
                        console.log(`[${this.userId}] Reconnecting in ${delay}ms...`);
                        setTimeout(() => this.start(true), delay); // Pass true for reconnect
                    } else {
                        // Only destroy if strictly NOT reconnectable (Logged Out)
                        console.log(`[${this.userId}] Fatal error (Not Reconnectable).`);
                        await this.destroy();
                    }
                }
            });

        } catch (err) {
            console.error(`[${this.userId}] Fatal start error:`, err);
            this.isInitializing = false;
        }
    }

    async stop() {
        this.isDisconnecting = true;
        if (this.sock) {
            try {
                await this.sock.logout(); // Try logout first
            } catch (e) {}
            try {
                this.sock.end(undefined);
            } catch (e) {}
            this.sock = null;
        }
        await this.clearWAGroups();
        await db.clearSession(this.userId);
        this.cleanupFiles();
    }

    async destroy() {
        this.isDisconnecting = true;
        if (this.sock) {
            this.sock.end(undefined);
            this.sock = null;
        }
        await this.clearWAGroups();
        await db.clearSession(this.userId);
        this.cleanupFiles();
    }

    cleanupFiles() {
        if (this.currentAuthPath && fs.existsSync(this.currentAuthPath)) {
            try {
                fs.rmSync(this.currentAuthPath, { recursive: true, force: true });
                console.log(`[${this.userId}] Session files deleted: ${this.currentAuthPath}`);
                this.currentAuthPath = null;
            } catch (e) {
                console.error(`[${this.userId}] Failed to delete files:`, e.message);
            }
        }
    }

    cleanupOldSessions() {
        if (!fs.existsSync(this.baseAuthPath)) {
            fs.mkdirSync(this.baseAuthPath, { recursive: true });
            return;
        }

        try {
            const files = fs.readdirSync(this.baseAuthPath);
            const userSessionPrefix = `session-${this.userId}-`;
            
            for (const file of files) {
                if (file.startsWith(userSessionPrefix) || file === `session-${this.userId}`) {
                    const filePath = path.join(this.baseAuthPath, file);
                    try {
                        fs.rmSync(filePath, { recursive: true, force: true });
                        console.log(`[${this.userId}] Old session cleaned: ${file}`);
                    } catch (err) {
                        console.error(`[${this.userId}] Failed to clean old session ${file}:`, err.message);
                    }
                }
            }
        } catch (error) {
            console.error(`[${this.userId}] Error scanning for old sessions:`, error);
        }
    }
    // --- GROUP MANAGEMENT ---
    async createGroup(name, participants = []) {
        if (!this.sock) return { success: false, error: 'Not connected' };
        try {
            const group = await this.sock.groupCreate(name, participants);
            console.log(`[${this.userId}] Group created: ${name} (${group.id})`);
            return { success: true, gid: group.id };
        } catch (error) {
            console.error(`[${this.userId}] Create group error:`, error);
            return { success: false, error: error.message };
        }
    }

    async deleteGroup(gid) {
        if (!this.sock) return { success: false, error: 'Not connected' };
        try {
            // 1. Fetch group metadata to check participants and admin status
            const metadata = await this.sock.groupMetadata(gid);
            const participants = metadata.participants.map(p => p.id);
            const myId = this.sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const amIAdmin = metadata.participants.find(p => p.id === myId)?.admin;

            // 2. If admin, remove all participants first (except self)
            if (amIAdmin) {
                const others = participants.filter(id => id !== myId);
                if (others.length > 0) {
                    await this.sock.groupParticipantsUpdate(gid, others, 'remove');
                    console.log(`[${this.userId}] Removed ${others.length} members from ${gid}`);
                }
            }

            // 3. Leave group
            await this.sock.groupLeave(gid);
            console.log(`[${this.userId}] Left group: ${gid}`);
            return { success: true };
        } catch (error) {
            console.error(`[${this.userId}] Leave group error:`, error);
            // Even if error (e.g. already left), return true to clear DB
            return { success: true, error: error.message };
        }
    }

    async syncGroups() {
        if (!this.sock) {
            console.log(`[${this.userId}] Cannot sync: Socket not connected`);
            return;
        }
        try {
            console.log(`[${this.userId}] Fetching groups from WA...`);
            const groups = await this.sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);
            console.log(`[${this.userId}] Found ${groupList.length} groups on WA.`);
            
            for (const g of groupList) {
                const { error } = await db.client.from('chat_groups').upsert({
                    id: g.id, 
                    name: g.subject,
                    is_whatsapp_group: true,
                    created_at: new Date(g.creation * 1000).toISOString(),
                    status: 'active',
                    created_by: this.userId
                }, { onConflict: 'id' });
                
                if (error) console.error(`[${this.userId}] Group upsert error (${g.subject}):`, error);
            }
            console.log(`[${this.userId}] Synced ${groupList.length} groups to DB.`);
        } catch (error) {
            console.error(`[${this.userId}] Sync CRITICAL error:`, error);
        }
    }
    
    async clearWAGroups() {
        try {
            console.log(`[${this.userId}] Clearing WA groups from DB for this user...`);
            // Only delete groups created by this user/session to avoid wiping other users' groups
            await db.client.from('chat_groups')
                .delete()
                .eq('is_whatsapp_group', true)
                .eq('created_by', this.userId);
        } catch (error) {
            console.error(`[${this.userId}] Clear groups error:`, error);
        }
    }

    // --- MESSAGING ---
    async sendMessage(phone, text) {
        if (!this.sock) return;
        const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
        await this.sock.sendMessage(jid, { text });
    }
}

module.exports = SessionManager;
