# QuickMeet in a MERN application

This guide integrates the self-hosted QuickMeet server and React conference UI into an existing MERN application:

- MongoDB stores your application's calls and membership rules.
- Express authenticates users, creates meetings, and issues join credentials.
- React renders the meeting with `QuickMeetConference`.
- QuickMeet manages meeting policy and signs LiveKit access tokens.
- LiveKit carries camera, microphone, screen-share, and chat traffic.

The recommended request flow is:

```text
React application
      |
      | POST /api/calls/:callId/join
      | Existing application login/JWT
      v
Your Express backend
      |
      | @quickmeet/node
      | X-QuickMeet-API-Key (server only)
      v
QuickMeet API -----------------> LiveKit
      |                            ^
      | safe join credentials      |
      v                            | WebRTC
React application ----------------+
```

The browser never receives `QUICKMEET_API_KEY`, `LIVEKIT_API_SECRET`, or permission to choose its own role.

## 1. Example project structure

This guide assumes an application organized like this:

```text
my-mern-app/
  server/
    .env
    package.json
    src/
      middleware/requireAuth.js
      models/Call.js
      models/User.js
      routes/calls.js
      quickmeet.js
      server.js
  client/
    .env
    package.json
    src/
      pages/CreateCallPage.jsx
      pages/CallPage.jsx
      api.js
      App.jsx
      main.jsx
      styles.css
```

Node.js 20 or newer is required.

## 2. Start the self-hosted QuickMeet services

QuickMeet runs beside your MERN application. It is not mounted inside Express.

In the QuickMeet repository, configure `.env`:

```dotenv
# QuickMeet meeting API
PORT=8787
PUBLIC_API_URL=http://localhost:8787
PUBLIC_APP_URL=http://localhost:3000
QUICKMEET_API_KEY=replace-this-with-a-long-random-secret
DEMO_MODE=false
CORS_ORIGIN=http://localhost:3000

# QuickMeet meeting storage
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/quickmeet
MONGO_COLLECTION=quickmeet_meetings

# Local LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

`PUBLIC_APP_URL` is used when QuickMeet creates invitation links. Point it at your React application in production.
If your product only uses authenticated `/calls/:callId` joins, the trusted join flow does not use those generated links.

Start LiveKit and only the QuickMeet API:

```bash
docker compose up -d livekit
npm run dev -w @quickmeet/server
```

Using only the API avoids starting the included demo frontend on port `5173`.

Check the API:

```bash
curl http://localhost:8787/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "quickmeet-api"
}
```

## 3. Install the SDK packages

When the packages are available from your npm registry, install them normally.

In the Express application:

```bash
cd my-mern-app/server
npm install @quickmeet/node
```

In the React application:

```bash
cd my-mern-app/client
npm install @quickmeet/react @quickmeet/sdk livekit-client @livekit/components-react
```

### Using this repository before publishing the packages

Build and package the SDKs from the QuickMeet repository:

```bash
npm run build
mkdir -p artifacts
npm pack -w @quickmeet/sdk --pack-destination artifacts
npm pack -w @quickmeet/node --pack-destination artifacts
npm pack -w @quickmeet/react --pack-destination artifacts
```

This creates versioned `.tgz` packages under `artifacts/`.

Install both the shared SDK and Node SDK in your Express application:

```bash
cd my-mern-app/server
npm install \
  /absolute/path/to/video_conference/artifacts/quickmeet-sdk-0.1.0.tgz \
  /absolute/path/to/video_conference/artifacts/quickmeet-node-0.1.0.tgz
```

Install the shared SDK and React SDK in your frontend:

```bash
cd my-mern-app/client
npm install \
  /absolute/path/to/video_conference/artifacts/quickmeet-sdk-0.1.0.tgz \
  /absolute/path/to/video_conference/artifacts/quickmeet-react-0.1.0.tgz \
  livekit-client \
  @livekit/components-react
```

Rebuild and reinstall the tarballs after changing SDK source code.

## 4. Express backend

Install the remaining example dependencies:

```bash
cd my-mern-app/server
npm install express mongoose cors dotenv jsonwebtoken
```

Make the backend an ES module because `@quickmeet/node` uses ESM.

### `server/package.json`

```json
{
  "name": "my-mern-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js"
  }
}
```

### `server/.env`

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/my-mern-app
CLIENT_URL=http://localhost:3000

# Your existing application authentication secret
JWT_SECRET=replace-with-your-existing-jwt-secret

# Server-to-server QuickMeet connection
QUICKMEET_API_URL=http://localhost:8787
QUICKMEET_API_KEY=replace-this-with-the-same-secret-used-by-quickmeet
```

