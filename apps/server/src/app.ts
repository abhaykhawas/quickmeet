import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import {
  defaultMeetingFeatures,
  type CreateMeetingResult,
  type MeetingInvitation,
  type MeetingRole,
} from '@quickmeet/sdk';
import type { AppConfig } from './config.js';
import type { StoredMeeting, StoredMember } from './model.js';
import { toMeetingSummary } from './model.js';
import { createAccessKey, createId, createSlug, hashAccessKey } from './security.js';
import type { MeetingStore } from './store.js';
import type { TokenIssuer, TokenParticipant } from './token.js';
import {
  createMeetingSchema,
  joinMeetingSchema,
  trustedTokenSchema,
  updateMeetingSchema,
} from './validation.js';

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

function sameSecret(left: string | undefined, right: string): boolean {
  if (!left) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function getApiKey(request: Request): string | undefined {
  const value = request.header('x-quickmeet-api-key');
  return value || undefined;
}

function assertServerKey(request: Request, config: AppConfig): void {
  if (!sameSecret(getApiKey(request), config.apiKey)) {
    throw new ApiError(401, 'invalid_api_key', 'A valid QuickMeet server API key is required.');
  }
}

async function findMeeting(store: MeetingStore, idOrSlug: string): Promise<StoredMeeting> {
  const meeting = await store.get(idOrSlug);
  if (!meeting) {
    throw new ApiError(404, 'meeting_not_found', 'This meeting does not exist.');
  }
  return meeting;
}

function buildMember(
  input: { id?: string; name: string; email?: string },
  role: MeetingRole,
): { member: StoredMember; accessKey: string } {
  const accessKey = createAccessKey();
  return {
    member: {
      id: input.id ?? createId('person'),
      name: input.name,
      ...(input.email ? { email: input.email } : {}),
      role,
      accessKeyHash: hashAccessKey(accessKey),
    },
    accessKey,
  };
}

function invitationFor(
  member: StoredMember,
  accessKey: string,
  config: AppConfig,
  meetingSlug: string,
): MeetingInvitation {
  const joinUrl = new URL(`/join/${meetingSlug}`, config.publicAppUrl);
  joinUrl.searchParams.set('key', accessKey);
  return {
    id: member.id,
    name: member.name,
    ...(member.email ? { email: member.email } : {}),
    role: member.role,
    accessKey,
    joinUrl: joinUrl.toString(),
  };
}

function participantIdentity(identity: string): string {
  return identity
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

async function buildCredentials(
  config: AppConfig,
  tokenIssuer: TokenIssuer,
  meeting: StoredMeeting,
  participant: TokenParticipant,
) {
  return {
    serverUrl: config.livekitUrl,
    participantToken: await tokenIssuer.issue(meeting, participant),
    meeting: toMeetingSummary(meeting),
    participant,
  };
}

export function createApp(
  config: AppConfig,
  store: MeetingStore,
  tokenIssuer: TokenIssuer,
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError(403, 'origin_not_allowed', 'This origin is not allowed by CORS.'));
    },
    allowedHeaders: ['content-type', 'x-quickmeet-api-key', 'x-quickmeet-access-key'],
  }));
  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'quickmeet-api' });
  });

  app.post('/v1/meetings', async (request, response) => {
    if (!config.demoMode) assertServerKey(request, config);
    const input = createMeetingSchema.parse(request.body);
    const now = new Date().toISOString();
    const host = buildMember(input.host, 'host');
    const coHosts = input.coHosts.map((person) => buildMember(person, 'cohost'));
    const participants = input.participants.map((person) => buildMember(person, 'participant'));
    const id = createId('meeting');
    const slug = createSlug(input.name);

    const meeting: StoredMeeting = {
      id,
      slug,
      livekitRoom: `qm_${id}`,
      name: input.name,
      access: input.access,
      features: { ...defaultMeetingFeatures, ...input.features },
      members: [
        host.member,
        ...coHosts.map(({ member }) => member),
        ...participants.map(({ member }) => member),
      ],
      createdAt: now,
      updatedAt: now,
    };

    await store.create(meeting);
    const invitations = [
      ...coHosts.map(({ member, accessKey }) =>
        invitationFor(member, accessKey, config, slug)),
      ...participants.map(({ member, accessKey }) =>
        invitationFor(member, accessKey, config, slug)),
    ];
    const result: CreateMeetingResult = {
      meeting: toMeetingSummary(meeting),
      hostAccessKey: host.accessKey,
      invitations,
    };
    response.status(201).json(result);
  });

  app.get('/v1/meetings/:meetingId', async (request, response) => {
    const meeting = await findMeeting(store, request.params.meetingId);
    response.json(toMeetingSummary(meeting));
  });

  app.post('/v1/meetings/:meetingId/join', async (request, response) => {
    const input = joinMeetingSchema.parse(request.body);
    const meeting = await findMeeting(store, request.params.meetingId);
    const accessKeyHash = input.accessKey ? hashAccessKey(input.accessKey) : undefined;
    const invitedMember = accessKeyHash
      ? meeting.members.find((member) => member.accessKeyHash === accessKeyHash)
      : undefined;

    if (meeting.access === 'invite-only' && !invitedMember) {
      throw new ApiError(
        403,
        'invitation_required',
        'A valid invitation key is required for this meeting.',
      );
    }

    const participant: TokenParticipant = invitedMember
      ? {
          identity: `member_${participantIdentity(invitedMember.id)}`,
          name: input.name || invitedMember.name,
          role: invitedMember.role,
        }
      : {
          identity: participantIdentity(createId('guest')),
          name: input.name,
          role: 'participant',
        };

    response.json(await buildCredentials(config, tokenIssuer, meeting, participant));
  });

  app.post('/v1/meetings/:meetingId/token', async (request, response) => {
    assertServerKey(request, config);
    const input = trustedTokenSchema.parse(request.body);
    const meeting = await findMeeting(store, request.params.meetingId);
    response.json(await buildCredentials(config, tokenIssuer, meeting, {
      identity: participantIdentity(input.identity),
      name: input.name,
      role: input.role,
    }));
  });

  app.patch('/v1/meetings/:meetingId', async (request, response) => {
    const meeting = await findMeeting(store, request.params.meetingId);
    const isServer = sameSecret(getApiKey(request), config.apiKey);
    const accessKey = request.header('x-quickmeet-access-key');
    const member = accessKey
      ? meeting.members.find((candidate) => candidate.accessKeyHash === hashAccessKey(accessKey))
      : undefined;
    const canManage = member?.role === 'host' || member?.role === 'cohost';
    if (!isServer && !canManage) {
      throw new ApiError(403, 'host_access_required', 'Host or co-host access is required.');
    }

    const input = updateMeetingSchema.parse(request.body);
    const updated: StoredMeeting = {
      ...meeting,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.access !== undefined ? { access: input.access } : {}),
      ...(input.features !== undefined
        ? { features: { ...meeting.features, ...input.features } }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    await store.update(updated);
    response.json(toMeetingSummary(updated));
  });

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'route_not_found', 'The requested endpoint does not exist.'));
  });

  app.use((
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: 'invalid_request',
        message: 'The request body is invalid.',
        details: error.flatten(),
      });
      return;
    }
    if (error instanceof ApiError) {
      response.status(error.status).json({
        error: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      });
      return;
    }
    console.error(error);
    response.status(500).json({
      error: 'internal_error',
      message: 'QuickMeet could not process the request.',
    });
  });

  return app;
}
