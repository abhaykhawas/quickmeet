import { z } from 'zod';

const personSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).optional(),
});

const featuresSchema = z.object({
  camera: z.boolean().optional(),
  microphone: z.boolean().optional(),
  screenShare: z.boolean().optional(),
  chat: z.boolean().optional(),
});

export const createMeetingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  host: personSchema,
  coHosts: z.array(personSchema).max(20).optional().default([]),
  participants: z.array(personSchema).max(500).optional().default([]),
  features: featuresSchema.optional().default({}),
  access: z.enum(['open', 'invite-only']).optional().default('open'),
});

export const joinMeetingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  accessKey: z.string().trim().min(10).max(200).optional(),
});

export const trustedTokenSchema = z.object({
  identity: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(100),
  role: z.enum(['host', 'cohost', 'participant']).optional().default('participant'),
});

export const updateMeetingSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  access: z.enum(['open', 'invite-only']).optional(),
  features: featuresSchema.optional(),
}).refine(
  (input) => input.name !== undefined || input.access !== undefined || input.features !== undefined,
  'At least one field must be provided',
);
