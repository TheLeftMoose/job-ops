import type { DesignResumeDocument } from "@shared/types";
import type { ItemDefinition } from "./definitions";

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function getByPath(
  source: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, source);
}

export function setByPath(
  source: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const next = structuredClone(source) as Record<string, unknown>;
  const segments = path.split(".");
  let cursor = next;
  for (const segment of segments.slice(0, -1)) {
    const current = cursor[segment];
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1] ?? path] = value;
  return next;
}

export function fieldId(...parts: string[]): string {
  return `design-resume-${parts.join("-").replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function makeDownload(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function getDesignResumeDialogItem(
  draft: DesignResumeDocument | null,
  definition: ItemDefinition,
  index: number | null,
) {
  if (!draft || index == null) return null;
  const sections = (asRecord(draft.resumeJson.sections) ?? {}) as Record<
    string,
    unknown
  >;
  const section = (asRecord(sections[definition.key]) ?? {}) as Record<
    string,
    unknown
  >;
  const items = asArray(section.items).map(
    (item) => asRecord(item) ?? {},
  ) as Record<string, unknown>[];
  return items[index] ?? null;
}

export const REORDERABLE_SECTION_KEYS = [
  "profiles",
  "experience",
  "education",
  "projects",
  "skills",
  "languages",
  "interests",
  "awards",
  "certifications",
  "publications",
  "volunteer",
  "references",
];

export type CustomSectionPlacement = "sidebar" | "main" | "continuation";

function customSectionDefaultsToSidebar(
  resumeJson: Record<string, unknown>,
  sectionId: string,
): boolean {
  const section = asArray(resumeJson.customSections)
    .map((item) => asRecord(item))
    .find((item) => toText(item?.id) === sectionId);
  return asArray(section?.items).some((item) =>
    /<li\b/i.test(
      toText(asRecord(item)?.content ?? asRecord(item)?.description),
    ),
  );
}

export function getCustomSectionPlacement(
  resumeJson: Record<string, unknown>,
  sectionId: string,
): CustomSectionPlacement {
  const metadata = asRecord(resumeJson.metadata);
  const layout = asRecord(metadata?.layout);
  const pages = asArray(layout?.pages);

  for (const [pageIndex, page] of pages.entries()) {
    const pageRecord = asRecord(page);
    if (pageIndex === 0 && asArray(pageRecord?.sidebar).includes(sectionId)) {
      return "sidebar";
    }
    if (pageIndex === 0 && asArray(pageRecord?.main).includes(sectionId)) {
      return "main";
    }
    if (
      pageIndex > 0 &&
      (asArray(pageRecord?.main).includes(sectionId) ||
        asArray(pageRecord?.sidebar).includes(sectionId))
    ) {
      return "continuation";
    }
  }

  return customSectionDefaultsToSidebar(resumeJson, sectionId)
    ? "sidebar"
    : "continuation";
}

export function setCustomSectionPlacement(
  resumeJson: DesignResumeDocument["resumeJson"],
  sectionId: string,
  placement: CustomSectionPlacement,
): DesignResumeDocument["resumeJson"] {
  const next = structuredClone(resumeJson);
  if (!next.metadata) {
    next.metadata = {} as DesignResumeDocument["resumeJson"]["metadata"];
  }
  if (!next.metadata.layout) {
    next.metadata.layout = { sidebarWidth: 35, pages: [] };
  }
  if (!next.metadata.layout.pages) {
    next.metadata.layout.pages = [];
  }
  if (!next.metadata.layout.pages[0]) {
    next.metadata.layout.pages.push({
      fullWidth: false,
      main: getSectionOrder(resumeJson as Record<string, unknown>),
      sidebar: [],
    });
  }

  for (const page of next.metadata.layout.pages) {
    page.main = page.main.filter((key) => key !== sectionId);
    page.sidebar = page.sidebar.filter((key) => key !== sectionId);
  }

  if (placement === "sidebar") {
    next.metadata.layout.pages[0]?.sidebar.push(sectionId);
  } else if (placement === "main") {
    const main = next.metadata.layout.pages[0]?.main ?? [];
    const summaryIndex = main.indexOf("summary");
    const experienceIndex = main.indexOf("experience");
    const insertAt =
      summaryIndex !== -1
        ? summaryIndex + 1
        : experienceIndex === -1
          ? main.length
          : experienceIndex;
    main.splice(insertAt, 0, sectionId);
  } else {
    if (!next.metadata.layout.pages[1]) {
      next.metadata.layout.pages.push({
        fullWidth: true,
        main: [],
        sidebar: [],
      });
    }
    next.metadata.layout.pages[1]?.main.push(sectionId);
  }

  return next;
}

export function moveCustomSectionWithinPlacement(
  resumeJson: DesignResumeDocument["resumeJson"],
  sectionId: string,
  direction: -1 | 1,
): DesignResumeDocument["resumeJson"] {
  const next = structuredClone(resumeJson);
  const pages = next.metadata?.layout?.pages ?? [];
  const customIds = new Set(next.customSections.map((section) => section.id));

  for (const page of pages) {
    for (const key of ["main", "sidebar"] as const) {
      const index = page[key].indexOf(sectionId);
      if (index === -1) continue;
      const customPositions = page[key]
        .map((id, position) => (customIds.has(id) ? position : -1))
        .filter((position) => position !== -1);
      const customIndex = customPositions.indexOf(index);
      const targetIndex = customPositions[customIndex + direction];
      if (targetIndex === undefined) return next;
      [page[key][index], page[key][targetIndex]] = [
        page[key][targetIndex],
        page[key][index],
      ];
      return next;
    }
  }

  return next;
}

export function removeCustomSectionLayoutReferences(
  resumeJson: DesignResumeDocument["resumeJson"],
  sectionIds: Set<string>,
): DesignResumeDocument["resumeJson"] {
  const next = structuredClone(resumeJson);
  for (const page of next.metadata?.layout?.pages ?? []) {
    page.main = page.main.filter((key) => !sectionIds.has(key));
    page.sidebar = page.sidebar.filter((key) => !sectionIds.has(key));
  }
  return next;
}

export function getSectionOrder(resumeJson: Record<string, unknown>): string[] {
  const metadata = resumeJson.metadata as Record<string, unknown> | undefined;
  const layout = metadata?.layout as Record<string, unknown> | undefined;
  const pages = layout?.pages as unknown[] | undefined;
  const firstPage = pages?.[0] as Record<string, unknown> | undefined;
  const mainSections = firstPage?.main;

  const order: string[] = [];
  if (Array.isArray(mainSections)) {
    for (const key of mainSections) {
      if (
        typeof key === "string" &&
        REORDERABLE_SECTION_KEYS.includes(key) &&
        !order.includes(key)
      ) {
        order.push(key);
      }
    }
  }

  for (const key of REORDERABLE_SECTION_KEYS) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }

  return order;
}

export function getOrderedDefinitions(
  resumeJson: Record<string, unknown>,
  definitions: ItemDefinition[],
): ItemDefinition[] {
  const order = getSectionOrder(resumeJson);
  const reorderableDefs = definitions.filter((d) =>
    REORDERABLE_SECTION_KEYS.includes(d.key),
  );
  reorderableDefs.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  let reorderableIndex = 0;
  return definitions.map((d) => {
    if (REORDERABLE_SECTION_KEYS.includes(d.key)) {
      return reorderableDefs[reorderableIndex++];
    }
    return d;
  });
}
