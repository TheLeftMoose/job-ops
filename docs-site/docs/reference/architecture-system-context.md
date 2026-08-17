---
id: architecture-system-context
title: Architecture - System Context
description: C4 system context showing JobOps users and external dependencies.
sidebar_position: 2
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## What it is

The system-context view defines the boundary of JobOps.

<div className="architecture-diagram">
  <a href={useBaseUrl('/img/architecture/jobops-system-context.svg')} target="_blank" rel="noreferrer">
    <img src={useBaseUrl('/img/architecture/jobops-system-context.svg')} alt="JobOps C4 system context" />
  </a>
</div>

Open the diagram in a new tab for the full-resolution view.

JobOps supports one primary person: the job seeker who discovers roles, prepares application material, applies manually, and tracks outcomes.

External systems are grouped by responsibility:

- job platforms and applicant-tracking systems
- AI providers and local model CLIs
- Gmail
- Reactive Resume
- visa sponsor data sources
- user-configured webhook targets
- optional analytics and telemetry services

## Why it exists

This view makes network and ownership boundaries explicit. Integrations are external even when JobOps provides an adapter or manages credentials for them.

## How to use it

Use this view when:

- evaluating a new external integration
- documenting which data leaves JobOps
- reviewing credentials and failure modes
- planning deployment firewall or network rules
- explaining JobOps without implementation details

JobOps does not auto-apply to roles. The user remains responsible for submitting applications on external sites.

## Common problems

### Extractors are treated as external systems

Extractor modules are JobOps code. The job platforms they query are external systems.

### Local model CLIs are assumed to be remote services

Codex, Claude CLI, Gemini CLI, Ollama, and LM Studio can run locally, but they still sit behind the AI-provider abstraction from the application's perspective.

### Product analytics is assumed to be mandatory

Analytics and Azure Monitor telemetry are optional integrations and can be disabled or left unconfigured.

## Related pages

- [Application Architecture](/docs/next/reference/application-architecture)
- [Containers](/docs/next/reference/architecture-containers)
- [Backend Components](/docs/next/reference/architecture-backend-components)
