import { NextRequest } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) return apiError('No file provided');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Folder name: YYYY-MM-DD_HH-MM-SS
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const folderName = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', folderName);
    await mkdir(uploadDir, { recursive: true });

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadDir, safeName);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/documents/${folderName}/${safeName}`;
    return apiResponse({ url: fileUrl, name: file.name, size: file.size, folder: folderName }, 201);

  } catch (err) {
    console.error('Upload error:', err);
    return apiError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
});
