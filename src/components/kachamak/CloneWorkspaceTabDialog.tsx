'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cloneableWorkspaceTabs } from '@/lib/kachamak/clone-workspace-tab';
import { saveWorkspaceClone, useWebLibrary } from '@/lib/kachamak/cloud-library';
import { useKachamak } from '@/lib/kachamak/store';
import type { TabKey } from '@/lib/kachamak/types';

export function CloneWorkspaceTabDialog({sourceId, tab, onClose}: {
  sourceId: string;
  tab: { key: TabKey; label: string; color?: string };
  onClose: () => void;
}) {
  const novels = useKachamak(s => s.novels);
  const [projectId, setProjectId] = useState('');
  const [tabKey, setTabKey] = useState<TabKey | ''>('');
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const projects = novels.filter(novel => novel.id !== sourceId && !novel.archived);
  const destination = projects.find(project => project.id === projectId);
  const tabs = destination ? cloneableWorkspaceTabs(destination) : [];
  const selected = tabs.find(item => item.key === tabKey);
  const field = 'w-full rounded border border-white/15 bg-background px-3 py-2 text-sm disabled:opacity-50';

  function submit() {
    if (submitted.current || !selected) return;
    const state = useKachamak.getState();
    const source = state.novels.find(novel => novel.id === sourceId);
    const target = state.novels.find(novel => novel.id === projectId);
    if (!source || !target || state.activeNovelId !== sourceId || !useWebLibrary.getState().ready) {
      setError('Your library changed. Reopen this dialog and choose a destination again.');
      return;
    }
    try {
      const { count, saving } = saveWorkspaceClone(source, tab.key, target, selected.key);
      submitted.current = true;
      onClose();
      const location = `${target.title} → ${selected.label} → Sort This`;
      void saving.then(
        () => toast.success(count === null ? `Saved the previous clone to ${location}.` : `Copied ${count} ${count === 1 ? 'note' : 'notes'} to ${location}.`),
        () => toast.error(count === null ? 'Could not confirm this clone. Check Retry save or My Account → Storage.' : 'The copies are pending in this window. Use Retry save to keep them.'),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The tab could not be copied.');
    }
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Clone to project</DialogTitle>
        <DialogDescription>Copy notes from <span style={{color:tab.color || undefined}}>{tab.label}</span> into Sort This in the destination tab.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); submit(); }}>
        <label className="block space-y-1 text-sm">
          <span>Destination project</span>
          <select className={field} value={projectId} onChange={event => { setProjectId(event.target.value); setTabKey(''); setError(''); }}>
            <option value="">Choose a project</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.title}{project.seriesIndex ? ` · ${project.seriesIndex}` : ''}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Destination tab</span>
          <select className={field} value={tabKey} disabled={!destination} onChange={event => { setTabKey(event.target.value as TabKey); setError(''); }}>
            <option value="">Choose a tab</option>
            {tabs.map(item => <option key={item.key} style={{color:item.color || undefined}} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        {!projects.length && <p className="text-sm text-muted-foreground">Create another project to copy this tab.</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <DialogFooter>
          <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!selected} className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-black disabled:opacity-40">Clone tab</button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
