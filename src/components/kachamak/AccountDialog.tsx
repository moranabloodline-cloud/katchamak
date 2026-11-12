"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppearancePreferences, saveAppearance, type Appearance } from "@/lib/kachamak/appearance-preferences";
import { checkDesktopRelease } from "@/lib/kachamak/desktop-releases";
import { UserRound } from "lucide-react";
import { useAccountPreferences, saveLocalProfile } from "@/lib/kachamak/account-preferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import packageInfo from "../../../package.json";
import { flushProjectFiles, isDesktop } from "@/lib/kachamak/project-files";
import { saveProjectsLocally, useKachamak } from "@/lib/kachamak/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type AccountTab = "profile" | "appearance" | "storage" | "about";
const displayPath = (path: string) => path.startsWith("\\\\?\\UNC\\") ? "\\\\" + path.slice(8) : path.startsWith("\\\\?\\") ? path.slice(4) : path;
const pill = "rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-40";
export function AccountDialog({
  open,
  onOpenChange,
  initialTab = "profile",
}: {
  initialTab?: AccountTab;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const setDefaultAuthor = useKachamak((s) => s.setDefaultAuthor);
  const profile = useAccountPreferences();
  const appearance = useAppearancePreferences();
  const [theme, setTheme] = useState<Appearance["theme"]>(appearance.theme);
  const [interfaceSize, setInterfaceSize] = useState<Appearance["interfaceSize"]>(appearance.interfaceSize);
  const [location, setLocation] = useState("");
  const [backups, setBackups] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [aboutDetail, setAboutDetail] = useState<"news" | "license" | null>(null);
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [draft, setDraft] = useState(defaultAuthor);
  const [name, setName] = useState(profile.displayName);
  const [photo, setPhoto] = useState(profile.photo);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoRequest = useRef(0);

  useEffect(() => {
    if (open) {
      const current = useAccountPreferences.getState();
      setDraft(useKachamak.getState().defaultAuthor);
      setName(current.displayName); setPhoto(current.photo); setReading(false);
      setTab(initialTab);
      const appearance = useAppearancePreferences.getState();
      setTheme(appearance.theme); setInterfaceSize(appearance.interfaceSize);
      setUpdateMessage(""); setAboutDetail(null);
    }
    return () => { photoRequest.current++; };
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !isDesktop()) return;
    let active = true;
    setStorageReady(false); setStorageError("");
    invoke<{ default_project_location: string; automatic_backups: boolean }>("get_storage_settings")
      .then(value => { if (active) { setLocation(displayPath(value.default_project_location)); setBackups(value.automatic_backups); setStorageReady(true); } })
      .catch(error => { if (active) setStorageError(String(error)); });
    return () => { active = false; };
  }, [open]);

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 1024 * 1024) {
      toast.error("Choose a PNG, JPG, WebP or GIF image up to 1 MB."); return;
    }
    const request = ++photoRequest.current;
    setReading(true);
    const reader = new FileReader();
    reader.onerror = () => { if (request === photoRequest.current) { setReading(false); toast.error("Could not read that image."); } };
    reader.onload = () => {
      const image = new Image();
      image.onload = () => { if (request === photoRequest.current) { setPhoto(String(reader.result)); setReading(false); } };
      image.onerror = () => { if (request === photoRequest.current) { setReading(false); toast.error("That file is not a valid image."); } };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    try {
      saveLocalProfile({ displayName: name.trim(), photo });
      setDefaultAuthor(draft.trim());
      if (!saveProjectsLocally()) throw new Error("Could not persist author settings.");
      toast.success("Account settings saved locally.");
      onOpenChange(false);
    } catch { toast.error("Could not save settings. Check available local storage and try again."); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onEscapeKeyDown={event => { if (browsing) event.preventDefault(); }} className="max-h-[calc(100dvh-32px)] overflow-y-auto rounded-xl border-white/15 bg-[#080808] p-5 text-[#ddd] sm:max-w-3xl [font-family:Arial,sans-serif]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">Account Settings</DialogTitle>
          <DialogDescription className="sr-only">Manage your local profile, library appearance and project backups.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={value => setTab(value as AccountTab)} className="gap-5">
          <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {([["profile", "Profile"], ["appearance", "Appearance"], ["storage", "Storage & Backup"], ["about", "About"]] as const).map(([value, label]) =>
              <TabsTrigger key={value} value={value} className="flex-none rounded-full border-white/20 px-3 py-1 text-xs text-[#bbb] data-[state=active]:bg-[#eee] data-[state=active]:text-[#171717] dark:data-[state=active]:bg-[#eee] dark:data-[state=active]:text-[#171717]">{label}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="profile" className="space-y-5 border-t border-white/[0.07] pt-6">
            <div className="flex items-center gap-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {photo ? <img src={photo} alt="Profile preview" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}
              </span>
              <div><h3 className="text-sm font-semibold">Profile picture</h3><p className="mb-1.5 mt-2 text-xs text-[#aaa]">Choose an image from your computer</p>
                <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Choose profile picture" className="sr-only" onChange={choosePhoto} />
                <div className="flex items-center gap-2"><button type="button" className={pill} disabled={reading} onClick={() => photoInput.current?.click()}>{reading ? "Reading image…" : "Change photo"}</button>
                  <button type="button" className="px-3 py-1.5 text-xs font-semibold hover:text-white disabled:opacity-40" disabled={!photo && !reading} onClick={() => { photoRequest.current++; setReading(false); setPhoto(null); }}>Remove</button></div>
              </div>
            </div>
            <div className="space-y-3"><Label htmlFor="account-display-name" className="text-xs">Display name</Label><Input id="account-display-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="Your name" className="h-10 rounded-full border-white/20 bg-transparent px-4" /></div>
            <div className="space-y-3"><Label htmlFor="account-pen-name" className="text-xs">Author name / Pen name</Label><Input id="account-pen-name" value={draft} maxLength={120} onChange={e => setDraft(e.target.value)} placeholder="Name shown on published work" className="h-10 rounded-full border-white/20 bg-transparent px-4" /></div>
            <DialogFooter><button type="button" disabled={reading} onClick={save} className="rounded-full bg-[#eee] px-4 py-2 text-xs font-semibold text-[#222] hover:bg-white disabled:opacity-40">Save</button></DialogFooter>
          </TabsContent>
          <TabsContent value="appearance" className="space-y-5 border-t border-white/[0.07] pt-6">
            <div className="space-y-4"><Label className="text-xs">Theme</Label><div className="flex gap-2">{(["dark", "light"] as const).map(value => <button type="button" key={value} aria-pressed={theme === value} onClick={() => setTheme(value)} className={`${pill} border-transparent ${theme === value ? "bg-white/10" : ""}`}>{value === "dark" ? "Dark" : "Light"}</button>)}</div></div>
            <div className="space-y-4"><Label className="text-xs">Interface size</Label><div className="flex gap-2">{(["small", "normal", "large"] as const).map(value => <button type="button" key={value} aria-pressed={interfaceSize === value} onClick={() => setInterfaceSize(value)} className={`${pill} border-transparent capitalize ${interfaceSize === value ? "bg-white/10" : ""}`}>{value}</button>)}</div></div>
            <DialogFooter><button type="button" onClick={() => { try { saveAppearance({ theme, interfaceSize }); toast.success("Appearance saved locally."); } catch { toast.error("Could not save appearance settings."); } }} className="rounded-full bg-[#eee] px-4 py-2 text-xs font-semibold text-[#222] hover:bg-white">Save</button></DialogFooter>
          </TabsContent>
          <TabsContent value="storage" className="space-y-5 border-t border-white/[0.07] pt-6">
            {isDesktop() && <>
              <div className="space-y-3"><Label htmlFor="account-default-location" className="text-xs">Default project location</Label><div className="flex items-center gap-2"><Input id="account-default-location" value={location} onChange={e => setLocation(e.target.value)} disabled={!storageReady || saving} placeholder="Documents/Katchamak" className="h-10 rounded-full border-white/20 bg-transparent px-4" /><button type="button" className={pill} disabled={!storageReady || browsing || saving} onClick={async () => { setBrowsing(true); try { const path = await invoke<string | null>("browse_project_location"); if (path) setLocation(displayPath(path)); } catch (error) { toast.error(String(error)); } finally { setBrowsing(false); } }}>{browsing ? "Browsing…" : "Browse"}</button></div></div>
              <div className="space-y-4"><h3 className="text-xs font-semibold">Backups</h3><label className="flex items-center justify-between gap-4 text-xs" htmlFor="account-auto-backups">Automatic local backups<input id="account-auto-backups" type="checkbox" checked={backups} onChange={e => setBackups(e.target.checked)} disabled={!storageReady || saving} className="h-4 w-4 accent-[#eee]" /></label><button type="button" className={`${pill} w-full`} onClick={() => { void invoke("open_backups_folder").catch(error => toast.error(String(error))); }}>Open backups folder</button></div>
              {storageError && <p role="alert" className="text-xs text-red-400">{storageError}</p>}
              <DialogFooter><button type="button" disabled={!storageReady || saving || !location.trim()} className="rounded-full bg-[#eee] px-4 py-2 text-xs font-semibold text-[#222] hover:bg-white disabled:opacity-40" onClick={async () => { setSaving(true); try { await flushProjectFiles(); const settings = await invoke<{ default_project_location: string }>("set_storage_settings", { settings: { default_project_location: location.trim(), automatic_backups: backups } }); setLocation(displayPath(settings.default_project_location)); toast.success("Storage settings saved locally."); } catch (error) { toast.error(String(error)); } finally { setSaving(false); } }}>{saving ? "Saving…" : "Save"}</button></DialogFooter>
              <p className="text-xs leading-relaxed text-[#aaa]">New project dialogs start in this location. Automatic backups keep up to 20 local versions per project, separate from the application and GitHub.</p>
            </>}
            {!isDesktop() && <p className="text-xs leading-relaxed text-[#aaa]">Folder selection and automatic file backups are available in the Windows desktop app. In the browser, use the project menu to export JSON backups to your computer.</p>}
          </TabsContent>
          <TabsContent value="about" className="space-y-5 border-t border-white/[0.07] pt-6 text-sm">
            <div><h3 className="text-lg font-semibold">KATCHAMAK</h3><p className="mt-2 text-xs">Version {packageInfo.version}</p></div>
            <button type="button" disabled={checking} className={`${pill} w-full`} onClick={async () => { setChecking(true); setUpdateMessage("Checking for updates…"); try { setUpdateMessage(await checkDesktopRelease(packageInfo.version)); } catch { setUpdateMessage("Could not check for updates. Check your connection and try again. Your local work is available offline."); } finally { setChecking(false); } }}>{checking ? "Checking…" : "Check for updates"}</button>
            {updateMessage && <p role="status" className="text-xs leading-relaxed text-[#aaa]">{updateMessage}</p>}
            <button type="button" aria-expanded={aboutDetail === "news"} className={`${pill} w-full`} onClick={() => setAboutDetail(aboutDetail === "news" ? null : "news")}>What's New</button>
            {aboutDetail === "news" && <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs leading-relaxed"><h4 className="font-semibold">Version {packageInfo.version}</h4><p>Local profile picture, display name and pen name. Dark and Light appearance with three interface sizes.</p><p>Default project location, automatic local backups and a searchable offline Help Center. User project files stay separate from the application.</p></div>}
            <div className="border-t border-white/[0.07] pt-5"><button type="button" aria-expanded={aboutDetail === "license"} className="text-xs hover:underline" onClick={() => setAboutDetail(aboutDetail === "license" ? null : "license")}>License information</button></div>
            {aboutDetail === "license" && <p className="text-xs leading-relaxed text-[#aaa]">Katchamak is a private application. This copy does not grant a public source-code license. Third-party components remain subject to their own licenses, available with their packages in the application source repository.</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
