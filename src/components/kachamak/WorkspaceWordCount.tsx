import type { NoteNode, Novel, SectionKey, ViewMode } from "@/lib/kachamak/types";
import { continuousSelection } from "@/lib/kachamak/continuous-manuscript";
import { documentTargetProgress } from "@/lib/kachamak/document-target";
import { manuscriptNoteWords, manuscriptTreeWords, novelWords, ownWords } from "@/lib/kachamak/utils";

interface Props {
  novel?: Novel;
  section: SectionKey;
  selectedSection: SectionKey;
  selected: NoteNode | null;
  view: ViewMode;
  rootId?: string;
}

function footerCount({ novel, section, selectedSection, selected, view, rootId }: Props) {
  if (view === "split" && section === "binder" && !selected) {
    return { value: words(0), title: "No document in the active pane" };
  }
  const binderNote = section === "binder" && selectedSection === "binder" ? selected : null;
  if (view === "continuous") {
    const notes = continuousSelection(novel?.sections[section] ?? [], selected?.id ?? null, rootId);
    // Continuous can show a folder tab whose selection still belongs to another branch.
    if (!binderNote || notes[0]?.id !== binderNote.id) {
      const count = notes.reduce((total, note) => total + manuscriptNoteWords(note), 0);
      return { value: words(count), title: "Words in the current manuscript view" };
    }
  }
  if (binderNote) {
    if (binderNote.kind === "scene" || !binderNote.children.length) {
      return { value: words(manuscriptNoteWords(binderNote)), title: "Words in this document’s text" };
    }
    return { value: words(manuscriptTreeWords([binderNote])), title: "Words in this document and its descendants" };
  }

  const target = selected?.documentTarget;
  if (selected && target?.amount) {
    const { count } = documentTargetProgress(selected.content, target);
    return { value: `${count.toLocaleString("en-US")}/${target.amount.toLocaleString("en-US")} ${target.unit}`, title: "Document text / target" };
  }
  if (selected) return { value: words(ownWords(selected)), title: "Words in the selected note" };
  return { value: words(novel ? novelWords(novel) : 0), title: "Manuscript words in Binder" };
}

function words(count: number) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "word" : "words"}`;
}

export function WorkspaceWordCount(props: Props) {
  const { value, title } = footerCount(props);
  return (
    <span title={title} className={`ml-10 mr-1 min-w-0 max-w-52 flex-1 truncate whitespace-nowrap text-xs text-muted-foreground ${props.view === "timeline"
      ? "@[1040px]:absolute @[1040px]:left-1/2 @[1040px]:mx-0 @[1040px]:-translate-x-1/2"
      : "@[680px]:absolute @[680px]:left-1/2 @[680px]:ml-0 @[680px]:-translate-x-1/2"}`}>
      {value}
    </span>
  );
}
