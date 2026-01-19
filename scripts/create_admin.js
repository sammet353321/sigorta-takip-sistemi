import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqubbkxsfwmhfbolkfah.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdWJia3hzZndtaGZib2xrZmFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcxOTc4MiwiZXhwIjoyMDgzMjk1NzgyfQ.ElFm1IF05APRCpdSM242T63NogL0pnPcgV_4zxnfOPY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@gmail.com';
  const password = '1234samet';
  const name = 'Admin User';

  console.log(`Checking if user ${email} exists...`);

  // 1. Check if user exists in Auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const existingUser = users.find(u => u.email === email);
  let userId;

  if (existingUser) {
    console.log('User already exists. Updating password...');
    userId = existingUser.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: { name: name }
    });
    if (updateError) {
      console.error('Error updating user:', updateError);
      process.exit(1);
    }
    console.log('Password updated.');
  } else {
    console.log('User does not exist. Creating...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name }
    });
    
    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log('User created with ID:', userId);
  }

  // 2. Upsert into public.users with role 'admin'
  console.log('Upserting into public.users...');
  const { error: upsertError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: email,
      name: name,
      role: 'admin',
      updated_at: new Date()
    });

  if (upsertError) {
    console.error('Error upserting public user:', upsertError);
    process.exit(1);
  }

  console.log('Admin user setup complete!');
}

createAdmin().catch(console.error);
