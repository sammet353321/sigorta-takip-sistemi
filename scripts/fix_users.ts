import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing keys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsers() {
  const usersToFix = [
    { email: 'ahmet@hotmail.com', password: 'password123' },
    { email: 'samet@hotmail.com', password: 'password123' }
  ];

  for (const u of usersToFix) {
    console.log(`Confirming ${u.email}...`);
    // 1. Find user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(x => x.email === u.email);
    
    if (user) {
        // 2. Update user: confirm email and set password
        const { error } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirm: true, password: u.password, user_metadata: { email_confirmed: true } }
        );
        if (error) console.error(`Error fixing ${u.email}:`, error);
        else console.log(`Fixed ${u.email}. New password: ${u.password}`);
    } else {
        console.log(`User ${u.email} not found.`);
    }
  }
}

fixUsers();
