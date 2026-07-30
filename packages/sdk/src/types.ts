export type MeetingRole = 'host' | 'cohost' | 'participant';
export type MeetingAccess = 'open' | 'invite-only';

export interface MeetingFeatures {
  camera: boolean;
  microphone: boolean;
  screenShare: boolean;
  chat: boolean;
}

export const defaultMeetingFeatures: MeetingFeatures = {
  camera: true,
  microphone: true,
  screenShare: true,
  chat: true,
};

export interface PersonInput {
  id?: string;
  name: string;
  email?: string;
}

export interface CreateMeetingInput {
  name: string;
  host: PersonInput;
  coHosts?: PersonInput[];
  participants?: PersonInput[];
  features?: Partial<MeetingFeatures>;
  access?: MeetingAccess;
}

export interface MeetingSummary {
  id: string;
  slug: string;
  name: string;
  access: MeetingAccess;
  features: MeetingFeatures;
  host: Omit<PersonInput, 'id'> & { id: string };
  coHostCount: number;
  participantCount: number;
  createdAt: string;
}

export interface MeetingInvitation {
  id: string;
  name: string;
  email?: string;
  role: MeetingRole;
  accessKey: string;
  joinUrl?: string;
}

export interface CreateMeetingResult {
  meeting: MeetingSummary;
  hostAccessKey: string;
  invitations: MeetingInvitation[];
}

export interface JoinMeetingInput {
  name: string;
  accessKey?: string;
}

export interface JoinCredentials {
  serverUrl: string;
  participantToken: string;
  meeting: MeetingSummary;
  participant: {
    identity: string;
    name: string;
    role: MeetingRole;
  };
}

export interface UpdateMeetingInput {
  name?: string;
  features?: Partial<MeetingFeatures>;
  access?: MeetingAccess;
  accessKey?: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}
