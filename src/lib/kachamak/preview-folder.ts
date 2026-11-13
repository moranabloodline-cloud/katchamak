import type { DiskFile, DiskFolder } from './folder-files';
const missing = () => new DOMException('Missing preview entry', 'NotFoundError');
/** Device-local preview working copy. Never serialised or uploaded. */
export class PreviewFolder implements DiskFolder {
  readonly kind = 'directory' as const;
  readonly entries = new Map<string, DiskFolder | DiskFile>();
  constructor(public name: string) {}
  async queryPermission() { return 'granted' as PermissionState; }
  async requestPermission() { return 'granted' as PermissionState; }
  async *values() { yield* this.entries.values(); }
  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<PreviewFolder> {
    let entry = this.entries.get(name);
    if (!entry && options?.create) { entry = new PreviewFolder(name); this.entries.set(name, entry); }
    if (!entry || entry.kind !== 'directory') throw missing(); return entry as PreviewFolder;
  }
  async getFileHandle(name: string, options?: { create?: boolean }): Promise<DiskFile> {
    let entry = this.entries.get(name);
    if (!entry && options?.create) { entry = new PreviewFile(new File([''], name)); this.entries.set(name, entry); }
    if (!entry || entry.kind !== 'file') throw missing(); return entry;
  }
  async removeEntry(name: string) { if (!this.entries.delete(name)) throw missing(); }
}
class PreviewFile implements DiskFile {
  readonly kind = 'file' as const;
  constructor(private file: File) {}
  get name() { return this.file.name; }
  async getFile() { return this.file; }
  async createWritable() {
    let next: string | Blob = this.file;
    return { write: async (value: string | Blob) => { next = value; }, close: async () => { this.file = new File([next], this.name); }, abort: async () => {} };
  }
}
export async function previewFolder(files: File[]): Promise<PreviewFolder> {
  const root = new PreviewFolder(files[0]?.webkitRelativePath.split('/')[0] || 'Preview library');
  for (const file of files) {
    const parts = file.webkitRelativePath.split('/').slice(1);
    const name = parts.pop(); if (!name) continue;
    let folder = root;
    for (const part of parts) { if (part === '..' || part === '.') throw new Error('Invalid preview path'); folder = await folder.getDirectoryHandle(part, { create: true }); }
    folder.entries.set(name, new PreviewFile(file));
  }
  return root;
}
