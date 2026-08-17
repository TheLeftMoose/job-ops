import { SettingsSectionFrame } from "@client/pages/settings/components/SettingsSectionFrame";
import type { UpdateSettingsInput } from "@shared/settings-schema.js";
import {
  RESUME_EXPERIENCE_MODE_LABELS,
  RESUME_EXPERIENCE_MODE_VALUES,
  type ResumeExperienceSettings,
} from "@shared/types.js";
import { FileText, ListFilter } from "lucide-react";
import type React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clampInt } from "@/lib/utils";

type CvGenerationSectionProps = {
  isLoading: boolean;
  isSaving: boolean;
  layoutMode?: "accordion" | "panel";
};

export const CvGenerationSection: React.FC<CvGenerationSectionProps> = ({
  isLoading,
  isSaving,
  layoutMode,
}) => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<UpdateSettingsInput>();
  const value = (useWatch({
    control,
    name: "resumeExperience",
  }) ?? {
    mode: "preserve",
    maxRoles: 5,
  }) as ResumeExperienceSettings;
  const disabled = isLoading || isSaving;
  const update = (next: ResumeExperienceSettings) =>
    setValue("resumeExperience", next, {
      shouldDirty: true,
      shouldTouch: true,
    });

  return (
    <SettingsSectionFrame
      mode={layoutMode}
      title="CV Generation"
      value="cv-generation"
    >
      <div className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm text-muted-foreground">
            Decide how much of your base employment history reaches each
            job-specific CV. These settings apply to Reactive Resume, LaTeX, and
            Typst output.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => update({ ...value, mode: "preserve" })}
            disabled={disabled}
            aria-pressed={value.mode === "preserve"}
            className="group flex min-h-32 flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40 aria-pressed:border-foreground/40 aria-pressed:bg-muted/60 disabled:opacity-50"
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="space-y-1">
              <span className="block text-sm font-semibold">
                Keep base experience
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Include every visible role with its original description.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => update({ ...value, mode: "tailored" })}
            disabled={disabled}
            aria-pressed={value.mode === "tailored"}
            className="group flex min-h-32 flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40 aria-pressed:border-foreground/40 aria-pressed:bg-muted/60 disabled:opacity-50"
          >
            <ListFilter className="h-5 w-5 text-muted-foreground" />
            <span className="space-y-1">
              <span className="block text-sm font-semibold">
                Tailor roles and bullets
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Select relevant roles and consolidate long histories into 3-5
                evidence-based bullets per role.
              </span>
            </span>
          </button>
        </div>

        <div className="max-w-md space-y-2">
          <label htmlFor="resumeExperienceMode" className="text-sm font-medium">
            Experience strategy
          </label>
          <Select
            value={value.mode}
            onValueChange={(mode) =>
              update({
                ...value,
                mode: mode as ResumeExperienceSettings["mode"],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="resumeExperienceMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESUME_EXPERIENCE_MODE_VALUES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {RESUME_EXPERIENCE_MODE_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.mode === "tailored" ? (
          <div className="max-w-md space-y-2">
            <label
              htmlFor="resumeExperienceMaxRoles"
              className="text-sm font-medium"
            >
              Maximum roles in final CV
            </label>
            <Input
              id="resumeExperienceMaxRoles"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={value.maxRoles}
              onChange={(event) =>
                update({
                  ...value,
                  maxRoles: clampInt(Number(event.target.value), 1, 20),
                })
              }
              disabled={disabled}
            />
            {errors.resumeExperience?.maxRoles?.message ? (
              <p className="text-xs text-destructive">
                {errors.resumeExperience.maxRoles.message.toString()}
              </p>
            ) : null}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Role selection prioritizes job relevance, then recency. Customize
              the summarization instructions under Prompt Templates → Experience
              tailoring prompt.
            </p>
          </div>
        ) : null}
      </div>
    </SettingsSectionFrame>
  );
};
