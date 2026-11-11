/** File System Access operations. Handles and absolute paths are never persisted. */
export interface DiskFile { kind: 'file'; name: string; getFile(): Promise<File>; createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void>; abort?(): Promise<void> }> }
export interface DiskFolder { kind: 'directory'; name: string; values(): AsyncIterable<DiskFile | DiskFolder>; getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DiskFolder>; getFileHandle(name: string, options?: { create?: boolean }): Promise<DiskFile>; removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> }
export const safeName = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 70) || 'Untitled';
export const folderName = (title: string, id: string) => `${safeName(title)}--${safeName(id)}`;
export async function directory(root: DiskFolder, path: string, create = false): Promise<DiskFolder> {
  let current = root;
  for (const part of path.split('/').filter(Boolean)) {
    if (part === '.' || part === '..') throw new Error('Invalid relative folder.');
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}
export async function readText(root: DiskFolder, path: string): Promise<string | null> {
  const parts = path.split('/'); const name = parts.pop()!;
  try { return await (await (await directory(root, parts.join('/'))).getFileHandle(name)).getFile().then(f => f.text()); }
  catch (error) { if ((error as Error).name === 'NotFoundError') return null; throw error; }
}
export async function writeText(root: DiskFolder, path: string, text: string) {
  const parts = path.split('/'); const name = parts.pop()!;
  const parent = await directory(root, parts.join('/'), true);
  const stream = await (await parent.getFileHandle(name, { create: true })).createWritable();
  try { await stream.write(text); await stream.close(); } catch (error) { await stream.abort?.(); throw error; }
  if (await readText(root, path) !== text) throw new Error(`Could not verify ${name}.`);
}
export async function copyFolder(source: DiskFolder, target: DiskFolder) {
  for await (const entry of source.values()) {
    if (entry.kind === 'directory') await copyFolder(entry, await target.getDirectoryHandle(entry.name, { create: true }));
    else {
      const original = await entry.getFile();
      const dest = await target.getFileHandle(entry.name, { create: true });
      const writer = await dest.createWritable();
      try { await writer.write(original); await writer.close(); } catch (error) { await writer.abort?.(); throw error; }
      const bytes = new Uint8Array(await original.arrayBuffer());
      const copied = new Uint8Array(await (await dest.getFile()).arrayBuffer());
      if (bytes.length !== copied.length || bytes.some((b, i) => b !== copied[i])) throw new Error(`Copy verification failed: ${entry.name}`);
    }
  }
}
export async function archiveFolder(root: DiskFolder, path: string) {
  const original = await directory(root, path);
  const archive = await directory(root, `.katchamak-history/${Date.now()}-${crypto.randomUUID()}/${path}`, true);
  await copyFolder(original, archive);
  const parts = path.split('/'); const name = parts.pop()!;
  await (await directory(root, parts.join('/'))).removeEntry(name, { recursive: true });
}
