terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
    random  = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

variable "name_base" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "share_quota_gb" {
  type    = number
  default = 100 # Premium FileStorage minimum
}
variable "pe_subnet_id" { type = string }
variable "file_dns_zone_id" { type = string }
variable "tags" { type = map(string) }

resource "random_string" "sa_suffix" {
  length  = 6
  upper   = false
  special = false
  numeric = true
}

# Premium FileStorage account for NFS file shares. NFS doesn't support
# encryption in transit, so https_traffic_only is disabled. Public access is
# disabled; access is exclusively via private endpoint from the VNet.
resource "azurerm_storage_account" "main" {
  name                            = substr("st${replace(var.name_base, "-", "")}${random_string.sa_suffix.result}", 0, 24)
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Premium"
  account_replication_type        = "LRS"
  account_kind                    = "FileStorage"
  https_traffic_only_enabled      = false
  min_tls_version                 = "TLS1_2"
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
  tags                            = var.tags

  # Policy #1: explicit network rules with default Deny (PE is the only path in).
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
}

resource "azurerm_storage_share" "app" {
  name               = "app"
  storage_account_id = azurerm_storage_account.main.id
  quota              = var.share_quota_gb
  enabled_protocol   = "NFS"
  # NFS shares don't support access tiers in this kind.
}

resource "azurerm_private_endpoint" "file" {
  name                = "pe-${substr(azurerm_storage_account.main.name, 0, 20)}-file"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "psc-file"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.file_dns_zone_id]
  }
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "storage_account_id" {
  value = azurerm_storage_account.main.id
}

# Used by ACA NFS env storage (private DNS resolves this to the PE).
output "nfs_server_fqdn" {
  value = "${azurerm_storage_account.main.name}.file.core.windows.net"
}

output "share_name" {
  value = azurerm_storage_share.app.name
}

# ACA NFS env storage expects the share path in /<account>/<share> form.
output "nfs_share_path" {
  value = "/${azurerm_storage_account.main.name}/${azurerm_storage_share.app.name}"
}

output "private_endpoint_id" {
  value = azurerm_private_endpoint.file.id
}
