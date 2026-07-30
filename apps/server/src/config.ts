export interface AppConfig {
  port: number;
  publicAppUrl: string;
  apiKey: string;
  demoMode: boolean;
  corsOrigins: string[];
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  mongoUri: string;
  mongoCollection: string;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 8787),
    publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:5173',
    apiKey: process.env.QUICKMEET_API_KEY ?? 'local-development-key',
    demoMode: readBoolean(process.env.DEMO_MODE, true),
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    livekitUrl: process.env.LIVEKIT_URL ?? 'ws://localhost:7880',
    livekitApiKey: process.env.LIVEKIT_API_KEY ?? 'devkey',
    livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? 'secret',
    mongoUri: requiredEnvironment('MONGO_URI'),
    mongoCollection: process.env.MONGO_COLLECTION?.trim() || 'quickmeet_meetings',
  };
}
