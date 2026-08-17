import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TailoringSections } from "./TailoringSections";

const baseProps: React.ComponentProps<typeof TailoringSections> = {
  catalog: [],
  isCatalogLoading: false,
  summary: "",
  headline: "",
  jobDescription: "",
  skillsDraft: [],
  experienceDraft: [],
  selectedIds: new Set(),
  resumeExperienceSettings: { mode: "tailored", maxRoles: 4 },
  tracerLinksEnabled: false,
  tracerEnableBlocked: false,
  tracerEnableBlockedReason: null,
  generatingSection: null,
  openSkillGroupId: "",
  disableInputs: false,
  onGenerateSummary: vi.fn(),
  onGenerateHeadline: vi.fn(),
  onGenerateSkills: vi.fn(),
  onGenerateExperience: vi.fn(),
  onSummaryChange: vi.fn(),
  onHeadlineChange: vi.fn(),
  onUndoSummary: vi.fn(),
  onUndoHeadline: vi.fn(),
  onUndoSkills: vi.fn(),
  onRedoSummary: vi.fn(),
  onRedoHeadline: vi.fn(),
  onRedoSkills: vi.fn(),
  canUndoSummary: false,
  canUndoHeadline: false,
  canUndoSkills: false,
  canRedoSummary: false,
  canRedoHeadline: false,
  canRedoSkills: false,
  onDescriptionChange: vi.fn(),
  onSkillGroupOpenChange: vi.fn(),
  onAddSkillGroup: vi.fn(),
  onUpdateSkillGroup: vi.fn(),
  onRemoveSkillGroup: vi.fn(),
  onUpdateExperienceBullet: vi.fn(),
  onRemoveExperienceRole: vi.fn(),
  onToggleProject: vi.fn(),
  onTracerLinksEnabledChange: vi.fn(),
};

describe("TailoringSections experience", () => {
  it("explains preserve mode without offering generation", () => {
    render(
      <TailoringSections
        {...baseProps}
        resumeExperienceSettings={{ mode: "preserve", maxRoles: 5 }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tailored Experience" }),
    );

    expect(screen.getByText(/uses every visible role/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Generate experience" }),
    ).not.toBeInTheDocument();
  });

  it("renders and edits generated role bullets", () => {
    const onUpdateExperienceBullet = vi.fn();
    render(
      <TailoringSections
        {...baseProps}
        experienceDraft={[
          {
            experienceId: "e1",
            roleId: null,
            company: "Acme",
            position: "Lead Engineer",
            period: "2022-2024",
            bullets: ["Led delivery", "Mentored engineers", "Improved quality"],
          },
        ]}
        onUpdateExperienceBullet={onUpdateExperienceBullet}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tailored Experience" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Lead Engineer bullet 1" }),
      { target: { value: "Led platform delivery" } },
    );

    expect(onUpdateExperienceBullet).toHaveBeenCalledWith(
      0,
      0,
      "Led platform delivery",
    );
  });
});
