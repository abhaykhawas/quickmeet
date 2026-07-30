import {
  QuickMeetApiError,
  QuickMeetClient,
  type CreateMeetingInput,
  type CreateMeetingResult,
  type JoinCredentials,
  type MeetingSummary,
} from '@quickmeet/sdk';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CreateMeeting } from './CreateMeeting.js';
import { Docs } from './Docs.js';
import { JoinMeeting } from './JoinMeeting.js';
import { Landing } from './Landing.js';

const apiUrl = import.meta.env.VITE_QUICKMEET_API_URL ?? 'http://localhost:8787';
const QuickMeetConference = lazy(async () => {
  const module = await import('@quickmeet/react');
  return { default: module.QuickMeetConference };
});

function messageFor(error: unknown): string {
  if (error instanceof QuickMeetApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function App() {
  const client = useMemo(() => new QuickMeetClient({ apiUrl }), []);
  const [created, setCreated] = useState<CreateMeetingResult | null>(null);
  const [meeting, setMeeting] = useState<MeetingSummary | null>(null);
  const [credentials, setCredentials] = useState<JoinCredentials | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = window.location.pathname;
  const joinSlug = path.startsWith('/join/')
    ? decodeURIComponent(path.slice('/join/'.length).split('/')[0] ?? '')
    : '';

  useEffect(() => {
    if (!joinSlug || credentials) return;
    setBusy(true);
    client.getMeeting(joinSlug)
      .then(setMeeting)
      .catch((caught) => setError(messageFor(caught)))
      .finally(() => setBusy(false));
  }, [client, credentials, joinSlug]);

  async function create(input: CreateMeetingInput) {
    setBusy(true);
    setError('');
    try {
      setCreated(await client.createMeeting(input));
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  async function enterCreated() {
    if (!created) return;
    setBusy(true);
    setError('');
    try {
      const joined = await client.joinMeeting(created.meeting.slug, {
        name: created.meeting.host.name,
        accessKey: created.hostAccessKey,
      });
      window.history.replaceState({}, '', `/join/${created.meeting.slug}`);
      setCredentials(joined);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  async function join(name: string, accessKey?: string) {
    setBusy(true);
    setError('');
    try {
      setCredentials(await client.joinMeeting(joinSlug, { name, accessKey }));
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  if (credentials) {
    const cameraSetting = sessionStorage.getItem('quickmeet.initialCamera');
    const microphoneSetting = sessionStorage.getItem('quickmeet.initialMicrophone');
    return (
      <div className="conference-page">
        <Suspense fallback={<div className="conference-loading">Preparing your room…</div>}>
          <QuickMeetConference
            credentials={credentials}
            brandName="QuickMeet"
            initialCameraEnabled={cameraSetting !== 'false'}
            initialMicrophoneEnabled={microphoneSetting !== 'false'}
            inviteUrl={credentials.meeting.access === 'open'
              ? `${window.location.origin}/join/${credentials.meeting.slug}`
              : undefined}
            onLeave={() => window.location.assign('/')}
            onError={(caught: Error) => setError(messageFor(caught))}
          />
        </Suspense>
        {error && <div className="meeting-toast">{error}</div>}
      </div>
    );
  }

  if (path === '/create') {
    return (
      <CreateMeeting
        onCreate={create}
        result={created}
        onEnter={enterCreated}
        error={error}
        busy={busy}
      />
    );
  }

  if (path === '/docs') return <Docs />;

  if (joinSlug) {
    return (
      <JoinMeeting
        meeting={meeting}
        loading={busy}
        error={error}
        onJoin={join}
      />
    );
  }

  return <Landing />;
}
