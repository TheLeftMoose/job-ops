import * as api from "@client/api";
import {
  parseTailoredExperience,
  serializeTailoredExperience,
} from "@shared/tailored-experience.js";
import type {
  Job,
  ResumeProjectCatalogItem,
  TailoredExperienceEntry,
} from "@shared/types.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTailoredSkillDraftId,
  type EditableSkillGroup,
  fromEditableSkillGroups,
  parseTailoredSkills,
  serializeTailoredSkills,
  toEditableSkillGroups,
} from "../tailoring-utils";

const parseSelectedIds = (value: string | null | undefined) =>
  new Set(value?.split(",").filter(Boolean) ?? []);

const toSelectedIdsCsv = (ids: Set<string>) => Array.from(ids).sort().join(",");

const hasSelectionDiff = (current: Set<string>, saved: Set<string>) => {
  if (current.size !== saved.size) return true;
  for (const id of current) {
    if (!saved.has(id)) return true;
  }
  return false;
};

export interface TailoringSavePayload {
  tailoredSummary: string;
  tailoredHeadline: string;
  tailoredSkills: string;
  tailoredExperience: string | null;
  jobDescription: string;
  selectedProjectIds: string;
  tracerLinksEnabled: boolean;
}

export const getTailoringSavePayloadKey = (
  payload: TailoringSavePayload,
): string =>
  JSON.stringify({
    tailoredSummary: payload.tailoredSummary,
    tailoredHeadline: payload.tailoredHeadline,
    tailoredSkills: payload.tailoredSkills,
    tailoredExperience: payload.tailoredExperience,
    jobDescription: payload.jobDescription,
    selectedProjectIds: toSelectedIdsCsv(
      parseSelectedIds(payload.selectedProjectIds),
    ),
    tracerLinksEnabled: payload.tracerLinksEnabled,
  });

const parseIncomingDraft = (incomingJob: Job) => {
  const summary = incomingJob.tailoredSummary || "";
  const headline = incomingJob.tailoredHeadline || "";
  const description = incomingJob.jobDescription || "";
  const selectedIds = parseSelectedIds(incomingJob.selectedProjectIds);
  const skillsDraft = toEditableSkillGroups(
    parseTailoredSkills(incomingJob.tailoredSkills),
  );
  const skillsJson = serializeTailoredSkills(
    fromEditableSkillGroups(skillsDraft),
  );
  const experienceEnabled = incomingJob.tailoredExperience !== null;
  const experienceDraft = parseTailoredExperience(
    incomingJob.tailoredExperience,
  );
  const experienceJson = experienceEnabled
    ? serializeTailoredExperience(experienceDraft)
    : null;
  const tracerLinksEnabled = Boolean(incomingJob.tracerLinksEnabled);

  return {
    summary,
    headline,
    description,
    selectedIds,
    skillsDraft,
    skillsJson,
    experienceEnabled,
    experienceDraft,
    experienceJson,
    tracerLinksEnabled,
  };
};

