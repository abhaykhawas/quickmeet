import { MongoClient, type Collection } from 'mongodb';
import type { StoredMeeting } from './model.js';

export interface MeetingStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  create(meeting: StoredMeeting): Promise<void>;
  get(idOrSlug: string): Promise<StoredMeeting | undefined>;
  update(meeting: StoredMeeting): Promise<void>;
}

export class MongoMeetingStore implements MeetingStore {
  private readonly client: MongoClient;
  private collection: Collection<StoredMeeting> | undefined;

  constructor(
    uri: string,
    private readonly collectionName: string,
  ) {
    this.client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10_000,
    });
  }

  async initialize(): Promise<void> {
    await this.client.connect();
    this.collection = this.client.db().collection<StoredMeeting>(this.collectionName);
    await Promise.all([
      this.collection.createIndex({ id: 1 }, { unique: true }),
      this.collection.createIndex({ slug: 1 }, { unique: true }),
    ]);
  }

  async close(): Promise<void> {
    await this.client.close();
    this.collection = undefined;
  }

  async create(meeting: StoredMeeting): Promise<void> {
    await this.meetings.insertOne(structuredClone(meeting));
  }

  async get(idOrSlug: string): Promise<StoredMeeting | undefined> {
    const document = await this.meetings.findOne({
      $or: [{ id: idOrSlug }, { slug: idOrSlug }],
    });
    if (!document) return undefined;
    const { _id: _ignored, ...meeting } = document;
    return structuredClone(meeting);
  }

  async update(meeting: StoredMeeting): Promise<void> {
    const result = await this.meetings.replaceOne(
      { id: meeting.id },
      structuredClone(meeting),
    );
    if (result.matchedCount === 0) {
      throw new Error(`Meeting ${meeting.id} does not exist`);
    }
  }

  private get meetings(): Collection<StoredMeeting> {
    if (!this.collection) {
      throw new Error('MongoMeetingStore has not been initialized');
    }
    return this.collection;
  }
}

export class MemoryMeetingStore implements MeetingStore {
  private readonly meetings = new Map<string, StoredMeeting>();

  async initialize(): Promise<void> {}

  async close(): Promise<void> {}

  async create(meeting: StoredMeeting): Promise<void> {
    this.meetings.set(meeting.id, structuredClone(meeting));
  }

  async get(idOrSlug: string): Promise<StoredMeeting | undefined> {
    const meeting = [...this.meetings.values()].find(
      (candidate) => candidate.id === idOrSlug || candidate.slug === idOrSlug,
    );
    return meeting ? structuredClone(meeting) : undefined;
  }

  async update(meeting: StoredMeeting): Promise<void> {
    this.meetings.set(meeting.id, structuredClone(meeting));
  }
}
