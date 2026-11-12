"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Profile = { displayName: string; photo: string | null };
const storageKey = "katchamak-local-profile-v1";
export const useAccountPreferences = create<Profile>()(persist<Profile>(() => ({
  displayName: "", photo: null,
}), { name: storageKey, version: 1, storage: createJSONStorage(() => localStorage) }));

// Check the local write before changing the visible profile. Never ship profile data as assets.
export function saveLocalProfile(profile: Profile) {
  localStorage.setItem(storageKey, JSON.stringify({ state: profile, version: 1 }));
  useAccountPreferences.setState(profile);
}
