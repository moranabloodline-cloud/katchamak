# KACHAMAK — Architecture Specification (record)

> **Provenance:** Nikola posted the original 23-chapter architecture document
> in chat (previous session). This file is a faithful record of every point
> from it, kept in the project so it survives session changes. It is the
> **authoritative specification** for Kachamak. If this document and anything
> else disagree, this document wins; Nikola's current word wins over both.
>
> Core definition (quoted from the document):
> **"One Note system. Unlimited hierarchy. One shared editor. Classic
> Scrivener Corkboard. Consistent three-panel interface."**

---

## 1. Universal Note architecture

- **Everything is a Note** — every tab (Binder, Codex, Planning, Research,
  Templates, Prompts, Trash) uses the same note system. No special entry
  types.
- **Note properties:** Title, Icon, Color, Content, Synopsis, Notes, Parent,
  Children, Label, Status, Details, Mentions.
- **Unlimited nesting** — any note can contain any number of sub-notes.
- A container note **keeps its own content, Synopsis and metadata**; being a
  parent does not change what a note is.
- Name, icon and colour of every note are chosen by the **user**; there are no
  fixed Act→Chapter→Scene types.

## 2. Layout — consistent three-panel interface

- Left panel: navigation tree of the current tab.
- Center: the one shared editor / current view.
- Right panel: Inspector for the selected note.
- The interface is the same on every tab; only Trash is a special view.

## 3. Top bar

- **Left:** Home icon + Search field (fills the remaining width).
- **Center:** tabs — Binder | Codex | Planning | Research | Templates |
  Prompts | Trash — active tab highlighted in gold.
- **Right:** Current Note dropdown + Save (floppy) icon + Account avatar
  (initials) + Settings gear.
- **No** global word count in the top bar. **No** Download button.
  **No** PRIVATE badge.

## 4. Tabs

- **Mandatory** (cannot be deleted or renamed): **Binder, Codex, Trash**.
- **Deletable:** Planning, Research, Templates, Prompts.
- User can create **custom tabs**.

## 5. Left panel

- Header: tab icon + tab name, Add (+), More (•••), Expand all, Collapse all.
- Rows: disclosure arrow + note icon + title + three-dot menu.
- Drag & drop to rearrange; **Delete key** deletes the selected note (→ Trash).
- **Clicking a note's icon opens the icon-picker popup** (any note, any icon).

## 6. Note context menu (three-dot)

Exact structure from the document / original screenshot, with separator lines
between groups:

```
Create note            (screenshot wording: "Create sub-page" — open question)
---
Rename
Duplicate
Export
Move
Delete                 (red)
---
Sort sub-pages         (disabled without children)
Edit permissions       (present in screenshot only — open question)
---
Hide
---
Collapse all
Expand all
---
Change icon
```

- Popup attaches to the three-dot control, adapts to the viewport, never
  clipped by the left panel; closes on Escape / outside click.
- Delete sends the note (whole subtree) to **Trash** and is restorable.

## 7. Central workspace — view modes

- **Split | Write | Corkboard | List** (Corkboard replaced the old Grid).
- Mode buttons live at the right edge of the **left panel's bottom bar**.

## 8. Write mode & toolbar

- Shared single editor used by every tab.
- Toolbar (existing design kept): Segoe UI, 16px, line-height 1.5;
  B I U S; lists; quote; alignment; palette (text colour); highlight; Tx
  (clear formatting).
- Additions: **Text Style dropdown** (default "Normal") before the font
  controls, plus **Copy, Delete, Link** buttons.

## 9. Corkboard (classic Scrivener)

- Index cards: each card shows **icon + title + Synopsis**.
- Shows **one hierarchy level at a time** (children of the selected container).
- **Double-click** a card opens the note; **drag** cards to reorder.
- Explicitly **NOT**: no infinite canvas, no nested frames, no automatically
  expanding parent frames, no adjustable card size.

## 10. List view

- Flat list of the current level: icon, title, status/label columns as in the
  original app.

## 11. Inspector (right panel) — three tabs

- **Info:** Synopsis and Notes, vertically stacked, **draggable divider**
  between them.
- **Details:** links the note to Codex notes; searchable picker.
- **Mentions:** where this note is mentioned.
- Panel is collapsible (Hide / open again).

## 12. Bottom bar (three segments, aligned with the three panels)

- **Left segment:** ⓘ button (Save / Recovery / Copy feedback popover) +
  view-mode buttons Split | Write | Corkboard | List at the segment's right
  edge — both fixed at the bottom-left, never scroll with the tree.
- **Center segment:** **Target icon at the far left** of the central editor's
  bottom bar; **word counter at the horizontal center of the central editor's
  bottom bar** — centered relative to the **central workspace**, not the whole
  browser window. Format: `1,262 words` (novel total).
- **Right segment:** Label | Status | Colour controls.

## 13. Labels, Status, Colours

- Status values (defaults): N/A, To Do, First Draft, Revised Draft, Final
  Draft, Done.
- Labels: free text, user-named, with colours.
- Colour is a document colour (the dot shown in the right panel / cards).

## 14. Storage

- **Vault:** the project stored as Markdown files.
- **Master Backup_&lt;Project&gt;.json:** full backup file of the project.

## 15. Import / Export

- Export formats: **Importable Master** (JSON backup), **HTML**, **Markdown**,
  **JSON**.
- Note-level JSON export already implemented (`exportNoteJson`).

## 16. Trash

- Deleted notes go to Trash (whole subtree, remember the original parent).
- Trash is a **permanent system tab**; restore puts the note back.
- Trash content can be emptied permanently.

## 17. Shared features

- Search across notes (top bar search field).
- Account dialog (initials avatar); Settings dialog.
- Save button: confirmation feedback (toast) — data is persisted locally
  (localStorage) already on every change.

## 18. Dashboard

- Starting screen of the project (per document; not yet designed in detail —
  confirm with Nikola when it comes up).

## 19. Design system

- Dark + gold theme; near-black panels; thin light-grey separators; gold
  highlights for active elements; colourful note icons.
- Editor typography: Segoe UI, 16px, 1.5 line height.
- Context menus / dialogs: dark surfaces, serif text in menus (per original).

## 20. Implemented already (as of 09.11.2026, store v4)

All five earlier requirements: full-width central bottom bar (Target far left,
word count centered), Everything-is-a-Note on every tab, free hierarchy,
icon-picker popup on note icon, exact three-dot menu with Move dialog;
Trash with restore; Tree Scope dropdown; left-panel bottom bar with ⓘ +
Split/Write/Grid/List; Label+Status+colour row in the right panel.

## 21. Remaining roadmap (in order — "ajmo redom")

1. Corkboard replaces Grid (§9) + rename button.
2. Inspector reorganisation (§11).
3. Toolbar additions (§8): Text Style dropdown + Copy, Delete, Link.
4. Tab rules + custom tabs (§4).
5. Top bar "Current Note" dropdown (§3).
6. Vault + Master Backup + export formats (§14–15).
7. Dashboard (§18).
