import {
  ParticipantTile,
  RoomAudioRenderer,
  RoomContext,
  type TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import type { JoinCredentials } from '@quickmeet/sdk';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
} from 'livekit-client';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CameraIcon,
  CameraOffIcon,
  ChatIcon,
  CloseIcon,
  LinkIcon,
  MicIcon,
  MicOffIcon,
  PeopleIcon,
  PhoneIcon,
  ScreenIcon,
  SendIcon,
} from './icons.js';

export interface QuickMeetConferenceProps {
  credentials: JoinCredentials;
  initialCameraEnabled?: boolean;
  initialMicrophoneEnabled?: boolean;
  initialCameraDeviceId?: string;
  initialMicrophoneDeviceId?: string;
  className?: string;
  brandName?: string;
  inviteUrl?: string;
  onLeave?: () => void;
  onError?: (error: Error) => void;
}

type QuickMeetSidePanel = 'chat' | 'people' | null;

function trackKey(track: TrackReferenceOrPlaceholder): string {
  return `${track.participant.identity}:${track.source}`;
}

function getBalancedGrid(itemCount: number): { columns: number; rows: number } {
  const columns = Math.max(1, Math.ceil(Math.sqrt(itemCount)));
  return {
    columns,
    rows: Math.max(1, Math.ceil(itemCount / columns)),
  };
}

function displayRole(participant: Participant, localRole?: string): string {
  if (participant.isLocal) return localRole ?? 'participant';
  try {
    const metadata = JSON.parse(participant.metadata ?? '{}') as { role?: string };
    return metadata.role ?? participant.attributes['quickmeet.role'] ?? 'participant';
  } catch {
    return participant.attributes['quickmeet.role'] ?? 'participant';
  }
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length === 1
    ? parts[0]?.slice(0, 2).toUpperCase()
    : parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return <span className="qm-avatar">{initials || '?'}</span>;
}

function ControlButton({
  active,
  danger,
  disabled,
  label,
  children,
  onClick,
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'qm-control',
        active ? 'is-active' : '',
        danger ? 'is-danger' : '',
      ].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className="qm-control-icon">{children}</span>
      <span>{label}</span>
    </button>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { chatMessages, send, isSending } = useChat();
  const [message, setMessage] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chatMessages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    setMessage('');
    await send(trimmed);
  }

  return (
    <aside className="qm-side-panel" aria-label="Meeting chat">
      <header className="qm-panel-header">
        <div>
          <span className="qm-eyebrow">In the room</span>
          <h2>Messages</h2>
        </div>
        <button type="button" className="qm-icon-button" onClick={onClose} aria-label="Close chat">
          <CloseIcon />
        </button>
      </header>
      <div className="qm-chat-list" ref={listRef}>
        {chatMessages.length === 0 ? (
          <div className="qm-empty-state">
            <ChatIcon />
            <strong>Start the conversation</strong>
            <span>Messages are shared with everyone in this meeting.</span>
          </div>
        ) : chatMessages.map((item) => (
          <div className="qm-chat-message" key={item.id}>
            <Initials name={item.from?.name ?? 'Guest'} />
            <div>
              <div className="qm-message-meta">
                <strong>{item.from?.isLocal ? 'You' : item.from?.name ?? 'Guest'}</strong>
                <time>{new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}</time>
              </div>
              <p>{item.message}</p>
            </div>
          </div>
        ))}
      </div>
      <form className="qm-chat-form" onSubmit={submit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message…"
          aria-label="Chat message"
          maxLength={2000}
        />
        <button type="submit" disabled={!message.trim() || isSending} aria-label="Send message">
          <SendIcon />
        </button>
      </form>
    </aside>
  );
}

