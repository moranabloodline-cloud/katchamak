"use client";

import { useEffect, useState } from "react";
import { useKachamak } from "@/lib/kachamak/store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/* owner account — opened from the initials circle in the top bar
   and from "My Account" on the dashboard */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const setDefaultAuthor = useKachamak((s) => s.setDefaultAuthor);
  const [draft, setDraft] = useState(defaultAuthor);

  useEffect(() => {
    if (open) setDraft(defaultAuthor);
  }, [open, defaultAuthor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#1b1b1b] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Author name</Label>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your name"
            className="bg-black/30"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your initials appear in the circle at the top right. Everything stays
            saved locally in this browser.
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              setDefaultAuthor(draft.trim() || defaultAuthor);
              onOpenChange(false);
              toast.success("Account updated.");
            }}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
