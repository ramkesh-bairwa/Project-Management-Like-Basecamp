import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return apiError('file required');

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const folder = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'comments', folder);
  await mkdir(uploadDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  await writeFile(path.join(uploadDir, safeName), buffer);
  const fileUrl = `/uploads/comments/${folder}/${safeName}`;
  return apiResponse({ url: fileUrl });
});
