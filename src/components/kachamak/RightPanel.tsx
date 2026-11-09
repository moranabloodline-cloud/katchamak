"use client";

import { useMemo } from "react";
import { AtSign, CalendarDays, ChevronRight, Hash, Info, Settings2 } from "lucide-react";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { countWords, stripHtml } from "@/lib/kachamak/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export function RightPanel({
  node,
  section,
  onHide,
}: {
  node: NoteNode;
  section: SectionKey;
  onHide?: () => void;
}) {
  const updateNode = useKachamak((s) => s.updateNode);
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const novel = novels.find((n) => n.id === activeNovelId);

  const mentions = useMemo(() => {
    if (!novel) return [];
    const text = stripHtml(node.content).toLowerCase();
    const found: { id: string; title: string; alias: string }[] = [];
    /* every note in the Codex tab is a mention source — titles (3+ letters) */
    const walk = (nodes: NoteNode[]) => {
      for (const nd of nodes) {
        const nm = nd.title.trim();
        if (nm.length >= 3 && text.includes(nm.toLowerCase())) {
          found.push({ id: nd.id, title: nd.title, alias: nm });
        }
        walk(nd.children);
      }
    };
    walk(novel.sections.codex ?? []);
    return found;
  }, [node.content, novel]);

  const words = countWords(node.content);

  return (
    <Tabs defaultValue="info" className="flex h-full flex-col gap-0">
      <div className="flex items-center gap-1 pl-3 pr-2 pt-3">
        <TabsList className="grid flex-1 grid-cols-3 bg-white/5">
          <TabsTrigger value="info" className="text-xs">
            <Info className="mr-1 h-3.5 w-3.5" /> Info
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            <Settings2 className="mr-1 h-3.5 w-3.5" /> Details
          </TabsTrigger>
          <TabsTrigger value="mentions" className="text-xs">
            <AtSign className="mr-1 h-3.5 w-3.5" /> Mentions
          </TabsTrigger>
        </TabsList>
        {onHide && (
          <button
            type="button"
            aria-label="Hide panel"
            title="Hide panel"
            onClick={onHide}
            className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto kachamak-scroll p-3">
        <TabsContent value="info" className="mt-0 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Synopsis</Label>
            <RichEditor
              html={node.synopsis}
              onChange={(html) => updateNode(section, node.id, { synopsis: html })}
              placeholder="Write here..."
              className="mt-1 min-h-24 rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <RichEditor
              html={node.notes}
              onChange={(html) => updateNode(section, node.id, { notes: html })}
              placeholder="Write here..."
              className="mt-1 min-h-24 rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm"
            />
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-0 space-y-4">
          <dl className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd>
                {node.kind === "doc"
                  ? "Note"
                  : node.kind.charAt(0).toUpperCase() + node.kind.slice(1)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Words</dt>
              <dd>{words.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Created
              </dt>
              <dd>{new Date(node.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Updated
              </dt>
              <dd>{new Date(node.updatedAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> Sub-notes
              </dt>
              <dd>{node.children.length}</dd>
            </div>
          </dl>
        </TabsContent>

        <TabsContent value="mentions" className="mt-0">
          {mentions.length === 0 ? (
            <p className="pt-2 text-xs text-muted-foreground">
              No Codex notes mentioned in this text yet. Names of characters, places and
              things (3+ letters) from the Codex tab appear here automatically.
            </p>
          ) : (
            <ul className="space-y-1.5 pt-2">
              {mentions.map((m) => (
                <li
                  key={`${m.id}-${m.alias}`}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs"
                >
                  <AtSign className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-medium">{m.title}</span>
                  <span className="ml-auto text-muted-foreground">“{m.alias}”</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
