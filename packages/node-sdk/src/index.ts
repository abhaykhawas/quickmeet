import type {
  CreateMeetingInput,
  CreateMeetingResult,
  JoinCredentials,
  MeetingRole,
  MeetingSummary,
  UpdateMeetingInput,
} from '@quickmeet/sdk';

export interface QuickMeetServerClientOptions {
  apiUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

export interface IssueTokenInput {
  meetingId: string;
  identity: string;
  name: string;
  role?: MeetingRole;
}

export class QuickMeetServerClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: QuickMeetServerClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
    return this.request('/v1/meetings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateMeeting(meetingId: string, input: Omit<UpdateMeetingInput, 'accessKey'>): Promise<MeetingSummary> {
    return this.request(`/v1/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  issueToken(input: IssueTokenInput): Promise<JoinCredentials> {
    return this.request(`/v1/meetings/${encodeURIComponent(input.meetingId)}/token`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-quickmeet-api-key': this.apiKey,
        ...init.headers,
      },
    });
    const body = await response.json() as T | { message?: string };

    if (!response.ok) {
      throw new Error(
        `QuickMeet request failed (${response.status}): ${
          'message' in (body as object) ? (body as { message?: string }).message : 'Unknown error'
        }`,
      );
    }

    return body as T;
  }
}

export type {
  CreateMeetingInput,
  CreateMeetingResult,
  JoinCredentials,
  MeetingFeatures,
  MeetingRole,
  MeetingSummary,
  PersonInput,
  UpdateMeetingInput,
} from '@quickmeet/sdk';
