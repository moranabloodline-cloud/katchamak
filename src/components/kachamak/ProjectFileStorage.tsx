'use client';
import type { ReactNode } from 'react';
import { WebLibraryStorage } from './WebLibraryStorage';
import { useWebLibrary } from '@/lib/kachamak/cloud-library';
export function ProjectFileStorage({ children }: { children: ReactNode }) { return <WebLibraryStorage>{children}</WebLibraryStorage>; }
export function ProjectFileStatus() {
  const state = useWebLibrary();
  return <>{state.error ? 'Cloud save failed' : state.busy || state.pending ? 'Saving to your account…' : 'Saved to your account'}</>;
}
