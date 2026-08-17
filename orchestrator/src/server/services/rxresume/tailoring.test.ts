import { describe, expect, it } from "vitest";
import {
  applyTailoredExperience,
  extractProjectsFromResume,
} from "./tailoring";

describe("rxresume tailoring", () => {
  it("strips html from project catalog descriptions", () => {
    const { catalog, selectionItems } = extractProjectsFromResume({
      sections: {
        projects: {
          items: [
            {
              id: "p1",
              name: "Analytics",
              description:
                "<ul><li><p><strong>Built analytics</strong> using FastAPI.</p></li></ul>",
              hidden: false,
              period: "2024",
            },
          ],
        },
      },
    });

    expect(catalog[0].description).toBe("Built analytics using FastAPI.");
    expect(selectionItems[0].summaryText).toBe(
      "Built analytics using FastAPI.",
    );
  });

  it("keeps base experience unchanged when tailored experience is null", () => {
    const resume = {
      sections: {
        experience: {
          hidden: false,
          items: [{ id: "e1", description: "<p>Original</p>", roles: [] }],
        },
      },
    };

    applyTailoredExperience(resume, null);

    expect(resume.sections.experience.items).toEqual([
      { id: "e1", description: "<p>Original</p>", roles: [] },
    ]);
  });

  it("selects top-level roles and escapes generated bullets", () => {
    const resume = {
      sections: {
        experience: {
          hidden: false,
          items: [
            { id: "e1", description: "Old", roles: [], hidden: false },
            { id: "e2", description: "Other", roles: [], hidden: false },
          ],
        },
      },
    };

    applyTailoredExperience(resume, [
      {
        experienceId: "e1",
        roleId: null,
        company: "Acme",
        position: "Engineer",
        period: "2024",
        bullets: ["Built <APIs>", "Led R&D", "Improved reliability"],
      },
    ]);

    expect(resume.sections.experience.items).toHaveLength(1);
    expect(resume.sections.experience.items[0].description).toBe(
      "<ul><li>Built &lt;APIs&gt;</li><li>Led R&amp;D</li><li>Improved reliability</li></ul>",
    );
  });

  it("flattens selected nested roles in source order", () => {
    const resume = {
      sections: {
        experience: {
          hidden: false,
          items: [
            {
              id: "e1",
              company: "Acme",
              location: "London",
              description: "Company",
              hidden: false,
              roles: [
                {
                  id: "r1",
                  position: "Engineer",
                  period: "2020",
                  description: "Old",
                },
                {
                  id: "r2",
                  position: "Lead",
                  period: "2022",
                  description: "New",
                },
              ],
            },
          ],
        },
      },
    };

    applyTailoredExperience(resume, [
      {
        experienceId: "e1",
        roleId: "r2",
        company: "Acme",
        position: "Lead",
        period: "2022",
        bullets: ["Led delivery", "Mentored engineers", "Improved quality"],
      },
      {
        experienceId: "e1",
        roleId: "r1",
        company: "Acme",
        position: "Engineer",
        period: "2020",
        bullets: ["Built services", "Shipped APIs", "Reduced incidents"],
      },
    ]);

    expect(
      resume.sections.experience.items.map(
        (item) => (item as { position?: string }).position,
      ),
    ).toEqual(["Engineer", "Lead"]);
    expect(resume.sections.experience.items[0].roles).toEqual([]);
  });

  it("rejects stale experience identifiers", () => {
    const resume = {
      sections: {
        experience: {
          hidden: false,
          items: [{ id: "e1", description: "Original", roles: [] }],
        },
      },
    };

    expect(() =>
      applyTailoredExperience(resume, [
        {
          experienceId: "missing",
          roleId: null,
          company: "Acme",
          position: "Engineer",
          period: "2024",
          bullets: ["One", "Two", "Three"],
        },
      ]),
    ).toThrow(/no longer exist/i);
  });
});
