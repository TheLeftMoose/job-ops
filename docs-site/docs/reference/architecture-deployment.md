---
id: architecture-deployment
title: Architecture - Deployment
description: C4 deployment view of the standard JobOps Docker image, runtime processes, binaries, and persistent volumes.
sidebar_position: 5
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## What it is

The deployment view shows what actually runs inside and beside the standard JobOps Docker container.

<div className="architecture-diagram architecture-diagram--extra-wide">
  <a href={useBaseUrl('/img/architecture/jobops-deployment.svg')} target="_blank" rel="noreferrer">
    <img src={useBaseUrl('/img/architecture/jobops-deployment.svg')} alt="JobOps self-hosted Docker deployment" />
  </a>
</div>

Scroll horizontally or open the diagram in a new tab for the full-resolution view.

The normal deployment contains one application container, but that container can spawn several specialized child processes:

| Runtime element | Behavior |
| --- | --- |
| Node.js orchestrator | Long-running Express application and workflow coordinator |
| Camoufox | Anti-detection Firefox binary launched through Playwright by browser-backed extractors |
| Python JobSpy | Python child process for LinkedIn, Indeed, and Glassdoor discovery |
| Challenge viewer | Lazy Xvfb, x11vnc, noVNC, and websockify stack for human challenge solving |
| Tectonic and Typst | Local child processes for resume PDF rendering |
| Local AI CLIs | Optional Codex app-server, Claude CLI, and Gemini CLI processes |
| Persistent data volume | SQLite, PDFs, documents, assets, backups, cookies, and extractor state |
| Codex home volume | Persistent Codex authentication and configuration |

## Why it exists

The logical container view intentionally hides implementation details inside the orchestrator process. That makes it useful for application boundaries, but insufficient for:

- Docker image composition
- native binary dependencies
- child-process behavior
- browser automation
- challenge-solving infrastructure
- volume persistence
- runtime troubleshooting

This deployment view fills that gap.

The logical system-context view groups remote providers and local model runtimes behind one AI-provider boundary. This deployment view refines that abstraction: Codex, Claude, and Gemini CLI processes can run inside the application container, while remote APIs and separately hosted runtimes such as Ollama or LM Studio remain outside it.

## How to use it

Use this view when:

- changing the Dockerfile or entrypoint
- adding a browser-backed extractor
- diagnosing Camoufox or Playwright failures
- changing challenge-viewer behavior
- adding native renderer or CLI dependencies
- reviewing which state survives container replacement
- planning a non-Docker or distributed deployment

### Camoufox behavior

Camoufox is bundled into the production image during the `camoufox-cache` build stage. It is not a separate long-running service.

Browser-backed extractors call the shared browser utility, which creates Camoufox launch options and starts the browser through Playwright. Failure to find Camoufox is treated as an image/build error rather than silently falling back to vanilla Firefox.

### Challenge viewer behavior

The challenge viewer is also not always running.

When a pipeline encounters a supported challenge:

1. The orchestrator starts Xvfb.
2. It starts x11vnc against the virtual display.
3. It starts noVNC through websockify.
4. The orchestrator exposes a short-lived tokenized proxy route.
5. The browser opens the proxied noVNC session.

Normal pipeline runs do not carry these idle processes.

### Persistent state

The standard Compose deployment mounts:

- `./data:/app/data` for application-private data
- `codex-home:/app/codex-home` for Codex authentication

Replacing the application container should not remove these mounted values.

### Local PDF renderer behavior

The production image copies Tectonic and Typst into `/usr/local/bin`. `TYPST_BIN` is set to `/usr/local/bin/typst`, and the image build runs `typst --version` so a missing or unusable binary fails during image construction instead of during a user PDF request.

Native development does not use the Docker-provided binary. Install Typst on the host and place it on `PATH`, or set `TYPST_BIN` to the executable path before starting JobOps.

## Common problems

### Camoufox is missing from the container view

Camoufox is runtime infrastructure inside the orchestrator deployment, not an independently deployable C4 container.

### Playwright and Camoufox are modeled as two independent services

Playwright is the automation library and process controller. Camoufox is the Firefox runtime it launches.

### The challenge viewer appears always active

It is started lazily only when human interaction is required.

### SQLite and private files are assumed to live inside the disposable container layer

They are represented by the persistent data volume and must be mounted for durable deployments.

### Typst works in Docker but fails during native development

The runtimes have separate dependency resolution. Confirm `typst --version` works in the host shell or set `TYPST_BIN`; the Docker image configuration does not install Typst on the host.

## Related pages

- [Application Architecture](/docs/next/reference/application-architecture)
- [Containers](/docs/next/reference/architecture-containers)
- [Backend Components](/docs/next/reference/architecture-backend-components)
- [CV Generation Flow](/docs/next/reference/architecture-generation-flow)
- [Extractors Overview](/docs/next/extractors/overview)
- [Self-Hosting](/docs/next/getting-started/self-hosting)
