import checkoutMigration from '../drizzle/0007_paddle_checkouts.sql' with { type: 'text' };

const founderPrice = 1499;
const standardPrice = 2499;
const transactionIdPattern = /^txn_[a-z0-9]{26}$/;
const priceIdPattern = /^pri_[a-z0-9]{26}$/;
const reservationAge = 30 * 60 * 1000;
const offerInventory = `SELECT
  (SELECT COUNT(*) FROM membership_purchases WHERE edition='founder') AS sold,
  (SELECT COUNT(*) FROM paddle_checkouts c WHERE edition='founder'
    AND NOT EXISTS (SELECT 1 FROM membership_purchases p WHERE p.account_id=c.account_id)) AS held`;

export function paddleConfig(env) {
  if (env.PADDLE_BILLING_ENABLED !== '1' || !env.PADDLE_API_KEY ||
      !env.PADDLE_CLIENT_TOKEN?.startsWith('live_') || !priceIdPattern.test(env.PADDLE_FOUNDER_PRICE_ID) ||
      !priceIdPattern.test(env.PADDLE_STANDARD_PRICE_ID) || env.PADDLE_FOUNDER_PRICE_ID===env.PADDLE_STANDARD_PRICE_ID) return null;
  return { key:env.PADDLE_API_KEY, token:env.PADDLE_CLIENT_TOKEN, founder:env.PADDLE_FOUNDER_PRICE_ID, standard:env.PADDLE_STANDARD_PRICE_ID };
}

async function paddle(config, path, method='GET', payload) {
  const response=await fetch('https://api.paddle.com'+path,{
    method, headers:{Authorization:'Bearer '+config.key, ...(payload?{'Content-Type':'application/json'}:{})},
    body:payload?JSON.stringify(payload):undefined, signal:AbortSignal.timeout(8000), redirect:'error',
  });
  if(!response.ok)throw new Error('Paddle is temporarily unavailable.');
  const result=await response.json();
  if(!result.data)throw new Error('Paddle returned incomplete information.');
  return result.data;
}

function checkoutState(row, config) {
  return row?.transaction_id
    ? {state:'pending',edition:row.edition,transactionId:row.transaction_id,clientToken:config.token}
    : {state:'preparing'};
}

async function confirmPaddleCheckout(q, row, transaction) {
  const line=transaction.items?.[0];
  if(transaction.id!==row.transaction_id || transaction.custom_data?.draftopus_checkout!==row.id ||
      transaction.collection_mode!=='automatic' || transaction.items?.length!==1 ||
      line?.price?.id!==row.price_id || line.quantity!==1 || line.price.billing_cycle!==null ||
      line.price.unit_price?.currency_code!=='EUR' || line.price.unit_price?.amount!==String(row.edition==='founder'?founderPrice:standardPrice)) {
    throw new Error('The Paddle transaction does not match the reserved Draftopus license.');
  }
  const captured=transaction.payments?.find(payment=>payment.status==='captured');
  const paidAt=Date.parse(captured?.captured_at??''), amount=Number(transaction.details?.totals?.grand_total);
  if(!Number.isSafeInteger(paidAt)||paidAt<=0||!Number.isSafeInteger(amount)||amount<=0||
      !/^[A-Z]{3}$/.test(transaction.currency_code)||transaction.details?.totals?.currency_code!==transaction.currency_code) {
    throw new Error('Paddle has not provided valid captured payment details.');
  }
  // The reservation and the Founder count are read within the same write.
  // A committed purchase takes over its reservation even if cleanup is retried.
  await q(`INSERT INTO membership_purchases
    (account_id,payment_ref,edition,founder_number,status,purchased_at,amount_minor,currency,license_id)
    SELECT c.account_id,?,c.edition,
      CASE WHEN c.edition='founder' THEN
        (SELECT COALESCE(MAX(founder_number),0)+1 FROM membership_purchases)
      END,'paid',?,?,?,?
    FROM paddle_checkouts c WHERE c.id=? AND c.transaction_id=?
      AND NOT EXISTS (SELECT 1 FROM membership_purchases p WHERE p.account_id=c.account_id)
    ON CONFLICT(account_id) DO NOTHING`, 'paddle:'+transaction.id,paidAt,amount,transaction.currency_code,crypto.randomUUID(),row.id,row.transaction_id).run();
  const purchase=await q('SELECT payment_ref FROM membership_purchases WHERE account_id=?',row.account_id).first();
  if(purchase?.payment_ref!=='paddle:'+transaction.id)throw new Error('The confirmed payment could not be recorded.');
  await q('DELETE FROM paddle_checkouts WHERE id=?',row.id).run();
  return 'complete';
}

async function reconcilePaddleCheckout(q, config, row, cancel=false) {
  if(!row.transaction_id)return 'preparing';
  const path='/transactions/'+row.transaction_id;
  let transaction=await paddle(config,path);
  if(cancel && ['draft','ready'].includes(transaction.status)) {
    try { transaction=await paddle(config,path,'PATCH',{status:'canceled'}); }
    catch { transaction=await paddle(config,path); }
  }
  if(transaction.status==='canceled') {
    await q('DELETE FROM paddle_checkouts WHERE id=?',row.id).run();
    return 'canceled';
  }
  if(transaction.status!=='completed')return transaction.status==='paid'?'settling':'pending';
  return confirmPaddleCheckout(q,row,transaction);
}

