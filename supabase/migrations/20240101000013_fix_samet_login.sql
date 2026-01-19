-- Reset User for Guaranteed Access

-- 1. Create or Update 'samet@hotmail.com' as Employee
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'samet@hotmail.com';

  IF new_user_id IS NULL THEN
    -- Create new user if not exists
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      'samet@hotmail.com',
      crypt('123456', gen_salt('bf')), -- Password: 123456
      NOW(),
      NULL,
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO new_user_id;
  ELSE
    -- Update password if exists
    UPDATE auth.users 
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = NOW()
    WHERE id = new_user_id;
  END IF;

  -- 2. Ensure user exists in public.users
  INSERT INTO public.users (id, email, name, role)
  VALUES (new_user_id, 'samet@hotmail.com', 'Samet Çalışan', 'employee')
  ON CONFLICT (id) DO UPDATE
  SET role = 'employee', email = 'samet@hotmail.com'; -- Force role update

END $$;

-- 3. Also fix 'samet@gmail.com' just in case
DO $$
DECLARE
  gmail_user_id UUID;
BEGIN
  SELECT id INTO gmail_user_id FROM auth.users WHERE email = 'samet@gmail.com';

  IF gmail_user_id IS NOT NULL THEN
     UPDATE auth.users 
     SET encrypted_password = crypt('1234samet', gen_salt('bf')),
         email_confirmed_at = NOW()
     WHERE id = gmail_user_id;

     INSERT INTO public.users (id, email, name, role)
     VALUES (gmail_user_id, 'samet@gmail.com', 'Samet Gmail', 'employee')
     ON CONFLICT (id) DO UPDATE SET role = 'employee';
  END IF;
END $$;
