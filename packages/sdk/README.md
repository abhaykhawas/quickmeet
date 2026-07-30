# @quickmeet/sdk

Framework-neutral browser client and shared TypeScript types for the self-hosted
QuickMeet video conferencing API.

## Install

```bash
npm install @quickmeet/sdk
```

## Browser invitation flow

```ts
import { QuickMeetClient } from '@quickmeet/sdk';

const quickmeet = new QuickMeetClient({
  apiUrl: 'https://meet-api.example.com',
});

const meeting = await quickmeet.getMeeting('weekly-review-a1b2c3');
const credentials = await quickmeet.joinMeeting(meeting.slug, {
  name: 'Aarav',
  accessKey: new URLSearchParams(location.search).get('key') ?? undefined,
});
```

Pass `credentials` to `@quickmeet/react` or connect with `livekit-client`.

Trusted meeting creation and role assignment belong on your backend. Use
`@quickmeet/node` there so the QuickMeet API key never enters browser code.

## License

Apache-2.0
