# @quickmeet/node

Server-to-server Node.js client for the self-hosted QuickMeet video conferencing
API. Use it to create meetings, update meeting policy, and issue trusted
participant credentials.

## Install

```bash
npm install @quickmeet/node
```

## Use

```ts
import { QuickMeetServerClient } from '@quickmeet/node';

const quickmeet = new QuickMeetServerClient({
  apiUrl: process.env.QUICKMEET_API_URL!,
  apiKey: process.env.QUICKMEET_API_KEY!,
});

const created = await quickmeet.createMeeting({
  name: 'Weekly review',
  host: { id: currentUser.id, name: currentUser.name },
  access: 'invite-only',
  features: {
    camera: true,
    microphone: true,
    screenShare: true,
    chat: false,
  },
});
```

Keep the API key on the server. Authenticate and authorize application users
before calling `issueToken`; never accept participant roles directly from an
untrusted browser.

## License

Apache-2.0
