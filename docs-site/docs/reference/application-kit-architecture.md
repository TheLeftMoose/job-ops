---
id: application-kit-architecture
title: Application Kit Architecture
description: How JobOps assembles application readiness, resume artifacts, selected evidence, links, and supporting documents.
sidebar_position: 3
---

## What it is

The application kit is currently a client-side view over data already stored for a job.

It is not:

- a database entity
- a generated document
- a backend aggregate
- a generic artifact collection

`JobDetailPanel.tsx` currently calculates:

```ts
const applicationKitReady =
  hasTailoredSummary && hasTailoredSkills && hasResumePdf;
```

The UI also displays selected projects and optional supporting links, but those values are not part of the current ready expression.

The ready expression also does not inspect PDF freshness or source. A stale generated PDF and a user-uploaded PDF both satisfy `hasResumePdf` while the UI reports their more specific state separately.

## Why it exists

The application kit gives the user one place to check whether the core resume material is ready before opening the external application and marking the job as applied.

It combines three different categories:

| Category | Examples |
| --- | --- |
| Generated job fields | Tailored summary and skills |
| Generated or supplied artifacts | Resume PDF |
| Supporting context | Selected projects, links, notes, and uploaded documents |

This works for the current resume-first workflow, but the readiness expression will become difficult to maintain if every new generator adds another hard-coded job field.

## How to use it

### Orchestrator application-kit panel

The Apply tab shows:

- overall application-material readiness
- PDF download
- job-listing link
- mark-applied action
- tailored summary status
- tailored skills status
- resume PDF status
- selected project count
- optional supporting-link status

Main location:

- `orchestrator/src/client/pages/orchestrator/JobDetailPanel.tsx`

### Dedicated job page

The dedicated job page expands the surrounding application memory:

- job brief and description
- stage timeline
- application tasks
- notes
- emails
- Ghostwriter conversation
- resume PDF
- uploaded job documents

Uploaded documents are stored separately from the resume PDF. Their metadata lives in the `job_documents` repository and their files use tenant/user-scoped storage.

Main locations:

- `orchestrator/src/client/pages/JobPage.tsx`
- `orchestrator/src/client/pages/job-page/JobDocumentsPanel.tsx`
- `orchestrator/src/server/repositories/job-documents.ts`
- `orchestrator/src/server/services/job-document-storage.ts`

### Document API

```text
GET    /api/jobs/:id/documents
POST   /api/jobs/:id/documents
GET    /api/jobs/:id/documents/:documentId/content
DELETE /api/jobs/:id/documents/:documentId
```

These endpoints support attachments, not generated-artifact lifecycle. They do not track:

- generation status
- source fingerprint
- stale state
- generator version
- automatic regeneration
- structured generated content

### Adjacent content

Treat these as separate concerns:

- **Job brief:** generated during scoring and displayed as job understanding.
- **Ghostwriter:** persistent job conversation for flexible drafting.
- **Notes:** user-authored job memory.
- **Uploaded documents:** supporting files supplied by the user.
- **Post-application tracking:** lifecycle after the application is submitted.

## Common problems

### Selected projects are assumed to determine kit readiness

The selected-project row is visible, but the current readiness expression only requires summary, skills, and PDF.

### An uploaded cover letter is treated as generated output

An uploaded cover letter is a job document. It has attachment storage but no generation or freshness lifecycle.

### A new artifact is added directly to `applicationKitReady`

That is acceptable for one small temporary addition, but several output types should move readiness to artifact definitions supplied by a generic generation layer.

### A stale PDF is assumed to make the kit incomplete

The current readiness calculation checks `pdfPath`, not `pdfFreshness`. Treat the freshness badge and the overall ready state as separate signals until readiness becomes artifact-driven.

### Supporting links always show as missing

The current row is optional and has no completed backend integration. It does not block the application-kit ready state.

## Related pages

- [Generation Architecture Overview](/docs/next/reference/generation-architecture)
- [CV Generation Architecture](/docs/next/reference/cv-generation-architecture)
- [Extending Generation](/docs/next/reference/extending-generation)
- [Orchestrator](/docs/next/features/orchestrator)
- [Ghostwriter](/docs/next/features/ghostwriter)
- [Post-Application Tracking](/docs/next/features/post-application-tracking)
