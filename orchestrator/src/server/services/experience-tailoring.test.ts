import type { ResumeProfile } from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callJson: vi.fn(),
  template:
    "Select {{maxRoles}} roles from {{experienceCandidatesJson}} for {{jobDescription}}. Write in {{outputLanguage}}. {{constraintsBullet}} {{avoidTermsBullet}}",
}));

vi.mock("./modelSelection", () => ({
  resolveLlmModel: vi.fn().mockResolvedValue("test-model"),
  createConfiguredLlmService: vi.fn().mockResolvedValue({
    callJson: mocks.callJson,
    getProvider: () => "test",
    getBaseUrl: () => "http://test",
  }),
}));

vi.mock("./writing-style", () => ({
  getWritingStyle: vi.fn().mockResolvedValue({
    tone: "professional",
    formality: "medium",
    constraints: "",
    doNotUse: "",
    languageMode: "manual",
    manualLanguage: "english",
    summaryMaxWords: null,
    maxKeywordsPerSkill: null,
  }),
}));

vi.mock("./prompt-templates", () => ({
  getEffectivePromptTemplate: vi.fn().mockResolvedValue(mocks.template),
  renderPromptTemplate: vi.fn(
    (template: string, tokens: Record<string, string | number>) =>
      template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) =>
        String(tokens[key] ?? ""),
      ),
  ),
}));

import {
  extractExperienceCandidates,
  generateExperienceTailoring,
} from "./experience-tailoring";

const profile: ResumeProfile = {
  sections: {
    experience: {
      visible: true,
      items: [
        {
          id: "experience-1",
          company: "Acme",
          position: "",
          location: "London",
          date: "",
          summary: "",
          visible: true,
          roles: [
            {
              id: "role-1",
              position: "Engineer",
              date: "2020-2022",
              summary: "<p>Built APIs and reduced incidents.</p>",
            },
            {
              id: "role-2",
              position: "Lead Engineer",
              date: "2022-2024",
              summary: "<p>Led delivery and mentored engineers.</p>",
            },
          ],
        },
      ],
    },
  },
};

describe("experience tailoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts nested roles as independent sanitized candidates", () => {
    expect(extractExperienceCandidates(profile)).toEqual([
      expect.objectContaining({
        experienceId: "experience-1",
        roleId: "role-1",
        company: "Acme",
        position: "Engineer",
        sourceText: "Built APIs and reduced incidents.",
      }),
      expect.objectContaining({
        experienceId: "experience-1",
        roleId: "role-2",
        position: "Lead Engineer",
      }),
    ]);
  });

  it("returns validated roles in base source order", async () => {
    mocks.callJson.mockResolvedValue({
      success: true,
      data: {
        experience: [
          {
            experienceId: "experience-1",
            roleId: "role-2",
            bullets: ["Led delivery", "Mentored engineers", "Improved quality"],
          },
          {
            experienceId: "experience-1",
            roleId: "role-1",
            bullets: ["Built APIs", "Reduced incidents", "Shipped services"],
          },
        ],
      },
    });

    const result = await generateExperienceTailoring({
      jobDescription: "Lead API engineering role",
      profile,
      maxRoles: 2,
    });

    expect(result).toEqual({
      success: true,
      data: [
        expect.objectContaining({ roleId: "role-1" }),
        expect.objectContaining({ roleId: "role-2" }),
      ],
    });
    expect(mocks.callJson).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining("Select 2 roles"),
          }),
        ],
      }),
    );
  });

  it("rejects unknown role identifiers", async () => {
    mocks.callJson.mockResolvedValue({
      success: true,
      data: {
        experience: [
          {
            experienceId: "experience-1",
            roleId: "missing",
            bullets: ["One", "Two", "Three"],
          },
        ],
      },
    });

    const result = await generateExperienceTailoring({
      jobDescription: "API role",
      profile,
      maxRoles: 2,
    });

    expect(result).toEqual({
      success: false,
      error: "Experience tailoring returned an unknown role",
    });
  });
});