export async function paddleBilling({request,env,q,account,active,admin,now,readMembershipPurchase,json,body}) {
  const action=new URL(request.url).searchParams.get('action');
  if(request.method==='GET'&&action==='invoice') {
    if(!env.PADDLE_API_KEY)return json({error:'Paddle invoices are temporarily unavailable.'},503);
    const purchase=await readMembershipPurchase();
    const reference=purchase?.payment_ref?.slice(7);
    if(!purchase?.payment_ref?.startsWith('paddle:')||!transactionIdPattern.test(reference))return json({error:'No Paddle invoice is available.'},404);
    const invoice=await paddle({key:env.PADDLE_API_KEY},'/transactions/'+reference+'/invoice');
    const link=new URL(invoice.url);
    if(link.protocol!=='https:'||link.username||link.password)throw new Error('Invalid invoice link.');
    return new Response(null,{status:303,headers:{Location:link.href,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  }
  const config=paddleConfig(env);
  if(!config)return json({state:'unavailable'});
  const purchase=await readMembershipPurchase();
  if(admin||active||purchase)return json({state:purchase?'complete':'ineligible'});
  const readCheckout=()=>q('SELECT * FROM paddle_checkouts WHERE account_id=?',account).first();
  let row;
  try { row=await readCheckout(); }
  catch(error){
    if(!/no such table:\s*(?:main\.)?paddle_checkouts\b/i.test(String(error)))throw error;
    await q(checkoutMigration).run();
    row=await readCheckout();
  }
  if(request.method==='POST'&&['verify','cancel'].includes(body.action)) {
    if(!row)return json({state:'available'});
    const state=await reconcilePaddleCheckout(q,config,row,body.action==='cancel');
    return json(state==='pending'?checkoutState(row,config):{state});
  }
  if(row?.transaction_id)return json(checkoutState(row,config));
  if(row) {
    // A transaction cannot be opened before its ID is committed and returned.
    if(now-row.created_at<reservationAge||request.method!=='POST')return json({state:'preparing'});
    await q('DELETE FROM paddle_checkouts WHERE id=? AND transaction_id IS NULL',row.id).run();
  }
  if(request.method==='POST'&&body.action==='start'){
    if(!['founder','standard'].includes(body.edition))return json({error:'Choose the available edition.'},400);
    await q('DELETE FROM paddle_checkouts WHERE transaction_id IS NULL AND created_at<=?',now-reservationAge).run();
    // Check the provider before freeing an expired checkout that could have paid.
    const stale=await q("SELECT * FROM paddle_checkouts WHERE edition='founder' AND transaction_id IS NOT NULL AND created_at<=? ORDER BY created_at LIMIT 1",now-reservationAge).first();
    if(stale)await reconcilePaddleCheckout(q,config,stale,true);
    const id=crypto.randomUUID();
    const result=await q(`INSERT INTO paddle_checkouts (id,account_id,edition,price_id,created_at)
      SELECT ?,?,CASE WHEN sold>=500 THEN 'standard' ELSE 'founder' END,?,?
      FROM (${offerInventory}) WHERE
      ((?='standard' AND sold>=500) OR (?='founder' AND sold+held<500))
      AND NOT EXISTS (SELECT 1 FROM membership_purchases WHERE account_id=?)
      ON CONFLICT(account_id) DO NOTHING`,id,account,config[body.edition],now,body.edition,body.edition,account).run();
    row=await readCheckout();
    if(result.meta.changes===1&&row?.id===id){
      let transaction;
      try {
        const price=await paddle(config,'/prices/'+row.price_id);
        if(price.id!==row.price_id||price.status!=='active'||price.billing_cycle!==null||
           price.unit_price?.currency_code!=='EUR'||price.unit_price?.amount!==String(row.edition==='founder'?founderPrice:standardPrice)) {
          throw new Error('The Paddle price does not match this edition.');
        }
        transaction=await paddle(config,'/transactions','POST',{
          items:[{price_id:row.price_id,quantity:1}], collection_mode:'automatic', currency_code:'EUR',
          custom_data:{draftopus_checkout:id},
        });
        if(!transactionIdPattern.test(transaction.id))throw new Error('Paddle did not create a checkout.');
        const saved=await q('UPDATE paddle_checkouts SET transaction_id=? WHERE id=? AND transaction_id IS NULL',transaction.id,id).run();
        if(saved.meta.changes!==1)throw new Error('The checkout reservation is no longer active.');
      } catch(error){
        await q('DELETE FROM paddle_checkouts WHERE id=? AND transaction_id IS NULL',id).run();
        throw error;
      }
      return json(checkoutState({...row,transaction_id:transaction.id},config));
    }
    if(row)return json(checkoutState(row,config));
  } else if(request.method!=='GET')return json({error:'Invalid checkout action.'},400);
  const {sold,held}=await q(offerInventory).first();
  const edition=sold>=500?'standard':'founder';
  if(edition==='founder'&&sold+held>=500)return json({state:'reserved'});
  return json({state:'offer',edition,amountMinor:edition==='founder'?founderPrice:standardPrice});
}
