import type { MeetingSummary } from '@quickmeet/sdk';
import { type FormEvent, useEffect, useState } from 'react';
import { Brand } from './Brand.js';

export function JoinMeeting({
  meeting,
  loading,
  error,
  onJoin,
}: {
  meeting: MeetingSummary | null;
  loading: boolean;
  error: string;
  onJoin: (name: string, accessKey?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const accessKey = new URLSearchParams(window.location.search).get('key') ?? undefined;

  useEffect(() => {
    if (!meeting) return;
    setCamera(meeting.features.camera);
    setMicrophone(meeting.features.microphone);
  }, [meeting]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem('quickmeet.initialCamera', String(camera));
    sessionStorage.setItem('quickmeet.initialMicrophone', String(microphone));
    await onJoin(name, accessKey);
  }

  return (
    <div className="join-page">
      <nav className="setup-nav"><Brand /></nav>
      <main className="join-card">
        <div className="join-preview">
          <div className="preview-orbit one" />
          <div className="preview-orbit two" />
          <span>{name ? name.slice(0, 2).toUpperCase() : 'MF'}</span>
          <small>Camera preview starts after joining</small>
        </div>
        <form onSubmit={submit}>
          <p className="kicker">You’re invited</p>
          <h1>{loading ? 'Finding your room…' : meeting?.name ?? 'Meeting unavailable'}</h1>
          {meeting && (
            <>
              <p className="join-host">Hosted by {meeting.host.name}</p>
              <label className="join-name">
                <span>Your name</span>
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="What should people call you?"
                />
              </label>
              <div className="join-device-row">
                {meeting.features.microphone && (
                  <label>
                    <input
                      type="checkbox"
                      checked={microphone}
                      onChange={(event) => setMicrophone(event.target.checked)}
                    />
                    <span>Mic {microphone ? 'on' : 'off'}</span>
                  </label>
                )}
                {meeting.features.camera && (
                  <label>
                    <input
                      type="checkbox"
                      checked={camera}
                      onChange={(event) => setCamera(event.target.checked)}
                    />
                    <span>Camera {camera ? 'on' : 'off'}</span>
                  </label>
                )}
              </div>
              <div className="enabled-features">
                {Object.entries(meeting.features)
                  .filter(([, enabled]) => enabled)
                  .map(([feature]) => (
                    <span key={feature}>{feature.replace(/([A-Z])/g, ' $1')}</span>
                  ))}
              </div>
              <button className="primary-action wide" disabled={loading}>
                Join meeting <span>→</span>
              </button>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
        </form>
      </main>
    </div>
  );
}
