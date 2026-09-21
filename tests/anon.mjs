import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!key)throw new Error('Missing public Supabase configuration');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
for(const table of ['profiles','families','family_members','babies','feedings','growth_measurements','family_invites']){
 const {data,error}=await db.from(table).select('*').limit(1);
 assert.ok(error||!data?.length,`Anonymous access exposed ${table}`);
}
const {error}=await db.rpc('create_family',{family_name:'Unauthorized'});
assert.ok(error,'Anonymous family creation unexpectedly succeeded');
const {data:avatars,error:avatarError}=await db.storage.from('baby-avatars').list();
assert.ok(avatarError||!avatars?.length,'Anonymous access exposed baby avatars');
console.log('Anonymous access checks passed for all seven tables, private avatars, and create_family RPC.');
