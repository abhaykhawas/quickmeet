# Self-hosting and production deployment

## Local all-in-one stack

```bash
cp .env.example .env
docker compose up --build
```

This runs the demo on port 5173, the QuickMeet API on 8787, and LiveKit on 7880/7881/7882.

The bundled LiveKit `--dev` mode and credentials are only for localhost.

## Production topology

Deploy four pieces:

1. The static `apps/demo` build or your own integrating frontend.
2. The `apps/server` container behind HTTPS.
3. A production LiveKit deployment behind WSS with UDP media ports reachable.
4. MongoDB Atlas or another reachable MongoDB deployment.

For a single server, a reverse proxy may route:

- `https://app.example.com` to the frontend
- `https://meet-api.example.com` to QuickMeet API port 8787
- `wss://livekit.example.com` to LiveKit signaling

Follow LiveKit’s self-hosting guide for public IP discovery, firewall ports, TLS, TURN, Redis, and multi-node configuration.

## Managed free-tier deployment

The repository includes provider configuration for this topology:

- Netlify serves the React/Vite demo from `apps/demo/dist`.
- Render builds the API from `apps/server/Dockerfile`.
- LiveKit Cloud provides the WebRTC signaling, SFU, TURN, and media network.
- MongoDB Atlas stores meeting definitions.

### 1. LiveKit Cloud

Create a LiveKit Cloud project and a service-account API key. Keep the generated
secret open until it has been copied into Render. You need:

```dotenv
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...
```

Do not put these values in Netlify or frontend code.

### 2. Netlify site URL

Import the GitHub repository into Netlify. The root `netlify.toml` sets the
monorepo build command, publish directory, Node version, and SPA fallback.

The first build can run before the API URL is known. Record the generated
`https://<site>.netlify.app` URL for the Render configuration.

### 3. Render API

Create a Render Blueprint from this repository. The root `render.yaml`:

- uses the free web-service instance in Singapore;
- builds the server Dockerfile with the repository root as its Docker context;
- probes `/health`;
- generates `QUICKMEET_API_KEY`; and
- prompts for every provider secret instead of storing it in Git.

Set both `PUBLIC_APP_URL` and `CORS_ORIGIN` to the production Netlify origin.
Set `MONGO_URI` to the Atlas connection string and add the three LiveKit values
from step 1.

The checked-in Blueprint sets `DEMO_MODE=true` because the included public demo
creates meetings directly from the browser. For an application that creates
meetings through its own authenticated backend, switch this to `false` and use
`QUICKMEET_API_KEY` only from that trusted backend.

### 4. Netlify API URL

After Render is live, add this Netlify environment variable and redeploy:

```dotenv
VITE_QUICKMEET_API_URL=https://<service>.onrender.com
```

Vite compiles this public API origin into the frontend bundle. No API or
LiveKit secret belongs in Netlify.

### 5. Verify

Check the API first:

```bash
curl https://<service>.onrender.com/health
```

Then create and join a meeting on the Netlify site. Use a second browser or
private window to verify camera, microphone, screen sharing, chat, and the
participant layout. The browser should connect directly to the LiveKit Cloud
WSS endpoint using a short-lived token issued by the Render API.

## Required environment variables

```dotenv
PORT=8787
PUBLIC_APP_URL=https://app.example.com
QUICKMEET_API_KEY=replace-with-at-least-32-random-bytes
DEMO_MODE=false
CORS_ORIGIN=https://app.example.com,https://admin.example.com

MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/quickmeet
MONGO_COLLECTION=quickmeet_meetings

LIVEKIT_URL=wss://livekit.example.com
LIVEKIT_API_KEY=replace-me
LIVEKIT_API_SECRET=replace-with-a-long-random-secret
```

Generate secrets with your platform’s secret manager or a cryptographically secure random generator.

## Networking

- QuickMeet API: inbound TCP through your HTTPS proxy.
- LiveKit signaling: inbound HTTPS/WSS.
- LiveKit WebRTC: expose the TCP fallback and configured UDP port or UDP range.
- TURN: configure for users behind restrictive networks.
- Never proxy UDP media through a normal HTTP reverse proxy.

## Persistence

The default `MongoMeetingStore` writes meeting definitions to the collection named
by `MONGO_COLLECTION` (`quickmeet_meetings` by default). It creates unique indexes
for meeting IDs and slugs during startup, so multiple API instances can share the
same database.

Store invitation hashes, not plaintext invitation keys. The current model already
stores only SHA-256 hashes after returning newly created keys once.

Chat is ephemeral and travels through LiveKit’s data channel. Add your own chat service if history, moderation, retention, or compliance storage is required.

## Security checklist

- `DEMO_MODE=false`
- Restrictive `CORS_ORIGIN`
- HTTPS/WSS only
- API and LiveKit secrets in a secret manager
- Application authorization before trusted token issuance
- Rate limiting at the API gateway
- Request body and access logs that redact access keys and tokens
- Short token lifetime adjusted to your requirements
- Database backups if using persistent meeting scheduling
- Regular LiveKit and Node dependency updates

## Build images

```bash
docker build -f apps/server/Dockerfile -t your-org/quickmeet-api:0.1.0 .

docker build \
  -f apps/demo/Dockerfile \
  --build-arg VITE_QUICKMEET_API_URL=https://meet-api.example.com \
  -t your-org/quickmeet-demo:0.1.0 .
```

The frontend API URL is compiled into the Vite build. If you need one image for multiple environments, load runtime configuration from your own backend instead.

## Health check

Probe:

```http
GET /health
```

Expected response:

```json
{ "status": "ok", "service": "quickmeet-api" }
```
