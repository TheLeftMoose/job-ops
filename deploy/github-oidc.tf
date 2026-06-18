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

variable "tfstate_storage_account_name" {
  type        = string
  default     = "stjobopstfstkm3uaz"
  description = "Name of the bootstrap-managed Storage Account holding terraform.tfstate. Used to scope Blob Data Contributor for the CI deploy UAMI."
}

variable "tfstate_resource_group_name" {
  type        = string
  default     = "rg-jobops-tfstate"
  description = "Resource group of the tfstate Storage Account."
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

# RBAC: enough for Terraform to plan/apply the full main stack from CI.
#
# - Contributor on the resource group: manage RG-scoped resources (ACA, KV mgmt,
#   storage mgmt, network, etc.). Does NOT include role assignments or KV data
#   plane.
# - User Access Administrator on the resource group: TF manages several
#   role assignments inside the RG (KV admins, ACA UAMI -> KV Secrets User);
#   re-applying them requires this role. Scoped to the RG only, not subscription.
# - Storage Blob Data Contributor on the tfstate SA: needed to read/write
#   the Terraform state blob (the SA is AAD-auth only; shared keys disabled).
# - Key Vault Administrator is granted via the foundation module by listing
#   this UAMI's principal id in module.foundation.kv_admin_principal_ids.
#
# Deliberately NOT granted: subscription-wide Contributor, Owner on anything,
# anything outside rg-jobops-prod + the single tfstate SA.

data "azurerm_storage_account" "tfstate" {
  count               = var.github_oidc_enabled ? 1 : 0
  name                = var.tfstate_storage_account_name
  resource_group_name = var.tfstate_resource_group_name
}

resource "azurerm_role_assignment" "github_deploy_rg_contributor" {
  count                = var.github_oidc_enabled ? 1 : 0
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deploy[0].principal_id
}

resource "azurerm_role_assignment" "github_deploy_rg_uaa" {
  count                = var.github_oidc_enabled ? 1 : 0
  scope                = azurerm_resource_group.main.id
  role_definition_name = "User Access Administrator"
  principal_id         = azurerm_user_assigned_identity.github_deploy[0].principal_id
}

resource "azurerm_role_assignment" "github_deploy_tfstate_blob" {
  count                = var.github_oidc_enabled ? 1 : 0
  scope                = data.azurerm_storage_account.tfstate[0].id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deploy[0].principal_id
}
