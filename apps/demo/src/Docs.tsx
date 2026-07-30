import { Brand } from './Brand.js';

export function Docs() {
  return (
    <div className="docs-page">
      <nav className="setup-nav">
        <Brand />
        <a href="/">Back to demo</a>
      </nav>
      <main className="docs-layout">
        <aside>
          <p className="kicker">Documentation</p>
          <a href="#quickstart">Quickstart</a>
          <a href="#backend">Backend SDK</a>
          <a href="#frontend">React SDK</a>
          <a href="#features-doc">Feature flags</a>
          <a href="#production">Production</a>
          <small>Full documentation is also available in the repository README and docs/ folder.</small>
        </aside>
        <article>
          <p className="kicker">QuickMeet v0.1</p>
          <h1>Ship your first room.</h1>
          <p className="docs-lede">
            A compact guide to running the stack and embedding QuickMeet. See the repository
            documentation for authentication, API endpoints, deployment, and non-React usage.
          </p>

          <h2 id="quickstart">Quickstart</h2>
          <pre><code>{`cp .env.example .env
docker compose up -d livekit
npm install
npm run dev`}</code></pre>
          <p>Open <code>http://localhost:5173</code>. The API runs on port 8787 and LiveKit on 7880.</p>

          <h2 id="backend">Create a room on your backend</h2>
          <pre><code>{`import { QuickMeetServerClient } from '@quickmeet/node';

const quickmeet = new QuickMeetServerClient({
  apiUrl: process.env.QUICKMEET_URL,
  apiKey: process.env.QUICKMEET_API_KEY,
});

const room = await quickmeet.createMeeting({
  name: 'Product review',
  host: { id: user.id, name: user.name },
  features: {
    camera: true,
    microphone: true,
    screenShare: true,
    chat: false,
  },
});`}</code></pre>

          <h2 id="frontend">Render it in React</h2>
          <pre><code>{`import { QuickMeetConference } from '@quickmeet/react';
import '@quickmeet/react/styles.css';

<QuickMeetConference
  credentials={joinCredentials}
  brandName="Your product"
  onLeave={() => navigate('/dashboard')}
/>`}</code></pre>

          <h2 id="features-doc">Feature flags</h2>
          <p>
            Every meeting stores four independent flags: <code>camera</code>, <code>microphone</code>,
            <code>screenShare</code>, and <code>chat</code>. Disabled controls are omitted from the UI,
            and token permissions block all publishing when every media feature is disabled.
          </p>

          <h2 id="production">Before production</h2>
          <ul>
            <li>Set <code>DEMO_MODE=false</code> so room creation requires your server API key.</li>
            <li>Use TLS endpoints: HTTPS for the API and WSS for LiveKit.</li>
            <li>Configure LiveKit’s public IP, UDP ports, TURN, and Redis for your deployment.</li>
            <li>Set <code>MONGO_URI</code> to a protected MongoDB Atlas or self-hosted MongoDB connection string.</li>
          </ul>
        </article>
      </main>
    </div>
  );
}
