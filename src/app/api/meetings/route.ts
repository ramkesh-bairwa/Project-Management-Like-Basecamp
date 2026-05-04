import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

// GET /api/meetings?group_id=X

function fmtDT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  const mon = dt.toLocaleString('en',{month:'short'});
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${day}${s} ${mon} ${dt.getFullYear()} ${h}:${m} ${ap}`;
}
function fmtD(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  return `${day}${s} ${dt.toLocaleString('en',{month:'short'})} ${dt.getFullYear()}`;
}

export const GET = withAuth(async (req: NextRequest, user) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');

  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=?', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);

  const pm = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!pm.length) return apiError('Not a project member', 403);

  const rows = await query<unknown[]>(
    `SELECT m.*, u.name as created_by_name FROM meetings m
     JOIN users u ON u.id=m.created_by
     WHERE m.group_id=? ORDER BY m.scheduled_at DESC`, [group_id]
  );
  return apiResponse(rows);
});

// POST — schedule a meeting and post to group chat
export const POST = withAuth(async (req: NextRequest, user) => {
  const { group_id, purpose, scheduled_at, is_instant } = await req.json();
  if (!group_id || !purpose) return apiError('group_id and purpose required');

  const grp = await query<{ project_id: number; name: string; chat_id: number | null }[]>(
    'SELECT project_id, name, chat_id FROM project_groups WHERE id=?', [group_id]
  );
  if (!grp.length) return apiError('Group not found', 404);

  const pm = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!pm.length) return apiError('Not a project member', 403);

  const creator = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  const creatorName = creator[0]?.name || 'Someone';

  const meetingTime = is_instant ? new Date() : new Date(scheduled_at);
  const meetingId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/meeting/${meetingId}`;

  // Insert meeting record
  const result = await query<{ insertId: number }>(
    'INSERT INTO meetings (group_id, created_by, purpose, scheduled_at, is_instant, meeting_link) VALUES (?,?,?,?,?,?)',
    [group_id, user.id, purpose, meetingTime, is_instant ? 1 : 0, meetingLink]
  );

  // Ensure group chat exists
  let chatId = grp[0].chat_id;
  if (!chatId) {
    const chatRes = await query<{ insertId: number }>(
      "INSERT INTO chats (type, name, created_by) VALUES ('group',?,?)",
      [`${grp[0].name} — Group Chat`, user.id]
    );
    chatId = chatRes.insertId;
    await query('UPDATE project_groups SET chat_id=? WHERE id=?', [chatId, group_id]);
    const members = await query<{ user_id: number }[]>('SELECT user_id FROM project_group_members WHERE group_id=?', [group_id]);
    const participants = members.length
      ? members
      : await query<{ user_id: number }[]>('SELECT user_id FROM project_members WHERE project_id=?', [grp[0].project_id]);
    for (const m of participants) {
      await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, m.user_id]);
    }
  }

  // Format and post the meeting message to group chat
  const timeStr = is_instant
    ? `Now (${fmtDT(meetingTime)})`
    : fmtDT(meetingTime);

  const chatMessage =
    `📅 MEETING SCHEDULED\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 Purpose: ${purpose}\n` +
    `🕐 Time: ${timeStr}\n` +
    `👤 Scheduled by: ${creatorName}\n` +
    `🔗 Join: ${meetingLink}`;

  await query(
    "INSERT INTO messages (chat_id, sender_id, content, type) VALUES (?,?,?,'text')",
    [chatId, user.id, chatMessage]
  );

  return apiResponse({ id: result.insertId, meeting_link: meetingLink, chat_id: chatId }, 201);
});
