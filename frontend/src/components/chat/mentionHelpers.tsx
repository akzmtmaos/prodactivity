import { User } from './types';

const MENTION_RE = /@([a-zA-Z0-9_]+)|@everyone/gi;

export type Mention =
  | { kind: 'user'; username: string; userId?: string }
  | { kind: 'everyone' };

export interface MentionedUser {
  userId: string;
  username: string;
}

export function parseMentions(content: string): Mention[] {
  const seen = new Set<string>();
  const mentions: Mention[] = [];
  let match: RegExpExecArray | null;

  while ((match = MENTION_RE.exec(content)) !== null) {
    if (match[0].toLowerCase() === '@everyone') {
      const key = 'everyone';
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({ kind: 'everyone' });
      }
      continue;
    }

    const username = match[1];
    if (!username) continue;
    const key = `user:${username.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      mentions.push({ kind: 'user', username });
    }
  }

  return mentions;
}

export function renderMentions(
  content: string,
  options?: {
    participants?: User[];
    participantsById?: Map<string, User>;
    mentionedUserIds?: Set<string>;
  },
): React.ReactNode[] {
  if (!content) return [];

  const byUsername = new Map<string, User>();
  options?.participants?.forEach((p) => {
    const key = (p.username || '').toLowerCase();
    if (key) byUsername.set(key, p);
  });

  const mentionedUserIds = options?.mentionedUserIds ?? new Set<string>();
  const parts: React.ReactNode[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_RE.exec(content)) !== null) {
    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;

    if (tokenStart > lastIndex) {
      parts.push(content.slice(lastIndex, tokenStart));
    }

    const raw = match[0];
    const lower = raw.toLowerCase();

    if (lower === '@everyone') {
      parts.push(
        <span key={`m-${tokenStart}`} className="mention-everyone">
          @{raw.slice(1)}
        </span>,
      );
    } else {
      const username = match[1];
      const participant = byUsername.get(username.toLowerCase());
      const isMentioned =
        participant &&
        mentionedUserIds.has(String(participant.id));

      if (isMentioned) {
        parts.push(
          <span
            key={`m-${tokenStart}`}
            className="mention-user"
            title={participant.username}
          >
            @{participant.username}
          </span>,
        );
      } else {
        parts.push(
          <span key={`m-${tokenStart}`} className="mention-unknown">
            @{username}
          </span>,
        );
      }
    }

    lastIndex = tokenEnd;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

export async function notifyMentions(
  options: {
    roomId: string;
    roomName: string | null;
    senderId: string;
    senderUsername: string | null;
    content: string;
    participants: User[];
    getUsernameById: (userId: string) => string | null | undefined;
  },
): Promise<void> {
  const { roomName, senderId, senderUsername, content, participants, getUsernameById } = options;
  const mentions = parseMentions(content);
  if (mentions.length === 0) return;

  const senderName = senderUsername || getUsernameById(senderId) || 'someone';
  const roomLabel = roomName || 'Group';
  const mentionedUserIds = new Set<string>();

  for (const mention of mentions) {
    if (mention.kind === 'everyone') {
      for (const participant of participants) {
        const pid = String(participant.id);
        if (pid !== senderId) {
          mentionedUserIds.add(pid);
        }
      }
      continue;
    }

    const target = participants.find(
      (p) =>
        (p.username || '').toLowerCase() === mention.username.toLowerCase(),
    );
    if (target) {
      const pid = String(target.id);
      if (pid !== senderId) {
        mentionedUserIds.add(pid);
      }
    }
  }

  if (mentionedUserIds.size === 0) return;

  const { notificationsService } = await import('../../services/notificationsService');


  for (const userId of mentionedUserIds) {
    await notificationsService.createNotification({
      user_id: Number(userId),
      title: `${senderName} mentioned you`,
      message: `“${senderName}” mentioned you in “${roomLabel}”`,
      notification_type: 'general',
      is_read: false,      }).catch((err: unknown) => {
      console.warn('[mentions] failed to create notification:', err);
    });
  }
}
