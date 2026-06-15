import { SettingsSectionFrame } from "@client/pages/settings/components/SettingsSectionFrame";
import type { CompanyInvestigationValues } from "@client/pages/settings/types";
import type { UpdateSettingsInput } from "@shared/settings-schema.js";
import type React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

type Props = {
  values: CompanyInvestigationValues;
  isLoading: boolean;
  isSaving: boolean;
  layoutMode?: "accordion" | "panel";
};

export const CompanyInvestigationSettingsSection: React.FC<Props> = ({
  values,
  isLoading,
  isSaving,
  layoutMode,
}) => {
  const { control, watch } = useFormContext<UpdateSettingsInput>();
  const enabled =
    watch("companyInvestigationEnabled") ?? values.enabled.default;

  return (
    <SettingsSectionFrame
      mode={layoutMode}
      title="Company Investigation"
      value="company-investigation"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Controller
            name="companyInvestigationEnabled"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="companyInvestigationEnabled"
                checked={field.value ?? values.enabled.default}
                onCheckedChange={(checked) => {
                  field.onChange(
                    checked === "indeterminate" ? null : checked === true,
                  );
                }}
                disabled={isLoading || isSaving}
              />
            )}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="companyInvestigationEnabled"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Enable company investigation
            </label>
            <p className="text-xs text-muted-foreground">
              When enabled, you can investigate companies to gather official
              registration details, employee counts, and industry information
              from external registries (e.g. Danish CVR).
            </p>
          </div>
        </div>

        {enabled && (
          <>
            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Investigation trigger</p>
              <p className="text-xs text-muted-foreground">
                Choose when investigations are run. Manual mode requires you to
                click "Investigate" on the Companies page.
              </p>
              <Controller
                name="companyInvestigationAutoTrigger"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value ?? values.autoTrigger.default}
                    onValueChange={(v) =>
                      field.onChange(v as "manual" | "on_import")
                    }
                    disabled={isLoading || isSaving}
                    className="mt-2 space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="trigger-manual" />
                      <Label htmlFor="trigger-manual">
                        Manual — only when I click Investigate
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="on_import"
                        id="trigger-on-import"
                      />
                      <Label htmlFor="trigger-on-import">
                        On import — automatically when a job is imported
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>
          </>
        )}

        <Separator />

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">
              Investigation effective
            </div>
            <div className="break-words font-mono text-xs">
              {values.enabled.effective ? "Enabled" : "Disabled"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Investigation default
            </div>
            <div className="break-words font-mono text-xs font-semibold">
              {values.enabled.default ? "Enabled" : "Disabled"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Trigger</div>
            <div className="break-words font-mono text-xs">
              {values.autoTrigger.effective}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Active providers
            </div>
            <div className="break-words font-mono text-xs">
              {values.providerIds.effective.length > 0
                ? values.providerIds.effective.join(", ")
                : "All registered"}
            </div>
          </div>
        </div>
      </div>
    </SettingsSectionFrame>
  );
};
