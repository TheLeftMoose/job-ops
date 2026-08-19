import { createId } from "@paralleldrive/cuid2";
import type { DesignResumeJson } from "@shared/types";
import { useMemo, useState } from "react";
import { DesignResumeListSectionContent } from "./DesignResumeListSection";
import type { ItemDefinition } from "./definitions";
import { ItemDialog } from "./ItemDialog";
import {
  asArray,
  asRecord,
  removeCustomSectionLayoutReferences,
  setCustomSectionPlacement,
  toBoolean,
  toText,
} from "./utils";

const CUSTOM_SECTION_DEFINITION: ItemDefinition = {
  key: "custom-sections",
  title: "Custom Sections",
  singularTitle: "custom section",
  description:
    "Create reusable sections such as Expertise Areas, Selected Achievements, or About Me.",
  primaryField: "title",
  secondaryField: "content",
  fields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "content", label: "Content", type: "richtext", required: true },
  ],
  createItem: () => ({
    id: createId(),
    hidden: false,
    title: "",
    content: "",
  }),
};

type CustomSectionsSectionProps = {
  resumeJson: DesignResumeJson;
  onChange: (resumeJson: DesignResumeJson) => void;
};

export function CustomSectionsSection({
  resumeJson,
  onChange,
}: CustomSectionsSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null | undefined>();
  const sections = asArray(resumeJson.customSections).map(
    (section) => asRecord(section) ?? {},
  );
  const editorItems = useMemo(
    () =>
      sections.map((section) => ({
        id: toText(section.id),
        hidden: toBoolean(section.hidden, false),
        title: toText(section.title),
        content: toText(asRecord(asArray(section.items)[0])?.content),
      })),
    [sections],
  );
  const editingItem =
    editingIndex === undefined
      ? null
      : editingIndex === null
        ? CUSTOM_SECTION_DEFINITION.createItem()
        : (editorItems[editingIndex] ?? null);

  const updateSections = (nextItems: Record<string, unknown>[]) => {
    const previousById = new Map(
      sections.map((section) => [toText(section.id), section]),
    );
    const nextIds = new Set(nextItems.map((item) => toText(item.id)));
    const removedIds = new Set(
      sections
        .map((section) => toText(section.id))
        .filter((id) => id && !nextIds.has(id)),
    );
    let next = removeCustomSectionLayoutReferences(resumeJson, removedIds);

    next.customSections = nextItems.map((item) => {
      const id = toText(item.id, createId());
      const previous = previousById.get(id);
      const previousItem = asRecord(asArray(previous?.items)[0]);
      return {
        ...(previous ?? {}),
        id,
        title: toText(item.title, "Custom Section"),
        icon: toText(previous?.icon),
        columns: 1,
        hidden: toBoolean(item.hidden, false),
        type: "summary",
        items: [
          {
            ...(previousItem ?? {}),
            id: toText(previousItem?.id, createId()),
            hidden: false,
            content: toText(item.content),
          },
        ],
      };
    }) as DesignResumeJson["customSections"];

    const customOrder = next.customSections.map((section) => section.id);
    const customIds = new Set(customOrder);
    for (const page of next.metadata?.layout?.pages ?? []) {
      for (const key of ["main", "sidebar"] as const) {
        const positions = page[key]
          .map((id, index) => (customIds.has(id) ? index : -1))
          .filter((index) => index !== -1);
        const placedIds = new Set(positions.map((index) => page[key][index]));
        const reorderedIds = customOrder.filter((id) => placedIds.has(id));
        positions.forEach((position, index) => {
          page[key][position] = reorderedIds[index] ?? page[key][position];
        });
      }
    }

    for (const item of nextItems) {
      const id = toText(item.id);
      if (!id || previousById.has(id)) continue;
      next = setCustomSectionPlacement(
        next,
        id,
        /<li\b/i.test(toText(item.content)) ? "sidebar" : "continuation",
      );
    }
    onChange(next);
  };

  const saveItem = (item: Record<string, unknown>) => {
    const nextItems =
      editingIndex === null
        ? [...editorItems, item]
        : editorItems.map((entry, index) =>
            index === editingIndex ? item : entry,
          );
    updateSections(nextItems);
    setEditingIndex(undefined);
  };

  return (
    <>
      <DesignResumeListSectionContent
        definition={CUSTOM_SECTION_DEFINITION}
        items={editorItems}
        onAdd={() => setEditingIndex(null)}
        onEdit={(index) => setEditingIndex(index)}
        onUpdateItems={updateSections}
      />
      <ItemDialog
        open={editingIndex !== undefined}
        title={`${editingIndex === null ? "Add" : "Edit"} custom section`}
        description={CUSTOM_SECTION_DEFINITION.description}
        item={editingItem}
        fields={CUSTOM_SECTION_DEFINITION.fields}
        resumeJson={resumeJson}
        onOpenChange={(open) => {
          if (!open) setEditingIndex(undefined);
        }}
        onSave={saveItem}
      />
    </>
  );
}