interface UseTailoringDraftParams {
  job: Job;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function useTailoringDraft({
  job,
  onDirtyChange,
}: UseTailoringDraftParams) {
  const [catalog, setCatalog] = useState<ResumeProjectCatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [summary, setSummary] = useState(job.tailoredSummary || "");
  const [headline, setHeadline] = useState(job.tailoredHeadline || "");
  const [jobDescription, setJobDescription] = useState(
    job.jobDescription || "",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    parseSelectedIds(job.selectedProjectIds),
  );
  const [skillsDraft, setSkillsDraft] = useState<EditableSkillGroup[]>(() =>
    toEditableSkillGroups(parseTailoredSkills(job.tailoredSkills)),
  );
  const [experienceEnabled, setExperienceEnabled] = useState(
    job.tailoredExperience !== null,
  );
  const [experienceDraft, setExperienceDraft] = useState<
    TailoredExperienceEntry[]
  >(() => parseTailoredExperience(job.tailoredExperience));
  const [openSkillGroupId, setOpenSkillGroupId] = useState<string>("");
  const [tracerLinksEnabled, setTracerLinksEnabled] = useState(
    Boolean(job.tracerLinksEnabled),
  );

  const [savedSummary, setSavedSummary] = useState(job.tailoredSummary || "");
  const [savedHeadline, setSavedHeadline] = useState(
    job.tailoredHeadline || "",
  );
  const [savedDescription, setSavedDescription] = useState(
    job.jobDescription || "",
  );
  const [savedSelectedIds, setSavedSelectedIds] = useState<Set<string>>(() =>
    parseSelectedIds(job.selectedProjectIds),
  );
  const [savedSkillsJson, setSavedSkillsJson] = useState(() =>
    serializeTailoredSkills(parseTailoredSkills(job.tailoredSkills)),
  );
  const [savedExperienceJson, setSavedExperienceJson] = useState<string | null>(
    () =>
      job.tailoredExperience !== null
        ? serializeTailoredExperience(
            parseTailoredExperience(job.tailoredExperience),
          )
        : null,
  );
  const [savedTracerLinksEnabled, setSavedTracerLinksEnabled] = useState(
    Boolean(job.tracerLinksEnabled),
  );

  const lastJobIdRef = useRef(job.id);
  const jobRef = useRef(job);

  const skillsJson = useMemo(
    () => serializeTailoredSkills(fromEditableSkillGroups(skillsDraft)),
    [skillsDraft],
  );
  const experienceJson = useMemo(
    () =>
      experienceEnabled ? serializeTailoredExperience(experienceDraft) : null,
    [experienceDraft, experienceEnabled],
  );

  const selectedIdsCsv = useMemo(
    () => toSelectedIdsCsv(selectedIds),
    [selectedIds],
  );

  const isDirty = useMemo(() => {
    if (summary !== savedSummary) return true;
    if (headline !== savedHeadline) return true;
    if (jobDescription !== savedDescription) return true;
    if (skillsJson !== savedSkillsJson) return true;
    if (experienceJson !== savedExperienceJson) return true;
    if (tracerLinksEnabled !== savedTracerLinksEnabled) return true;
    return hasSelectionDiff(selectedIds, savedSelectedIds);
  }, [
    summary,
    savedSummary,
    headline,
    savedHeadline,
    jobDescription,
    savedDescription,
    skillsJson,
    savedSkillsJson,
    experienceJson,
    savedExperienceJson,
    tracerLinksEnabled,
    savedTracerLinksEnabled,
    selectedIds,
    savedSelectedIds,
  ]);

  const savedPayloadKey = useMemo(
    () =>
      getTailoringSavePayloadKey({
        tailoredSummary: savedSummary,
        tailoredHeadline: savedHeadline,
        tailoredSkills: savedSkillsJson,
        tailoredExperience: savedExperienceJson,
        jobDescription: savedDescription,
        selectedProjectIds: toSelectedIdsCsv(savedSelectedIds),
        tracerLinksEnabled: savedTracerLinksEnabled,
      }),
    [
      savedSummary,
      savedHeadline,
      savedSkillsJson,
      savedExperienceJson,
      savedDescription,
      savedSelectedIds,
      savedTracerLinksEnabled,
    ],
  );

  const applyIncomingDraft = useCallback((incomingJob: Job) => {
    const next = parseIncomingDraft(incomingJob);
    setSummary(next.summary);
    setHeadline(next.headline);
    setJobDescription(next.description);
    setSelectedIds(next.selectedIds);
    setSkillsDraft(next.skillsDraft);
    setExperienceEnabled(next.experienceEnabled);
    setExperienceDraft(next.experienceDraft);
    setSavedSummary(next.summary);
    setSavedHeadline(next.headline);
    setSavedDescription(next.description);
    setSavedSelectedIds(next.selectedIds);
    setSavedSkillsJson(next.skillsJson);
    setSavedExperienceJson(next.experienceJson);
    setTracerLinksEnabled(next.tracerLinksEnabled);
    setSavedTracerLinksEnabled(next.tracerLinksEnabled);
  }, []);

  const markSavedSnapshot = useCallback((snapshot: TailoringSavePayload) => {
    setSavedSummary(snapshot.tailoredSummary);
    setSavedHeadline(snapshot.tailoredHeadline);
    setSavedDescription(snapshot.jobDescription);
    setSavedSelectedIds(parseSelectedIds(snapshot.selectedProjectIds));
    setSavedSkillsJson(snapshot.tailoredSkills);
    setSavedExperienceJson(snapshot.tailoredExperience);
    setSavedTracerLinksEnabled(snapshot.tracerLinksEnabled);
  }, []);

  const markSavedJob = useCallback((incomingJob: Job) => {
    const next = parseIncomingDraft(incomingJob);
    setSavedSummary(next.summary);
    setSavedHeadline(next.headline);
    setSavedDescription(next.description);
    setSavedSelectedIds(next.selectedIds);
    setSavedSkillsJson(next.skillsJson);
    setSavedExperienceJson(next.experienceJson);
    setSavedTracerLinksEnabled(next.tracerLinksEnabled);
  }, []);

  const loadCatalog = useCallback(async (silently = false) => {
    if (!silently) setIsCatalogLoading(true);
    try {
      const nextCatalog = await api.getResumeProjectsCatalog();
      setCatalog(nextCatalog);
    } catch {
      if (!silently) setCatalog([]);
    } finally {
      if (!silently) setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    void loadCatalog(false);

    const refreshCatalog = () => {
      void loadCatalog(true);
    };

    window.addEventListener("focus", refreshCatalog);
    document.addEventListener("visibilitychange", refreshCatalog);
    return () => {
      window.removeEventListener("focus", refreshCatalog);
      document.removeEventListener("visibilitychange", refreshCatalog);
    };
  }, [loadCatalog]);

  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  // Only sync when job ID changes (user switched to a different job)
  // User edits persist until explicitly saved - no auto-sync from server
  useEffect(() => {
    if (job.id !== lastJobIdRef.current) {
      lastJobIdRef.current = job.id;
      applyIncomingDraft(jobRef.current);
    }
  }, [job.id, applyIncomingDraft]);

  useEffect(() => {
    if (
      openSkillGroupId.length > 0 &&
      !skillsDraft.some((group) => group.id === openSkillGroupId)
    ) {
      setOpenSkillGroupId("");
    }
  }, [skillsDraft, openSkillGroupId]);

  const handleToggleProject = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddSkillGroup = useCallback(() => {
    const nextId = createTailoredSkillDraftId();
    setSkillsDraft((prev) => [
      ...prev,
      { id: nextId, name: "", keywordsText: "" },
    ]);
    setOpenSkillGroupId(nextId);
  }, []);

  const handleUpdateSkillGroup = useCallback(
    (id: string, key: "name" | "keywordsText", value: string) => {
      setSkillsDraft((prev) =>
        prev.map((group) =>
          group.id === id ? { ...group, [key]: value } : group,
        ),
      );
    },
    [],
  );

  const handleRemoveSkillGroup = useCallback((id: string) => {
    setSkillsDraft((prev) => prev.filter((group) => group.id !== id));
  }, []);

  const handleUpdateExperienceBullet = useCallback(
    (entryIndex: number, bulletIndex: number, value: string) => {
      setExperienceEnabled(true);
      setExperienceDraft((previous) =>
        previous.map((entry, currentEntryIndex) =>
          currentEntryIndex !== entryIndex
            ? entry
            : {
                ...entry,
                bullets: entry.bullets.map((bullet, currentBulletIndex) =>
                  currentBulletIndex === bulletIndex ? value : bullet,
                ),
              },
        ),
      );
    },
    [],
  );

  const handleRemoveExperienceRole = useCallback((entryIndex: number) => {
    setExperienceEnabled(true);
    setExperienceDraft((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== entryIndex),
    );
  }, []);

  return {
    catalog,
    isCatalogLoading,
    summary,
    setSummary,
    headline,
    setHeadline,
    jobDescription,
    setJobDescription,
    selectedIds,
    selectedIdsCsv,
    skillsDraft,
    setSkillsDraft,
    openSkillGroupId,
    setOpenSkillGroupId,
    skillsJson,
    experienceDraft,
    experienceJson,
    tracerLinksEnabled,
    setTracerLinksEnabled,
    isDirty,
    savedPayloadKey,
    applyIncomingDraft,
    markSavedSnapshot,
    markSavedJob,
    handleToggleProject,
    handleAddSkillGroup,
    handleUpdateSkillGroup,
    handleRemoveSkillGroup,
    handleUpdateExperienceBullet,
    handleRemoveExperienceRole,
  };
}
