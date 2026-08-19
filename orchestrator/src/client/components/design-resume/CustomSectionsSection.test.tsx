import type { DesignResumeJson } from "@shared/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomSectionsSection } from "./CustomSectionsSection";

describe("CustomSectionsSection", () => {
  it("shows every canonical custom section with visibility and edit controls", () => {
    const resumeJson = {
      customSections: [
        {
          id: "expertise",
          title: "Expertise Areas",
          type: "summary",
          hidden: false,
          items: [{ id: "expertise-item", content: "<ul><li>Cloud</li></ul>" }],
        },
        {
          id: "achievements",
          title: "Selected Achievements",
          type: "summary",
          hidden: false,
          items: [
            {
              id: "achievements-item",
              content: "<ul><li>Scaled a platform</li></ul>",
            },
          ],
        },
        {
          id: "about",
          title: "About Me",
          type: "summary",
          hidden: true,
          items: [{ id: "about-item", content: "<p>Enjoys sailing.</p>" }],
        },
      ],
      metadata: {
        layout: {
          pages: [
            {
              fullWidth: false,
              main: [],
              sidebar: ["expertise", "achievements"],
            },
            { fullWidth: true, main: ["about"], sidebar: [] },
          ],
        },
      },
    } as unknown as DesignResumeJson;

    render(
      <CustomSectionsSection resumeJson={resumeJson} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Expertise Areas")).toBeInTheDocument();
    expect(screen.getByText("Selected Achievements")).toBeInTheDocument();
    expect(screen.getByText("About Me")).toBeInTheDocument();
    expect(screen.getAllByText("Visible")).toHaveLength(2);
    expect(screen.getAllByText("Hidden")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
