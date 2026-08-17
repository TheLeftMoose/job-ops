# JobOps C4 model

`workspace.dsl` is the source of truth for the application architecture diagrams.

Generate the published SVG files from the repository root:

```bash
npm run architecture:generate
```

Requirements:

- Java 17 or newer
- Internet access on the first run to download the pinned Structurizr CLI and PlantUML JAR

Generated intermediate PlantUML files are written below `generated/plantuml`.
Published SVGs are copied to `docs-site/static/img/architecture`.

Published views:

- `jobops-system-context.svg`
- `jobops-containers.svg`
- `jobops-backend-components.svg`
- `jobops-cv-generation.svg`
- `jobops-deployment.svg`

Commit the DSL, explanatory documentation, and updated SVGs together.