Do not prefix either QuickMeet value with `VITE_` or otherwise expose them to the React build.

### `server/src/quickmeet.js`

Create one server client and reuse it:

```js
import { QuickMeetServerClient } from '@quickmeet/node';

export const quickmeet = new QuickMeetServerClient({
  apiUrl: process.env.QUICKMEET_API_URL,
  apiKey: process.env.QUICKMEET_API_KEY,
});
```

### `server/src/models/User.js`

Use your existing User model. This minimal shape only documents the fields used below:

```js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model('User', userSchema);
```

### `server/src/models/Call.js`

Store the mapping between your MongoDB call and the QuickMeet meeting:

```js
import mongoose from 'mongoose';

const callMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['host', 'cohost', 'participant'],
      required: true,
    },
  },
  { _id: false },
);

const callSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    quickmeetMeetingId: { type: String, required: true, unique: true },
    quickmeetSlug: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: { type: [callMemberSchema], default: [] },
    features: {
      camera: { type: Boolean, default: true },
      microphone: { type: Boolean, default: true },
      screenShare: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const Call =
  mongoose.models.Call || mongoose.model('Call', callSchema);
```

Do not store LiveKit participant tokens in MongoDB. They are temporary credentials and should be issued when a user joins.

### `server/src/middleware/requireAuth.js`

Connect QuickMeet to your existing authentication middleware. The important result is a trusted `req.user` containing the authenticated user's ID and display name.

This example accepts your application's existing bearer JWT:

```js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication is required.' });
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);

    if (!claims.sub || !claims.name) {
      return res.status(401).json({ message: 'The login token is incomplete.' });
    }

    req.user = {
      id: String(claims.sub),
      name: String(claims.name),
      email: claims.email ? String(claims.email) : undefined,
    };

    next();
  } catch {
    return res.status(401).json({ message: 'The login token is invalid.' });
  }
}
```

If your application uses an HTTP-only session cookie, keep that authentication system and only ensure it sets the equivalent `req.user`.

### `server/src/routes/calls.js`

This router creates a call, authorizes joins, and updates feature settings:

