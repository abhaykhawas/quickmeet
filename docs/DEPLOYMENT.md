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
