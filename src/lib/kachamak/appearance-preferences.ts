'use client';
import { create } from 'zustand';
export type Appearance = { theme: 'dark' | 'light'; interfaceSize: 'small' | 'normal' | 'large' };
/** Loaded and saved with the authenticated account, without a browser cache. */
export const useAppearancePreferences = create<Appearance>(() => ({ theme: 'dark', interfaceSize: 'normal' }));
