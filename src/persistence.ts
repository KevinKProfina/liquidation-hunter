import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function appendJsonFile<T extends { createdAt?: string }>(filePath: string, entry: T) {
  const existing = await readJsonFile<T[]>(filePath, []);
  existing.push({ ...entry, createdAt: entry.createdAt || new Date().toISOString() });
  await writeJsonFile(filePath, existing);
}
