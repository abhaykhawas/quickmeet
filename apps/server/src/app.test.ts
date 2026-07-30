import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { AppConfig } from './config.js';
import { createApp } from './app.js';
import { MemoryMeetingStore } from './store.js';
import type { TokenIssuer } from './token.js';

const config: AppConfig = {
  port: 0,
  publicAppUrl: 'http://localhost:5173',
  apiKey: 'test-api-key',
  demoMode: true,
  corsOrigins: ['http://localhost:5173'],
  livekitUrl: 'ws://localhost:7880',
  livekitApiKey: 'devkey',
  livekitApiSecret: 'secret',
  mongoUri: 'mongodb://unused-in-memory-test',
  mongoCollection: 'unused-in-memory-test',
};

const issuer: TokenIssuer = {
  async issue(_meeting, participant) {
    return `token-for-${participant.identity}-${participant.role}`;
  },
};

describe('QuickMeet API', () => {
  const store = new MemoryMeetingStore();
  const server = createApp(config, store, issuer).listen(0);
  let baseUrl = '';

  before(async () => {
    await store.initialize();
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    server.close();
    await store.close();
  });

  it('creates a configurable meeting and joins the host with the host role', async () => {
    const createResponse = await fetch(`${baseUrl}/v1/meetings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Design review',
        host: { name: 'Ada' },
        coHosts: [{ name: 'Lin' }],
        features: { chat: false },
        access: 'invite-only',
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json() as {
      meeting: { slug: string; features: { chat: boolean; camera: boolean } };
      hostAccessKey: string;
      invitations: unknown[];
    };
    assert.equal(created.meeting.features.chat, false);
    assert.equal(created.meeting.features.camera, true);
    assert.equal(created.invitations.length, 1);

    const joinResponse = await fetch(
      `${baseUrl}/v1/meetings/${created.meeting.slug}/join`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Ada', accessKey: created.hostAccessKey }),
      },
    );
    assert.equal(joinResponse.status, 200);
    const joined = await joinResponse.json() as {
      participant: { role: string };
      participantToken: string;
    };
    assert.equal(joined.participant.role, 'host');
    assert.match(joined.participantToken, /host$/);
  });

  it('blocks an uninvited guest from an invite-only meeting', async () => {
    const createResponse = await fetch(`${baseUrl}/v1/meetings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Private sync',
        host: { name: 'Grace' },
        access: 'invite-only',
      }),
    });
    const created = await createResponse.json() as { meeting: { id: string } };
    const response = await fetch(
      `${baseUrl}/v1/meetings/${created.meeting.id}/join`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Unknown guest' }),
      },
    );
    assert.equal(response.status, 403);
  });

  it('requires the server key for trusted token issuance', async () => {
    const createResponse = await fetch(`${baseUrl}/v1/meetings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'API meeting', host: { name: 'Host' } }),
    });
    const created = await createResponse.json() as { meeting: { id: string } };

    const denied = await fetch(`${baseUrl}/v1/meetings/${created.meeting.id}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity: 'user-1', name: 'User' }),
    });
    assert.equal(denied.status, 401);

    const allowed = await fetch(`${baseUrl}/v1/meetings/${created.meeting.id}/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-quickmeet-api-key': config.apiKey,
      },
      body: JSON.stringify({ identity: 'user-1', name: 'User', role: 'cohost' }),
    });
    assert.equal(allowed.status, 200);
    const joined = await allowed.json() as { participant: { role: string } };
    assert.equal(joined.participant.role, 'cohost');
  });
});
