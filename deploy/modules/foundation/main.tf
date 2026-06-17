terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
    random  = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

variable "name_base" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "tenant_id" { type = string }
variable "current_principal_id" { type = string }
variable "tags" { type = map(string) }
variable "kv_admin_ip_cidrs" {
  type        = list(string)
  default     = []
  description = "Public IP CIDRs allowed through the Key Vault firewall for admin/CI ops. ACA uses the AzureServices bypass."
}

resource "random_string" "kv_suffix" {
  length  = 6
  upper   = false
  special = false
  numeric = true
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${var.name_base}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_user_assigned_identity" "main" {
  name                = "id-${var.name_base}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${var.name_base}-${random_string.kv_suffix.result}"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  enable_rbac_authorization  = true # azurerm 4.x; renamed in 5.x to rbac_authorization_enabled
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true # IRREVERSIBLE per Azure: once true, cannot be turned off; destroying KV soft-deletes the name for 7 days minimum
  public_network_access_enabled = true # Pinned: Defender auto-rem may flip to Disabled, which blocks operator/CI ops. Firewall (below) restricts to allowed IPs.
  tags                          = var.tags

  # Policy #5: deny public, allow trusted Microsoft services (covers ACA secret resolution path).
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = var.kv_admin_ip_cidrs
  }
}

# Policy #3: ship KV resource logs (AuditEvent, AzurePolicyEvaluationDetails) to LAW.
resource "azurerm_monitor_diagnostic_setting" "kv" {
  name                       = "diag-kv-to-law"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category_group = "audit"
  }
  enabled_log {
    category_group = "allLogs"
  }
  metric {
    category = "AllMetrics"
  }
}

# Let the deploying user manage secrets in this KV.
resource "azurerm_role_assignment" "kv_admin_current" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.current_principal_id
}

# Let the UAMI used by the Container App read secrets.
resource "azurerm_role_assignment" "kv_secrets_user_uami" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.main.principal_id
}

# Policy #7: manage KV secret metadata (expiration). Values are seeded out-of-band
# (rotated independently); TF only owns expiration here, so we ignore value drift.
# Secrets are imported on first apply — see deploy/README.md.
variable "secret_names" {
  type        = list(string)
  default     = ["basic-auth-user", "basic-auth-password", "jwt-secret", "llm-api-key"]
  description = "KV secrets whose expiration_date TF should manage."
}
variable "secret_expiration_date" {
  type        = string
  default     = "2027-06-15T00:00:00Z"
  description = "Expiration applied to managed KV secrets. Bump annually."
}

resource "azurerm_key_vault_secret" "managed" {
  for_each        = toset(var.secret_names)
  name            = each.value
  value           = "managed-out-of-band"
  key_vault_id    = azurerm_key_vault.main.id
  expiration_date = var.secret_expiration_date
  content_type    = "text/plain"

  lifecycle {
    ignore_changes = [value, content_type, tags]
  }

  depends_on = [azurerm_role_assignment.kv_admin_current]
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.main.id
}

output "uami_id" {
  value = azurerm_user_assigned_identity.main.id
}

output "uami_client_id" {
  value = azurerm_user_assigned_identity.main.client_id
}

output "uami_principal_id" {
  value = azurerm_user_assigned_identity.main.principal_id
}

output "key_vault_id" {
  value = azurerm_key_vault.main.id
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}
