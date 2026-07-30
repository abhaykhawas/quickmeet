import {
  defaultMeetingFeatures,
  type CreateMeetingResult,
  type MeetingFeatures,
  type PersonInput,
} from '@quickmeet/sdk';
import { type FormEvent, useState } from 'react';
import { Brand } from './Brand.js';

interface CreateMeetingProps {
  onCreate: (input: {
    name: string;
    host: PersonInput;
    coHosts: PersonInput[];
    participants: PersonInput[];
    features: MeetingFeatures;
    access: 'open' | 'invite-only';
  }) => Promise<void>;
  result: CreateMeetingResult | null;
  onEnter: () => Promise<void>;
  error: string;
  busy: boolean;
}

function parsePeople(value: string): PersonInput[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', email] = line.split(',').map((part) => part.trim());
      return { name, ...(email ? { email } : {}) };
    })
    .filter(({ name }) => Boolean(name));
}

function FeatureToggle({
  title,
  detail,
  checked,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="feature-toggle">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

export function CreateMeeting({
  onCreate,
  result,
  onEnter,
  error,
  busy,
}: CreateMeetingProps) {
  const [name, setName] = useState('');
  const [hostName, setHostName] = useState('');
  const [coHosts, setCoHosts] = useState('');
  const [participants, setParticipants] = useState('');
  const [access, setAccess] = useState<'open' | 'invite-only'>('open');
  const [features, setFeatures] = useState(defaultMeetingFeatures);
  const [copied, setCopied] = useState<string | null>(null);

  function setFeature(feature: keyof MeetingFeatures, enabled: boolean) {
    setFeatures((current) => ({ ...current, [feature]: enabled }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreate({
      name,
      host: { name: hostName },
      coHosts: parsePeople(coHosts),
      participants: parsePeople(participants),
      features,
      access,
    });
  }

  async function copy(value: string, id: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  if (result) {
    const openLink = `${window.location.origin}/join/${result.meeting.slug}`;
    return (
      <div className="setup-page">
        <nav className="setup-nav"><Brand /></nav>
        <main className="created-card">
          <span className="success-mark">✓</span>
          <p className="kicker">Your room is ready</p>
          <h1>{result.meeting.name}</h1>
          <p className="created-intro">
            {result.invitations.length > 0
              ? 'Share the personal links below, then enter when you are ready.'
              : 'Copy the room link for guests, then enter when you are ready.'}
          </p>

          <section className="room-link">
            <div>
              <small>Meeting link</small>
              <strong>{openLink}</strong>
            </div>
            <button type="button" onClick={() => copy(openLink, 'open')}>
              {copied === 'open' ? 'Copied' : 'Copy'}
            </button>
          </section>

          {result.invitations.length > 0 && (
            <section className="invite-list">
              <div className="section-heading">
                <h2>Invitations</h2>
                <span>{result.invitations.length}</span>
              </div>
              {result.invitations.map((invite) => (
                <div className="invite-row" key={invite.id}>
                  <span className="person-avatar">{invite.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{invite.name}</strong>
                    <small>{invite.role === 'cohost' ? 'Co-host' : 'Participant'}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(invite.joinUrl ?? invite.accessKey, invite.id)}
                  >
                    {copied === invite.id ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              ))}
            </section>
          )}

          {error && <p className="form-error">{error}</p>}
          <button className="primary-action wide" type="button" onClick={onEnter} disabled={busy}>
            {busy ? 'Opening room…' : 'Enter as host'}
            <span>→</span>
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <nav className="setup-nav"><Brand /></nav>
      <main className="setup-shell">
        <header className="setup-header">
          <a href="/">← Back</a>
          <p className="kicker">New meeting</p>
          <h1>Shape your room.</h1>
          <p>Choose only what your meeting needs. You can change these settings later.</p>
        </header>

        <form className="setup-form" onSubmit={submit}>
          <section className="form-section">
            <span className="section-number">01</span>
            <div className="section-content">
              <h2>The basics</h2>
              <div className="field-grid">
                <label>
                  <span>Meeting name</span>
                  <input
                    required
                    minLength={2}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Weekly product review"
                  />
                </label>
                <label>
                  <span>Your name</span>
                  <input
                    required
                    value={hostName}
                    onChange={(event) => setHostName(event.target.value)}
                    placeholder="Aarav Sharma"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">02</span>
            <div className="section-content">
              <h2>Room features</h2>
              <div className="feature-grid">
                <FeatureToggle
                  title="Camera"
                  detail="Participants can publish video"
                  checked={features.camera}
                  onChange={(value) => setFeature('camera', value)}
                />
                <FeatureToggle
                  title="Microphone"
                  detail="Two-way room audio"
                  checked={features.microphone}
                  onChange={(value) => setFeature('microphone', value)}
                />
                <FeatureToggle
                  title="Screen sharing"
                  detail="Share a screen or browser tab"
                  checked={features.screenShare}
                  onChange={(value) => setFeature('screenShare', value)}
                />
                <FeatureToggle
                  title="Room chat"
                  detail="Live, in-meeting messages"
                  checked={features.chat}
                  onChange={(value) => setFeature('chat', value)}
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">03</span>
            <div className="section-content">
              <h2>People & access</h2>
              <div className="access-choice">
                <label className={access === 'open' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="access"
                    checked={access === 'open'}
                    onChange={() => setAccess('open')}
                  />
                  <strong>Open link</strong>
                  <small>Anyone with the meeting link can join.</small>
                </label>
                <label className={access === 'invite-only' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="access"
                    checked={access === 'invite-only'}
                    onChange={() => setAccess('invite-only')}
                  />
                  <strong>Invite only</strong>
                  <small>Each person receives a private access link.</small>
                </label>
              </div>
              <div className="field-grid textareas">
                <label>
                  <span>Co-hosts <em>optional</em></span>
                  <textarea
                    value={coHosts}
                    onChange={(event) => setCoHosts(event.target.value)}
                    placeholder={'Priya, priya@example.com\nKabir, kabir@example.com'}
                  />
                  <small>One person per line: name, email</small>
                </label>
                <label>
                  <span>Participants <em>optional</em></span>
                  <textarea
                    value={participants}
                    onChange={(event) => setParticipants(event.target.value)}
                    placeholder={'Nisha, nisha@example.com\nRohan, rohan@example.com'}
                  />
                  <small>One person per line: name, email</small>
                </label>
              </div>
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}
          <div className="form-submit">
            <p>
              By creating a room, you agree to let the browser use enabled media devices.
            </p>
            <button className="primary-action" disabled={busy}>
              {busy ? 'Creating…' : 'Create meeting'}
              <span>→</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
