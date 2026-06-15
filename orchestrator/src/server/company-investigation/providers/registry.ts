import { logger } from "@infra/logger";
import { cvrProvider } from "./cvr/index";
import type { CompanyInvestigationProvider } from "./types";

const REGISTERED_PROVIDERS: CompanyInvestigationProvider[] = [cvrProvider];

logger.info("Company investigation providers loaded", {
  count: REGISTERED_PROVIDERS.length,
  ids: REGISTERED_PROVIDERS.map((p) => p.id),
});

export function getCompanyInvestigationProviders(): CompanyInvestigationProvider[] {
  return REGISTERED_PROVIDERS;
}

export function getCompanyInvestigationProvider(
  id: string,
): CompanyInvestigationProvider | undefined {
  return REGISTERED_PROVIDERS.find((p) => p.id === id);
}
