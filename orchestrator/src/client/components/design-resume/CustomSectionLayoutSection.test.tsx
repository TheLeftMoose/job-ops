import type { DesignResumeJson } from "@shared/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomSectionLayoutSection } from "./CustomSectionLayoutSection";

describe("CustomSectionLayoutSection", () => {
  it("shows canonical placement controls for every custom section", () => {
    const resumeJson = {
      customSections: [
        {
          id: "expertise",
          title: "Expertise Areas",
          type: "summary",
          items: [],
        },
        {
          id: "about",
          title: "About Me",
          type: "summary",
          items: [],
        },
      ],
      metadata: {
        layout: {
          pages: [
            { fullWidth: false, main: [], sidebar: ["expertise"] },
            { fullWidth: true, main: ["about"], sidebar: [] },
          ],
        },
      },
    } as unknown as DesignResumeJson;

    render(
      <CustomSectionLayoutSection
        resumeJson={resumeJson}
        onPlacementChange={vi.fn()}
        onOrderChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Expertise Areas")).toBeInTheDocument();
    expect(screen.getByText("About Me")).toBeInTheDocument();
    expect(screen.getAllByText("Blue sidebar")).toHaveLength(2);
    expect(
      screen.getByText("Between Summary and Experience"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Later pages")).toHaveLength(2);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
});
