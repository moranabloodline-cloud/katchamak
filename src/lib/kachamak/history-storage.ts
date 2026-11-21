// Local to the browser profile. Each checkpoint belongs to one account, book and content revision.
import type {SavedHistory} from './workspace-history';

type StoredHistory = {owner:string;bookId:string;digest:string;writtenAt:number;history:unknown;texts:string[]};

// Array edits can reference the same Gallery image in dozens of steps. Keep one copy per checkpoint.
function mapHistory(value:unknown,leaf:(value:unknown)=>unknown):unknown{
  if(Array.isArray(value))return value.map(item=>mapHistory(item,leaf));
  if(value!==null&&typeof value==='object'&&!(value instanceof Uint32Array)){
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,mapHistory(item,leaf)]));
  }
  return leaf(value);
}
function pack(history:SavedHistory){
  const texts:string[]=[],indices=new Map<string,number>();
  const content=mapHistory(history,value=>{
    if(typeof value!=='string'||value.length<4096)return value;
    let index=indices.get(value);
    if(index===undefined){index=texts.length;texts.push(value);indices.set(value,index);}
    // Project values are JSON. This IndexedDB-only type is unambiguous even for imported data.
    return Uint32Array.of(index);
  });
  return {history:content,texts};
}
function unpack(record:StoredHistory):SavedHistory{
  return mapHistory(record.history,value=>{
    if(!(value instanceof Uint32Array))return value;
    const text=record.texts[value[0]];
    if(value.length!==1||typeof text!=='string')throw new Error('Invalid stored history text.');
    return text;
  }) as SavedHistory;
}
let opening:Promise<IDBDatabase>|undefined;
function database(){
  if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{
    let expired=false;
    const timeout=setTimeout(()=>{
      expired=true;
      reject(new Error('Undo history storage did not open in time.'));
    },3000);
    const request=indexedDB.open('kachamak-book-history',1);
    request.onupgradeneeded=()=>{
      const books=request.result.createObjectStore('books',{keyPath:['owner','bookId','digest']});
      books.createIndex('byBook',['owner','bookId','writtenAt']);
    };
    request.onsuccess=()=>{
      clearTimeout(timeout);
      const db=request.result;
      if(expired){db.close();return;}
      db.onversionchange=()=>{db.close();opening=undefined;};
      resolve(db);
    };
    request.onerror=()=>{clearTimeout(timeout);reject(request.error);};
  }).catch(error=>{opening=undefined;throw error;});
  return opening;
}
// Wait for transaction completion, including deletes, before reporting a completed checkpoint.
async function transaction<T>(mode:IDBTransactionMode,use:(store:IDBObjectStore,done:(value:T)=>void)=>void){
  const db=await database();
  return new Promise<T>((resolve,reject)=>{
    const tx=db.transaction('books',mode);
    let result:T;
    const timeout=setTimeout(()=>tx.abort(),5000);
    tx.oncomplete=()=>{clearTimeout(timeout);resolve(result);};
    tx.onabort=()=>{clearTimeout(timeout);reject(tx.error??new Error('Undo history transaction was interrupted.'));};
    try{use(tx.objectStore('books'),value=>{result=value;});}
    catch(error){clearTimeout(timeout);tx.abort();reject(error);}
  });
}
export async function historyDigest(content:string){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function readBookHistory(owner:string,bookId:string,digest:string):Promise<SavedHistory|undefined>{
  const record=await transaction<StoredHistory|undefined>('readonly',(store,done)=>{
    const read=store.get([owner,bookId,digest]);
    read.onsuccess=()=>done(read.result);
  });
  return record?unpack(record):undefined;
}
export async function writeBookHistory(owner:string,bookId:string,checkpoint?:{digest:string;history:SavedHistory}){
  return transaction<void>('readwrite',store=>{
    const range=IDBKeyRange.bound([owner,bookId,0],[owner,bookId,Number.MAX_SAFE_INTEGER]);
    if(checkpoint){
      const record:StoredHistory={owner,bookId,digest:checkpoint.digest,writtenAt:Date.now(),...pack(checkpoint.history)};
      store.put(record);
    }
    const cursor=store.index('byBook').openKeyCursor(range);
    const versions:{key:IDBValidKey;time:number}[]=[];
    cursor.onsuccess=()=>{
      const row=cursor.result;
      if(row){
        if(!checkpoint)store.delete(row.primaryKey);
        else if((row.primaryKey as string[])[2]!==checkpoint.digest)versions.push({key:row.primaryKey,time:(row.key as [string,string,number])[2]});
        row.continue();
      }else{
        // Also retain the previous saved content in case another window or an interrupted save is ahead.
        versions.sort((a,b)=>b.time-a.time).slice(1).forEach(old=>store.delete(old.key));
      }
    };
  });
}
