-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id uuid := uuid_generate_v4();
  existing_user_id uuid;
BEGIN
  -- Check if admin exists in auth.users
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@gmail.com';

  IF existing_user_id IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@gmail.com',
      crypt('1234samet', gen_salt('bf')), -- Password: 1234samet
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Yönetici"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );

    -- Create public user profile
    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'admin@gmail.com', 'Yönetici', 'admin');
    
  ELSE
    -- If exists, ensure public profile exists
    INSERT INTO public.users (id, email, name, role)
    VALUES (existing_user_id, 'admin@gmail.com', 'Yönetici', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin'; -- Ensure admin role
  END IF;
END $$;