```js
import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Call } from '../models/Call.js';
import { User } from '../models/User.js';
import { quickmeet } from '../quickmeet.js';

export const callsRouter = Router();

callsRouter.use(requireAuth);

callsRouter.param('callId', (req, res, next, callId) => {
  if (!mongoose.isValidObjectId(callId)) {
    return res.status(404).json({ message: 'Call not found.' });
  }
  next();
});

const featureNames = ['camera', 'microphone', 'screenShare', 'chat'];

function normalizeFeatures(input = {}) {
  return Object.fromEntries(
    featureNames.map((name) => [name, input[name] !== false]),
  );
}

function memberRole(call, userId) {
  return call.members.find(
    (member) => String(member.userId) === String(userId),
  )?.role;
}

// Create a MongoDB call and its corresponding QuickMeet meeting.
callsRouter.post('/', async (req, res, next) => {
  try {
    const {
      title,
      coHostUserIds = [],
      participantUserIds = [],
      features: requestedFeatures,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'A call title is required.' });
    }

    const hostId = String(req.user.id);
    const coHostIds = [...new Set(coHostUserIds.map(String))]
      .filter((id) => id !== hostId);
    const participantIds = [...new Set(participantUserIds.map(String))]
      .filter((id) => id !== hostId && !coHostIds.includes(id));
    const requestedIds = [...coHostIds, ...participantIds];

    if (requestedIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'A member ID is invalid.' });
    }

    const invitedUsers = await User.find({
      _id: { $in: requestedIds },
    }).lean();

    if (invitedUsers.length !== requestedIds.length) {
      return res.status(400).json({
        message: 'One or more selected users do not exist.',
      });
    }

    const usersById = new Map(
      invitedUsers.map((user) => [String(user._id), user]),
    );
    const coHosts = coHostIds.map((id) => usersById.get(id));
    const participants = participantIds.map((id) => usersById.get(id));
    const features = normalizeFeatures(requestedFeatures);

    const created = await quickmeet.createMeeting({
      name: title.trim(),
      host: {
        id: hostId,
        name: req.user.name,
        email: req.user.email,
      },
      coHosts: coHosts.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
      })),
      participants: participants.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
      })),
      access: 'invite-only',
      features,
    });

    const call = await Call.create({
      title: created.meeting.name,
      quickmeetMeetingId: created.meeting.id,
      quickmeetSlug: created.meeting.slug,
      createdBy: req.user.id,
      members: [
        { userId: req.user.id, role: 'host' },
        ...coHostIds.map((userId) => ({ userId, role: 'cohost' })),
        ...participantIds.map((userId) => ({
          userId,
          role: 'participant',
        })),
      ],
      features: created.meeting.features,
    });

    // For signed-in application users, do not return QuickMeet access keys.
    // If you email invitation links, send created.invitations from this
    // backend and never expose the entire invitations array to all users.
    return res.status(201).json({
      id: call.id,
      title: call.title,
      features: call.features,
      joinPath: `/calls/${call.id}`,
    });
  } catch (error) {
    next(error);
  }
});

// Return safe metadata for an authorized member.
callsRouter.get('/:callId', async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.callId).lean();

    if (!call) {
      return res.status(404).json({ message: 'Call not found.' });
    }

    if (!memberRole(call, req.user.id)) {
      return res.status(403).json({ message: 'You cannot access this call.' });
    }

    return res.json({
      id: String(call._id),
      title: call.title,
      features: call.features,
    });
  } catch (error) {
    next(error);
  }
});

// Issue short-lived credentials using identity and role from MongoDB.
callsRouter.post('/:callId/join', async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.callId).lean();

    if (!call) {
      return res.status(404).json({ message: 'Call not found.' });
    }

    const role = memberRole(call, req.user.id);
    if (!role) {
      return res.status(403).json({ message: 'You cannot join this call.' });
    }

    const credentials = await quickmeet.issueToken({
      meetingId: call.quickmeetMeetingId,
      identity: `app-user-${req.user.id}`,
      name: req.user.name,
      role,
    });

    return res.json(credentials);
  } catch (error) {
    next(error);
  }
});

// Let the host change which meeting features are available.
callsRouter.patch('/:callId/features', async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.callId);

    if (!call) {
      return res.status(404).json({ message: 'Call not found.' });
    }

    if (memberRole(call, req.user.id) !== 'host') {
      return res.status(403).json({
        message: 'Only the host can change call features.',
      });
    }

    const updates = Object.fromEntries(
      featureNames
        .filter((name) => typeof req.body[name] === 'boolean')
        .map((name) => [name, req.body[name]]),
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one feature setting.',
      });
    }

    const meeting = await quickmeet.updateMeeting(call.quickmeetMeetingId, {
      features: updates,
    });

    call.features = meeting.features;
    await call.save();

    return res.json({ features: meeting.features });
  } catch (error) {
    next(error);
  }
});
```

The `/join` route deliberately ignores any `identity`, `name`, or `role` sent by the browser. Those values come from authentication and MongoDB membership.

### `server/src/server.js`

```js
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { callsRouter } from './routes/calls.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/calls', callsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: error instanceof Error
      ? error.message
      : 'The request could not be completed.',
  });
});

await mongoose.connect(process.env.MONGODB_URI);

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(`MERN API listening on http://localhost:${port}`);
});
```

## 5. React frontend

The trusted flow only requires the React component in browser code. Express supplies its `credentials` property.

The examples below use React Router:

```bash
cd my-mern-app/client
npm install react-router-dom
```

### `client/.env`

For a Vite React application:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

This is your Express API URL, not the QuickMeet API URL.

### `client/src/api.js`

This example assumes your existing login flow stores a bearer access token. If you use HTTP-only cookies, remove the `authorization` header and keep `credentials: 'include'`.

```js
const apiUrl = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }

  return body;
}
```

### `client/src/pages/CreateCallPage.jsx`

The host selects features while creating the call:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const initialFeatures = {
  camera: true,
  microphone: true,
  screenShare: true,
  chat: true,
};

export function CreateCallPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [features, setFeatures] = useState(initialFeatures);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleFeature(name) {
    setFeatures((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const call = await api('/calls', {
        method: 'POST',
        body: JSON.stringify({
          title,
          features,

          // Populate these from your application's user picker.
          coHostUserIds: [],
          participantUserIds: [],
        }),
      });

      navigate(call.joinPath);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="create-call">
      <form onSubmit={submit}>
        <h1>Create a call</h1>

        <label>
          Meeting name
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekly product review"
            required
          />
        </label>

        <fieldset>
          <legend>Available features</legend>
          {Object.entries(features).map(([name, enabled]) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggleFeature(name)}
              />
              {name}
            </label>
          ))}
        </fieldset>

        {error && <p role="alert">{error}</p>}

        <button disabled={submitting} type="submit">
          {submitting ? 'Creating…' : 'Create and join'}
        </button>
      </form>
    </main>
  );
}
```

