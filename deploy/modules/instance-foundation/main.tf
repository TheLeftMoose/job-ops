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
variable "log_analytics_workspace_id" { type = string }
variable "kv_admin_principals" {
  type        = map(string)
  description = "Stable role-assignment keys mapped to principal object IDs."
}
variable "kv_admin_ip_cidrs" {
  type    = list(string)
  default = []
}
variable "pe_subnet_id" {
  type        = string
  default     = ""
  description = "Optional subnet for a Key Vault private endpoint."
}
variable "key_vault_private_dns_zone_id" {
  type        = string
  default     = ""
  description = "Optional privatelink.vaultcore.azure.net zone for the Key Vault private endpoint."
}
variable "basic_auth_user" {
  type    = string
  default = "admin"
}
variable "tags" { type = map(string) }

resource "random_string" "kv_suffix" {
  length  = 6
  upper   = false
  special = false
  numeric = true
}

resource "random_password" "basic_auth" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${var.name_base}"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = var.log_analytics_workspace_id
  application_type    = "Node.JS"
  tags                = var.tags
}

resource "azurerm_user_assigned_identity" "main" {
  name                = "id-${var.name_base}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_key_vault" "main" {
  name                          = "kv-${var.name_base}-${random_string.kv_suffix.result}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = var.tenant_id
  sku_name                      = "standard"
  enable_rbac_authorization     = true
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true
  public_network_access_enabled = true
  tags                          = var.tags

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = var.kv_admin_ip_cidrs
  }
}

resource "azurerm_monitor_diagnostic_setting" "kv" {
  name                       = "diag-kv-to-law"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

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

resource "azurerm_role_assignment" "kv_admins" {
  for_each             = var.kv_admin_principals
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = each.value
}

resource "azurerm_role_assignment" "kv_secrets_user_uami" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.main.principal_id
}

resource "azurerm_private_endpoint" "key_vault" {
  count               = var.pe_subnet_id != "" && var.key_vault_private_dns_zone_id != "" ? 1 : 0
  name                = "pe-${var.name_base}-vault"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "psc-${var.name_base}-vault"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.key_vault_private_dns_zone_id]
  }
}

resource "azurerm_key_vault_secret" "basic_auth_user" {
  name         = "basic-auth-user"
  value        = var.basic_auth_user
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.kv_admins,
  ]
}

resource "azurerm_key_vault_secret" "basic_auth_password" {
  name         = "basic-auth-password"
  value        = random_password.basic_auth.result
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.kv_admins,
  ]
}

resource "azurerm_key_vault_secret" "jwt" {
  name         = "jwt-secret"
  value        = random_password.jwt.result
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.kv_admins,
  ]
}

output "appinsights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "appinsights_id" {
  value = azurerm_application_insights.main.id
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
