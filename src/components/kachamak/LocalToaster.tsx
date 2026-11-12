"use client";
import { Toaster } from "sonner";
import { useAppearancePreferences } from "@/lib/kachamak/appearance-preferences";
export function LocalToaster() { const theme = useAppearancePreferences(s => s.theme); return <Toaster theme={theme} position="bottom-right" duration={3500} />; }
