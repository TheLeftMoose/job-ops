import { z } from "zod";
import type { TailoredExperienceEntry } from "./types/tailoring";

export const tailoredExperienceEntrySchema = z
  .object({
    experienceId: z.string().trim().min(1).max(200),
    roleId: z.string().trim().min(1).max(200).nullable(),
    company: z.string().trim().min(1).max(300),
    position: z.string().trim().min(1).max(300),
    period: z.string().trim().max(200),
    bullets: z.array(z.string().trim().min(1).max(500)).min(3).max(5),
  })
  .strict();

export const tailoredExperienceSchema = z
  .array(tailoredExperienceEntrySchema)
  .max(20);

export function parseTailoredExperience(
  value: string | null | undefined,
): TailoredExperienceEntry[] {
  if (!value?.trim()) return [];
  try {
    const result = tailoredExperienceSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function serializeTailoredExperience(
  value: TailoredExperienceEntry[],
): string {
  return JSON.stringify(value);
}
