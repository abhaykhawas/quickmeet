import { type FormEvent, useState } from 'react';
import { Brand } from './Brand.js';

export function Landing() {
  const [meetingCode, setMeetingCode] = useState('');

  function join(event: FormEvent) {
    event.preventDefault();
    const input = meetingCode.trim();
    if (!input) return;
    try {
      const url = new URL(input);
      window.location.assign(url.pathname + url.search);
    } catch {
      const slug = input.split('/').filter(Boolean).at(-1);
      if (slug) window.location.assign(`/join/${encodeURIComponent(slug)}`);
    }
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand />
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="/docs">Docs</a>
          <a href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <a className="nav-create" href="/create">Create room <span>↗</span></a>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker"><i /> Open source · Self-hosted</p>
            <h1>Good meetings.<br /><em>Your rules.</em></h1>
            <p className="hero-intro">
              Video rooms that feel effortless to use and take minutes to add to your product.
              Keep the features you need. Leave the rest out.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="/create">Start a meeting <span>→</span></a>
              <a className="text-action" href="/docs">Read the docs <span>↗</span></a>
            </div>
            <div className="trust-row">
              <span>No vendor lock-in</span>
              <span>Apache 2.0</span>
              <span>Your infrastructure</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="QuickMeet meeting preview">
            <div className="visual-stamp">ROOM 08:42</div>
            <div className="meeting-window">
              <div className="mock-topbar">
                <span className="mini-brand"><i /><i /><i /></span>
                <strong>Monday design circle</strong>
                <span className="live-dot">● Live</span>
              </div>
              <div className="mock-grid">
                <div className="mock-person person-one">
                  <div className="face"><span>AK</span></div>
                  <p><span /> Aarav</p>
                </div>
                <div className="mock-person person-two">
                  <div className="face"><span>PN</span></div>
                  <p><span /> Priya</p>
                </div>
                <div className="mock-person person-three">
                  <div className="face"><span>RS</span></div>
                  <p><span /> Rohan</p>
                </div>
                <div className="mock-share">
                  <span>SHARING</span>
                  <div className="share-lines"><i /><i /><i /><i /></div>
                  <strong>Simple rooms.<br />Real conversations.</strong>
                </div>
              </div>
              <div className="mock-controls">
                <i>●</i><i>▰</i><i>↥</i><i className="hangup">⌁</i>
              </div>
            </div>
            <div className="visual-note">Built for conversation,<br />not configuration.</div>
          </div>
        </section>

        <section className="join-strip">
          <div>
            <p className="kicker">Already have a room?</p>
            <h2>Walk right in.</h2>
          </div>
          <form onSubmit={join}>
            <input
              value={meetingCode}
              onChange={(event) => setMeetingCode(event.target.value)}
              placeholder="Paste a meeting link or room code"
              aria-label="Meeting link or code"
            />
            <button>Join <span>→</span></button>
          </form>
        </section>

        <section className="feature-section" id="features">
          <div className="section-intro">
            <p className="kicker">Exactly enough</p>
            <h2>Everything a meeting needs.<br />Nothing it doesn’t.</h2>
          </div>
          <div className="feature-cards">
            <article>
              <span className="feature-index">01</span>
              <div className="feature-glyph camera-glyph"><i /><i /></div>
              <h3>Clear audio & video</h3>
              <p>Fast WebRTC media with adaptive quality and familiar controls.</p>
            </article>
            <article>
              <span className="feature-index">02</span>
              <div className="feature-glyph share-glyph"><i>↑</i></div>
              <h3>Share what matters</h3>
              <p>Present a screen, window, or browser tab without extra setup.</p>
            </article>
            <article>
              <span className="feature-index">03</span>
              <div className="feature-glyph chat-glyph"><i /><i /><i /></div>
              <h3>Optional by design</h3>
              <p>Switch camera, mic, sharing, or chat on and off per room.</p>
            </article>
          </div>
        </section>

        <section className="sdk-section">
          <div>
            <p className="kicker">One component</p>
            <h2>Your product.<br />Now with meetings.</h2>
            <p>
              Create rooms on your backend, drop the conference into React,
              and style the container around it. QuickMeet handles the hard realtime parts.
            </p>
            <a className="text-action light" href="/docs">Integration guide <span>→</span></a>
          </div>
          <pre><code><span className="code-muted">{"// Your React frontend"}</span>{`
`}<span className="code-pink">import</span>{' { QuickMeetConference } '}
<span className="code-pink">from</span>{` '@quickmeet/react';

`}<span className="code-pink">export function</span>{` Call({ credentials }) {
  `}<span className="code-pink">return</span>{` (
    <QuickMeetConference
      credentials={credentials}
      brandName="Acme"
    />
  );
}`}</code></pre>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <p>Open meetings for an open web.</p>
        <span>© 2026 QuickMeet contributors</span>
      </footer>
    </div>
  );
}
