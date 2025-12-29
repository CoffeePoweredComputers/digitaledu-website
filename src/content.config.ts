import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * DigEd@VT Content Collection Schemas
 *
 * These schemas define the structure for seminars, reading group sessions,
 * and faculty data. Astro validates frontmatter against these at build time.
 */

// Shared schema for event location
const locationSchema = z.object({
  type: z.enum(['zoom', 'in-person', 'hybrid']),
  value: z.string(), // Zoom URL or room number
  zoomLink: z.string().url().optional(), // For hybrid events
  roomNumber: z.string().optional(), // For hybrid events
});

// Speaker schema for seminars
const speakerSchema = z.object({
  name: z.string(),
  affiliation: z.string().optional(),
  url: z.string().url().optional(),
  photo: z.string().optional(),
});

// Paper schema for reading group
const paperSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  venue: z.string().optional(), // e.g., "SIGCSE 2024"
  year: z.number().optional(),
  url: z.string().url().optional(), // DOI or PDF link
});

// Seminars collection
const seminars = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/seminars' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default('America/New_York'),
    location: locationSchema,
    speaker: speakerSchema,
    abstract: z.string(),
    tags: z.array(z.string()).optional(),
    cancelled: z.boolean().optional().default(false),
  }),
});

// Reading group collection
const readingGroup = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reading-group' }),
  schema: z.object({
    title: z.string(), // Discussion title (can differ from paper title)
    date: z.coerce.date(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default('America/New_York'),
    location: locationSchema,
    paper: paperSchema,
    facilitator: z.string(), // Who's leading the discussion
    tags: z.array(z.string()).optional(),
    cancelled: z.boolean().optional().default(false),
  }),
});

export const collections = {
  seminars,
  'reading-group': readingGroup,
};
