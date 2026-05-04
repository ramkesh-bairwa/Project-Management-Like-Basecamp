import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

function fmtDT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  const mon = dt.toLocaleString('en',{month:'short'});
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${day}${s} ${mon} ${dt.getFullYear()} ${h}:${m} ${ap}`;
}

async function ensureGroupChat(groupId: number, userId: number): Promise<number> {
  const grp = await query<{ chat_id: number | null; name: string }[]>(
    'SELECT chat_id, name FROM `groups` WHERE id=?', [groupId]
  );
  if (!grp.length) throw new Error('Group not found');
  if (grp[0].chat_id) return grp[0].chat_id;

  const chatRes = await query<{ insertId: number }>(
    "INSERT INTO chats (type, name, created_by) VALUES ('group',?,?)",
    [`${grp[0].name} — Group Chat`, userId]
  );
  const chatId = chatRes.insertId;
  await query('UPDATE `groups` SET chat_id=? WHERE id=?', [chatId, groupId]);
  const members = await query<{ user_id: number }[]>('SELECT user_id FROM group_members WHERE group_id=?', [groupId]);
  for (const m of members) {
    await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, m.user_id]);
  }
  return chatId;
}

export const POST = withAuth(async (req: NextRequest, user) => {
  const groupId = Number(req.url.split('/groups/')[1].split('/')[0]);
  const { purpose, scheduled_at, is_instant } = await req.json();
  if (!purpose) return apiError('purpose required');

  const member = await query<unknown[]>('SELECT id FROM group_members WHERE group_id=? AND user_id=?', [groupId, user.id]);
  if (!member.length) return apiError('Not a group member', 403);

  const creator = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  const creatorName = creator[0]?.name || 'Someone';

  const meetingTime = is_instant ? new Date() : new Date(scheduled_at);
  const meetingId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/meeting/${meetingId}`;

  const result = await query<{ insertId: number }>(
    'INSERT INTO group_meetings (group_id, created_by, purpose, scheduled_at, is_instant, meeting_link) VALUES (?,?,?,?,?,?)',
    [groupId, user.id, purpose, meetingTime, is_instant ? 1 : 0, meetingLink]
  );

  const chatId = await ensureGroupChat(groupId, user.id);

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
