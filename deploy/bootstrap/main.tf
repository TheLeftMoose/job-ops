terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }
  }
}

provider "azurerm" {
  subscription_id     = var.subscription_id
  storage_use_azuread = true
  features {}
}

data "azurerm_client_config" "current" {}

variable "subscription_id" {
  type    = string
  default = "d85485c6-e97c-4b2b-9e1a-4176837bd625"
}

variable "location" {
  type    = string
  default = "swedencentral"
}

variable "prefix" {
  type    = string
  default = "jobops"
}

variable "tfstate_admin_ip_cidrs" {
  type        = list(string)
  default     = []
  description = "Public IP CIDRs allowed through the tfstate SA firewall for operator/CI state ops."
}

resource "random_string" "sa_suffix" {
  length  = 6
  upper   = false
  special = false
  numeric = true
}

resource "azurerm_resource_group" "tfstate" {
  name     = "rg-${var.prefix}-tfstate"
  location = var.location
  tags = {
    purpose = "terraform-state"
    app     = var.prefix
  }
}

resource "azurerm_storage_account" "tfstate" {
  name                            = "st${var.prefix}tfst${random_string.sa_suffix.result}"
  resource_group_name             = azurerm_resource_group.tfstate.name
  location                        = azurerm_resource_group.tfstate.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  public_network_access_enabled   = true
  blob_properties {
    versioning_enabled = true
  }

  # Closes the Defender "Storage accounts should restrict network access" finding
  # without an exemption: public path is firewalled to operator/CI CIDRs only,
  # and AAD-only auth (shared_access_key_enabled=false) remains in effect.
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
    ip_rules       = var.tfstate_admin_ip_cidrs
  }

  tags = {
    purpose = "terraform-state"
    app     = var.prefix
  }
}

resource "azurerm_role_assignment" "tfstate_blob_owner" {
  scope                = azurerm_storage_account.tfstate.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "time_sleep" "wait_rbac" {
  depends_on      = [azurerm_role_assignment.tfstate_blob_owner]
  create_duration = "30s"
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.tfstate.id
  container_access_type = "private"
  depends_on            = [time_sleep.wait_rbac]
}

output "resource_group_name" {
  value = azurerm_resource_group.tfstate.name
}

output "storage_account_name" {
  value = azurerm_storage_account.tfstate.name
}

output "container_name" {
  value = azurerm_storage_container.tfstate.name
}
