/**
 * Azure Monitor (Application Insights) bootstrap.
 *
 * Uses the Azure Monitor OpenTelemetry Distro to auto-instrument HTTP and
 * Express, shipping requests, dependencies and unhandled exceptions to
 * Application Insights.
 *
 * Inert unless `APPLICATIONINSIGHTS_CONNECTION_STRING` is set, so this is a
 * no-op in local development and upstream builds while active in the fork's
 * Azure Container Apps deployment where the connection string is injected as
 * an environment variable.
 *
 * IMPORTANT: this module must be imported before any other server module (see
 * `src/server/index.ts`) so OpenTelemetry can patch instrumented dependencies
 * (express, http) as they are first loaded.
 */
import { useAzureMonitor as startAzureMonitor } from "@azure/monitor-opentelemetry";

function initTelemetry(): boolean {
  const connectionString =
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim();

  if (!connectionString) {
    return false;
  }

  try {
    startAzureMonitor({
      azureMonitorExporterOptions: { connectionString },
    });
    return true;
  } catch {
    // Telemetry is best-effort; never let observability wiring break startup.
    return false;
  }
}

export const telemetryEnabled = initTelemetry();
