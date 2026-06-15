import * as api from "@client/api";
import {
  DetailPanel,
  EmptyState,
  PageHeader,
  PageMain,
  SplitLayout,
} from "@client/components/layout";
import { showErrorToast } from "@client/lib/error-toast";
import { queryKeys } from "@client/lib/queryKeys";
import type { CompanyInvestigation, CompanyProfile } from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  FlaskConical,
  Loader2,
  Users,
} from "lucide-react";
import type React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function statusBadgeVariant(
  status: CompanyInvestigation["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "complete":
      return "default";
    case "running":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function CompanyFactsCard({ profile }: { profile: CompanyProfile }) {
  const facts = profile.facts;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-base font-semibold">
          {profile.normalizedName ?? profile.employer}
        </span>
        {facts?.country && (
          <Badge variant="outline" className="uppercase text-xs">
            {facts.country}
          </Badge>
        )}
      </div>

      {!facts ? (
        <p className="text-sm text-muted-foreground">
          No facts collected yet. Run an investigation to gather company
          information.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {facts.officialName && facts.officialName !== profile.employer && (
            <>
              <dt className="text-muted-foreground">Official name</dt>
              <dd className="font-medium">{facts.officialName}</dd>
            </>
          )}
          {facts.registrationNumbers.map((rn) => (
            <React.Fragment key={`${rn.system}-${rn.value}`}>
              <dt className="text-muted-foreground">{rn.system}</dt>
              <dd className="font-mono font-medium">{rn.value}</dd>
            </React.Fragment>
          ))}
          {facts.industry && (
            <>
              <dt className="text-muted-foreground">Industry</dt>
              <dd>{facts.industry}</dd>
            </>
          )}
          {facts.employeeCountTotal != null && (
            <>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Employees
              </dt>
              <dd>{facts.employeeCountTotal.toLocaleString()}</dd>
            </>
          )}
          {facts.foundedDate && (
            <>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Founded
              </dt>
              <dd>{facts.foundedDate}</dd>
            </>
          )}
          {facts.website && (
            <>
              <dt className="text-muted-foreground">Website</dt>
              <dd>
                <a
                  href={facts.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {facts.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </>
          )}
          {facts.description && (
            <>
              <dt className="col-span-2 text-muted-foreground mt-2">
                Description
              </dt>
              <dd className="col-span-2 text-sm leading-relaxed">
                {facts.description}
              </dd>
            </>
          )}
          {facts.attributedTo && (
            <>
              <dt className="text-muted-foreground text-xs mt-2">Source</dt>
              <dd className="text-xs text-muted-foreground mt-2">
                {facts.attributedTo}
                {facts.confidence && ` (${facts.confidence} confidence)`}
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}

function InvestigationHistoryCard({
  investigations,
}: {
  investigations: CompanyInvestigation[];
}) {
  if (investigations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No investigations yet.</p>
    );
  }
  return (
    <div className="divide-y divide-border/60 rounded-lg border">
      {investigations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {new Date(inv.startedAt).toLocaleString()}
            </span>
            {inv.errorCode && (
              <span className="text-xs text-destructive">{inv.errorCode}</span>
            )}
            {inv.providerIds.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Providers: {inv.providerIds.join(", ")}
              </span>
            )}
          </div>
          <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
        </div>
      ))}
    </div>
  );
}

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.companies.detail(id ?? ""),
    queryFn: () => api.getCompanyProfile(id ?? ""),
    enabled: !!id,
  });

  const investigateMutation = useMutation({
    mutationFn: () => api.triggerInvestigation(id ?? ""),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.companies.detail(id ?? ""),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.companies.list(),
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Investigation failed");
    },
  });

  const latestStatus = data?.profile.latestInvestigation?.status;

  return (
    <>
      <PageHeader
        icon={Building2}
        title={
          data?.profile.normalizedName ?? data?.profile.employer ?? "Company"
        }
        subtitle="Company investigation details"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/companies")}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            <Button
              size="sm"
              disabled={
                investigateMutation.isPending || latestStatus === "running"
              }
              onClick={() => investigateMutation.mutate()}
            >
              {investigateMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
              )}
              Re-investigate
            </Button>
          </div>
        }
      />
      <PageMain>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <EmptyState
            icon={Building2}
            title="Company not found"
            description="This company profile does not exist or you don't have access to it."
          />
        ) : (
          <SplitLayout>
            <div className="space-y-6">
              <DetailPanel sticky={false}>
                <CompanyFactsCard profile={data.profile} />
              </DetailPanel>

              <DetailPanel sticky={false}>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    Investigation History
                  </h3>
                  <InvestigationHistoryCard
                    investigations={data.investigations}
                  />
                </div>
              </DetailPanel>
            </div>

            <DetailPanel>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Linked Watchlists</h3>
                {data.profile.linkedWatchlistSourceIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No watchlists linked. Attach watchlists to quickly navigate
                    to relevant job listings.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {data.profile.linkedWatchlistSourceIds.map((sid) => (
                      <li key={sid} className="text-sm">
                        <a
                          href="/watchlist"
                          className="text-primary hover:underline"
                        >
                          {sid}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Source
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Employer (raw):{" "}
                    <span className="font-mono text-foreground">
                      {data.profile.employer}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added{" "}
                    {new Date(data.profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </DetailPanel>
          </SplitLayout>
        )}
      </PageMain>
    </>
  );
};
