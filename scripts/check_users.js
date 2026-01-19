import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqubbkxsfwmhfbolkfah.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdWJia3hzZndtaGZib2xrZmFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcxOTc4MiwiZXhwIjoyMDgzMjk1NzgyfQ.ElFm1IF05APRCpdSM242T63NogL0pnPcgV_4zxnfOPY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log('Users in public table:', data);
  }
}

checkUsers();
