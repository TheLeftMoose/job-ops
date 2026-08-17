import { logger } from "@infra/logger";
import type { ResumeProfile, TailoredExperienceEntry } from "@shared/types";
import { stripHtmlTags } from "@shared/utils/string";
import type { JsonSchemaDefinition } from "./llm/types";
import { createConfiguredLlmService, resolveLlmModel } from "./modelSelection";
import {
  getWritingLanguageLabel,
  resolveWritingOutputLanguage,
} from "./output-language";
import {
  getEffectivePromptTemplate,
  renderPromptTemplate,
} from "./prompt-templates";
import { getWritingStyle } from "./writing-style";

type ExperienceCandidate = {
  experienceId: string;
  roleId: string | null;
  company: string;
  position: string;
  period: string;
  sourceText: string;
  sourceIndex: number;
};

type ExperienceTailoringResponse = {
  experience: Array<{
    experienceId: string;
    roleId: string | null;
    bullets: string[];
  }>;
};

export type ExperienceTailoringResult =
  | { success: true; data: TailoredExperienceEntry[] }
  | { success: false; error: string };

function sanitizePlainText(value: string, maxLength: number): string {
  return stripHtmlTags(value)
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function candidateKey(
  candidate: Pick<ExperienceCandidate, "experienceId" | "roleId">,
): string {
  return `${candidate.experienceId}\u0000${candidate.roleId ?? ""}`;
}

export function extractExperienceCandidates(
  profile: ResumeProfile,
): ExperienceCandidate[] {
  if (profile.sections?.experience?.visible === false) return [];

  const candidates: ExperienceCandidate[] = [];
  for (const item of profile.sections?.experience?.items ?? []) {
    if (item.visible === false || !item.id) continue;
    const roles = item.roles ?? [];

    if (roles.length > 0) {
      for (const role of roles) {
        const sourceText = sanitizePlainText(role.summary, 6000);
        if (!role.id || !sourceText) continue;
        candidates.push({
          experienceId: item.id,
          roleId: role.id,
          company: sanitizePlainText(item.company, 300),
          position: sanitizePlainText(role.position, 300),
          period: sanitizePlainText(role.date, 200),
          sourceText,
          sourceIndex: candidates.length,
        });
      }
      continue;
    }

    const sourceText = sanitizePlainText(item.summary, 6000);
    if (!sourceText) continue;
    candidates.push({
      experienceId: item.id,
      roleId: null,
      company: sanitizePlainText(item.company, 300),
      position: sanitizePlainText(item.position, 300),
      period: sanitizePlainText(item.date, 200),
      sourceText,
      sourceIndex: candidates.length,
    });
  }

  return candidates;
}

function buildSchema(maxRoles: number): JsonSchemaDefinition {
  return {
    name: "resume_experience_tailoring",
    schema: {
      type: "object",
      properties: {
        experience: {
          type: "array",
          maxItems: maxRoles,
          items: {
            type: "object",
            properties: {
              experienceId: { type: "string" },
              roleId: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              bullets: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: { type: "string" },
              },
            },
            required: ["experienceId", "roleId", "bullets"],
            additionalProperties: false,
          },
        },
      },
      required: ["experience"],
      additionalProperties: false,
    },
  };
}

function validateResponse(args: {
  response: ExperienceTailoringResponse;
  candidates: ExperienceCandidate[];
  maxRoles: number;
}): TailoredExperienceEntry[] {
  if (!Array.isArray(args.response.experience)) {
    throw new Error("Experience tailoring response is missing experience");
  }
  if (args.response.experience.length > args.maxRoles) {
    throw new Error("Experience tailoring selected more roles than allowed");
  }

  const candidateByKey = new Map(
    args.candidates.map((candidate) => [candidateKey(candidate), candidate]),
  );
  const seen = new Set<string>();
  const selected = args.response.experience.map((entry) => {
    const key = candidateKey(entry);
    const candidate = candidateByKey.get(key);
    if (!candidate) {
      throw new Error("Experience tailoring returned an unknown role");
    }
    if (seen.has(key)) {
      throw new Error("Experience tailoring returned a duplicate role");
    }
    seen.add(key);

    if (!Array.isArray(entry.bullets) || entry.bullets.length < 3) {
      throw new Error("Each tailored role must contain at least 3 bullets");
    }
    if (entry.bullets.length > 5) {
      throw new Error("Each tailored role must contain at most 5 bullets");
    }
    const bullets = entry.bullets.map((bullet) =>
      sanitizePlainText(bullet, 500),
    );
    if (bullets.some((bullet) => !bullet)) {
      throw new Error("Tailored experience bullets cannot be empty");
    }

    return {
      experienceId: candidate.experienceId,
      roleId: candidate.roleId,
      company: candidate.company || "Experience",
      position: candidate.position || "Role",
      period: candidate.period,
      bullets,
      sourceIndex: candidate.sourceIndex,
    };
  });

  return selected
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .map(({ sourceIndex: _sourceIndex, ...entry }) => entry);
}

export async function generateExperienceTailoring(args: {
  jobDescription: string;
  profile: ResumeProfile;
  maxRoles: number;
}): Promise<ExperienceTailoringResult> {
  const candidates = extractExperienceCandidates(args.profile);
  if (candidates.length === 0) {
    return { success: true, data: [] };
  }

  const maxRoles = Math.max(1, Math.min(20, Math.floor(args.maxRoles)));
  const [model, writingStyle] = await Promise.all([
    resolveLlmModel("tailoring"),
    getWritingStyle(),
  ]);
  const resolvedLanguage = resolveWritingOutputLanguage({
    style: writingStyle,
    profile: args.profile,
    jobDescription: args.jobDescription,
  });
  const outputLanguage = getWritingLanguageLabel(resolvedLanguage.language);
  const template = await getEffectivePromptTemplate(
    "experienceTailoringPromptTemplate",
  );
  const prompt = renderPromptTemplate(template, {
    jobDescription: sanitizePlainText(args.jobDescription, 40000),
    experienceCandidatesJson: JSON.stringify(
      candidates.map(
        ({ experienceId, roleId, company, position, period, sourceText }) => ({
          experienceId,
          roleId,
          company,
          position,
          period,
          sourceText,
        }),
      ),
    ),
    maxRoles,
    outputLanguage,
    tone: writingStyle.tone,
    formality: writingStyle.formality,
    constraintsBullet: writingStyle.constraints
      ? `- Additional constraints: ${sanitizePlainText(writingStyle.constraints, 1000)}.`
      : "",
    avoidTermsBullet: writingStyle.doNotUse
      ? `- Avoid these words or phrases: ${sanitizePlainText(writingStyle.doNotUse, 1000)}.`
      : "",
  });

  const llm = await createConfiguredLlmService("tailoring");
  const result = await llm.callJson<ExperienceTailoringResponse>({
    model,
    messages: [{ role: "user", content: prompt }],
    jsonSchema: buildSchema(maxRoles),
  });

  if (!result.success) {
    const context = `provider=${llm.getProvider()} baseUrl=${llm.getBaseUrl()}`;
    return { success: false, error: `${result.error} (${context})` };
  }

  try {
    const data = validateResponse({
      response: result.data,
      candidates,
      maxRoles,
    });
    logger.info("Generated tailored experience", {
      candidateCount: candidates.length,
      maxRoles,
      selectedCount: data.length,
    });
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid experience tailoring response";
    logger.warn("Rejected tailored experience response", {
      candidateCount: candidates.length,
      maxRoles,
      error: message,
    });
    return { success: false, error: message };
  }
}
