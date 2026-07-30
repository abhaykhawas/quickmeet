import type {
  MeetingAccess,
  MeetingFeatures,
  MeetingRole,
  MeetingSummary,
} from '@quickmeet/sdk';

export interface StoredMember {
  id: string;
  name: string;
  email?: string;
  role: MeetingRole;
  accessKeyHash: string;
}

export interface StoredMeeting {
  id: string;
  slug: string;
  livekitRoom: string;
  name: string;
  access: MeetingAccess;
  features: MeetingFeatures;
  members: StoredMember[];
  createdAt: string;
  updatedAt: string;
}

export function toMeetingSummary(meeting: StoredMeeting): MeetingSummary {
  const host = meeting.members.find((member) => member.role === 'host');
  if (!host) {
    throw new Error(`Meeting ${meeting.id} has no host`);
  }

  return {
    id: meeting.id,
    slug: meeting.slug,
    name: meeting.name,
    access: meeting.access,
    features: meeting.features,
    host: {
      id: host.id,
      name: host.name,
      ...(host.email ? { email: host.email } : {}),
    },
    coHostCount: meeting.members.filter((member) => member.role === 'cohost').length,
    participantCount: meeting.members.filter((member) => member.role === 'participant').length,
    createdAt: meeting.createdAt,
  };
}