function PeoplePanel({
  localRole,
  onClose,
}: {
  localRole: string;
  onClose: () => void;
}) {
  const participants = useParticipants();
  return (
    <aside className="qm-side-panel" aria-label="Meeting participants">
      <header className="qm-panel-header">
        <div>
          <span className="qm-eyebrow">{participants.length} connected</span>
          <h2>People</h2>
        </div>
        <button type="button" className="qm-icon-button" onClick={onClose} aria-label="Close people">
          <CloseIcon />
        </button>
      </header>
      <div className="qm-people-list">
        {participants.map((participant) => {
          const role = displayRole(participant, localRole);
          return (
            <div className="qm-person" key={participant.identity}>
              <Initials name={participant.name ?? participant.identity} />
              <div className="qm-person-info">
                <strong>
                  {participant.name ?? participant.identity}
                  {participant.isLocal ? ' (you)' : ''}
                </strong>
                <span>
                  {role === 'cohost' ? 'Co-host' : role[0]?.toUpperCase() + role.slice(1)}
                  {participant.isSpeaking && <b className="qm-speaking-label"> · Speaking</b>}
                </span>
              </div>
              <div className="qm-person-devices">
                <span
                  className={`qm-person-device ${participant.isMicrophoneEnabled ? 'is-on' : 'is-off'}`}
                  title={participant.isMicrophoneEnabled ? 'Microphone on' : 'Microphone off'}
                  aria-label={participant.isMicrophoneEnabled ? 'Microphone on' : 'Microphone off'}
                >
                  {participant.isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
                </span>
                <span
                  className={`qm-person-device ${participant.isCameraEnabled ? 'is-on' : 'is-off'}`}
                  title={participant.isCameraEnabled ? 'Camera on' : 'Camera off'}
                  aria-label={participant.isCameraEnabled ? 'Camera on' : 'Camera off'}
                >
                  {participant.isCameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ConnectedConferenceShell({
  credentials,
  brandName,
  inviteUrl,
  connectionState,
  initialCameraDeviceId,
  initialMicrophoneDeviceId,
  onLeave,
  onError,
}: {
  credentials: JoinCredentials;
  brandName: string;
  inviteUrl?: string;
  connectionState: ConnectionState;
  initialCameraDeviceId?: string;
  initialMicrophoneDeviceId?: string;
  onLeave: () => void;
  onError?: (error: Error) => void;
}) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ], { onlySubscribed: false });
  const participants = useParticipants();
  const {
    localParticipant,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const room = useRoomContext();
  const [panel, setPanel] = useState<QuickMeetSidePanel>(null);
  const [copied, setCopied] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDeviceId, setCameraDeviceId] = useState(initialCameraDeviceId ?? '');
  const [microphoneDeviceId, setMicrophoneDeviceId] = useState(initialMicrophoneDeviceId ?? '');
  const features = credentials.meeting.features;
  const cameraTracks = useMemo(
    () => tracks.filter((track) => track.source === Track.Source.Camera),
    [tracks],
  );
  const screenTrack = useMemo(
    () => tracks.find((track) => track.source === Track.Source.ScreenShare),
    [tracks],
  );
  const cameraGrid = getBalancedGrid(cameraTracks.length);
  const railTracks = cameraTracks.slice(0, 4);
  const hiddenRailCount = Math.max(0, cameraTracks.length - railTracks.length);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const refresh = () => {
      void navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => {});
    };
    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [isCameraEnabled, isMicrophoneEnabled]);

  async function selectDevice(kind: 'audioinput' | 'videoinput', deviceId: string) {
    const enabled = kind === 'audioinput' ? isMicrophoneEnabled : isCameraEnabled;
    const activeId = deviceId || devices.find((device) => device.kind === kind && device.deviceId)?.deviceId;
    if (enabled && activeId) {
      setMediaBusy(kind);
      try {
        await room.switchActiveDevice(kind, activeId);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
        setMediaBusy(null);
        return;
      }
      setMediaBusy(null);
    }
    if (kind === 'audioinput') setMicrophoneDeviceId(deviceId);
    else setCameraDeviceId(deviceId);
  }

  async function toggleMedia(
    kind: 'camera' | 'microphone' | 'screen',
    action: () => Promise<unknown>,
  ) {
    setMediaBusy(kind);
    try {
      await action();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setMediaBusy(null);
    }
  }

  async function copyInvite() {
    const link = inviteUrl ?? window.location.href;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={`qm-conference ${panel ? 'has-panel' : ''}`}>
      <header className="qm-topbar">
        <div className="qm-brand">
          <span className="qm-brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{brandName}</span>
        </div>
        <div className="qm-meeting-title">
          <strong>{credentials.meeting.name}</strong>
          <span className={`qm-connection ${connectionState === ConnectionState.Connected ? 'is-live' : ''}`}>
            <i />
            {connectionState === ConnectionState.Connected ? 'Live' : connectionState}
          </span>
        </div>
        <div className="qm-top-actions">
          {inviteUrl && (
            <button type="button" className="qm-copy-button" onClick={copyInvite}>
              <LinkIcon />
              <span>{copied ? 'Copied' : 'Invite'}</span>
            </button>
          )}
          <span className="qm-role-pill">
            {credentials.participant.role === 'cohost'
              ? 'Co-host'
              : credentials.participant.role[0]?.toUpperCase()
                + credentials.participant.role.slice(1)}
          </span>
        </div>
      </header>

      <main className="qm-stage">
        {screenTrack ? (
          <div className="qm-presentation-layout">
            <ParticipantTile
              trackRef={screenTrack}
              className="qm-screen-tile"
            />
            <aside className="qm-participant-rail" aria-label="Participant videos">
              {railTracks.map((track, index) => (
                <div className="qm-rail-item" key={trackKey(track)}>
                  <ParticipantTile trackRef={track} />
                  {index === railTracks.length - 1 && hiddenRailCount > 0 && (
                    <span
                      className="qm-overflow-badge"
                      aria-label={`${hiddenRailCount} more participants`}
                    >
                      +{hiddenRailCount} more
                    </span>
                  )}
                </div>
              ))}
            </aside>
          </div>
        ) : (
          <div
            className="qm-grid"
            style={{
              gridTemplateColumns: `repeat(${cameraGrid.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${cameraGrid.rows}, minmax(0, 1fr))`,
            }}
          >
            {cameraTracks.map((track) => (
              <ParticipantTile key={trackKey(track)} trackRef={track} />
            ))}
          </div>
        )}
        <RoomAudioRenderer />
        {connectionState !== ConnectionState.Connected && (
          <div className="qm-connecting">
            <span className="qm-spinner" />
            <strong>
              {connectionState === ConnectionState.Reconnecting
                ? 'Reconnecting…'
                : 'Joining the room…'}
            </strong>
          </div>
        )}
      </main>

      {panel === 'chat' && features.chat && <ChatPanel onClose={() => setPanel(null)} />}
      {panel === 'people' && (
        <PeoplePanel
          localRole={credentials.participant.role}
          onClose={() => setPanel(null)}
        />
      )}

      <footer className="qm-toolbar">
        <div className="qm-toolbar-spacer">
          <span>{participants.length} {participants.length === 1 ? 'person' : 'people'}</span>
        </div>
        <div className="qm-main-controls">
          {features.microphone && (
            <div className="qm-device-control">
              <ControlButton
                active={!isMicrophoneEnabled}
                disabled={mediaBusy === 'microphone'}
                label={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
                onClick={() => toggleMedia(
                  'microphone',
                  () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled, {
                    deviceId: microphoneDeviceId || undefined,
                  }),
                )}
              >
                {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
              </ControlButton>
              <select
                aria-label="Choose microphone"
                title={devices.find((device) => device.deviceId === microphoneDeviceId)?.label || 'Choose microphone'}
                value={microphoneDeviceId}
                disabled={mediaBusy === 'audioinput'}
                onChange={(event) => void selectDevice('audioinput', event.target.value)}
              >
                <option value="">Default microphone</option>
                {devices.filter((device) => device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default')
                  .map((device, index) => (
                    <option value={device.deviceId} key={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {features.camera && (
            <div className="qm-device-control">
              <ControlButton
                active={!isCameraEnabled}
                disabled={mediaBusy === 'camera'}
                label={isCameraEnabled ? 'Stop video' : 'Start video'}
                onClick={() => toggleMedia(
                  'camera',
                  () => localParticipant.setCameraEnabled(!isCameraEnabled, {
                    deviceId: cameraDeviceId || undefined,
                  }),
                )}
              >
                {isCameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
              </ControlButton>
              <select
                aria-label="Choose camera"
                title={devices.find((device) => device.deviceId === cameraDeviceId)?.label || 'Choose camera'}
                value={cameraDeviceId}
                disabled={mediaBusy === 'videoinput'}
                onChange={(event) => void selectDevice('videoinput', event.target.value)}
              >
                <option value="">Default camera</option>
                {devices.filter((device) => device.kind === 'videoinput' && device.deviceId && device.deviceId !== 'default')
                  .map((device, index) => (
                    <option value={device.deviceId} key={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {features.screenShare && (
            <ControlButton
              active={isScreenShareEnabled}
              disabled={mediaBusy === 'screen'}
              label={isScreenShareEnabled ? 'Stop sharing' : 'Share screen'}
              onClick={() => toggleMedia(
                'screen',
                () => localParticipant.setScreenShareEnabled(
                  !isScreenShareEnabled,
                  {
                    audio: true,
                    systemAudio: 'include',
                  },
                ),
              )}
            >
              <ScreenIcon />
            </ControlButton>
          )}
          <ControlButton danger label="Leave" onClick={onLeave}>
            <PhoneIcon />
          </ControlButton>
        </div>
        <div className="qm-secondary-controls">
          <button
            type="button"
            className={panel === 'people' ? 'is-active' : ''}
            onClick={() => setPanel(panel === 'people' ? null : 'people')}
            aria-label="Show people"
          >
            <PeopleIcon />
            <span>{participants.length}</span>
          </button>
          {features.chat && (
            <button
              type="button"
              className={panel === 'chat' ? 'is-active' : ''}
              onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
              aria-label="Show chat"
            >
              <ChatIcon />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export function QuickMeetConference({
  credentials,
  initialCameraEnabled = true,
  initialMicrophoneEnabled = true,
  initialCameraDeviceId,
  initialMicrophoneDeviceId,
  className = '',
  brandName = 'QuickMeet',
  inviteUrl,
  onLeave,
  onError,
}: QuickMeetConferenceProps) {
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [connectionState, setConnectionState] = useState(room.state);

  useEffect(() => {
    let active = true;

    const handleState = (state: ConnectionState) => {
      if (active) setConnectionState(state);
    };
    const handleDisconnected = () => {
      if (active) setConnectionState(ConnectionState.Disconnected);
    };
    room.on(RoomEvent.ConnectionStateChanged, handleState);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    async function connectRoom() {
      await room.disconnect();
      if (!active) return;
      await room.connect(credentials.serverUrl, credentials.participantToken);
      if (!active) return;
        const tasks: Promise<unknown>[] = [];
        if (credentials.meeting.features.camera && initialCameraEnabled) {
          tasks.push(room.localParticipant.setCameraEnabled(true, {
            deviceId: initialCameraDeviceId || undefined,
          }));
        }
        if (credentials.meeting.features.microphone && initialMicrophoneEnabled) {
          tasks.push(room.localParticipant.setMicrophoneEnabled(true, {
            deviceId: initialMicrophoneDeviceId || undefined,
          }));
        }
        const results = await Promise.allSettled(tasks);
        const rejected = results.find((result) => result.status === 'rejected');
        if (rejected?.status === 'rejected') {
          throw rejected.reason;
        }
    }

    void connectRoom().catch((error) => {
        if (active) {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      });

    return () => {
      active = false;
      room.off(RoomEvent.ConnectionStateChanged, handleState);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      void room.disconnect();
    };
  }, [
    credentials,
    initialCameraEnabled,
    initialMicrophoneEnabled,
    initialCameraDeviceId,
    initialMicrophoneDeviceId,
    onError,
    room,
  ]);

  function leave() {
    void room.disconnect();
    onLeave?.();
  }

  return (
    <div className={`qm-root ${className}`}>
      <RoomContext.Provider value={room}>
        <ConnectedConferenceShell
          credentials={credentials}
          brandName={brandName}
          inviteUrl={inviteUrl}
          connectionState={connectionState}
          initialCameraDeviceId={initialCameraDeviceId}
          initialMicrophoneDeviceId={initialMicrophoneDeviceId}
          onLeave={leave}
          onError={onError}
        />
      </RoomContext.Provider>
    </div>
  );
}
