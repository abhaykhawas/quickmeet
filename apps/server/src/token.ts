import { AccessToken, TrackSource } from 'livekit-server-sdk';
import type { MeetingRole } from '@quickmeet/sdk';
import type { AppConfig } from './config.js';
import type { StoredMeeting } from './model.js';

export interface TokenParticipant {
  identity: string;
  name: string;
  role: MeetingRole;
}

export interface TokenIssuer {
  issue(meeting: StoredMeeting, participant: TokenParticipant): Promise<string>;
}

export class LiveKitTokenIssuer implements TokenIssuer {
  constructor(private readonly config: AppConfig) {}

  async issue(meeting: StoredMeeting, participant: TokenParticipant): Promise<string> {
    const allowedSources: TrackSource[] = [];
    if (meeting.features.camera) allowedSources.push(TrackSource.CAMERA);
    if (meeting.features.microphone) allowedSources.push(TrackSource.MICROPHONE);
    if (meeting.features.screenShare) {
      allowedSources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
    }
    const token = new AccessToken(
      this.config.livekitApiKey,
      this.config.livekitApiSecret,
      {
        identity: participant.identity,
        name: participant.name,
        ttl: '6h',
        metadata: JSON.stringify({
          role: participant.role,
          meetingId: meeting.id,
          features: meeting.features,
        }),
        attributes: {
          'quickmeet.role': participant.role,
          'quickmeet.meetingId': meeting.id,
        },
      },
    );

    token.addGrant({
      room: meeting.livekitRoom,
      roomJoin: true,
      roomAdmin: participant.role === 'host' || participant.role === 'cohost',
      canSubscribe: true,
      canPublish: meeting.features.camera
        || meeting.features.microphone
        || meeting.features.screenShare,
      canPublishSources: allowedSources,
      canPublishData: meeting.features.chat,
    });

    return token.toJwt();
  }
}
