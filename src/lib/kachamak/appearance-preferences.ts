"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export type Appearance = { theme: "dark" | "light"; interfaceSize: "small" | "normal" | "large" };
export const useAppearancePreferences = create<Appearance>()(persist<Appearance>(() => ({ theme: "dark", interfaceSize: "normal" }), {
  name: "katchamak-appearance-v1", version: 1, storage: createJSONStorage(() => localStorage),
}));
export function saveAppearance(value: Appearance) {
  localStorage.setItem("katchamak-appearance-v1", JSON.stringify({ state: value, version: 1 }));
  useAppearancePreferences.setState(value);
}
