import type { DesignResumeJson } from "@shared/types";
import { describe, expect, it } from "vitest";
import {
  getCustomSectionPlacement,
  moveCustomSectionWithinPlacement,
  setCustomSectionPlacement,
} from "./utils";

const resumeJson = {
  customSections: [
    {
      id: "achievements",
      title: "Selected Achievements",
      type: "summary",
      items: [{ id: "item-1", content: "<ul><li>Scaled a platform</li></ul>" }],
    },
    {
      id: "about",
      title: "About Me",
      type: "summary",
      items: [{ id: "item-2", content: "<p>Enjoys sailing.</p>" }],
    },
  ],
  metadata: {
    layout: {
      sidebarWidth: 35,
      pages: [
        {
          fullWidth: false,
          main: ["experience"],
          sidebar: ["achievements"],
        },
        {
          fullWidth: true,
          main: ["about"],
          sidebar: [],
        },
      ],
    },
  },
} as unknown as DesignResumeJson;

describe("custom section layout", () => {
  it("reads placement from canonical Resume Studio pages", () => {
    expect(getCustomSectionPlacement(resumeJson, "achievements")).toBe(
      "sidebar",
    );
    expect(getCustomSectionPlacement(resumeJson, "about")).toBe("continuation");
  });

  it("moves sections without leaving duplicate layout references", () => {
    const next = setCustomSectionPlacement(resumeJson, "achievements", "main");

    expect(next.metadata.layout.pages[0]?.sidebar).not.toContain(
      "achievements",
    );
    expect(next.metadata.layout.pages[0]?.main).toEqual([
      "achievements",
      "experience",
    ]);
    expect(next.metadata.layout.pages[1]?.main).toEqual(["about"]);
  });

  it("reorders custom sections without disturbing standard sidebar entries", () => {
    const ordered = structuredClone(resumeJson);
    ordered.metadata.layout.pages[0].sidebar = [
      "skills",
      "achievements",
      "languages",
      "about",
    ];
    ordered.metadata.layout.pages[1].main = [];

    const next = moveCustomSectionWithinPlacement(ordered, "about", -1);

    expect(next.metadata.layout.pages[0]?.sidebar).toEqual([
      "skills",
      "about",
      "languages",
      "achievements",
    ]);
  });
});
