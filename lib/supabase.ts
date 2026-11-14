import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { tr } from './i18n';
let client: SupabaseClient | null = null;
export function supabase() {
  if (client) return client;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error(tr('请先配置 Supabase 环境变量。','Supabase environment variables are not configured.'));
  client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
