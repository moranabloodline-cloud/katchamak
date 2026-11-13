'use client';
import { WebAccountDialog } from './WebAccountDialog';
export type AccountTab = 'profile' | 'appearance' | 'storage' | 'about';
export function AccountDialog({ open, onOpenChange, initialTab = 'profile' }: { open: boolean; onOpenChange: (open: boolean) => void; initialTab?: AccountTab }) {
  const tabs = { profile: 'Profile', appearance: 'Appearance', storage: 'Storage', about: 'About' };
  return <WebAccountDialog open={open} onOpenChange={onOpenChange} initialTab={tabs[initialTab]} />;
}
