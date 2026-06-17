# GitHub Actions OIDC federation for fork-driven deploys.
#
# Implementation: User-Assigned Managed Identity (UAMI) + workload identity
# federation. UAMIs support GitHub OIDC subjects natively, are managed via
# ARM (azurerm), and avoid the AAD app permissions a non-tenant-admin user
# typically lacks.
#
# Subjects allowed (federated identity credentials):
#   - repo:<owner>/<repo>:environment:<env>     (recommended; gated by GitHub Environment)
#   - repo:<owner>/<repo>:ref:refs/heads/infra  (fallback for ad-hoc workflow_dispatch)
#
# RBAC scope: the specific Container App only. No KV access, no subscription rights.

variable "github_oidc_enabled" {
  type        = bool
  default     = true
  description = "Set to false to skip provisioning the GitHub Actions OIDC integration."
}

variable "github_repo_owner" {
  type        = string
  default     = "TheLeftMoose"
  description = "Owner of the GitHub repo that's allowed to assume this identity."
}

variable "github_repo_name" {
  type        = string
  default     = "job-ops"
  description = "Repo name allowed to assume this identity."
}

variable "github_environment" {
  type        = string
  default     = "prod"
  description = "GitHub Environment whose runs may assume this identity (recommended path; supports approval gates)."
}

variable "github_branch" {
  type        = string
  default     = "infra"
  description = "Branch fallback whose runs may assume this identity (used by workflow_dispatch outside an environment)."
}

resource "azurerm_user_assigned_identity" "github_deploy" {
  count               = var.github_oidc_enabled ? 1 : 0
  name                = "uami-${var.prefix}-${var.environment}-gh-deploy"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

# Federated credential 1: GitHub Environment-gated runs (recommended path).
# A workflow that uses `environment: prod` on its job, in this repo, may
# request a token. Set required reviewers / wait timer on the Environment
# in GitHub to add an approval gate.
resource "azurerm_federated_identity_credential" "gh_environment" {
  count               = var.github_oidc_enabled ? 1 : 0
  name                = "gh-env-${var.github_environment}"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_deploy[0].id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_repo_owner}/${var.github_repo_name}:environment:${var.github_environment}"
}

# Federated credential 2: branch-bound (used for workflow_dispatch when the
# job does not declare an environment). Narrower than allowing all refs.
resource "azurerm_federated_identity_credential" "gh_branch" {
  count               = var.github_oidc_enabled ? 1 : 0
  name                = "gh-branch-${var.github_branch}"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_deploy[0].id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_repo_owner}/${var.github_repo_name}:ref:refs/heads/${var.github_branch}"
}

# Minimum-blast-radius RBAC: Container Apps Contributor on this ACA only.
# Sufficient for `az containerapp update --image`, revision_suffix bumps, etc.
# Does NOT grant Key Vault access (revisions inherit secret access via the
# UAMI bound to the Container App, not via the deployer principal).
resource "azurerm_role_assignment" "github_deploy_aca" {
  count                = var.github_oidc_enabled ? 1 : 0
  scope                = module.aca_app.id
  role_definition_name = "Container Apps Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deploy[0].principal_id
}
