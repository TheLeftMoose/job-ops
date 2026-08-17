import { createId } from "@paralleldrive/cuid2";
import type {
  ResumeProjectCatalogItem,
  TailoredExperienceEntry,
} from "@shared/types";
import { stripHtmlTags } from "@shared/utils/string";

type RecordLike = Record<string, unknown>;

export type TailoredSkillsInput =
  | Array<{ name: string; keywords: string[] }>
  | string
  | null
  | undefined;

export type TailorChunkInput = {
  headline?: string | null;
  summary?: string | null;
  skills?: TailoredSkillsInput;
  experience?: TailoredExperienceEntry[] | null;
};

export type ResumeProjectSelectionItem = ResumeProjectCatalogItem & {
  summaryText: string;
};

export function cloneResumeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

function asRecord(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordLike)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function experienceKey(experienceId: string, roleId: string | null): string {
  return `${experienceId}\u0000${roleId ?? ""}`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function bulletsToHtml(bullets: string[]): string {
  return `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`;
}

function parseTailoredSkills(
  skills: TailoredSkillsInput,
): Array<RecordLike> | null {
  if (!skills) return null;
  const parsed = Array.isArray(skills)
    ? skills
    : typeof skills === "string"
      ? (JSON.parse(skills) as unknown)
      : null;
  if (!Array.isArray(parsed)) return null;
  return parsed.filter(
    (item) => item && typeof item === "object",
  ) as RecordLike[];
}

export function applyTailoredHeadline(
  resumeData: RecordLike,
  headline?: string | null,
): void {
  if (!headline) return;
  const basics = asRecord(resumeData.basics);
  if (!basics) return;
  basics.headline = headline;
  // Preserve current behavior for legacy consumers/templates that use label.
  basics.label = headline;
}

export function applyTailoredSummary(
  resumeData: RecordLike,
  summary?: string | null,
): void {
  if (!summary) return;
  const topSummary = asRecord(resumeData.summary);
  if (topSummary) {
    if (
      typeof topSummary.content === "string" ||
      topSummary.content === undefined
    ) {
      topSummary.content = summary;
      return;
    }
    if (
      typeof topSummary.value === "string" ||
      topSummary.value === undefined
    ) {
      topSummary.value = summary;
      return;
    }
  }

  const sections = asRecord(resumeData.sections);
  const summarySection = asRecord(sections?.summary);
  if (summarySection) {
    summarySection.content = summary;
    return;
  }
}

export function applyTailoredSkills(
  resumeData: RecordLike,
  tailoredSkills?: TailoredSkillsInput,
): void {
  const skills = parseTailoredSkills(tailoredSkills);
  if (!skills) return;

  const sections = asRecord(resumeData.sections);
  const skillsSection = asRecord(sections?.skills);
  const existingItems = asArray(skillsSection?.items);
  if (!skillsSection || !existingItems) return;
  const existing = existingItems
    .map((item) => asRecord(item))
    .filter((item): item is RecordLike => Boolean(item));

  const template = existing[0] ?? null;
  if (!template) return;

  skillsSection.items = skills.map((newSkill) => {
    const match =
      existing.find((item) => item.name === newSkill.name) ?? template;
    const next: RecordLike = { ...match };

    if ("id" in next) {
      next.id =
        (typeof newSkill.id === "string" && newSkill.id) ||
        (typeof match.id === "string" ? match.id : "") ||
        createId();
    }

    if ("name" in next) {
      next.name =
        (typeof newSkill.name === "string" ? newSkill.name : "") ||
        (typeof match.name === "string" ? match.name : "");
    }
    if ("keywords" in next) {
      next.keywords = Array.isArray(newSkill.keywords)
        ? newSkill.keywords.filter((k) => typeof k === "string")
        : Array.isArray(match.keywords)
          ? match.keywords.filter((k) => typeof k === "string")
          : [];
    }

    if ("description" in next) {
      next.description =
        typeof newSkill.description === "string"
          ? newSkill.description
          : typeof match.description === "string"
            ? match.description
            : "";
    }
    if ("proficiency" in next) {
      next.proficiency =
        typeof newSkill.proficiency === "string"
          ? newSkill.proficiency
          : typeof newSkill.description === "string"
            ? newSkill.description
            : typeof match.proficiency === "string"
              ? match.proficiency
              : "";
    }
    if ("level" in next) {
      next.level =
        typeof newSkill.level === "number"
          ? newSkill.level
          : typeof match.level === "number"
            ? match.level
            : next.level;
    }
    if ("hidden" in next) {
      next.hidden =
        typeof newSkill.hidden === "boolean"
          ? newSkill.hidden
          : typeof match.hidden === "boolean"
            ? match.hidden
            : next.hidden;
    }

    return next;
  });
}

export function applyTailoredExperience(
  resumeData: RecordLike,
  tailoredExperience?: TailoredExperienceEntry[] | null,
): void {
  if (tailoredExperience === undefined || tailoredExperience === null) return;

  const sections = asRecord(resumeData.sections);
  const experienceSection = asRecord(sections?.experience);
  const items = asArray(experienceSection?.items);
  if (!experienceSection || !items) {
    if (tailoredExperience.length > 0) {
      throw new Error(
        "Tailored experience cannot be applied because the base resume has no experience section",
      );
    }
    return;
  }

  const selectedByKey = new Map(
    tailoredExperience.map((entry) => [
      experienceKey(entry.experienceId, entry.roleId),
      entry,
    ]),
  );
  const matchedKeys = new Set<string>();
  const nextItems: RecordLike[] = [];

  for (const rawItem of items) {
    const item = asRecord(rawItem);
    if (!item || typeof item.id !== "string") continue;
    const roles = asArray(item.roles) ?? [];

    if (roles.length > 0) {
      for (const rawRole of roles) {
        const role = asRecord(rawRole);
        if (!role || typeof role.id !== "string") continue;
        const key = experienceKey(item.id, role.id);
        const selected = selectedByKey.get(key);
        if (!selected) continue;
        matchedKeys.add(key);
        nextItems.push({
          ...item,
          id: `${item.id}:${role.id}`,
          hidden: false,
          position: role.position,
          period: role.period,
          description: bulletsToHtml(selected.bullets),
          roles: [],
        });
      }
      continue;
    }

    const key = experienceKey(item.id, null);
    const selected = selectedByKey.get(key);
    if (!selected) continue;
    matchedKeys.add(key);
    nextItems.push({
      ...item,
      hidden: false,
      description: bulletsToHtml(selected.bullets),
      roles: [],
    });
  }

  const missing = [...selectedByKey.keys()].filter(
    (key) => !matchedKeys.has(key),
  );
  if (missing.length > 0) {
    throw new Error(
      "Tailored experience references roles that no longer exist in the base resume. Regenerate experience tailoring.",
    );
  }

  experienceSection.items = nextItems;
  experienceSection.hidden = nextItems.length === 0;
}

export function extractProjectsFromResume(resumeData: RecordLike): {
  catalog: ResumeProjectCatalogItem[];
  selectionItems: ResumeProjectSelectionItem[];
} {
  const sections = asRecord(resumeData.sections);
  const projectsSection = asRecord(sections?.projects);
  const items = asArray(projectsSection?.items);
  if (!items) return { catalog: [], selectionItems: [] };

  const catalog: ResumeProjectCatalogItem[] = [];
  const selectionItems: ResumeProjectSelectionItem[] = [];

  for (const raw of items) {
    const item = asRecord(raw);
    if (!item) continue;
    const id = typeof item.id === "string" ? item.id : "";
    if (!id) continue;

    const name = typeof item.name === "string" ? item.name : id;
    const description =
      typeof item.description === "string"
        ? stripHtmlTags(item.description)
        : "";
    const date = typeof item.period === "string" ? item.period : "";

    const isVisibleInBase = !(typeof item.hidden === "boolean"
      ? item.hidden
      : false);

    const summaryRaw = description;

    const base: ResumeProjectCatalogItem = {
      id,
      name,
      description,
      date,
      isVisibleInBase,
    };
    catalog.push(base);
    selectionItems.push({
      ...base,
      summaryText: stripHtmlTags(summaryRaw),
    });
  }

  return { catalog, selectionItems };
}

export function applyProjectVisibility(args: {
  resumeData: RecordLike;
  selectedProjectIds: ReadonlySet<string>;
  forceVisibleProjectsSection?: boolean;
}): void {
  const sections = asRecord(args.resumeData.sections);
  const projectsSection = asRecord(sections?.projects);
  const items = asArray(projectsSection?.items);
  if (!projectsSection || !items) return;

  for (const raw of items) {
    const item = asRecord(raw);
    if (!item) continue;
    const id = typeof item.id === "string" ? item.id : "";
    if (!id) continue;

    if ("hidden" in item) {
      item.hidden = !args.selectedProjectIds.has(id);
    }
  }

  if (args.forceVisibleProjectsSection !== false) {
    if ("hidden" in projectsSection) {
      projectsSection.hidden = false;
    }
  }
}

export function applyTailoredChunks(args: {
  resumeData: RecordLike;
  tailoredContent: TailorChunkInput;
}): void {
  applyTailoredExperience(args.resumeData, args.tailoredContent.experience);
  applyTailoredSkills(args.resumeData, args.tailoredContent.skills);
  applyTailoredSummary(args.resumeData, args.tailoredContent.summary);
  applyTailoredHeadline(args.resumeData, args.tailoredContent.headline);
}
