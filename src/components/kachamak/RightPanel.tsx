"use client";

import { useMemo } from "react";
import { AtSign, CalendarDays, Hash, Info, Settings2 } from "lucide-react";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { countWords, stripHtml } from "@/lib/kachamak/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function RightPanel({ node, section }: { node: NoteNode; section: SectionKey }) {
  const updateNode = useKachamak((s) => s.updateNode);
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const novel = novels.find((n) => n.id === activeNovelId);

  const mentions = useMemo(() => {
    if (!novel) return [];
    const text = stripHtml(node.content).toLowerCase();
    const found: { id: string; title: string; alias: string }[] = [];
    const walk = (
      cats: typeof novel.codex
    ) => {
      for (const c of cats) {
        for (const e of c.entries) {
          const names = [e.title, ...e.aliases].filter(Boolean);
          for (const nm of names) {
            if (nm.length >= 3 && text.includes(nm.toLowerCase())) {
              found.push({ id: e.id, title: e.title, alias: nm });
              break;
            }
          }
        }
        walk(c.children);
      }
    };
    walk(novel.codex);
    return found;
  }, [node.content, novel]);

  const words = countWords(node.content);

  return (
    <Tabs defaultValue="info" className="flex h-full flex-col gap-0">
      <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3 bg-white/5">
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
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={node.status || "none"}
              onValueChange={(v) =>
                updateNode(section, node.id, { status: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className="mt-1 w-full bg-black/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1b1b1b] border-white/10">
                <SelectItem value="none">No Status</SelectItem>
                {(novel?.statuses ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Select
              value={node.label || "none"}
              onValueChange={(v) =>
                updateNode(section, node.id, { label: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className="mt-1 w-full bg-black/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1b1b1b] border-white/10">
                <SelectItem value="none">No Label</SelectItem>
                {(novel?.labels ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <dl className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{node.kind}</dd>
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
              No Codex entries mentioned in this text yet. Names of characters, places and
              things (3+ letters) appear here automatically.
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
