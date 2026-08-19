import type { DesignResumeJson } from "@shared/types";
import {
  ChevronDown,
  ChevronUp,
  Files,
  PanelRight,
  PanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  asArray,
  asRecord,
  type CustomSectionPlacement,
  fieldId,
  getCustomSectionPlacement,
  toText,
} from "./utils";

type CustomSectionLayoutSectionProps = {
  resumeJson: DesignResumeJson;
  onPlacementChange: (
    sectionId: string,
    placement: CustomSectionPlacement,
  ) => void;
  onOrderChange: (sectionId: string, direction: -1 | 1) => void;
};

export function CustomSectionLayoutSection({
  resumeJson,
  onPlacementChange,
  onOrderChange,
}: CustomSectionLayoutSectionProps) {
  const customSections = asArray(resumeJson.customSections)
    .map((section) => asRecord(section))
    .filter((section): section is Record<string, unknown> => Boolean(section))
    .map((section, index) => ({
      id: toText(section.id, `custom-section-${index + 1}`),
      title: toText(section.title, `Custom section ${index + 1}`),
      type: toText(section.type, "summary"),
      hidden: Boolean(section.hidden),
    }));
  const sidebarSections = customSections.filter(
    (section) =>
      getCustomSectionPlacement(
        resumeJson as Record<string, unknown>,
        section.id,
      ) === "sidebar",
  );
  const mainSections = customSections.filter(
    (section) =>
      getCustomSectionPlacement(
        resumeJson as Record<string, unknown>,
        section.id,
      ) === "main",
  );
  const continuationSections = customSections.filter(
    (section) =>
      getCustomSectionPlacement(
        resumeJson as Record<string, unknown>,
        section.id,
      ) === "continuation",
  );
  const metadataPages = resumeJson.metadata?.layout?.pages ?? [];
  const orderedIds = [
    ...(metadataPages[0]?.sidebar ?? []),
    ...metadataPages.flatMap((page, index) =>
      index === 0 ? page.main : [...page.main, ...page.sidebar],
    ),
  ];
  const orderIndex = new Map(orderedIds.map((id, index) => [id, index]));
  const sortByLayout = (
    left: (typeof customSections)[number],
    right: (typeof customSections)[number],
  ) =>
    (orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
    (orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  sidebarSections.sort(sortByLayout);
  mainSections.sort(sortByLayout);
  continuationSections.sort(sortByLayout);
  const sections = [
    ...sidebarSections,
    ...mainSections,
    ...continuationSections,
  ];

  if (sections.length === 0) {
    return (
      <div className="border-y border-dashed border-border/70 py-8 text-center">
        <p className="text-sm font-medium text-foreground">
          No custom sections yet
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Imported custom sections will appear here for placement.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60">
        <div className="bg-background/80 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <PanelRight className="h-3.5 w-3.5 text-primary" />
            Blue sidebar
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            First-page highlights
          </p>
        </div>
        <div className="bg-background/80 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <PanelTop className="h-3.5 w-3.5 text-primary" />
            Main column
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Between Summary and Experience
          </p>
        </div>
        <div className="bg-background/80 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Files className="h-3.5 w-3.5 text-primary" />
            Later pages
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Full-width supporting content
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50 border-y border-border/50">
        {sections.map((section, index) => {
          const selectId = fieldId("layout", section.id);
          const placement = getCustomSectionPlacement(
            resumeJson as Record<string, unknown>,
            section.id,
          );
          const placementSections =
            placement === "sidebar"
              ? sidebarSections
              : placement === "main"
                ? mainSections
                : continuationSections;
          const placementIndex = placementSections.findIndex(
            (entry) => entry.id === section.id,
          );

          return (
            <div
              key={section.id}
              className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <label
                    htmlFor={selectId}
                    className="block truncate text-sm font-medium text-foreground"
                  >
                    {section.title}
                  </label>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {section.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Select
                  value={placement}
                  onValueChange={(value) =>
                    onPlacementChange(
                      section.id,
                      value as CustomSectionPlacement,
                    )
                  }
                >
                  <SelectTrigger
                    id={selectId}
                    className="h-9 min-w-0 flex-1 bg-background/70"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sidebar">Blue sidebar</SelectItem>
                    <SelectItem value="main">
                      Between Summary and Experience
                    </SelectItem>
                    <SelectItem value="continuation">Later pages</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8"
                    aria-label={`Move ${section.title} up`}
                    disabled={placementIndex <= 0}
                    onClick={() => onOrderChange(section.id, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8"
                    aria-label={`Move ${section.title} down`}
                    disabled={
                      placementIndex === -1 ||
                      placementIndex >= placementSections.length - 1
                    }
                    onClick={() => onOrderChange(section.id, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
