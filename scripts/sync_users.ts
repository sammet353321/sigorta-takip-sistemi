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

async function syncUsers() {
  console.log('--- Syncing Auth Users to Public Table ---');
  
  // 1. Get all auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
      console.error('Error listing auth users:', error);
      return;
  }

  for (const user of users) {
      // 2. Check if exists in public.users
      const { data: publicUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

      if (!publicUser) {
          console.log(`Syncing user: ${user.email} (${user.id})`);
          
          // Determine role (default sub_agent unless admin)
          let role = 'sub_agent';
          let name = user.user_metadata?.name || user.email?.split('@')[0];

          if (user.email === 'admin@gmail.com') role = 'admin';
          else if (user.email?.includes('samet')) role = 'employee'; // Simple heuristic for now

          const { error: insertError } = await supabase
              .from('users')
              .insert({
                  id: user.id,
                  email: user.email,
                  name: name,
                  role: role,
                  created_at: user.created_at,
                  updated_at: user.updated_at
              });
          
          if (insertError) console.error(`Failed to sync ${user.email}:`, insertError);
          else console.log(`Synced ${user.email} as ${role}`);
      } else {
          console.log(`User ${user.email} already exists in public table.`);
      }
  }
}

syncUsers();
