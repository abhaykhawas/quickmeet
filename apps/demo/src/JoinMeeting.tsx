import type { MeetingSummary } from '@quickmeet/sdk';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Brand } from './Brand.js';

export function JoinMeeting({
  meeting,
  initialName = '',
  loading,
  error,
  onJoin,
}: {
  meeting: MeetingSummary | null;
  initialName?: string;
  loading: boolean;
  error: string;
  onJoin: (name: string, accessKey?: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [microphoneDeviceId, setMicrophoneDeviceId] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewHasVideo, setPreviewHasVideo] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const accessKey = new URLSearchParams(window.location.search).get('key') ?? undefined;

  useEffect(() => {
    if (!meeting) return;
    setCamera(meeting.features.camera);
    setMicrophone(meeting.features.microphone);
  }, [meeting]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceError('Device selection requires localhost or HTTPS.');
      return;
    }
    const refresh = () => {
      void navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => {});
    };
    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, []);

  useEffect(() => {
    if (!previewEnabled || !meeting) return;
    let cancelled = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setPreviewHasVideo(false);
    if (!camera && !microphone) return;

    void navigator.mediaDevices.getUserMedia({
      video: camera && meeting.features.camera
        ? { deviceId: cameraDeviceId ? { ideal: cameraDeviceId } : undefined }
        : false,
      audio: microphone && meeting.features.microphone
        ? { deviceId: microphoneDeviceId ? { ideal: microphoneDeviceId } : undefined }
        : false,
    }).then(async (stream) => {
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (previewRef.current) previewRef.current.srcObject = stream;
      setPreviewHasVideo(stream.getVideoTracks().length > 0);
      setDeviceError('');
      setDevices(await navigator.mediaDevices.enumerateDevices());
    }).catch((error: unknown) => {
      if (!cancelled) setDeviceError(error instanceof Error ? error.message : 'Could not access media devices.');
    });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [previewEnabled, meeting, camera, microphone, cameraDeviceId, microphoneDeviceId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem('quickmeet.initialCamera', String(camera));
    sessionStorage.setItem('quickmeet.initialMicrophone', String(microphone));
    sessionStorage.setItem('quickmeet.cameraDeviceId', cameraDeviceId);
    sessionStorage.setItem('quickmeet.microphoneDeviceId', microphoneDeviceId);
    setPreviewEnabled(false);
    setPreviewHasVideo(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    await onJoin(name, accessKey);
  }

  return (
    <div className="join-page">
      <nav className="setup-nav"><Brand /></nav>
      <main className="join-card">
        <div className="join-preview">
          <div className="preview-orbit one" />
          <div className="preview-orbit two" />
          <video ref={previewRef} autoPlay playsInline muted className={previewHasVideo ? 'is-visible' : ''} />
          {!previewHasVideo && <span>{name ? name.slice(0, 2).toUpperCase() : 'MF'}</span>}
          <small>{previewEnabled ? 'Device preview' : 'Preview your devices before joining'}</small>
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
              {(meeting.features.microphone || meeting.features.camera) && (
                <div className="join-device-options">
                  {meeting.features.microphone && (
                    <label>
                      <span>Microphone</span>
                      <select value={microphoneDeviceId} onChange={(event) => setMicrophoneDeviceId(event.target.value)}>
                        <option value="">Default microphone</option>
                        {devices.filter((device) => device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default')
                          .map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
                      </select>
                    </label>
                  )}
                  {meeting.features.camera && (
                    <label>
                      <span>Camera</span>
                      <select value={cameraDeviceId} onChange={(event) => setCameraDeviceId(event.target.value)}>
                        <option value="">Default camera</option>
                        {devices.filter((device) => device.kind === 'videoinput' && device.deviceId && device.deviceId !== 'default')
                          .map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                      </select>
                    </label>
                  )}
                  <button type="button" className="join-preview-button" disabled={!camera && !microphone} onClick={() => {
                    setPreviewEnabled((enabled) => !enabled);
                    setPreviewHasVideo(false);
                  }}>
                    {previewEnabled ? 'Stop preview' : 'Preview devices'}
                  </button>
                  {deviceError && <p className="join-device-error" role="alert">{deviceError}</p>}
                </div>
              )}
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
