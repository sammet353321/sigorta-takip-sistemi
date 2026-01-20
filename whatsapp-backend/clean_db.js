require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aqubbkxsfwmhfbolkfah.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanSessions() {
    console.log('Cleaning all sessions...');
    const { error } = await supabase.from('whatsapp_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) console.error('Error:', error);
    else console.log('All sessions deleted.');
}

cleanSessions();
