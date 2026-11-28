import assert from 'node:assert/strict';
import {Database} from 'bun:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {accountApi} from '../scripts/accounts-runtime.mjs';

const sql=new Database(':memory:');
for(const file of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort()){
  for(const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(statement.trim())sql.exec(statement);
}
const DB={prepare(query){return {bind(...values){return {
  async first(){return sql.query(query).get(...values);},
  async run(){return {meta:{changes:sql.query(query).run(...values).changes}};},
};}};}};
const founderPrice='pri_'+'a'.repeat(26), standardPrice='pri_'+'b'.repeat(26);
const env={DB,KATCHAMAK_ADMIN_EMAIL:'owner@test.local',PADDLE_BILLING_ENABLED:'1',PADDLE_API_KEY:'test-only',PADDLE_CLIENT_TOKEN:'live_fixture',PADDLE_FOUNDER_PRICE_ID:founderPrice,PADDLE_STANDARD_PRICE_ID:standardPrice};
const call=(email,path='/api/account/billing',body)=>{
  const headers={'oai-authenticated-user-id':email,'oai-authenticated-user-email':email};
  if(body)Object.assign(headers,{Origin:'https://test.local','Content-Type':'application/json'});
  return accountApi(new Request('https://test.local'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env);
};
const action=(email,action,edition)=>call(email,undefined,{action,edition});
const profile=async email=>(await (await call(email,'/api/account?include=membership')).json()).membership;
const transactions=new Map();
const lifetimeProduct='pro_'+'s'.repeat(26);
let nextId=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer test-only');
  const path=new URL(url).pathname;
  const price=id=>({id,status:'active',billing_cycle:null,unit_price:{currency_code:'EUR',amount:id===founderPrice?'1499':'2499'}});
  if(path.startsWith('/prices/'))return Response.json({data:price(path.split('/').at(-1))});
  if(path==='/transactions'){
    const body=JSON.parse(options.body),id='txn_'+String(++nextId).padStart(26,'0');
    const item=body.items[0];
    const customPrice=item.price;
    const total=customPrice?{subtotal:'2000',tax:'400',discount:'0',grand_total:'2400',currency_code:'EUR'}:
      {grand_total:'1689',currency_code:'EUR'};
    const tx={...body,id,status:'draft',items:[{price:customPrice?{...customPrice,id:'pri_'+'s'.repeat(26),type:'custom'}:price(item.price_id),quantity:1}],
      details:{totals:total},payments:[]};
    transactions.set(id,tx);return Response.json({data:tx});
  }
  const id=path.split('/')[2],tx=transactions.get(id);
  assert.ok(tx,'Requests address persistent server-created transactions');
  if(path.endsWith('/invoice'))return Response.json({data:{url:'https://invoice.test.local/'+id+'.pdf'}});
  if(options.method==='PATCH'){
    assert.equal(JSON.parse(options.body).status,'canceled');
    if(tx.status!=='draft')return new Response(null,{status:409});
    tx.status='canceled';
  }
  return Response.json({data:tx});
};
const seed=sql.query("INSERT INTO accounts (id,email,created_at,last_seen) VALUES (?,?,1,1)");
const licenseInsert=sql.query("INSERT INTO licenses (email,plan,expires_at,updated_at,updated_by) VALUES (?,'lifetime',NULL,1,'owner@test.local')");
const paid=sql.query("INSERT INTO membership_purchases (account_id,payment_ref,edition,founder_number,status,purchased_at,amount_minor,currency) VALUES (?,?,'founder',?,'paid',1,1499,'EUR')");
const markPaid=id=>{const tx=transactions.get(id);tx.status='completed';tx.payments=[{status:'captured',captured_at:'2026-11-28T10:00:00Z'}];};

try{
  const manual='legacy@test.local',owner='owner@test.local',buyer='buyer@test.local',other='second@test.local';
  licenseInsert.run(manual);
  const before=sql.query('SELECT * FROM licenses').all();
  assert.equal((await (await call(manual)).json()).state,'ineligible');
  assert.equal((await (await action(owner,'start','founder')).json()).state,'ineligible');
  assert.equal((await call(manual,'/api/account/billing?action=invoice')).status,404);
  for(let i=1;i<500;i++){seed.run('fixture-'+i,`fixture-${i}@test.local`);paid.run('fixture-'+i,'fixture-ref-'+i,i);}
  await call(buyer,'/api/account');
  await call(other,'/api/account');
  const requests=await Promise.all([action(buyer,'start','founder'),action(other,'start','founder')]);
  const states=await Promise.all(requests.map(r=>r.json()));
  assert.deepEqual(states.map(s=>s.state).sort(),['pending','reserved']);
  const buyerWon=states[0].state==='pending', winner=buyerWon?buyer:other, next=buyerWon?other:buyer;
  const tx=states.find(s=>s.transactionId).transactionId;
  assert.equal((await profile(winner)).status,'none');
  assert.equal((await (await action(winner,'verify')).json()).state,'pending');
  assert.equal((await (await action(next,'start','standard')).json()).state,'reserved');
  transactions.get(tx).status='paid';
  assert.equal((await (await action(winner,'verify')).json()).state,'settling');
  markPaid(tx);
  transactions.get(tx).custom_data.draftopus_checkout='unrelated';
  await assert.rejects(action(winner,'verify'),/does not match/);
  transactions.get(tx).custom_data.draftopus_checkout=sql.query('SELECT id FROM paddle_checkouts WHERE transaction_id=?').get(tx).id;
  await Promise.all([action(winner,'verify'),action(winner,'verify')]);
  const membership=await profile(winner);
  assert.equal(membership.status,'active');
  assert.equal(membership.founderNumber,500);
  assert.equal(membership.purchase.amountMinor,1689);
  assert.equal((await call(next,'/api/account/billing?action=invoice')).status,404);
  const receipt=await call(winner,'/api/account/billing?action=invoice');
  assert.equal(receipt.status,303);
  assert.equal(receipt.headers.get('Location'),'https://invoice.test.local/'+tx+'.pdf');
  assert.equal((await (await action(next,'start','founder')).json()).edition,'standard');
  const standard=await (await action(next,'start','standard')).json();
  markPaid(standard.transactionId);
  assert.equal((await (await action(next,'verify')).json()).state,'complete');
  assert.equal((await profile(next)).founderNumber,null);
  assert.equal((await profile(next)).edition,'standard');
  const abandoned=await (await action('abandoned@test.local','start','standard')).json();
  assert.equal((await (await action('abandoned@test.local','cancel')).json()).state,'canceled');
  assert.ok(!sql.query('SELECT 1 FROM membership_purchases WHERE payment_ref=?').get('paddle:'+abandoned.transactionId));
  env.PADDLE_LIFETIME_PRODUCT_ID=lifetimeProduct;
  const lifetimeBuyer='lifetime@test.local';
  assert.deepEqual(await (await call(lifetimeBuyer)).json(),{state:'offer',edition:'lifetime',amountMinor:2000});
  assert.equal((await action(lifetimeBuyer,'start','founder')).status,400);
  const lifetimeCheckout=await (await action(lifetimeBuyer,'start','lifetime')).json();
  assert.equal(lifetimeCheckout.edition,'lifetime');
  assert.equal(lifetimeCheckout.state,'pending');
  const lifetimeTransaction=transactions.get(lifetimeCheckout.transactionId);
  assert.equal(lifetimeTransaction.items[0].price.product_id,lifetimeProduct);
  assert.equal(lifetimeTransaction.items[0].price.type,'custom');
  assert.equal(lifetimeTransaction.items[0].price.tax_mode,'external');
  assert.equal(lifetimeTransaction.items[0].price.billing_cycle,null);
  assert.deepEqual(lifetimeTransaction.items[0].price.unit_price,{amount:'2000',currency_code:'EUR'});
  assert.deepEqual(lifetimeTransaction.items[0].price.quantity,{minimum:1,maximum:1});
  assert.equal((await profile(lifetimeBuyer)).status,'none');
  markPaid(lifetimeCheckout.transactionId);
  await Promise.all([action(lifetimeBuyer,'verify'),action(lifetimeBuyer,'verify')]);
  const lifetimeMembership=await profile(lifetimeBuyer);
  assert.equal(lifetimeMembership.status,'active');
  assert.equal(lifetimeMembership.founderNumber,null);
  assert.equal(lifetimeMembership.purchase.amountMinor,2400);
  assert.equal(sql.query('SELECT COUNT(*) AS count FROM membership_purchases WHERE account_id=?').get(lifetimeBuyer).count,1);
  assert.equal((await profile(winner)).founderNumber,500);
  env.PADDLE_LIFETIME_PRODUCT_ID='invalid';
  assert.equal((await (await call('after-launch@test.local')).json()).state,'unavailable');
  assert.deepEqual(sql.query('SELECT * FROM licenses').all(),before);
  env.PADDLE_BILLING_ENABLED='0';
  assert.equal((await (await call(winner)).json()).state,'unavailable');
  assert.equal((await profile(winner)).status,'active');
  assert.equal((await call(winner,'/api/account/billing?action=invoice')).status,303,'Turning off checkout preserves invoice access');
  assert.equal((await profile(manual)).edition,'manual');
} finally {globalThis.fetch=originalFetch;}
console.log('Paddle billing passed: €20 plus tax, prior Founder/Standard checkout, confirmed payments, receipt ownership, cancellation, and existing grants.');
