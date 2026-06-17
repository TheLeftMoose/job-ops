terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.0"
    }
  }

  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}

provider "azapi" {
  subscription_id = var.subscription_id
}

variable "subscription_id" {
  type        = string
  description = "Subscription that holds the existing Foundry / AI Services account."
  default     = "10c5c242-6a46-41a1-a93d-ceb66f4212a1"
}

variable "resource_group_name" {
  type    = string
  default = "foundary-job-ops"
}

variable "account_name" {
  type        = string
  description = "Existing AI Services / Foundry account name (not created here)."
  default     = "dennissch-jobops-resource"
}

variable "project_name" {
  type    = string
  default = "jobops-prod"
}

variable "project_display_name" {
  type    = string
  default = "JobOps Prod"
}

variable "project_description" {
  type    = string
  default = "Foundry project for the JobOps Container App. Managed by Terraform."
}

variable "chat_deployment_name" {
  type        = string
  description = "Deployment name JobOps will pass as MODEL."
  default     = "chat-mini"
}

variable "chat_model_name" {
  type    = string
  default = "gpt-5.4-mini"
}

variable "chat_model_version" {
  type    = string
  default = "2026-03-17"
}

variable "chat_sku_name" {
  type    = string
  default = "GlobalStandard"
}

variable "chat_capacity" {
  type        = number
  description = "Capacity in thousands of TPM (50 = 50K TPM)."
  default     = 50
}

variable "tags" {
  type = map(string)
  default = {
    app   = "jobops"
    owner = "dennissch"
    stack = "foundry"
  }
}

# Adopt the existing Foundry / AI Services account by reference.
data "azurerm_cognitive_account" "main" {
  name                = var.account_name
  resource_group_name = var.resource_group_name
}

# Foundry project under the existing account. The Microsoft.CognitiveServices
# `projects` child resource is preview-only at time of writing, so azapi is the
# correct surface (azurerm has no first-class resource yet).
resource "azapi_resource" "project" {
  type                      = "Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview"
  name                      = var.project_name
  parent_id                 = data.azurerm_cognitive_account.main.id
  location                  = data.azurerm_cognitive_account.main.location
  schema_validation_enabled = false

  identity {
    type = "SystemAssigned"
  }

  body = {
    properties = {
      displayName = var.project_display_name
      description = var.project_description
    }
  }

  response_export_values = ["properties.endpoints"]
}

# Chat deployment. Account-scoped, so it's shared across all projects on the
# account. Using a distinct name from any pre-existing manually-created
# deployment to avoid import collisions.
resource "azurerm_cognitive_deployment" "chat" {
  name                 = var.chat_deployment_name
  cognitive_account_id = data.azurerm_cognitive_account.main.id

  model {
    format  = "OpenAI"
    name    = var.chat_model_name
    version = var.chat_model_version
  }

  sku {
    name     = var.chat_sku_name
    capacity = var.chat_capacity
  }

  # Serialize behind the project create to dodge the CogSvcs IfMatch race.
  depends_on = [azapi_resource.project]
}

output "account_id" {
  value = data.azurerm_cognitive_account.main.id
}

output "account_endpoint" {
  value = data.azurerm_cognitive_account.main.endpoint
}

# What JobOps' LLM_BASE_URL should be set to (account-level OpenAI v1 surface).
output "llm_base_url" {
  value = "https://${var.account_name}.services.ai.azure.com/openai/v1"
}

# What JobOps' MODEL should be set to.
output "llm_model" {
  value = azurerm_cognitive_deployment.chat.name
}

output "project_id" {
  value = azapi_resource.project.id
}

output "project_endpoints" {
  value = try(azapi_resource.project.output.properties.endpoints, null)
}
