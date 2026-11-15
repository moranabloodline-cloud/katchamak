import assert from 'node:assert/strict';
import {Database} from 'bun:sqlite';
import {readFileSync} from 'node:fs';
import {accountApi} from '../scripts/accounts-runtime.mjs';
const sql=new Database(':memory:');
for(const statement of readFileSync('drizzle/0000_cold_spyke.sql','utf8').split('--> statement-breakpoint'))if(statement.trim())sql.exec(statement);
const DB={prepare(query){let values=[];const obj={bind(...v){values=v;return obj;},async run(){return sql.query(query).run(...values);},async first(){return sql.query(query).get(...values);},async all(){return {results:sql.query(query).all(...values)};}};return obj;},async batch(statements){return Promise.all(statements.map(s=>s.run()));}};
const env={DB,KATCHAMAK_ADMIN_EMAIL:'owner@test.local',KATCHAMAK_GMAIL_CLIENT_ID:'test-client',KATCHAMAK_GMAIL_CLIENT_SECRET:'test-secret',KATCHAMAK_GMAIL_SENDER:'sender@test.local'};
const call=(path,body,owner='owner@test.local')=>accountApi(new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner,...(body?{Origin:'https://test.local','Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
assert.equal((await call('/api/admin/gmail/status',null,'member@test.local')).status,403);
assert.equal((await (await call('/api/admin/gmail/status')).json()).connected,false);
const begin=async()=>new URL((await (await call('/api/admin/gmail/connect',{})).json()).url);
let auth=await begin();
assert.equal(auth.origin,'https://accounts.google.com');assert.equal(auth.searchParams.get('login_hint'),env.KATCHAMAK_GMAIL_SENDER);assert.ok(auth.searchParams.get('scope').includes('gmail.send'));assert.ok(!auth.searchParams.get('scope').includes('mail.google.com'));assert.equal(auth.searchParams.get('code_challenge_method'),'S256');
assert.equal((await call('/api/admin/gmail/callback?code=test&state=forged')).status,400);
let original=fetch,calls=[],wrongSender=true,sendCount=0,failSend=false;
try{
  globalThis.fetch=async(url,init)=>{
    calls.push({url,init});
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-access',refresh_token:'test-refresh',scope:'openid email https://www.googleapis.com/auth/gmail.send'});
    if(url==='https://openidconnect.googleapis.com/v1/userinfo')return Response.json({email:wrongSender?'wrong@test.local':'sender@test.local',email_verified:true});
    if(url==='https://gmail.googleapis.com/gmail/v1/users/me/messages/send'){sendCount++;if(failSend)throw new Error('network interrupted');return Response.json({id:'gmail-message-id'});}
    throw new Error('Unexpected outgoing endpoint');
  };
  let callback='/api/admin/gmail/callback?code=test&state='+auth.searchParams.get('state');assert.equal((await call(callback)).status,400,'Wrong sender must never connect');
  wrongSender=false;auth=await begin();callback='/api/admin/gmail/callback?code=test&state='+auth.searchParams.get('state');
  assert.equal((await call(callback)).status,200);assert.equal((await call(callback)).status,400,'OAuth state is one-use');
  assert.equal((await (await call('/api/admin/gmail/status')).json()).connected,true);
  assert.ok(!sql.query('SELECT token FROM admin_mail_connection').get().token.includes('test-refresh'),'Refresh token encrypted');
  await call('/api/admin/license',{email:'recipient@test.local',plan:'lifetime'});
  const body={email:'recipient@test.local',requestId:'11111111-1111-4111-8111-111111111111'};
  const sent=await (await call('/api/admin/send-access-link',body)).json();assert.equal(sent.ok,true);assert.equal(sendCount,1);
  const raw=JSON.parse(calls.find(c=>c.url.includes('/messages/send')).init.body).raw;const message=Buffer.from(raw,'base64url').toString('utf8');
  assert.ok(message.includes('From: Katchamak <sender@test.local>'));assert.ok(message.includes('To: recipient@test.local'));assert.ok(message.includes('https://test.local/#library'));assert.ok(!message.includes('test-access'));
  assert.equal((await (await call('/api/admin/send-access-link',body)).json()).ok,true);assert.equal(sendCount,1,'Double click cannot resend');
  failSend=true;const uncertain={...body,requestId:'22222222-2222-4222-8222-222222222222'};assert.equal((await call('/api/admin/send-access-link',uncertain)).status,502);assert.equal(sendCount,2);assert.equal((await call('/api/admin/send-access-link',uncertain)).status,409);assert.equal(sendCount,2,'Uncertain send cannot be replayed');
  await call('/api/admin/status',{email:body.email,status:'suspended'});assert.equal((await call('/api/admin/send-access-link',{...body,requestId:crypto.randomUUID()})).status,400);
}finally{globalThis.fetch=original;sql.close();}
console.log('Gmail access: sender verification, OAuth replay/CSRF gates, encrypted token, send and duplicate protection passed');
