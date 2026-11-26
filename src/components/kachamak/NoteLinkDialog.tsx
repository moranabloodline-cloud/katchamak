'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {indexNotes,searchNotes,type IndexedNote} from '@/lib/kachamak/knowledge';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {createLinkedCodexNote} from '@/lib/kachamak/create-linked-note';
import {toast} from 'sonner';
import {isWebsiteLink,noteLinkColor,noteLinkTitle} from '@/lib/kachamak/note-links';

type LinkSource = {
  editor: HTMLElement;
  range: Range;
  start: Node;
  startOffset: number;
  end: Node;
  endOffset: number;
  html: string;
  projectId: string | null;
  noteId?: string;
};

function validSource(source: LinkSource | null): source is LinkSource {
  return !!source && source.editor.isConnected &&
    source.projectId === useKachamak.getState().activeNovelId &&
    source.range.startContainer === source.start && source.range.endContainer === source.end &&
    source.range.startOffset === source.startOffset && source.range.endOffset === source.endOffset &&
    source.editor.innerHTML === source.html;
}

function restoreSelection(source: LinkSource) {
  source.editor.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(source.range);
}

export function NoteLinkDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [parentId, setParentId] = useState('');
  const [source, setSource] = useState<LinkSource | null>(null);
  const pendingLink = useRef<(() => void) | null>(null);
  const inserted = useRef(false);
  const novel = useKachamak(s => open || source ? s.novels.find(n => n.id === s.activeNovelId) : undefined);
  const index = useMemo(() => novel ? indexNotes(novel) : [], [novel]);
  const sourceNoteId = source?.noteId;
  const results = useMemo(() => {
    const eligible = index.filter(n => n.node.id !== sourceNoteId);
    return query.trim() ? searchNotes(eligible, query).slice(0, 15) : eligible.slice(0, 15);
  }, [index, sourceNoteId, query]);

  useEffect(() => {
    const show = () => {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const common = range?.commonAncestorContainer;
      const element = common instanceof Element ? common : common?.parentElement;
      const editor = element?.closest<HTMLElement>('.kachamak-editor[contenteditable="true"]');
      const text = selection?.toString().trim().slice(0, 200) ?? '';
      inserted.current = false;
      setSource(editor && range ? {
        editor,
        range: range.cloneRange(),
        start: range.startContainer,
        startOffset: range.startOffset,
        end: range.endContainer,
        endOffset: range.endOffset,
        html: editor.innerHTML,
        projectId: useKachamak.getState().activeNovelId,
        noteId: editor.dataset.noteId ?? editor.closest<HTMLElement>('[data-link-source-id]')?.dataset.linkSourceId,
      } : null);
      setQuery(text);
      setNewTitle(text);
      setParentId('');
      setUrl('');
      setOpen(true);
    };
    document.addEventListener('katchamak-link', show);
    return () => document.removeEventListener('katchamak-link', show);
  }, []);

  const getActiveSource = () => {
    if (validSource(source)) return source;
    toast.error('The editor selection changed. Select the text and open Link again.');
    return null;
  };

  const insert = (active: LinkSource, href: string, target?: IndexedNote) => {
    const { editor, range } = active;
    restoreSelection(active);
    const link = document.createElement('a');
    link.setAttribute('href', href);
    if (range.collapsed) link.textContent = target?.node.title || href;
    else {
      link.append(range.cloneContents());
      link.querySelectorAll('a').forEach(anchor => anchor.replaceWith(...Array.from(anchor.childNodes)));
    }
    // Chromium trims ordinary boundary spaces in insertHTML. Keep the selected separation intact.
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    const first = walker.firstChild() as Text | null;
    if (first) {
      first.data = first.data.replace(/^[ \t]+/, space => space.replace(/ /g, '\u00a0'));
      let last = first;
      let textNode: Node | null;
      while ((textNode = walker.nextNode())) last = textNode as Text;
      last.data = last.data.replace(/[ \t]+$/, space => space.replace(/ /g, '\u00a0'));
    }
    if (target) {
      link.dataset.katchamakNote = target.node.id;
      link.title = noteLinkTitle(target.node.title, target.path);
    }
    if (!document.execCommand('insertHTML', false, link.outerHTML)) {
      toast.error('The link could not be inserted. Your text is unchanged.');
      return false;
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    inserted.current = true;
    return true;
  };

  useEffect(() => {
    if (open) return;
    const apply = pendingLink.current;
    pendingLink.current = null;
    // Restore the editor's selection only after the modal stops trapping focus.
    apply?.();
  }, [open]);

  const choose = (href: string, target?: IndexedNote) => {
    if (!target && !isWebsiteLink(href)) {
      toast.error('Use an https://, http:// or mailto: link.');
      return;
    }
    pendingLink.current = () => {
      const active = getActiveSource();
      if (active) insert(active, href, target);
    };
    setOpen(false);
  };

  const create = () => {
    pendingLink.current = () => {
      const active = getActiveSource();
      if (!active?.projectId || !active.noteId) return;
      const id = createLinkedCodexNote(active.projectId, active.noteId, newTitle, parentId || null);
      if (!id) {
        toast.error('The note could not be created. Check its name and location.');
        return;
      }
      const current = useKachamak.getState().novels.find(n => n.id === active.projectId);
      const entry = current ? indexNotes(current).find(n => n.node.id === id) : null;
      if (entry && insert(active, '#note/' + id, entry)) toast.success('Codex note created and linked. Continue writing or click its link to open it.');
      else toast.info('The new note is in Codex and linked in Details. Insert its text link again when ready.');
    };
    setOpen(false);
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent onCloseAutoFocus={event => {
      if (open) return;
      if (source?.editor.isConnected && source.projectId === useKachamak.getState().activeNovelId) {
        event.preventDefault();
        if (!inserted.current && validSource(source)) restoreSelection(source);
        else source.editor.focus();
      }
      setSource(current => current === source ? null : current);
    }} className="max-h-[80vh] overflow-auto border-white/15 bg-background text-foreground">
      <DialogHeader>
        <DialogTitle>Insert a link</DialogTitle>
        <DialogDescription className="sr-only">Choose a project note, create a blank Codex note or insert a website link at your selection.</DialogDescription>
      </DialogHeader>
      {!source && <p className="text-sm text-muted-foreground">Place the cursor or select text in an editor, then use Link or Ctrl+K.</p>}
      <label className="text-xs font-semibold" htmlFor="insert-note-link">Link to a project note</label>
      <input id="insert-note-link" placeholder="Search titles, aliases and content…" value={query} onChange={e => setQuery(e.target.value)} className="rounded border border-white/15 bg-transparent p-2 text-sm"/>
      <ul className="max-h-64 space-y-1 overflow-auto">
        {results.map(entry => <li key={entry.node.id}>
          <button type="button" disabled={!source} className="w-full rounded p-2 text-left text-sm hover:bg-white/5 disabled:opacity-40" onClick={() => choose('#note/' + entry.node.id, entry)}>
            <span className="block" style={{ color: noteLinkColor(entry.node.color) }}>{entry.node.title}</span>
            <span className="text-xs text-muted-foreground">{entry.path}</span>
          </button>
        </li>)}
        {!results.length && <li className="text-sm text-muted-foreground">No matching notes.</li>}
      </ul>
      {source?.projectId && source.noteId && <div className="space-y-2 rounded-lg border border-amber-400/25 p-3">
        <h3 className="text-sm font-semibold">Create a Codex note</h3>
        <p className="text-xs text-muted-foreground">A blank note linked to this text. Keep writing here.</p>
        <input aria-label="New Codex note title" placeholder="Name of your new note" maxLength={200} value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full rounded border border-white/15 bg-transparent p-2 text-sm"/>
        <select aria-label="New Codex note location" value={parentId} onChange={e => setParentId(e.target.value)} className="w-full rounded border border-white/15 bg-muted p-2 text-sm">
          <option value="">Codex · top level</option>
          {index.filter(n => n.section === 'codex').map(n => <option key={n.node.id} value={n.node.id}>{n.path} / {n.node.title}</option>)}
        </select>
        <button type="button" disabled={!newTitle.trim()} onClick={create} className="rounded bg-amber-400 px-3 py-2 text-sm text-black disabled:opacity-40">Create and link</button>
      </div>}
      <form className="border-t border-white/10 pt-3" onSubmit={event => {
        event.preventDefault();
        if (source && url.trim()) choose(url.trim());
      }}>
        <label className="text-xs font-semibold" htmlFor="external-link">Or link to a website</label>
        <div className="mt-2 flex gap-2">
          <input id="external-link" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded border border-white/15 bg-transparent p-2 text-sm"/>
          <button type="submit" disabled={!source || !url.trim()} className="rounded border border-white/15 px-3 text-sm disabled:opacity-40">Insert</button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
