// Integration test against a disposable Supabase project after applying the migration.
// Provide TEST_USER_A_EMAIL/PASSWORD, TEST_USER_B_EMAIL/PASSWORD, TEST_USER_C_EMAIL/PASSWORD.
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!key)throw new Error('Missing Supabase environment variables');
const clients=[];
for(const label of ['A','B','C']){
 const email=process.env[`TEST_USER_${label}_EMAIL`];const password=process.env[`TEST_USER_${label}_PASSWORD`];
 if(!email||!password)throw new Error(`Missing TEST_USER_${label} credentials`);
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
 clients.push({client,user:data.user});
}
const [{client:a,user:ua},{client:b,user:ub},{client:c}]=clients;
const must=async promise=>{const {data,error}=await promise;if(error)throw error;return data;};
const familyA=await must(a.rpc('create_family',{family_name:`RLS test A ${Date.now()}`}));
const familyC=await must(c.rpc('create_family',{family_name:`RLS test C ${Date.now()}`}));
const birthday='2025-01-01';
const [allie]=await must(a.from('babies').insert({family_id:familyA,name:'Allie',birthday}).select());
const [billie]=await must(a.from('babies').insert({family_id:familyA,name:'Billie',birthday}).select());
const [foreignBaby]=await must(c.from('babies').insert({family_id:familyC,name:'Other',birthday}).select());
const [feeding]=await must(a.from('feedings').insert({family_id:familyA,baby_id:allie.id,created_by:ua.id,amount_ml:90,feeding_type:'formula'}).select());
assert.equal((await must(a.from('feedings').select('amount_ml').eq('baby_id',allie.id)))[0].amount_ml,90);
await must(a.from('feedings').update({amount_ml:100}).eq('id',feeding.id));
assert.equal((await must(a.from('feedings').select('amount_ml').eq('id',feeding.id)))[0].amount_ml,100);
await must(a.from('feedings').delete().eq('id',feeding.id));
assert.equal((await must(a.from('feedings').select('id').eq('id',feeding.id))).length,0);
const invite=await must(a.rpc('create_family_invite',{fid:familyA}));
assert.equal(await must(b.rpc('join_family',{invite_token:invite})),familyA);
assert.equal((await must(b.from('babies').select('id').eq('family_id',familyA))).length,2);
await must(b.from('feedings').insert({family_id:familyA,baby_id:billie.id,created_by:ub.id,amount_ml:120,feeding_type:'formula'}));
assert.equal((await must(a.from('feedings').select('id').eq('baby_id',billie.id))).length,1);
for(const [table,id] of [['families',familyA],['babies',allie.id],['feedings',(await must(a.from('feedings').select('id').eq('baby_id',billie.id)))[0].id]]){
 assert.equal((await must(c.from(table).select('id').eq('id',id))).length,0,`${table} SELECT leaked`);
}
assert.equal((await must(c.from('family_members').select('id').eq('family_id',familyA))).length,0);
assert.equal((await must(c.from('profiles').select('id').eq('id',ua.id))).length,0);
assert.ok((await c.from('babies').insert({family_id:familyA,name:'Intruder',birthday})).error,'Foreign baby INSERT should fail');
assert.equal((await must(c.from('babies').update({name:'Changed'}).eq('id',allie.id).select())).length,0);

assert.equal((await must(c.from('family_invites').select('id').eq('family_id',familyA))).length,0);
const forbiddenInsert=await c.from('feedings').insert({family_id:familyA,baby_id:allie.id,created_by:(await c.auth.getUser()).data.user.id,amount_ml:90,feeding_type:'formula'});
assert.ok(forbiddenInsert.error,'Foreign feeding INSERT should fail');
const foreignFeeding=(await must(a.from('feedings').select('id').eq('baby_id',billie.id)))[0];
assert.equal((await must(c.from('feedings').update({amount_ml:999}).eq('id',foreignFeeding.id).select())).length,0);
assert.equal((await must(c.from('feedings').delete().eq('id',foreignFeeding.id).select())).length,0);
const move=await a.from('feedings').insert({family_id:familyC,baby_id:foreignBaby.id,created_by:ua.id,amount_ml:90,feeding_type:'formula'});
assert.ok(move.error,'A should not insert into C family');
console.log('RLS integration checks passed: CRUD, sharing, and cross-family SELECT/INSERT/UPDATE/DELETE.');
