workspace "JobOps" "C4 model for the JobOps job-search, CV generation, and application-tracking platform." {
    !identifiers hierarchical

    model {
        jobSeeker = person "Job seeker" "Searches for roles, prepares tailored application material, applies manually, and tracks outcomes."

        jobPlatforms = softwareSystem "Job platforms and ATS providers" "Job boards, aggregators, APIs, and applicant-tracking systems queried by extractor modules." "External" {
            tags "External"
        }
        llmProviders = softwareSystem "AI model providers and local model CLIs" "OpenAI-compatible APIs, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, Codex, Claude CLI, and Gemini CLI." "External" {
            tags "External"
        }
        gmail = softwareSystem "Gmail" "Provides read-only recruitment email access through OAuth." "External" {
            tags "External"
        }
        reactiveResume = softwareSystem "Reactive Resume" "Optional resume import source and PDF export backend." "External" {
            tags "External"
        }
        sponsorSources = softwareSystem "Visa sponsor data sources" "Country-specific sponsor datasets loaded by provider modules." "External" {
            tags "External"
        }
        webhookTargets = softwareSystem "User-configured webhook endpoints" "Receive sanitized pipeline and job lifecycle notifications." "External" {
            tags "External"
        }
        observability = softwareSystem "Analytics and telemetry services" "Optional Umami product analytics and Azure Monitor application telemetry." "External" {
            tags "External"
        }

        jobOps = softwareSystem "JobOps" "Self-hosted job discovery, scoring, CV tailoring, application preparation, and tracking." {
            webApp = container "Web application" "Browser interface for job discovery, orchestration, Resume Studio, application tracking, settings, and administration." "React, Vite, TypeScript" {
                tags "Web"
            }
            docsSite = container "Documentation site" "Versioned user and architecture documentation built as static content and served below /docs." "Docusaurus" {
                tags "Documentation"
            }
            database = container "Application database" "Stores users, workspaces, settings, jobs, pipeline runs, chat, application history, email metadata, and artifact metadata." "SQLite, Drizzle ORM" {
                tags "Database"
            }
            privateFiles = container "Private file storage" "Stores generated/uploaded PDFs, Resume Studio assets, job documents, backups, cookies, and extractor runtime data under tenant/user scopes." "Local filesystem or mounted volume" {
                tags "FileStore"
            }
            api = container "Orchestrator API" "Authenticates users, exposes HTTP and SSE APIs, coordinates pipelines, invokes integrations, and serves built web assets." "Node.js, Express, TypeScript" {
                tags "Application"

                apiRoutes = component "API routes and transport" "Express routers, request validation, standard API responses, SSE streams, and static delivery." "Express, Zod"
                authTenancy = component "Authentication and tenancy" "JWT authentication, workspace membership, request context, quotas, and private-data scoping." "JWT, request context"
                pipeline = component "Pipeline orchestrator" "Runs discovery, import, scoring, selection, tailoring, PDF generation, progress, cancellation, and webhooks." "TypeScript services"
                extractorRegistry = component "Extractor registry and adapters" "Discovers extractor manifests and executes source-specific discovery and health checks." "Manifest-based plugins"
                aiGeneration = component "AI generation services" "Scoring, job briefs, summary and skills tailoring, experience role selection and bullet generation, project selection, Ghostwriter, prompt templates, and structured-output validation." "LLM service abstraction"
                resumeServices = component "Resume and artifact services" "Resume Studio import/editing, resume composition, tracer links, PDF rendering, uploads, and freshness tracking." "Reactive Resume v5, LaTeX, Typst"
                applicationTracking = component "Application tracking services" "Application stages, tasks, notes, interviews, outcomes, and timeline updates." "Domain services"
                postApplication = component "Post-application ingestion" "Gmail OAuth, email synchronization, AI routing, review queue, and automatic stage updates." "Gmail API, provider registry"
                repositories = component "Repositories and scoped storage" "Tenant/user-scoped database repositories, settings, job documents, PDFs, assets, and backups." "Drizzle ORM, filesystem"
                backgroundWork = component "Queues and scheduled workers" "Auto PDF regeneration, email sync, backups, auth cleanup, visa data refresh, and analytics replay." "In-process queues and schedulers"
                observabilityAdapter = component "Logging, analytics, and telemetry" "Structured logging, correlation context, product analytics, and optional OpenTelemetry export." "Logger, Umami, Azure Monitor"

                apiRoutes -> authTenancy "Uses authenticated request context and authorization"
                apiRoutes -> pipeline "Starts and controls pipeline and job processing"
                apiRoutes -> aiGeneration "Starts chat and focused generation"
                apiRoutes -> resumeServices "Imports, edits, generates, uploads, and downloads resume artifacts"
                apiRoutes -> applicationTracking "Reads and updates application lifecycle data"
                apiRoutes -> postApplication "Configures providers and reviews email matches"
                apiRoutes -> repositories "Reads and writes settings and domain data"

                pipeline -> extractorRegistry "Runs selected sources"
                pipeline -> aiGeneration "Scores jobs and generates tailored content"
                pipeline -> resumeServices "Generates job-specific PDFs"
                pipeline -> applicationTracking "Moves jobs through lifecycle states"
                pipeline -> repositories "Persists runs, jobs, progress, and artifacts"
                pipeline -> webhookTargets "Sends sanitized lifecycle notifications" "HTTPS"

                extractorRegistry -> jobPlatforms "Searches and fetches job listings" "HTTPS, browser automation, APIs"
                aiGeneration -> llmProviders "Requests text or schema-constrained generation" "HTTPS or local CLI"
                aiGeneration -> repositories "Loads scoped settings, profiles, jobs, notes, and documents"
                resumeServices -> reactiveResume "Optionally imports resumes and exports PDFs" "HTTPS"
                resumeServices -> repositories "Loads resume sources and stores artifact metadata"
                applicationTracking -> repositories "Persists stages, tasks, notes, interviews, and outcomes"
                postApplication -> gmail "Reads recruitment email metadata" "Gmail API over HTTPS"
                postApplication -> aiGeneration "Classifies relevance and matches messages to jobs"
                postApplication -> applicationTracking "Applies approved or high-confidence stage changes"
                postApplication -> repositories "Stores integrations, messages, and sync runs"
                repositories -> database "Reads and writes scoped relational data" "SQL"
                repositories -> privateFiles "Reads and writes PDFs, resume assets, documents, backups, and extractor state" "Filesystem"
                backgroundWork -> postApplication "Runs scheduled email synchronization"
                backgroundWork -> resumeServices "Regenerates stale PDFs"
                backgroundWork -> repositories "Loads queued work and persists results"
                backgroundWork -> sponsorSources "Refreshes sponsor datasets" "HTTPS/files"
                observabilityAdapter -> observability "Sends optional analytics and telemetry" "HTTPS/OTLP"
            }
        }

        jobSeeker -> jobOps.webApp "Uses" "HTTPS"
        jobSeeker -> jobOps.docsSite "Reads" "HTTPS"
        jobOps.webApp -> jobOps.api "Calls JSON and streaming APIs" "HTTPS, SSE"
        jobOps.docsSite -> jobOps.api "Is served as static content by"

        selfHosted = deploymentEnvironment "Self-hosted Docker" {
            userDevice = deploymentNode "User device" "The job seeker's desktop or mobile device." "Web browser" {
                browser = infrastructureNode "Web browser" "Runs the JobOps React application and displays the documentation and challenge viewer."
            }

            dockerHost = deploymentNode "Docker host" "A user-managed host running Docker Compose." "Docker Engine" {
                appContainer = deploymentNode "JobOps application container" "The single production image built by this repository." "Linux, Node.js 22, Python 3" {
                    apiInstance = containerInstance jobOps.api
                    webInstance = containerInstance jobOps.webApp
                    docsInstance = containerInstance jobOps.docsSite

                    camoufox = infrastructureNode "Camoufox browser runtime" "Anti-detection Firefox build launched through Playwright by browser-backed extractors." "Camoufox, Playwright"
                    pythonJobspy = infrastructureNode "Python JobSpy worker" "Child process launched for LinkedIn, Indeed, and Glassdoor discovery." "Python 3, python-jobspy"
                    challengeViewer = infrastructureNode "Challenge viewer stack" "Lazily started Xvfb, x11vnc, noVNC, and websockify processes for human Cloudflare challenge solving." "Xvfb, x11vnc, noVNC, WebSockets"
                    pdfRenderers = infrastructureNode "Local PDF renderer binaries" "Child processes used for local resume rendering." "Tectonic, Typst"
                    localAiClis = infrastructureNode "Local AI CLI runtimes" "Optional child processes used instead of remote model APIs." "Codex app-server, Claude CLI, Gemini CLI"

                    apiInstance -> camoufox "Launches for browser-backed extraction"
                    apiInstance -> pythonJobspy "Spawns for JobSpy searches"
                    apiInstance -> challengeViewer "Starts lazily and proxies tokenized HTTP/WebSocket sessions"
                    apiInstance -> pdfRenderers "Spawns for local PDF rendering"
                    apiInstance -> localAiClis "Spawns when a CLI provider is selected"

                    camoufox -> jobPlatforms "Browses protected job sites" "HTTPS"
                    pythonJobspy -> jobPlatforms "Queries supported job sources" "HTTPS"
                    localAiClis -> llmProviders "Uses provider authentication and model runtimes"
                }

                dataVolume = deploymentNode "Persistent data volume" "Bind-mounted or Docker-managed private application data." "Filesystem volume" {
                    databaseInstance = containerInstance jobOps.database
                    filesInstance = containerInstance jobOps.privateFiles
                }

                codexVolume = infrastructureNode "Codex home volume" "Persists Codex authentication and configuration across container replacement." "Docker volume"
            }

            selfHosted.userDevice.browser -> selfHosted.dockerHost.appContainer.webInstance "Loads application assets" "HTTP/HTTPS"
            selfHosted.userDevice.browser -> selfHosted.dockerHost.appContainer.docsInstance "Loads documentation assets" "HTTP/HTTPS"
            selfHosted.userDevice.browser -> selfHosted.dockerHost.appContainer.apiInstance "Calls APIs and streams progress" "HTTP/HTTPS, SSE"
            selfHosted.userDevice.browser -> selfHosted.dockerHost.appContainer.challengeViewer "Displays proxied challenge session" "HTTP/HTTPS, WebSocket"
            selfHosted.dockerHost.appContainer.localAiClis -> selfHosted.dockerHost.codexVolume "Uses when Codex is selected"
        }
    }

    views {
        systemContext jobOps "SystemContext" {
            include *
            autolayout lr
            title "JobOps - System Context"
            description "People and external systems that interact with JobOps."
        }

        container jobOps "Containers" {
            include *
            autolayout lr
            title "JobOps - Containers"
            description "Runtime and build artifacts that make up a JobOps deployment."
        }

        component jobOps.api "BackendComponents" {
            include *
            autolayout lr
            title "JobOps - Orchestrator API Components"
            description "Major responsibilities inside the Node.js orchestrator process."
        }

        dynamic jobOps.api "CvGeneration" {
            jobOps.api.apiRoutes -> jobOps.api.pipeline "Starts tailoring or PDF generation"
            jobOps.api.pipeline -> jobOps.api.repositories "Loads the scoped job and persists workflow state"
            jobOps.api.pipeline -> jobOps.api.aiGeneration "Requests structured summary, skills, experience, and project selection"
            jobOps.api.aiGeneration -> jobOps.api.repositories "Loads minimized profile evidence, prompt settings, and job context"
            jobOps.api.aiGeneration -> llmProviders "Requests schema-constrained tailoring"
            jobOps.api.pipeline -> jobOps.api.repositories "Persists validated role IDs and 3-5 bullets per selected role"
            jobOps.api.pipeline -> jobOps.api.resumeServices "Composes persisted tailoring and renders the resume"
            jobOps.api.resumeServices -> jobOps.api.repositories "Loads resume sources and records artifact metadata"
            jobOps.api.resumeServices -> reactiveResume "Optionally imports and exports a temporary tailored resume"
            jobOps.api.repositories -> jobOps.database "Commits tailoring, status, fingerprint, and artifact metadata"
            jobOps.api.repositories -> jobOps.privateFiles "Writes the generated PDF under the active private-data scope"
            autolayout lr
            title "JobOps - CV Generation Flow"
            description "Main interactions for tailoring, rendering, scoped storage, and finalization."
        }

        deployment jobOps selfHosted "Deployment" {
            include *
            autolayout lr
            title "JobOps - Self-hosted Docker Deployment"
            description "Processes, binaries, and persistent volumes inside the standard Docker deployment."
        }

        styles {
            element "Person" {
                shape person
                background "#08427B"
                color "#FFFFFF"
            }
            element "Software System" {
                background "#1168BD"
                color "#FFFFFF"
            }
            element "External" {
                background "#999999"
                color "#FFFFFF"
            }
            element "Container" {
                background "#438DD5"
                color "#FFFFFF"
            }
            element "Web" {
                shape webBrowser
            }
            element "Documentation" {
                shape webBrowser
                background "#5C2D91"
            }
            element "Database" {
                shape cylinder
                background "#2F95C7"
            }
            element "FileStore" {
                shape folder
                background "#2F95C7"
            }
            element "Component" {
                background "#85BBF0"
                color "#000000"
            }
            element "Deployment Node" {
                background "#FFFFFF"
                color "#000000"
            }
            element "Infrastructure Node" {
                background "#F3F2F1"
                color "#000000"
            }
            relationship "Relationship" {
                color "#707070"
                routing orthogonal
            }
        }
    }
}
