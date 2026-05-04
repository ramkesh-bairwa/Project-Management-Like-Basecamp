import { randomUUID } from 'crypto';
import { query } from './db';

export function generateUUID(): string {
  return randomUUID();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/** Generates a slug that is unique within the given table+column, appending -2, -3 etc if needed */
export async function uniqueSlug(table: string, column: string, base: string, excludeId?: number): Promise<string> {
  const baseSlug = slugify(base);
  let slug = baseSlug;
  let counter = 2;
  while (true) {
    const rows = await query<{ id: number }[]>(
      `SELECT id FROM \`${table}\` WHERE \`${column}\` = ?${excludeId ? ' AND id != ?' : ''}`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (!rows.length) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}
