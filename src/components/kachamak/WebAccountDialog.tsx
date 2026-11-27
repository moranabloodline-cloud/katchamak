'use client';
import {GalleryImagePicker} from './GalleryImagePicker';
import {galleryAvatar} from '@/lib/kachamak/project-settings';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {AdminDemoProject} from './AdminDemoProject';
import {AdminLicenseList} from './AdminLicenseList';
import { Input } from '@/components/ui/input';
import { CloudStorageControls } from './WebLibraryStorage';
import { LocalRecovery } from './LocalRecovery';
import { useKachamak } from '@/lib/kachamak/store';
import { toast } from 'sonner';
import { useAppearancePreferences } from '@/lib/kachamak/appearance-preferences';
import packageInfo from '../../../package.json';
import { requestJson } from '@/lib/kachamak/request-json';
import {cn} from '@/lib/utils';
import {useAccountPreferences} from '@/lib/kachamak/account-preferences';
import {saveWebLibrary} from '@/lib/kachamak/cloud-library';
import {AdminMailConnection} from './AdminMailConnection';
import {ProjectSettings} from './ProjectSettings';
import {SettingsNavigation, type SettingsPage} from './SettingsNavigation';
type Account = { id: string; email: string; role: 'admin'|'member'; displayName: string; avatar: string; preferences: Record<string,boolean>; license: { plan: string; active: boolean; expires_at?: number } };
type User = { id: string|null; email: string; display_name: string; role: string; status: string; plan: string|null; expires_at: number|null; source?: string };
async function api(path: string, method = 'GET', body?: unknown) {
  const {response:r,data} = await requestJson(path, { method, headers: body ? { 'Content-Type':'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(data.error || 'Request failed'); return data;
}
const button = 'rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted disabled:opacity-50';
const primary = 'rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-300 disabled:opacity-50';
const surface = 'space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5';
const selectClass = 'h-10 rounded-md border border-border bg-background px-3 text-sm';
const appearanceKeys = ['lightTheme','smallInterface','largeInterface'] as const;
const notificationKeys = ['tips','updates','changelog'] as const;
export function WebAccountDialog({open,onOpenChange,trigger}:{open:boolean;onOpenChange:(v:boolean)=>void;trigger:ReactElement}) {
  const [tab,setTab]=useState<SettingsPage>('profile'), [account,setAccount]=useState<Account|null>(null), [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [projectBusy,setProjectBusy]=useState(false);
  const main=useRef<HTMLElement>(null);
  const [name,setName]=useState(''),[avatar,setAvatar]=useState(''),[prefs,setPrefs]=useState<Record<string,boolean>>({});
  const [users,setUsers]=useState<User[]>([]),[search,setSearch]=useState(''),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false);
  const [email,setEmail]=useState(''),[plan,setPlan]=useState('lifetime'),[expiry,setExpiry]=useState(''),[events,setEvents]=useState<{id:string;action:string;target:string;created_at:number;detail:string}[]>([]);
  const [licenseFeedback,setLicenseFeedback]=useState<{ok:boolean;message:string}|null>(null);
  const [licenseRevision,setLicenseRevision]=useState(0);
  const [accountAttempt,setAccountAttempt]=useState(0);
  const licenseForm=useRef<HTMLFormElement>(null);
  const books=useKachamak(s=>s.novels);
  const activeBook=useKachamak(s=>s.activeNovelId);
  const novel=books.find(book=>book.id===activeBook);
  const setAuthor=useKachamak(s=>s.setDefaultAuthor);
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  useEffect(()=>{
    if (!open) return;
    let current = true;
    setAccount(null); setError('');
    void api('/api/account').then((loaded: Account) => {
      if (!current) return;
      setAccount(loaded); setName(loaded.displayName); setAvatar(loaded.avatar); setPrefs(loaded.preferences);
    }).catch((error: unknown) => {
      if (current) setError(error instanceof Error ? error.message : 'Could not load your account.');
    });
    return () => { current = false; };
  },[open, accountAttempt]);
  const loadUsers=async(page=offset,query=search)=>{const d=await api('/api/admin/users?search='+encodeURIComponent(query)+'&offset='+page);setUsers(d.users);setHasMore(d.hasMore);setOffset(page);};
  useEffect(()=>{if(open&&tab==='admin'&&account?.role==='admin')void run(async()=>{await loadUsers(0);const d=await api('/api/admin/audit');setEvents(d.events);});},[open,tab,account?.role]);
  const saveSettings=(page:'profile'|'appearance'|'notifications')=>run(async()=>{
    if (!account) return;
    const displayName=page==='profile'?name.trim():account.displayName;
    const photo=page==='profile'?avatar:account.avatar;
    const preferences={...account.preferences};
    const keys=page==='appearance'?appearanceKeys:page==='notifications'?notificationKeys:[];
    for (const key of keys) preferences[key]=prefs[key]??false;
    await api('/api/account','PATCH',{displayName,avatar:photo,preferences});
    setAccount({...account,displayName,avatar:photo,preferences});
    if (page==='profile') {
      useAccountPreferences.setState({displayName,photo:photo||null});
      setAuthor(displayName);
    }
    if (page==='appearance') useAppearancePreferences.setState({
      theme:preferences.lightTheme?'light':'dark',
      interfaceSize:preferences.smallInterface?'small':preferences.largeInterface?'large':'normal',
    });
    toast.success('Settings saved.');
  });
  const locked=busy||projectBusy;
  const changePage=(page:SettingsPage)=>{
    if (locked || tab===page) return;
    setError('');
    setTab(page);
    if (main.current) main.current.scrollTop=0;
  };
  const projectSection=tab==='project'||tab==='backups'?tab:'hidden';
  return <Dialog open={open} onOpenChange={next=>{
    if (locked) return;
    if (next) setTab('profile');
    onOpenChange(next);
  }}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent placement="right" aria-describedby={undefined} className="flex max-w-[60rem] flex-col overflow-hidden border-border bg-background font-sans text-foreground sm:w-[min(94vw,60rem)] sm:rounded-l-2xl">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border px-5 pr-14 sm:px-7">
        <img src="/draftopus-logo.png" alt="" width={30} height={30} className="size-[30px] object-contain"/>
        <DialogTitle className="font-serif text-xl">Settings</DialogTitle>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_14rem] md:grid-rows-[minmax(0,1fr)]">
        <SettingsNavigation page={tab} onSelect={changePage} project={!!novel} admin={account?.role==='admin'} busy={locked}/>
        <main ref={main} aria-label="Settings content" className="@container row-start-2 min-w-0 overflow-y-auto p-5 md:col-start-1 md:row-start-1 md:p-7">
          <div className="mx-auto max-w-2xl space-y-5">
            {error&&<p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
            {!account && projectSection==='hidden' && (error
              ? <button className={button} onClick={()=>setAccountAttempt(attempt=>attempt+1)}>Retry</button>
              : <p role="status" className="text-sm text-muted-foreground">Loading account…</p>)}
            {projectSection!=='hidden'&&<h2 className="font-serif text-2xl">{tab==='project'?'Project settings':'Backups & export'}</h2>}
            {open && <ProjectSettings key={activeBook} open={open} onOpenChange={onOpenChange} section={projectSection} onBusyChange={setProjectBusy}/>}
            {account&&<>
              {tab==='profile'&&<section className="max-w-md space-y-3" aria-labelledby="personal-details-title">
                <h2 id="personal-details-title" className="text-base font-semibold">Personal details</h2>
                <form className="space-y-3 rounded-xl border border-border bg-card p-3.5 sm:p-4" onSubmit={event=>{event.preventDefault();void saveSettings('profile');}}>
                  <div className="flex flex-wrap items-center gap-3">
                    {avatar?<img src={avatar} alt="Your avatar" className="size-11 shrink-0 rounded-full object-cover"/>:
                      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-medium">{(name||account.email).slice(0,2).toUpperCase()}</span>}
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <GalleryImagePicker novel={novel} books={books} onPick={(_,item)=>void run(async()=>setAvatar(await galleryAvatar(item.image)))}>
                        <button type="button" disabled={locked} className={cn(button,'h-8 rounded-md px-2.5 py-0 text-xs')} aria-label="Choose avatar from Gallery">Choose avatar</button>
                      </GalleryImagePicker>
                      {avatar&&<button type="button" className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" disabled={locked} onClick={()=>setAvatar('')}>Remove</button>}
                    </div>
                  </div>
                  <label className="block text-xs font-medium">Display / author name<Input value={name} maxLength={100} disabled={locked} onChange={e=>setName(e.target.value)} className="mt-1 h-8 px-2.5"/></label>
                  <label className="block text-xs font-medium">Sign-in email<Input readOnly value={account.email} className="mt-1 h-8 px-2.5 text-muted-foreground"/></label>
                  <button disabled={locked} className={cn(primary,'h-8 rounded-md px-3 py-0 text-xs')}>Save profile</button>
                </form>
              </section>}
              {tab==='appearance'&&<>
                <h2 className="font-serif text-2xl">Appearance</h2>
                <form className={surface} onSubmit={event=>{event.preventDefault();void saveSettings('appearance');}}>
                  <label className="flex flex-wrap items-center justify-between gap-3 text-sm">Theme
                    <select disabled={locked} className={selectClass} value={prefs.lightTheme?'light':'dark'} onChange={e=>setPrefs({...prefs,lightTheme:e.target.value==='light'})}>
                      <option value="dark">Dark</option><option value="light">Light</option>
                    </select>
                  </label>
                  <label className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">Interface size
                    <select disabled={locked} className={selectClass} value={prefs.smallInterface?'small':prefs.largeInterface?'large':'normal'} onChange={e=>setPrefs({...prefs,smallInterface:e.target.value==='small',largeInterface:e.target.value==='large'})}>
                      <option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option>
                    </select>
                  </label>
                  <button disabled={locked} className={primary}>Save appearance</button>
                </form>
              </>}
              {tab==='about'&&<>
                <h2 className="font-serif text-2xl">About Draftopus</h2>
                <div className={surface}>
                  <p>Version {packageInfo.version}</p>
                  <p className="text-sm text-muted-foreground">Draftopus is a private application. Third-party components retain their respective licenses.</p>
                  <button className={button} disabled={locked} onClick={()=>void run(async()=>{
                    const latest=await api('/api/app-version');
                    toast.info(latest.sourceTree===process.env.NEXT_PUBLIC_APPLICATION_SOURCE_TREE?'You are using the current application.':'Reload the application to load the latest published version.');
                  })}>Check for updates</button>
                </div>
              </>}
              {tab==='membership'&&<>
                <h2 className="font-serif text-2xl">Membership</h2>
                <div className={surface}>
                  <h3 className="text-lg font-medium">{account.license.plan==='lifetime'?'Lifetime':account.license.plan==='timed'?'Time-limited access':'No license assigned'}</h3>
                  <p className="text-sm text-muted-foreground">{account.license.plan==='none'?'Contact the administrator to assign a license.':account.license.active?'Active':'Expired / inactive'}{account.license.expires_at?' · Until '+new Date(account.license.expires_at).toLocaleDateString():''}</p>
                </div>
              </>}
              {tab==='security'&&<>
                <h2 className="font-serif text-2xl">Sign-in &amp; security</h2>
                <div className={surface}>
                  <h3 className="font-medium">ChatGPT sign-in</h3>
                  <p className="break-words text-sm">{account.email}</p>
                  <p className="text-sm text-muted-foreground">Manage your password, passkeys and sign-in methods in your ChatGPT account settings.</p>
                  <button className={button} disabled={locked} onClick={()=>void run(async()=>{await saveWebLibrary();window.location.assign('/signout-with-chatgpt?return_to=%2F');})}>Sign out</button>
                </div>
              </>}
              {tab==='notifications'&&<>
                <h2 className="font-serif text-2xl">Notifications</h2>
                <form className={surface} onSubmit={event=>{event.preventDefault();void saveSettings('notifications');}}>
                  <p className="text-sm text-muted-foreground">Save your preferences for when email delivery becomes available.</p>
                  {[[notificationKeys[0],'Writing and product tips'],[notificationKeys[1],'Product updates'],[notificationKeys[2],'Release notes']].map(([key,label])=>
                    <label key={key} className="flex items-center justify-between gap-4 border-t border-border pt-3 text-sm">{label}<input type="checkbox" disabled={locked} checked={prefs[key]??false} onChange={e=>setPrefs({...prefs,[key]:e.target.checked})}/></label>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={locked} className={button} onClick={()=>setPrefs({...prefs,tips:false,updates:false,changelog:false})}>Unsubscribe from all</button>
                    <button className={primary} disabled={locked}>Save preferences</button>
                  </div>
                </form>
              </>}
              {tab==='storage'&&<>
                <h2 className="font-serif text-2xl">Cloud storage</h2>
                <div className={surface}><CloudStorageControls/></div>
                <div className={surface}><LocalRecovery accountId={account.id}/></div>
              </>}
              {tab==='integrations'&&<>
                <h2 className="font-serif text-2xl">Connected services</h2>
                <div className={surface}>
                  <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">ChatGPT</h3><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300">Connected</span></div>
                  <p className="break-words text-sm text-muted-foreground">Sign-in is linked to {account.email}.</p>
                </div>
                {account.role==='admin'&&<AdminMailConnection/>}
              </>}
  {tab==='admin'&&account.role==='admin'&&<>{process.env.NEXT_PUBLIC_KATCHAMAK_DESKTOP !== '1' && <AdminDemoProject onOpen={()=>onOpenChange(false)}/>}<h2 className="font-serif text-2xl">Users and licenses</h2><AdminLicenseList revision={licenseRevision} onEdit={license=>{setEmail(license.email);setPlan(license.plan);setExpiry(license.expires_at?new Date(license.expires_at-new Date(license.expires_at).getTimezoneOffset()*60000).toISOString().slice(0,10):'');setLicenseFeedback(null);licenseForm.current?.scrollIntoView({block:'start',behavior:'smooth'});}} onRevoked={()=>{void run(async()=>{await loadUsers();setEvents((await api('/api/admin/audit')).events);});}}/><h3 className="font-medium">Accounts and access</h3><form className="flex gap-2" onSubmit={e=>{e.preventDefault();void run(()=>loadUsers(0));}}><Input aria-label="Search users" placeholder="Search name or email" value={search} onChange={e=>setSearch(e.target.value)}/><button disabled={busy} className={button}>Search</button></form><div className="max-h-64 overflow-auto rounded border border-white/10">{users.map(u=><div key={u.id??u.email} className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3 text-xs"><div className="min-w-0 flex-1"><p className="break-all">{u.email}</p><p className="text-stone-400">{u.role} · {u.id?u.status:u.status==='suspended'?'Suspended before sign-in':'Awaiting first sign-in'}{u.source==='sites'?' · Sites invitation':''} · {u.plan||'No license'}{u.expires_at?' · '+new Date(u.expires_at).toLocaleDateString():''}</p></div>{u.role!=='admin'&&<><button className={button} onClick={()=>{setEmail(u.email);setPlan(u.plan==='timed'?'timed':'lifetime');}}>License</button><button disabled={busy} className={button} onClick={()=>{if(window.confirm((u.status==='suspended'?'Restore':'Suspend')+' access for '+u.email+'?'))void run(async()=>{await api('/api/admin/status','POST',{email:u.email,status:u.status==='suspended'?'active':'suspended'});await loadUsers();toast.success('Access updated.');});}}>{u.status==='suspended'?'Restore':'Suspend'}</button></>}</div>)}{!users.length&&<p className="p-3 text-sm text-stone-400">No users or assigned licenses match.</p>}</div><div className="flex justify-between"><button className={button} disabled={busy||offset===0} onClick={()=>void run(()=>loadUsers(Math.max(0,offset-50)))}>Previous</button><button className={button} disabled={busy||!hasMore} onClick={()=>void run(()=>loadUsers(offset+50))}>Next</button></div><form ref={licenseForm} className="space-y-3 rounded-xl border border-amber-400/20 p-4" onSubmit={e=>{e.preventDefault();void run(async()=>{setLicenseFeedback(null);try{const result=await api('/api/admin/license','POST',{email:email.trim(),plan,expiresAt:plan==='timed'?new Date(expiry+'T23:59:59').getTime():undefined});const saved=result.license;const message=saved.plan==='none'?'License revoked for '+saved.email+'.':(saved.plan==='lifetime'?'Lifetime license saved for ':'Time-limited license saved for ')+saved.email+'.'+(!result.registered?' Ready for their first sign-in.':'');setLicenseFeedback({ok:true,message});setEmail(saved.email);setSearch(saved.email);setLicenseRevision(r=>r+1);toast.success(message);try{await loadUsers(0,saved.email);setEvents((await api('/api/admin/audit')).events);}catch{setLicenseFeedback({ok:true,message:message+' The list could not refresh. Search this email to check it.'});}}catch(error){setLicenseFeedback({ok:false,message:error instanceof Error?error.message:'License could not be saved.'});throw error;}});}}><h3>Assign or revoke a license</h3><p className="text-xs text-stone-400">You can assign a license before the user signs in for the first time. Use their ChatGPT sign-in email.</p><Input aria-label="License email" type="email" required placeholder="User email" maxLength={254} value={email} onChange={e=>{setEmail(e.target.value);setLicenseFeedback(null);}}/><select aria-label="License type" className="rounded border border-white/20 bg-background p-2 text-sm" value={plan} onChange={e=>{setPlan(e.target.value);setLicenseFeedback(null);}}><option value="lifetime">Lifetime</option><option value="timed">Time-limited</option><option value="none">Revoke license</option></select>{plan==='timed'&&<Input aria-label="Expiry date" type="date" required value={expiry} onChange={e=>{setExpiry(e.target.value);setLicenseFeedback(null);}}/>}<button disabled={busy} className={button}>{busy?'Saving…':'Apply license'}</button>{licenseFeedback&&<p role={licenseFeedback.ok?'status':'alert'} className={'rounded border p-3 text-sm '+(licenseFeedback.ok?'border-emerald-500/30 bg-emerald-500/10 text-emerald-200':'border-red-500/30 bg-red-950 text-red-200')}>{licenseFeedback.message}</p>}</form><details className="text-xs text-stone-400"><summary>Recent admin activity</summary>{events.map(e=><p key={e.id} className="mt-2 break-all">{new Date(e.created_at).toLocaleString()} · {e.action} · {e.target} · {e.detail}</p>)}</details></>}
            </>}
          </div>
        </main>
      </div>
    </DialogContent>
  </Dialog>;
}

