import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STRUCTURIZR_VERSION = "2025.11.09";
const PLANTUML_VERSION = "1.2026.6";
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolsDir = join(rootDir, ".cache", "architecture-tools");
const structurizrDir = join(toolsDir, `structurizr-${STRUCTURIZR_VERSION}`);
const structurizrZip = join(
  toolsDir,
  `structurizr-cli-${STRUCTURIZR_VERSION}.zip`,
);
const plantUmlJar = join(toolsDir, `plantuml-${PLANTUML_VERSION}.jar`);
const architectureDir = join(rootDir, "docs-site", "diagrams", "architecture");
const workspacePath = join(architectureDir, "workspace.dsl");
const generatedDir = join(architectureDir, "generated", "plantuml");
const publishedDir = join(
  rootDir,
  "docs-site",
  "static",
  "img",
  "architecture",
);

const downloads = {
  structurizr: `https://github.com/structurizr/cli/releases/download/v${STRUCTURIZR_VERSION}/structurizr-cli.zip`,
  plantuml: `https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml-${PLANTUML_VERSION}.jar`,
};

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });
}

function assertJava() {
  try {
    run("java", ["-version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "Java 17 or newer is required. Install Java, then run npm run architecture:generate again.",
    );
  }
}

async function download(url, destination) {
  if (existsSync(destination)) return;

  console.log(`Downloading ${basename(destination)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download failed (${response.status} ${response.statusText}): ${url}`,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(destination, bytes);
}

function findFile(directory, fileName) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(entryPath, fileName);
      if (nested) return nested;
    } else if (entry.name === fileName) {
      return entryPath;
    }
  }
  return null;
}

async function ensureTools() {
  mkdirSync(toolsDir, { recursive: true });
  await Promise.all([
    download(downloads.structurizr, structurizrZip),
    download(downloads.plantuml, plantUmlJar),
  ]);

  if (!existsSync(structurizrDir)) {
    mkdirSync(structurizrDir, { recursive: true });
    run("tar", ["-xf", structurizrZip, "-C", structurizrDir]);
  }
}

function exportPlantUml() {
  rmSync(generatedDir, { recursive: true, force: true });
  mkdirSync(generatedDir, { recursive: true });

  const scriptName =
    process.platform === "win32" ? "structurizr.bat" : "structurizr.sh";
  const cliScript = findFile(structurizrDir, scriptName);
  if (!cliScript) {
    throw new Error(`Could not find ${scriptName} in ${structurizrDir}.`);
  }

  const args = [
    "export",
    "-workspace",
    workspacePath,
    "-format",
    "plantuml",
    "-output",
    generatedDir,
  ];

  if (process.platform === "win32") {
    run(process.env.ComSpec ?? "cmd.exe", [
      "/d",
      "/s",
      "/c",
      cliScript,
      ...args,
    ]);
  } else {
    run("bash", [cliScript, ...args]);
  }
}

function renderSvg() {
  const plantUmlFiles = readdirSync(generatedDir)
    .filter((fileName) => fileName.endsWith(".puml"))
    .map((fileName) => join(generatedDir, fileName));

  if (plantUmlFiles.length === 0) {
    throw new Error("Structurizr did not export any PlantUML views.");
  }

  run("java", [
    "-Djava.awt.headless=true",
    "-jar",
    plantUmlJar,
    "-charset",
    "UTF-8",
    "-tsvg",
    ...plantUmlFiles,
  ]);
}

function publishSvg() {
  mkdirSync(publishedDir, { recursive: true });
  const svgFiles = readdirSync(generatedDir).filter((fileName) =>
    fileName.endsWith(".svg"),
  );
  const views = [
    ["SystemContext", "jobops-system-context.svg"],
    ["Containers", "jobops-containers.svg"],
    ["BackendComponents", "jobops-backend-components.svg"],
    ["CvGeneration", "jobops-cv-generation.svg"],
    ["Deployment", "jobops-deployment.svg"],
  ];

  for (const [viewKey, destinationName] of views) {
    const sourceName = svgFiles.find(
      (fileName) =>
        fileName.toLowerCase().includes(viewKey.toLowerCase()) &&
        !fileName.toLowerCase().includes("-key"),
    );
    if (!sourceName) {
      throw new Error(`Could not find the generated SVG for view ${viewKey}.`);
    }
    copyFileSync(
      join(generatedDir, sourceName),
      join(publishedDir, destinationName),
    );
    console.log(`Published ${destinationName}`);
  }
}

assertJava();
await ensureTools();
exportPlantUml();
renderSvg();
publishSvg();
