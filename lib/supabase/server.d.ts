import { SupabaseClient } from '@supabase/supabase-js'

declare module '@/lib/supabase/server' {
  export function createClient(): Promise<SupabaseClient>
}