To add co-hosts and participants, submit their MongoDB user IDs in `coHostUserIds` and `participantUserIds`. The Express route loads their trusted names and emails from MongoDB.

### `client/src/pages/CallPage.jsx`

This page requests join credentials from Express and gives them to the drop-in UI:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuickMeetConference } from '@quickmeet/react';
import { api } from '../api.js';

export function CallPage() {
  const { callId } = useParams();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api(`/calls/${callId}/join`, { method: 'POST' })
      .then((result) => {
        if (active) setCredentials(result);
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      });

    return () => {
      active = false;
    };
  }, [callId]);

  if (error) {
    return (
      <main className="call-state">
        <h1>Unable to join</h1>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')}>Back</button>
      </main>
    );
  }

  if (!credentials) {
    return <main className="call-state">Preparing your meeting…</main>;
  }

  return (
    <main className="call-page">
      <QuickMeetConference
        credentials={credentials}
        brandName="My MERN App"
        inviteUrl={window.location.href}
        initialCameraEnabled
        initialMicrophoneEnabled
        onLeave={() => navigate('/dashboard')}
        onError={(caught) => setError(caught.message)}
      />
    </main>
  );
}
```

You can obtain `initialCameraEnabled` and `initialMicrophoneEnabled` from your own pre-join screen instead of always setting them to `true`.

### `client/src/App.jsx`

```jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CallPage } from './pages/CallPage.jsx';
import { CreateCallPage } from './pages/CreateCallPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/calls/new" element={<CreateCallPage />} />
        <Route path="/calls/:callId" element={<CallPage />} />
        <Route path="*" element={<Navigate to="/calls/new" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### `client/src/main.jsx`

Import the QuickMeet stylesheet once at the React application entry point:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@quickmeet/react/styles.css';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### `client/src/styles.css`

The conference parent must have an explicit height:

```css
html,
body,
#root {
  min-height: 100%;
  margin: 0;
}

.call-page {
  width: 100%;
  height: 100dvh;
  min-height: 600px;
}

.call-state {
  display: grid;
  min-height: 100dvh;
  place-content: center;
  font-family: system-ui, sans-serif;
}

.create-call {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 20px;
}
```

The conference component automatically:

- connects to the correct LiveKit room;
- shows only features enabled for this meeting;
- applies host, co-host, and participant permissions;
- renders equal participant grids;
- switches to the screen-share presentation layout;
- cleans up its LiveKit connection when it unmounts.

## 6. Run the complete local system

Four processes are involved:

```text
MongoDB             mongodb://127.0.0.1:27017
LiveKit             ws://localhost:7880
QuickMeet API         http://localhost:8787
Your Express API     http://localhost:5000
Your React app       http://localhost:3000
```

Start them in separate terminals.

QuickMeet repository:

```bash
docker compose up -d livekit
npm run dev -w @quickmeet/server
```

MERN backend:

```bash
cd my-mern-app/server
npm run dev
```

MERN frontend:

```bash
cd my-mern-app/client
npm run dev -- --port 3000
```

Then:

1. Sign in through your existing MERN authentication.
2. Open `http://localhost:3000/calls/new`.
3. Create a call.
4. Open its `/calls/:callId` URL as another authorized user.
5. Test camera and microphone using two browsers or a normal and private window.

Camera, microphone, and screen sharing require `localhost` or HTTPS.

## 7. How feature selection works

Features are selected when Express creates the QuickMeet meeting:

```js
features: {
  camera: true,
  microphone: true,
  screenShare: true,
  chat: false,
}
```

Any combination is valid. For example, a webinar with audio and screen sharing but no participant cameras can use:

```js
features: {
  camera: false,
  microphone: true,
  screenShare: true,
  chat: false,
}
```

The policy is enforced twice:

1. `QuickMeetConference` omits disabled controls.
2. The generated LiveKit token blocks publishing disallowed track types.

Hiding a button in your React application alone is not a security boundary.

Feature changes affect credentials issued after the update. Participants already
inside the room should leave and rejoin when token-level publishing permissions
change.

## 8. Host and co-host behavior

The example assigns roles from `Call.members`:

```text
Call creator                 host
coHostUserIds entries        cohost
participantUserIds entries   participant
```

Hosts and co-hosts receive LiveKit room-admin permission. Participants do not.

Never implement the join endpoint like this:

```js
// Insecure: the browser can promote itself to host.
quickmeet.issueToken({
  identity: req.body.identity,
  name: req.body.name,
  role: req.body.role,
});
```

Always derive these values from your authenticated session and MongoDB authorization data.

## 9. Optional public invitation links

The signed-in flow above is recommended for a MERN product. QuickMeet also supports direct guest invitations.

`createMeeting()` returns:

```js
{
  meeting,
  hostAccessKey,
  invitations
}
```

Each invitation contains a private `accessKey` and optional `joinUrl`. Send a specific invitation from Express through your own email provider. Treat the key like a password.

If you use the generated `joinUrl`, add a React route such as
`/join/:meetingSlug` that renders your guest-name form and performs the exchange
below. The signed-in example uses `/calls/:callId` instead and therefore does not
need that guest route.

A public React invitation page can exchange that key with the browser SDK:

```js
import { QuickMeetClient } from '@quickmeet/sdk';

const quickmeet = new QuickMeetClient({
  apiUrl: 'http://localhost:8787',
});

const accessKey =
  new URLSearchParams(window.location.search).get('key') || undefined;

const credentials = await quickmeet.joinMeeting(meetingSlug, {
  name: guestName,
  accessKey,
});
```

Pass the returned `credentials` to `QuickMeetConference`. An invite-only meeting rejects missing or invalid access keys.

For this direct-browser flow, `CORS_ORIGIN` on the QuickMeet service must contain the React application's origin.

## 10. Production configuration

Change the local development values before deployment:

```dotenv
DEMO_MODE=false
CORS_ORIGIN=https://app.example.com
PUBLIC_APP_URL=https://app.example.com
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/quickmeet
MONGO_COLLECTION=quickmeet_meetings
LIVEKIT_URL=wss://livekit.example.com
LIVEKIT_API_KEY=production-livekit-key
LIVEKIT_API_SECRET=production-livekit-secret
QUICKMEET_API_KEY=a-separate-long-random-secret
```

Production requirements:

- Serve the React and Express applications over HTTPS.
- Serve LiveKit signaling over WSS.
- Keep `QUICKMEET_API_KEY` only in Express and the QuickMeet service.
- Keep `LIVEKIT_API_SECRET` only in the QuickMeet service.
- Keep `MONGO_URI` only in the QuickMeet service.
- Configure LiveKit's public IP, UDP ports, TURN, TLS, and Redis as required.
- Back up the MongoDB collection used for persistent meeting definitions.
- Add rate limiting and your normal audit logging to call creation and join routes.
- Do not log participant tokens or invitation access keys.
- Validate that the authenticated user is still a call member on every join.

## 11. Integration checklist

- [ ] LiveKit is reachable from participants' browsers.
- [ ] The QuickMeet API health endpoint returns `200`.
- [ ] `DEMO_MODE=false` outside the included demo environment.
- [ ] Express and QuickMeet use the same `QUICKMEET_API_KEY`.
- [ ] The API key is absent from the React bundle and browser network requests.
- [ ] Express derives participant identity and role from trusted application data.
- [ ] The React conference parent has a defined height.
- [ ] `@quickmeet/react/styles.css` is imported once.
- [ ] Camera and microphone are tested through HTTPS or `localhost`.
- [ ] Two different authenticated users can join the same MongoDB call.
- [ ] Disabled features are absent and rejected by LiveKit permissions.
