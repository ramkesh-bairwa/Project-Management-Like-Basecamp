import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiError } from '@/lib/api';
import { readFile } from 'fs/promises';
import path from 'path';

export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url);
  const document_id = searchParams.get('document_id');
  const version = searchParams.get('version');

  if (!document_id) return apiError('document_id required');

  const rows = await query<{ file_url: string; file_name: string; content: string }[]>(
    version
      ? `SELECT dv.file_url, dv.file_name, dv.content FROM document_versions dv WHERE dv.document_id=? AND dv.version_number=?`
      : `SELECT dv.file_url, dv.file_name, dv.content FROM document_versions dv
         JOIN documents d ON d.id=dv.document_id
         WHERE dv.document_id=? AND dv.version_number=d.current_version`,
    version ? [document_id, version] : [document_id]
  );

  if (!rows.length) return apiError('No file found', 404);

  const { file_url, file_name, content } = rows[0];

  // Plain text/doc content
  if (!file_url && content) {
    const bytes = Buffer.from(content, 'utf-8');
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file_name || 'document.txt'}"`,
      },
    });
  }

  if (!file_url) return apiError('No file found', 404);

  // Real file on disk
  if (file_url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', file_url);
    try {
      const bytes = await readFile(filePath);
      const ext = path.extname(file_name || file_url).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword', '.zip': 'application/zip',
        '.txt': 'text/plain', '.csv': 'text/csv',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `attachment; filename="${file_name || path.basename(file_url)}"`,
          'Content-Length': String(bytes.length),
        },
      });
    } catch {
      return apiError('File not found on server', 404);
    }
  }

  // Legacy base64 data URL
  if (file_url.startsWith('data:')) {
    const commaIdx = file_url.indexOf(',');
    const meta = file_url.substring(0, commaIdx);
    const base64 = file_url.substring(commaIdx + 1);
    const mime = meta.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const bytes = Buffer.from(base64, 'base64');
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${file_name || 'download'}"`,
        'Content-Length': String(bytes.length),
      },
    });
  }

  return NextResponse.redirect(file_url);
});
