# Integrating QuickMeet

QuickMeet separates trusted backend actions from browser actions:

- Your backend creates meetings and issues join credentials.
- Your frontend renders the room using the join credentials.
- The LiveKit API secret and `QUICKMEET_API_KEY` never enter browser code.

## 1. Configure the self-hosted service

Copy `.env.example` to `.env` and set:

```dotenv
QUICKMEET_API_KEY=a-long-random-server-secret
DEMO_MODE=false
CORS_ORIGIN=https://app.example.com
PUBLIC_APP_URL=https://app.example.com
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/quickmeet
MONGO_COLLECTION=quickmeet_meetings
LIVEKIT_URL=wss://livekit.example.com
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
```

`LIVEKIT_URL` is returned to browsers. Keep the MongoDB and LiveKit credentials only in the QuickMeet API environment.

## 2. Install the packages

Install the published packages needed by each side of your application:

```bash
npm install @quickmeet/node
npm install @quickmeet/sdk @quickmeet/react livekit-client
```

## 3. Create meetings from your backend

```ts
import { QuickMeetServerClient } from '@quickmeet/node';

const quickmeet = new QuickMeetServerClient({
  apiUrl: process.env.QUICKMEET_URL!,
  apiKey: process.env.QUICKMEET_API_KEY!,
});

const created = await quickmeet.createMeeting({
  name: 'Weekly product review',
  host: {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
  },
  coHosts: [
    { id: 'user-2', name: 'Priya', email: 'priya@example.com' },
  ],
  participants: [
    { id: 'user-3', name: 'Rohan', email: 'rohan@example.com' },
  ],
  access: 'invite-only',
  features: {
    camera: true,
    microphone: true,
    screenShare: true,
    chat: false,
  },
});

// Save created.meeting.id beside your application's event/booking.
// Send created.invitations[n].joinUrl through your own email system.
```

The result includes:

- `meeting`: safe public meeting information
- `hostAccessKey`: the host’s private invitation key
- `invitations`: one private access key and link for every co-host/participant

Treat access keys like passwords. Do not log them or store them in analytics.

## 4. Issue trusted credentials to signed-in users

If users enter from an authenticated area of your product, issue credentials on your backend instead of exposing invitation keys:

```ts
// POST /api/calls/:meetingId/join in your own backend
app.post('/api/calls/:meetingId/join', requireUser, async (req, res) => {
  // First verify that req.user may join this meeting.
  const credentials = await quickmeet.issueToken({
    meetingId: req.params.meetingId,
    identity: req.user.id,
    name: req.user.name,
    role: req.user.isModerator ? 'cohost' : 'participant',
  });

  res.json(credentials);
});
```

Never accept `identity` or `role` directly from an untrusted browser without checking them against your application’s session and authorization rules.

## 5. Render the React conference

```tsx
import { useEffect, useState } from 'react';
import {
  QuickMeetConference,
  type QuickMeetConferenceProps,
} from '@quickmeet/react';
import '@quickmeet/react/styles.css';

export function ProductCall({ meetingId }: { meetingId: string }) {
  const [credentials, setCredentials] =
    useState<QuickMeetConferenceProps['credentials']>();

  useEffect(() => {
    fetch(`/api/calls/${meetingId}/join`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then(setCredentials);
  }, [meetingId]);

  if (!credentials) return <p>Joining…</p>;

  return (
    <div style={{ height: '100vh' }}>
      <QuickMeetConference
        credentials={credentials}
        brandName="Acme"
        initialCameraEnabled
        initialMicrophoneEnabled
        onLeave={() => window.location.assign('/dashboard')}
        onError={(error) => console.error(error)}
      />
    </div>
  );
}
```

The parent container needs a defined height. The component is responsive down to phone widths.

## Browser SDK and invitation flow

For public or invitation-link joins:

```ts
import { QuickMeetClient } from '@quickmeet/sdk';

const client = new QuickMeetClient({
  apiUrl: 'https://meet-api.example.com',
});

const meeting = await client.getMeeting('weekly-review-a1b2c3');

const credentials = await client.joinMeeting(meeting.slug, {
  name: 'Aarav',
  accessKey: new URLSearchParams(location.search).get('key') ?? undefined,
});
```

An open meeting does not require `accessKey`. An invite-only meeting does.

## Vanilla JavaScript or another framework

The join result is a standard LiveKit server URL and participant token:

```ts
import { Room } from 'livekit-client';
import { QuickMeetClient } from '@quickmeet/sdk';

const api = new QuickMeetClient({ apiUrl: 'https://meet-api.example.com' });
const credentials = await api.joinMeeting(meetingId, { name: 'Guest' });

const room = new Room({ adaptiveStream: true, dynacast: true });
await room.connect(credentials.serverUrl, credentials.participantToken);

if (credentials.meeting.features.camera) {
  await room.localParticipant.setCameraEnabled(true);
}
if (credentials.meeting.features.microphone) {
  await room.localParticipant.setMicrophoneEnabled(true);
}
```

Build your UI with LiveKit’s native SDK for Vue, Svelte, Flutter, React Native, Swift, Android, Unity, or other supported platforms. Use `credentials.meeting.features` to decide which controls to show.

## Update a meeting

Trusted backend:

```ts
await quickmeet.updateMeeting(meetingId, {
  features: { chat: true },
  access: 'invite-only',
});
```

Host/co-host browser:

```ts
await browserClient.updateMeeting(meetingId, {
  accessKey: hostAccessKey,
  features: { screenShare: false },
});
```

Changes affect credentials issued after the update. Existing participants should rejoin if token-level permissions changed.

## Custom styling

`QuickMeetConference` uses `qm-` prefixed classes and CSS custom properties. Override the variables on the container:

```css
.my-call {
  --qm-coral: #d946ef;
  --qm-mint: #67e8f9;
  --qm-stage: #09090b;
}
```

```tsx
<QuickMeetConference className="my-call" credentials={credentials} />
```
