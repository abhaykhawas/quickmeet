# @quickmeet/react

Responsive, drop-in React conference UI for the self-hosted QuickMeet stack.
It includes camera, microphone, screen sharing, chat, participant grids, and
host/co-host-aware room controls.

## Install

```bash
npm install @quickmeet/react
```

React 18 or newer is required.

## Use

```tsx
import { QuickMeetConference } from '@quickmeet/react';
import '@quickmeet/react/styles.css';

export function Call({ credentials }) {
  return (
    <div style={{ height: '100dvh' }}>
      <QuickMeetConference
        credentials={credentials}
        brandName="Acme"
        initialCameraEnabled
        initialMicrophoneEnabled
        onLeave={() => window.location.assign('/dashboard')}
      />
    </div>
  );
}
```

Obtain `credentials` from your authenticated backend using `@quickmeet/node`, or
from an invitation exchange using `@quickmeet/sdk`. The parent element must have
a defined height.

## License

Apache-2.0
