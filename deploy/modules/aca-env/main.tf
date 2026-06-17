terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
    azapi   = { source = "Azure/azapi", version = "~> 2.0" }
  }
}

variable "name_base" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "log_analytics_workspace_id" { type = string }
variable "aca_subnet_id" { type = string }
variable "nfs_server_fqdn" { type = string }
variable "nfs_share_path" { type = string }
variable "private_endpoint_id" { type = string }
variable "tags" { type = map(string) }

# Workload Profiles environment (supports a /27 infra subnet and is required
# for VNet integration without consuming /23).
resource "azurerm_container_app_environment" "main" {
  name                               = "cae-${var.name_base}"
  location                           = var.location
  resource_group_name                = var.resource_group_name
  log_analytics_workspace_id         = var.log_analytics_workspace_id
  infrastructure_subnet_id           = var.aca_subnet_id
  internal_load_balancer_enabled     = false
  infrastructure_resource_group_name = "rg-${var.name_base}-cae-infra"

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = var.tags
}

# NFS Azure Files env storage. Provider 4.x azurerm_container_app_environment_storage
# supports SMB only, so use azapi for the NFS shape. The PE must exist before
# the env can probe the NFS endpoint.
resource "azapi_resource" "nfs_storage" {
  type      = "Microsoft.App/managedEnvironments/storages@2025-01-01"
  name      = "jobops-app"
  parent_id = azurerm_container_app_environment.main.id

  schema_validation_enabled = false

  body = {
    properties = {
      nfsAzureFile = {
        server     = var.nfs_server_fqdn
        accessMode = "ReadWrite"
        shareName  = var.nfs_share_path
      }
    }
  }
}

output "environment_id" {
  value = azurerm_container_app_environment.main.id
}

output "app_storage_name" {
  value = azapi_resource.nfs_storage.name
}
