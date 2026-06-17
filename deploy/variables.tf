variable "subscription_id" {
  type        = string
  description = "Target Azure subscription."
  default     = "d85485c6-e97c-4b2b-9e1a-4176837bd625"
}

variable "location" {
  type    = string
  default = "swedencentral"
}

variable "prefix" {
  type        = string
  description = "Short resource name prefix."
  default     = "jobops"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "image" {
  type    = string
  default = "ghcr.io/dakheera47/job-ops:latest"
}

variable "container_cpu" {
  type    = number
  default = 2.0
}

variable "container_memory" {
  type    = string
  default = "4Gi"
}

variable "data_share_quota_gb" {
  type    = number
  default = 5
}

variable "codex_share_quota_gb" {
  type    = number
  default = 1
}

variable "revision_suffix" {
  type        = string
  default     = "rot202606151526"
  description = "Container App revision suffix. Bump to force a new revision (needed to re-pull rotated Key Vault secrets)."
}

variable "kv_admin_ip_cidrs" {
  type        = list(string)
  default     = []
  description = "Public IP CIDRs allowed through the Key Vault firewall for operator/CI access."
}

variable "tags" {
  type = map(string)
  default = {
    app   = "jobops"
    owner = "dennissch"
  }
}
