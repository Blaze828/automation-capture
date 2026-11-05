import * as path from 'path';
import * as fs from 'fs/promises';

export async function exists(file: string): Promise<boolean> {
  try { await fs.stat(file); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') { return false; } throw e; }
}
export function versioned(file: string, version: number): string {
  const parsed = path.parse(file);
  return path.join(parsed.dir, `${parsed.name}_${String(version).padStart(2, '0')}${parsed.ext}`);
}
export async function nextAvailable(file: string, start = 2): Promise<string> {
  let n = start;
  while (await exists(versioned(file, n))) { n++; }
  return versioned(file, n);
}
export async function publishFile(temp: string, destination: string, overwrite: boolean): Promise<void> {
  if (overwrite) { await fs.rename(temp, destination); }
  else {
    await fs.copyFile(temp, destination, fs.constants.COPYFILE_EXCL);
    await fs.unlink(temp);
  }
}
