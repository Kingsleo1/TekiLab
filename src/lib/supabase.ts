/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Environment configuration for Supabase
const env = (import.meta as any).env || {};
const rawSupabaseUrl = env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// Sanitizes Supabase URL: removes surrounding quotes, trailing slashes, accidental /rest/v1 suffixes
function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = String(url).trim().replace(/^["']|["']$/g, '');
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  // Remove accidental /rest/v1 or /rest paths if user configured endpoint with rest path
  cleaned = cleaned.replace(/\/rest(\/v1)?\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

function sanitizeAnonKey(key: string): string {
  if (!key) return '';
  return String(key).trim().replace(/^["']|["']$/g, '');
}

export const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = sanitizeAnonKey(rawSupabaseAnonKey);

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://localhost')) return false;
  if (
    supabaseUrl.includes('your-project-id') || 
    supabaseUrl.includes('placeholder') ||
    supabaseUrl.includes('example.com') ||
    supabaseAnonKey.includes('your-anon-key') ||
    supabaseAnonKey.includes('placeholder')
  ) {
    return false;
  }
  try {
    const parsed = new URL(supabaseUrl);
    return Boolean(parsed.hostname && parsed.hostname.length > 3);
  } catch {
    return false;
  }
};

// Safe initialization to prevent app crash if environment keys are not configured
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

export interface SupabaseProfile {
  id: string; // matches auth.users.id UUID
  email: string;
  name: string;
  role: string;
  level: number;
  branch_id?: string;
  status?: string;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}
