import { z } from "zod";

// Best-effort validation: keep it permissive so ingestion doesn't break
// when optional fields are missing.

export const CourseTypeSchema = z.object({
  groupKey: z.string(),
  typeKey: z.string()
});
export const PayloadSchema = z.object({
  course: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    geoLat: z.number().nullable().optional(),
    geoLng: z.number().nullable().optional(),
    timezone: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    moderationStatus: z.string().nullable().optional(),
    sourceTags: z.array(z.string()).optional(),
    lastVerifiedAt: z.string().datetime().optional(),

    address: z.any().optional(),
    playability: z.any().optional(),
    pricingMeta: z.any().optional(),
    media: z.any().optional(),
    provenance: z.any().optional()
  }),
  teeSets: z.array(z.any()).optional(),
  holes: z.array(z.any()).optional(),
  amenities: z.array(z.any()).optional(),
  courseTypes: z.array(CourseTypeSchema).optional()
});