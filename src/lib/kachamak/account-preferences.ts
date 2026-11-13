'use client';
import { create } from 'zustand';
type Profile = { displayName: string; photo: string | null };
/** Account API owns persistence. Hydrating the UI must never write browser storage. */
export const useAccountPreferences = create<Profile>(() => ({ displayName: '', photo: null }));
