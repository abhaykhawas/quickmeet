# QuickMeet HTTP API

Base URL in development: `http://localhost:8787`

All request and response bodies use JSON. Errors use:

```json
{
  "error": "machine_readable_code",
  "message": "Human-readable explanation",
  "details": {}
}
```

## Authentication

Trusted endpoints use:

```http
X-QuickMeet-API-Key: your-server-api-key
```

Host-managed updates may instead use:

```http
X-QuickMeet-Access-Key: host-or-cohost-invitation-key
```

When `DEMO_MODE=true`, `POST /v1/meetings` is public so the included demo can create rooms directly. Never enable this on a public production service.

## `GET /health`

Returns service health.

## `POST /v1/meetings`

Creates a meeting. Requires the server API key unless demo mode is enabled.

```json
{
  "name": "Design review",
  "host": { "id": "u1", "name": "Aarav", "email": "a@example.com" },
  "coHosts": [{ "id": "u2", "name": "Priya" }],
  "participants": [{ "id": "u3", "name": "Rohan" }],
  "access": "invite-only",
  "features": {
    "camera": true,
    "microphone": true,
    "screenShare": true,
    "chat": false
  }
}
```

Missing feature flags default to `true`. `access` defaults to `open`.

## `GET /v1/meetings/:idOrSlug`

Returns safe meeting metadata. Invitation secrets and member details are never returned.

## `POST /v1/meetings/:idOrSlug/join`

Browser invitation join:

```json
{
  "name": "Guest name",
  "accessKey": "required-for-invite-only"
}
```

Returns:

```json
{
  "serverUrl": "wss://livekit.example.com",
  "participantToken": "signed-livekit-jwt",
  "meeting": {},
  "participant": {
    "identity": "member_u3",
    "name": "Guest name",
    "role": "participant"
  }
}
```

## `POST /v1/meetings/:idOrSlug/token`

Trusted backend join. Requires `X-QuickMeet-API-Key`.

```json
{
  "identity": "your-application-user-id",
  "name": "Aarav",
  "role": "participant"
}
```

Allowed roles: `host`, `cohost`, `participant`.

Your backend must authenticate the user and authorize the requested meeting and role before calling this endpoint.

## `PATCH /v1/meetings/:idOrSlug`

Requires the server API key or a host/co-host access key.

```json
{
  "name": "Updated meeting name",
  "access": "open",
  "features": {
    "chat": true
  }
}
```

At least one field is required.
