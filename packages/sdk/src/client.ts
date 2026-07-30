import type {
  ApiErrorBody,
  CreateMeetingInput,
  CreateMeetingResult,
  JoinCredentials,
  JoinMeetingInput,
  MeetingSummary,
  UpdateMeetingInput,
} from './types.js';

export class QuickMeetApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'QuickMeetApiError';
    this.status = status;
    this.code = body.error;
    this.details = body.details;
  }
}

export interface QuickMeetClientOptions {
  apiUrl: string;
  fetch?: typeof globalThis.fetch;
}

export class QuickMeetClient {
  private readonly apiUrl: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: QuickMeetClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, '');
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
    return this.request('/v1/meetings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getMeeting(meetingIdOrSlug: string): Promise<MeetingSummary> {
    return this.request(`/v1/meetings/${encodeURIComponent(meetingIdOrSlug)}`);
  }

  joinMeeting(meetingIdOrSlug: string, input: JoinMeetingInput): Promise<JoinCredentials> {
    return this.request(`/v1/meetings/${encodeURIComponent(meetingIdOrSlug)}/join`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateMeeting(
    meetingIdOrSlug: string,
    input: UpdateMeetingInput,
  ): Promise<MeetingSummary> {
    const { accessKey, ...updates } = input;
    return this.request(`/v1/meetings/${encodeURIComponent(meetingIdOrSlug)}`, {
      method: 'PATCH',
      headers: accessKey ? { 'x-quickmeet-access-key': accessKey } : undefined,
      body: JSON.stringify(updates),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init.headers,
      },
    });

    const body = (await response.json()) as T | ApiErrorBody;
    if (!response.ok) {
      throw new QuickMeetApiError(response.status, body as ApiErrorBody);
    }

    return body as T;
  }
}
