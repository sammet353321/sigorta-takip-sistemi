const { createClient } = require('@supabase/supabase-js');

class Database {
    constructor() {
        const SUPABASE_URL = 'https://aqubbkxsfwmhfbolkfah.supabase.co';
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_KEY) {
            console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY missing.");
            process.exit(1);
        }

        this.client = createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    async updateSession(userId, data) {
        return await this.client
            .from('whatsapp_sessions')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
    }

    async getSession(userId) {
        const { data } = await this.client
            .from('whatsapp_sessions')
            .select('*')
            .eq('user_id', userId)
            .single();
        return data;
    }

    async clearSession(userId) {
        return await this.client
            .from('whatsapp_sessions')
            .update({ 
                status: 'disconnected', 
                qr_code: null, 
                phone_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
    }
}

module.exports = new Database();
