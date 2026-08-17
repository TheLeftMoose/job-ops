---
id: cv-generation-architecture
title: CV Generation Architecture
description: End-to-end architecture of job-specific resume tailoring, composition, rendering, persistence, and regeneration.
sidebar_position: 2
---

## What it is

CV generation turns a base resume and a job description into persisted tailoring fields and a job-specific PDF.

It is a two-step orchestration:

```text
processJob(jobId)
  |
  +-- summarizeJob(jobId)
  |     +-- load profile
  |     +-- generate headline, summary, and skills
  |     +-- optionally select roles and generate experience bullets
  |     +-- select projects
  |     `-- persist tailoring fields on the job
  |
  `-- generateFinalPdf(jobId)
        +-- mark PDF as regenerating
        +-- load the base resume
        +-- apply tailoring and project visibility
        +-- render the PDF
        +-- calculate the source fingerprint
        `-- commit the PDF and move the job to ready
```

The main orchestration lives in:

- `orchestrator/src/server/pipeline/orchestrator.ts`
- `orchestrator/src/server/services/summary.ts`
- `orchestrator/src/server/services/experience-tailoring.ts`
- `orchestrator/src/server/services/pdf.ts`

## Why it exists

The pipeline provides guarantees that are easy to lose in a simple "prompt then save file" implementation:

- generated values are persisted before rendering
- the Resume Studio document is the preferred source of truth
- Reactive Resume remains available as a fallback source and renderer
- generated files are tenant- and, when required, user-scoped
- stale PDFs are detected from a stable fingerprint
- ready jobs keep their previous PDF while regeneration runs
- obsolete renders are not committed after conflicting job changes

## How to use it

### Stage 1: job brief and scoring

`scoreJobSuitability()` produces:

- suitability score
- suitability reason
- structured job brief
- validated job-fact corrections

The job brief is stored as JSON in `job.jobBrief`. It is not an input to resume tailoring.

Main locations:

- `orchestrator/src/server/services/scorer.ts`
- `orchestrator/src/server/pipeline/steps/score-jobs.ts`

### Stage 2: profile loading

`getProfile()` prefers the local Resume Studio document. If none is available, it loads the configured Reactive Resume base resume.

The profile cache is keyed by the active private-data scope, not globally by one user.

Main location:

- `orchestrator/src/server/services/profile.ts`

### Stage 3: structured resume tailoring

`generateTailoring()` sends a minimized profile snapshot and the job description to the configured LLM.

The response uses a strict JSON schema:

```ts
{
  headline: string;
  summary: string;
  skills: Array<{
    name: string;
    keywords: string[];
  }>;
}
```

The LLM provider and model are resolved for the `tailoring` purpose. Writing style, output language, prompt templates, word limits, keyword limits, constraints, and avoided terms are applied before the request.

Main locations:

- `orchestrator/src/server/services/summary.ts`
- `orchestrator/src/server/services/modelSelection.ts`
- `orchestrator/src/server/services/llm/`

When tailored experience is enabled, `generateExperienceTailoring()` makes a separate structured request. This keeps customized summary/headline/skills prompt templates backward-compatible. It receives minimized experience evidence, selects up to the configured role limit, and returns 3-5 bullets per role. The result is stored in `job.tailoredExperience`.

The experience response is validated against source identifiers:

```ts
Array<{
  experienceId: string;
  roleId: string | null;
  company: string;
  position: string;
  period: string;
  bullets: string[];
}>
```

Unknown or duplicate roles, empty bullets, and results outside the 3-5 bullet range are rejected. Valid results are restored to base-resume order before persistence.

The setting has two modes:

- `preserve`: clear `job.tailoredExperience` and render the visible base experience unchanged
- `tailored`: select at most `maxRoles` and persist the generated bullets

Full tailoring includes experience. The focused `experience` field can also be regenerated independently, and forced generation replaces a previously persisted selection.

The dedicated `experienceTailoringPromptTemplate` controls role selection and bullet consolidation while reusing the `tailoring` provider/model purpose and writing-style settings.

Main locations:

- `orchestrator/src/server/services/experience-tailoring.ts`
- `shared/src/prompt-template-definitions.ts`
- `shared/src/tailored-experience.ts`

### Stage 4: project selection

`summarizeJob()` reads the project catalog from the profile and combines:

- locked project IDs
- AI-selectable project IDs
- maximum project count
- existing valid selections

The final IDs are stored as a comma-separated value in `job.selectedProjectIds`.

Main locations:

- `orchestrator/src/server/pipeline/orchestrator.ts`
- `orchestrator/src/server/services/resumeProjects.ts`
- `orchestrator/src/server/services/rxresume/tailoring.ts`

### Stage 5: resume composition

`prepareTailoredResumeForPdf()` clones the base resume and applies:

- tailored headline
- tailored summary
- tailored skill groups
- persisted tailored role selection and experience bullets
- selected-project visibility
- tracer-link rewriting when enabled

The composition functions modify the Reactive Resume v5-shaped document while preserving the rest of the base resume.

Persisted `experienceId` and nested `roleId` values map generated bullets back to the source document. This avoids matching roles by mutable display text and keeps PDF regeneration deterministic.

Main locations:

- `orchestrator/src/server/services/rxresume/index.ts`
- `orchestrator/src/server/services/rxresume/tailoring.ts`

### Stage 6: rendering

`generatePdf()` selects the configured renderer:

| Renderer | Behavior |
| --- | --- |
| `rxresume` | Imports a temporary tailored resume, exports its PDF, then deletes the temporary resume |
| `latex` | Normalizes resume JSON into the local render document and calls Tectonic |
| `typst` | Normalizes the same render document and applies the selected Typst theme |

Main locations:

- `orchestrator/src/server/services/pdf.ts`
- `orchestrator/src/server/services/resume-renderer/index.ts`
- `orchestrator/src/server/services/resume-renderer/document.ts`

### Stage 7: storage and finalization

Generated PDFs are written as:

```text
<data-dir>/pdfs/<tenantId>/resume_<jobId>.pdf
```

Hosted user isolation adds a `users/<userId>` segment.

`finalizeGeneratedPdfIfCurrent()` commits the generated path only when the job is still in the expected state. It then records:

- `pdfPath`
- `pdfSource = "generated"`
- `pdfFingerprint`
- `pdfGeneratedAt`
- `pdfRegenerating = false`
- `status = "ready"`

Main locations:

- `orchestrator/src/server/services/pdf-storage.ts`
- `orchestrator/src/server/repositories/jobs.ts`

### Status and conflict behavior

Initial generation temporarily moves a job to `processing`. Regenerating a `ready` job leaves it `ready` and sets `pdfRegenerating = true`, so the previous PDF remains usable.

The final database update succeeds only when the job still has the expected status and regeneration marker. If the job changed while rendering, the new result is rejected as superseded instead of overwriting newer state.

On rendering failure:

- the previous status is restored
- `pdfRegenerating` is cleared
- a previous ready PDF remains available
- usage reservations are settled or refunded according to whether output was produced

### Stage 8: freshness and automatic regeneration

The PDF fingerprint includes:

- tailored headline, summary, skills, and experience
- selected project IDs
- job description
- tracer-link setting
- employer
- Resume Studio document identity and revision
- configured Reactive Resume base
- PDF renderer
- Typst theme when applicable

Changes can mark a generated PDF stale and enqueue tenant-scoped regeneration. Uploaded PDFs are not automatically regenerated.

Changing the global experience mode, role limit, or prompt does not automatically spend LLM usage re-tailoring existing jobs. Those settings are consumed by the next full or focused experience generation. Once `job.tailoredExperience` changes, the PDF fingerprint changes and the generated PDF becomes stale until regenerated.

Main locations:

- `orchestrator/src/server/services/pdf-fingerprint.ts`
- `orchestrator/src/server/services/auto-pdf-regeneration.ts`

### API entry points

```text
POST /api/jobs/actions
POST /api/jobs/:id/summarize
POST /api/jobs/:id/generate-pdf
POST /api/jobs/:id/pdf
```

`POST /api/jobs/:id/summarize?fields=experience` runs focused experience generation without replacing summary, headline, skills, or project selection.

## Common problems

### Tailoring changed but the PDF did not

Confirm the generated PDF is marked stale and that automatic regeneration is running. Manual regeneration uses `POST /api/jobs/:id/generate-pdf`.

### A new resume input does not invalidate the PDF

Add it to the PDF fingerprint and the appropriate regeneration trigger.

### Experience settings changed but an existing job still uses old roles

Run full tailoring or focused experience generation. Settings define the next generation request; persisted job-specific experience remains stable until explicitly regenerated.

### A ready job loses its usable PDF during regeneration

Ready jobs should keep the old path while `pdfRegenerating` is true. Do not clear the existing artifact before the new render commits.

### A generated PDF crosses tenant boundaries

Use the existing scoped storage helpers and restore request context inside background workers. Do not construct global PDF paths directly.

## Related pages

- [Generation Architecture Overview](/docs/next/reference/generation-architecture)
- [CV Generation Flow](/docs/next/reference/architecture-generation-flow)
- [Application Kit Architecture](/docs/next/reference/application-kit-architecture)
- [Extending Generation](/docs/next/reference/extending-generation)
- [Resume Studio](/docs/next/features/design-resume)
- [Reactive Resume](/docs/next/features/reactive-resume)
