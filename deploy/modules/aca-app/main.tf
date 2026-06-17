terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
}

variable "name_base" { type = string }
variable "resource_group_name" { type = string }
variable "environment_id" { type = string }
variable "image" { type = string }
variable "container_cpu" { type = number }
variable "container_memory" { type = string }
variable "uami_id" { type = string }
variable "uami_client_id" { type = string }
variable "key_vault_id" { type = string }
variable "key_vault_uri" { type = string }
variable "app_storage_name" { type = string }
variable "llm_provider" {
  type    = string
  default = "openai"
}
variable "llm_model" {
  type    = string
  default = "chat-mini"
}
variable "llm_base_url" {
  type    = string
  default = "https://dennissch-jobops-resource.services.ai.azure.com/openai/v1"
}
variable "revision_suffix" {
  type        = string
  default     = ""
  description = "Optional revision suffix. Bump (e.g., to a timestamp) to force a new revision so Key Vault-backed secrets are re-fetched."
}
variable "tags" { type = map(string) }

resource "azurerm_container_app" "main" {
  name                         = "ca-${var.name_base}"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.environment_id
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [var.uami_id]
  }

  ingress {
    external_enabled           = true
    target_port                = 3001
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  secret {
    name                = "basic-auth-user"
    key_vault_secret_id = "${var.key_vault_uri}secrets/basic-auth-user"
    identity            = var.uami_id
  }

  secret {
    name                = "basic-auth-password"
    key_vault_secret_id = "${var.key_vault_uri}secrets/basic-auth-password"
    identity            = var.uami_id
  }

  secret {
    name                = "jwt-secret"
    key_vault_secret_id = "${var.key_vault_uri}secrets/jwt-secret"
    identity            = var.uami_id
  }

  secret {
    name                = "llm-api-key"
    key_vault_secret_id = "${var.key_vault_uri}secrets/llm-api-key"
    identity            = var.uami_id
  }

  template {
    min_replicas    = 1
    max_replicas    = 1
    revision_suffix = var.revision_suffix != "" ? var.revision_suffix : null

    container {
      name   = "jobops"
      image  = var.image
      cpu    = var.container_cpu
      memory = var.container_memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3001"
      }
      env {
        name  = "DATA_DIR"
        value = "/app/data"
      }
      env {
        name  = "CODEX_HOME"
        value = "/app/codex-home"
      }
      env {
        name  = "PYTHON_PATH"
        value = "/usr/bin/python3"
      }

      env {
        name        = "BASIC_AUTH_USER"
        secret_name = "basic-auth-user"
      }
      env {
        name        = "BASIC_AUTH_PASSWORD"
        secret_name = "basic-auth-password"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name  = "LLM_PROVIDER"
        value = var.llm_provider
      }
      env {
        name  = "MODEL"
        value = var.llm_model
      }
      env {
        name  = "LLM_BASE_URL"
        value = var.llm_base_url
      }
      env {
        name        = "LLM_API_KEY"
        secret_name = "llm-api-key"
      }

      # Single NFS share mounted twice via subPath to keep storage cost low
      # (Premium FileStorage minimum is one 100 GiB share).
      volume_mounts {
        name     = "app"
        path     = "/app/data"
        sub_path = "data"
      }
      volume_mounts {
        name     = "app"
        path     = "/app/codex-home"
        sub_path = "codex-home"
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = 3001
        path                    = "/health"
        initial_delay           = 60
        interval_seconds        = 30
        timeout                 = 10
        failure_count_threshold = 5
      }

      readiness_probe {
        transport               = "HTTP"
        port                    = 3001
        path                    = "/health"
        interval_seconds        = 15
        timeout                 = 5
        failure_count_threshold = 5
        success_count_threshold = 1
      }
    }

    volume {
      name         = "app"
      storage_type = "NfsAzureFile"
      storage_name = var.app_storage_name
    }
  }
}

output "fqdn" {
  value = azurerm_container_app.main.ingress[0].fqdn
}

output "name" {
  value = azurerm_container_app.main.name
}
