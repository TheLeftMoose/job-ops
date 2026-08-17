---
id: extending-generation
title: Extending Generation
description: Design guidance and integration checklist for adding new generated artifacts to JobOps.
sidebar_position: 4
---

## What it is

This page describes how to add generated outputs beyond the current resume PDF without coupling every output to resume-specific fields and orchestration.

Examples include:

- cover letters
- application-question answers
- recruiter outreach
- interview preparation packs
- role-specific portfolios

## Why it exists

The current resume flow has useful lifecycle guarantees, but those guarantees are embedded in resume-specific code:

- dedicated columns on `jobs`
- `summarizeJob()`
- `generateFinalPdf()`
- PDF-specific fingerprints
- PDF-specific queues and UI state

Copying that structure for each output would duplicate tenancy, errors, retries, freshness, storage, and UI logic.

The preferred direction is a generic artifact lifecycle beside the existing resume pipeline. The resume flow should migrate only after the generic path proves it preserves the existing guarantees.

## How to use it

### Decide whether a new generator is needed

| New output | Best starting point |
| --- | --- |
| Another field inside the tailored resume | Extend resume tailoring, composition, editing, and PDF fingerprinting |
| Another resume renderer | Implement the resume renderer contract |
| Cover letter, answers, outreach, or interview pack | Add a separate generated artifact |
| Flexible conversational drafting | Reuse Ghostwriter |
| User-supplied supporting material | Reuse job-document upload and storage |

### Integration checklist

1. Define shared input and output types.
2. Use a strict JSON schema for structured LLM output.
3. Whitelist only the required job, profile, note, and document context.
4. Put prompt construction and validation in a service, not an API route.
5. Select or add an LLM purpose with appropriate settings.
6. Persist artifact status, content or file path, fingerprint, revision, and timestamp.
7. Scope database access, files, queues, locks, caches, and dedupe keys by tenant/user.
8. Follow the standard API response and request-ID contract.
9. Fingerprint every input that should invalidate the output.
10. Prevent obsolete generation runs from committing over newer source changes.
11. Add generating, stale, failed, retry, edit, and download states to the UI.
12. Add cross-tenant, invalid-output, retry, stale, and superseded-run tests.
13. Document the exact external LLM or webhook payload.

The tailored-experience implementation is the current example for extending the resume itself: it uses a dedicated prompt template and service, validates source IDs and output cardinality, persists structured JSON on the job, integrates editing/composition, and adds the persisted value to the PDF fingerprint.

### LLM purpose selection

Purpose-specific model selection currently recognizes:

- `scoring`
- `tailoring`
- `projectSelection`

Reuse an existing purpose only when the new task should share the same provider, model, base URL, and API-key configuration.

Otherwise extend:

- `LlmPurpose`
- settings parsing
- purpose-specific credentials
- Settings UI
- model-selection tests

### Recommended generator contract

```ts
type GenerationKind =
  | "resume_pdf"
  | "cover_letter"
  | "application_answers"
  | "outreach_message";

interface GeneratorDefinition<TInput, TOutput> {
  kind: GenerationKind;
  buildInput(jobId: string): Promise<TInput>;
  generate(input: TInput, signal?: AbortSignal): Promise<TOutput>;
  fingerprint(input: TInput): string;
  persist(jobId: string, output: TOutput): Promise<void>;
}
```

The contract should separate:

- context assembly
- generation
- validation
- fingerprinting
- persistence
- presentation metadata

### Recommended artifact record

A generic artifact record should contain:

```text
id
tenantId
userId
jobId
kind
status
contentJson
storagePath
sourceFingerprint
sourceRevision
artifactRevision
generatedAt
createdAt
updatedAt
errorCode
errorMessage
```

Sensitive details must be sanitized before errors are stored or returned.

### Recommended readiness definition

Instead of extending one hard-coded boolean, each artifact definition should expose presentation metadata:

```ts
interface ApplicationKitItemDefinition {
  kind: GenerationKind;
  label: string;
  required: boolean;
  editable: boolean;
  downloadable: boolean;
}
```

The application kit can then derive:

- required and optional items
- ready, missing, stale, generating, and failed states
- available actions
- overall readiness

### Safe first implementation

Use this sequence:

1. Leave existing resume generation unchanged.
2. Add the generic artifact table, repository, and scoped storage.
3. Implement one new artifact such as `cover_letter`.
4. Add artifact-driven UI beside the existing resume rows.
5. Validate tenancy, freshness, conflicts, retries, and failure handling.
6. Extract shared lifecycle helpers.
7. Consider migrating resume generation only after behavior matches the current PDF flow.

## Common problems

### A new generator is implemented inside `generateFinalPdf()`

Keep independent outputs separate. Resume rendering should not become the coordinator for cover letters or application answers.

### Generated text is stored only as a job column

Dedicated columns are convenient but do not scale to multiple versions, statuses, errors, fingerprints, or output types.

### A background worker reads the wrong tenant

Carry tenant/user scope in the queue payload and restore request context before loading jobs, settings, profiles, or files.

### Raw provider output is logged or returned

Sanitize and truncate errors. Do not log prompts, complete responses, credentials, or upstream response bodies.

### Regeneration overwrites user edits

Track source and artifact revisions. Require an explicit policy for replacing edited artifacts.

## Related pages

- [Generation Architecture Overview](/docs/next/reference/generation-architecture)
- [CV Generation Architecture](/docs/next/reference/cv-generation-architecture)
- [Application Kit Architecture](/docs/next/reference/application-kit-architecture)
- [Ghostwriter](/docs/next/features/ghostwriter)
- [Documentation Style Guide](/docs/next/reference/documentation-style-guide)
