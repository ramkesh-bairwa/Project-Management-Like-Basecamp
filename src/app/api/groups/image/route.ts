import { NextRequest } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const POST = withAuth(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return apiError('No file provided');

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) return apiError('Invalid file type');

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop();
  const fileName = `group_${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'groups');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return apiResponse({ url: `/uploads/groups/${fileName}` }, 201);
});
