# QuickMeet

QuickMeet is a small, self-hosted video conferencing stack and embeddable SDK. It provides:

- Camera and microphone controls
- Screen sharing
- Realtime room chat
- Host, co-host, and participant roles
- Open-link or invite-only rooms
- Per-meeting feature flags
- A framework-neutral browser API client
- A drop-in React conference component
- A server-to-server Node.js SDK
- A complete demo application

The realtime media layer uses the open-source [LiveKit](https://github.com/livekit/livekit) SFU. QuickMeet adds the meeting model, roles, invitations, feature policy, REST API, SDK wrappers, and user interface.

## Repository layout

```text
apps/
  demo/          React/Vite example product and meeting UI
  server/        Meeting, invitation, and LiveKit token API
packages/
  sdk/           @quickmeet/sdk browser/API client and shared types
  react/         @quickmeet/react drop-in conference component
  node-sdk/      @quickmeet/node trusted backend client
docs/
  API.md
  DEPLOYMENT.md
  INTEGRATION.md
```

## Run locally

Requirements: Node.js 20+, Docker, and a MongoDB connection string.

```bash
cp .env.example .env
# Set MONGO_URI in .env to your MongoDB Atlas connection string.
npm install
docker compose up -d livekit
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Services:

| Service | Address | Purpose |
|---|---|---|
| Demo | `http://localhost:5173` | Example application |
| QuickMeet API | `http://localhost:8787` | Meetings and join credentials |
| LiveKit | `ws://localhost:7880` | WebRTC signaling and media |
| MongoDB | `MONGO_URI` | Persistent meeting configuration |

To run the entire stack in Docker:

```bash
docker compose up --build
```

Then open `http://localhost:5173`.

Camera and microphone access require `localhost` or HTTPS. Test a multi-person room using two browsers or a normal and private window.

## Use in another application

The recommended flow keeps all secrets on your backend:

```text
Your frontend ──authenticated request──> Your backend
                                           │
                              @quickmeet/node│
                                           ▼
                                      QuickMeet API
                                           │
                                    signed join token
                                           ▼
Your frontend <──────────────────── Your backend
      │
      └── @quickmeet/react ─────────> LiveKit
```

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for complete Express, Next.js-style, React, and vanilla JavaScript examples.

## Feature selection

Features are chosen when a meeting is created:

```ts
features: {
  camera: true,
  microphone: true,
  screenShare: true,
  chat: false,
}
```

Any combination is valid. The React component omits disabled controls. When all media publishing features are off, the generated LiveKit token also prevents media publishing. Chat permission is controlled separately.

## Commands

```bash
npm run dev          # API + demo with hot reload
npm run dev:media    # LiveKit in the foreground
npm run typecheck
npm test
npm run build
npm run check        # typecheck + tests + production builds
```

## Production notes

QuickMeet persists meeting definitions in MongoDB. Set `MONGO_URI` to an Atlas or
self-hosted MongoDB connection string and optionally set `MONGO_COLLECTION`
(defaults to `quickmeet_meetings`). The API creates unique indexes for meeting IDs
and slugs when it starts.

Before exposing the service:

- Set `DEMO_MODE=false`.
- Use a long random `QUICKMEET_API_KEY`.
- Replace the LiveKit development key and secret.
- Serve the API over HTTPS and LiveKit over WSS.
- Configure LiveKit’s external IP, UDP ports, TURN, and Redis.
- Restrict `CORS_ORIGIN` to your frontend origins.
- Keep QuickMeet and LiveKit API secrets out of browser code.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production checklist.

## Scale and storage

LiveKit is an SFU, so participants send one upstream media stream rather than one stream per peer. The bundled LiveKit development configuration is for local use only. Room definitions are stored in MongoDB; chat messages use LiveKit’s realtime data channel and are not persisted.

## License

Apache 2.0. See [LICENSE](LICENSE).
