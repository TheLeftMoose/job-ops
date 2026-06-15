import { randomUUID } from "node:crypto";
import type { CompanyFacts, CompanyInvestigationStatus } from "@shared/types";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index";
import {
  getPrivateDataScope,
  privateDataScopeFilter,
} from "../tenancy/private-scope";

const { companyProfiles, companyInvestigations } = schema;

// ---------- type helpers ----------

function rowToProfile(row: typeof companyProfiles.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    employer: row.employer,
    normalizedName: row.normalizedName,
    facts: (row.factsJson as CompanyFacts | null) ?? null,
    linkedWatchlistSourceIds: (row.linkedWatchlistSourceIds as string[]) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToInvestigation(row: typeof companyInvestigations.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    companyProfileId: row.companyProfileId,
    status: row.status as CompanyInvestigationStatus,
    providerIds: (row.providerIds as string[]) ?? [],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorCode: row.errorCode,
    requestId: row.requestId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------- company profile repository ----------

export async function listCompanyProfiles() {
  const rows = await db
    .select()
    .from(companyProfiles)
    .where(privateDataScopeFilter(companyProfiles))
    .orderBy(desc(companyProfiles.updatedAt));
  return rows.map(rowToProfile);
}

export async function getCompanyProfile(id: string) {
  const [row] = await db
    .select()
    .from(companyProfiles)
    .where(
      and(privateDataScopeFilter(companyProfiles), eq(companyProfiles.id, id)),
    );
  return row ? rowToProfile(row) : null;
}

export async function getCompanyProfileByEmployer(employer: string) {
  const scope = getPrivateDataScope();
  const filters = [
    eq(companyProfiles.tenantId, scope.tenantId),
    eq(companyProfiles.employer, employer),
  ];
  if (scope.enforceUserIsolation && scope.userId) {
    filters.push(eq(companyProfiles.userId, scope.userId));
  }
  const [row] = await db
    .select()
    .from(companyProfiles)
    .where(and(...filters));
  return row ? rowToProfile(row) : null;
}

export async function upsertCompanyProfile(input: {
  employer: string;
  normalizedName?: string | null;
}): Promise<ReturnType<typeof rowToProfile>> {
  const scope = getPrivateDataScope();
  const now = new Date().toISOString();

  const existing = await getCompanyProfileByEmployer(input.employer);
  if (existing) {
    const updates: Partial<typeof companyProfiles.$inferInsert> = {
      updatedAt: now,
    };
    if (input.normalizedName !== undefined) {
      updates.normalizedName = input.normalizedName;
    }
    await db
      .update(companyProfiles)
      .set(updates)
      .where(eq(companyProfiles.id, existing.id));
    return { ...existing, ...updates };
  }

  const id = randomUUID();
  await db.insert(companyProfiles).values({
    id,
    tenantId: scope.tenantId,
    userId: scope.userId,
    employer: input.employer,
    normalizedName: input.normalizedName ?? null,
    factsJson: null,
    linkedWatchlistSourceIds: JSON.stringify([]),
    createdAt: now,
    updatedAt: now,
  });

  const created = await getCompanyProfile(id);
  if (!created) throw new Error("Failed to retrieve created company profile");
  return created;
}

export async function updateCompanyProfileFacts(
  id: string,
  facts: CompanyFacts,
): Promise<void> {
  await db
    .update(companyProfiles)
    .set({ factsJson: facts, updatedAt: new Date().toISOString() })
    .where(
      and(privateDataScopeFilter(companyProfiles), eq(companyProfiles.id, id)),
    );
}

export async function updateCompanyProfileWatchlists(
  id: string,
  watchlistSourceIds: string[],
): Promise<void> {
  await db
    .update(companyProfiles)
    .set({
      linkedWatchlistSourceIds: JSON.stringify(watchlistSourceIds),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(privateDataScopeFilter(companyProfiles), eq(companyProfiles.id, id)),
    );
}

// ---------- company investigation repository ----------

export async function createInvestigation(input: {
  companyProfileId: string;
  providerIds: string[];
  requestId: string | null;
}): Promise<ReturnType<typeof rowToInvestigation>> {
  const scope = getPrivateDataScope();
  const now = new Date().toISOString();
  const id = randomUUID();

  await db.insert(companyInvestigations).values({
    id,
    tenantId: scope.tenantId,
    userId: scope.userId,
    companyProfileId: input.companyProfileId,
    status: "pending",
    providerIds: JSON.stringify(input.providerIds),
    startedAt: now,
    requestId: input.requestId,
    createdAt: now,
    updatedAt: now,
  });

  const row = await getInvestigation(id);
  if (!row) throw new Error("Failed to retrieve created investigation");
  return row;
}

export async function getInvestigation(id: string) {
  const [row] = await db
    .select()
    .from(companyInvestigations)
    .where(
      and(
        privateDataScopeFilter(companyInvestigations),
        eq(companyInvestigations.id, id),
      ),
    );
  return row ? rowToInvestigation(row) : null;
}

export async function updateInvestigation(
  id: string,
  updates: {
    status: CompanyInvestigationStatus;
    completedAt?: string;
    errorCode?: string | null;
  },
): Promise<void> {
  await db
    .update(companyInvestigations)
    .set({
      status: updates.status,
      completedAt: updates.completedAt ?? null,
      errorCode: updates.errorCode ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        privateDataScopeFilter(companyInvestigations),
        eq(companyInvestigations.id, id),
      ),
    );
}

export async function listInvestigationsForProfile(companyProfileId: string) {
  const rows = await db
    .select()
    .from(companyInvestigations)
    .where(
      and(
        privateDataScopeFilter(companyInvestigations),
        eq(companyInvestigations.companyProfileId, companyProfileId),
      ),
    )
    .orderBy(desc(companyInvestigations.createdAt));
  return rows.map(rowToInvestigation);
}

export async function getLatestInvestigationForProfile(
  companyProfileId: string,
) {
  const [row] = await db
    .select()
    .from(companyInvestigations)
    .where(
      and(
        privateDataScopeFilter(companyInvestigations),
        eq(companyInvestigations.companyProfileId, companyProfileId),
      ),
    )
    .orderBy(desc(companyInvestigations.createdAt))
    .limit(1);
  return row ? rowToInvestigation(row) : null;
}
