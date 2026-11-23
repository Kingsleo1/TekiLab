-- ==============================================================================
-- MANESOL PHARMACY: SUPER ADMIN, AUTH & PROFILES DATABASE INITIALIZATION SCRIPT
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable pgcrypto extension for UUID generation & password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure public.profiles table exists with complete role, branch & permissions schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Store Manager',
    level INT NOT NULL DEFAULT 4,
    branch_id TEXT DEFAULT 'pharma-1',
    status TEXT DEFAULT 'active',
    permissions TEXT[] DEFAULT ARRAY['canAccessPOS']::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'Kernel Admin'
    )
);

-- 5. Create System Settings Table (Stores application-wide configs & credentials metadata)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System settings viewable by authenticated" ON public.system_settings;
CREATE POLICY "System settings viewable by authenticated" 
ON public.system_settings FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Only Kernel Admin can update system settings" ON public.system_settings;
CREATE POLICY "Only Kernel Admin can update system settings" 
ON public.system_settings FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'Kernel Admin'
    )
);

-- 6. Pre-seed Default System Settings for /admin Portal
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES 
    ('admin_portal', '{"endpoint": "/admin", "default_email": "admin@manesolpharmacy.com", "role": "Kernel Admin", "level": 5}'::JSONB, 'Super Admin portal configuration and access level', NOW()),
    ('general_settings', '{"app_name": "Manesol Pharmacy", "currency": "USD", "tax_rate": 0.075}'::JSONB, 'General system configuration', NOW())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- 7. Automated Trigger to create public.profiles record when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role, level, branch_id, permissions, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        CASE 
            WHEN NEW.email = 'admin@manesolpharmacy.com' OR NEW.raw_user_meta_data->>'role' = 'Kernel Admin' THEN 'Kernel Admin'
            ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'Store Manager')
        END,
        CASE 
            WHEN NEW.email = 'admin@manesolpharmacy.com' OR NEW.raw_user_meta_data->>'role' = 'Kernel Admin' THEN 5
            ELSE 4
        END,
        COALESCE(NEW.raw_user_meta_data->>'branch_id', 'pharma-1'),
        CASE 
            WHEN NEW.email = 'admin@manesolpharmacy.com' OR NEW.raw_user_meta_data->>'role' = 'Kernel Admin' 
            THEN ARRAY['canAccessPOS', 'canApplyDiscounts', 'canDispenseControlled', 'canManageInventory', 'canAccessTransfers', 'canAccessSuppliers', 'canAccessExpenses', 'canManageStaff', 'canManageBranches', 'canAccessAdminPanel']::TEXT[]
            ELSE ARRAY['canAccessPOS', 'canApplyDiscounts', 'canDispenseControlled', 'canManageInventory', 'canAccessTransfers', 'canAccessSuppliers', 'canAccessExpenses', 'canManageStaff']::TEXT[]
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        role = EXCLUDED.role,
        level = EXCLUDED.level,
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Seed / Update Super Admin Profile if user already exists in auth.users
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if admin@manesolpharmacy.com exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@manesolpharmacy.com' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Link or update profiles entry
        INSERT INTO public.profiles (
            id, name, email, role, level, branch_id, status, permissions, created_at, updated_at
        ) VALUES (
            admin_user_id,
            'Super Administrator',
            'admin@manesolpharmacy.com',
            'Kernel Admin',
            5,
            'pharma-1',
            'active',
            ARRAY['canAccessPOS', 'canApplyDiscounts', 'canDispenseControlled', 'canManageInventory', 'canAccessTransfers', 'canAccessSuppliers', 'canAccessExpenses', 'canManageStaff', 'canManageBranches', 'canAccessAdminPanel']::TEXT[],
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'Kernel Admin',
            level = 5,
            permissions = EXCLUDED.permissions,
            updated_at = NOW();
    END IF;
END $$;

-- Verification query
SELECT id, name, email, role, level, branch_id FROM public.profiles WHERE role = 'Kernel Admin';
