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
        initialCameraDeviceId={selectedCameraId}
        initialMicrophoneDeviceId={selectedMicrophoneId}
        onLeave={() => window.location.assign('/dashboard')}
      />
    </div>
  );
}
```

Obtain `credentials` from your authenticated backend using `@quickmeet/node`, or
from an invitation exchange using `@quickmeet/sdk`. The parent element must have
a defined height.

The optional device IDs come from `navigator.mediaDevices.enumerateDevices()`.
The conference toolbar also lists available cameras and microphones and lets
participants switch devices without leaving the room. Browsers may hide device
names until the user grants camera or microphone permission.

## License

Apache-2.0
