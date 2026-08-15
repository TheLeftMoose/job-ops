variable "jobops_resource_group_name" {
  type        = string
  default     = "rg-jobops-prod"
  description = "Resource group containing the existing JobOps VNet."
}

variable "jobops_vnet_name" {
  type        = string
  default     = "vnet-jobops-prod"
  description = "Existing JobOps VNet used by the private runner."
}

variable "jobops_pe_subnet_name" {
  type        = string
  default     = "snet-pe"
  description = "Existing private-endpoint subnet."
}

variable "runner_subnet_prefix" {
  type        = string
  default     = "10.50.0.96/27"
  description = "Address prefix for the dedicated GitHub Actions runner subnet."
}

variable "runner_vm_name" {
  type        = string
  default     = "vm-jobops-prod-gh-runner"
  description = "Name of the self-hosted GitHub Actions runner VM."
}

variable "runner_vm_size" {
  type        = string
  default     = "Standard_B2als_v2"
  description = "Runner VM SKU."
}

variable "github_repository_url" {
  type        = string
  default     = "https://github.com/TheLeftMoose/job-ops"
  description = "Repository URL used when registering the runner."
}

variable "github_runner_version" {
  type        = string
  default     = "2.336.0"
  description = "Pinned GitHub Actions runner release."
}

variable "github_runner_linux_x64_sha256" {
  type        = string
  default     = "04cf0be1aff4c3ec3554466c39124ca250e3effd8873bb7e8d68535aa9505d5d"
  description = "SHA-256 checksum for the pinned Linux x64 runner archive."
}

locals {
  runner_tags = {
    app         = var.prefix
    environment = "prod"
    purpose     = "github-actions-runner"
  }
}

data "azurerm_resource_group" "jobops" {
  name = var.jobops_resource_group_name
}

data "azurerm_virtual_network" "jobops" {
  name                = var.jobops_vnet_name
  resource_group_name = data.azurerm_resource_group.jobops.name
}

data "azurerm_subnet" "private_endpoints" {
  name                 = var.jobops_pe_subnet_name
  virtual_network_name = data.azurerm_virtual_network.jobops.name
  resource_group_name  = data.azurerm_resource_group.jobops.name
}

resource "azurerm_private_dns_zone" "tfstate_blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.tfstate.name
  tags                = local.runner_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "tfstate_blob" {
  name                  = "vnl-jobops-tfstate-blob"
  resource_group_name   = azurerm_resource_group.tfstate.name
  private_dns_zone_name = azurerm_private_dns_zone.tfstate_blob.name
  virtual_network_id    = data.azurerm_virtual_network.jobops.id
  registration_enabled  = false
  tags                  = local.runner_tags
}

resource "azurerm_private_endpoint" "tfstate_blob" {
  name                = "pe-${azurerm_storage_account.tfstate.name}-blob"
  location            = azurerm_resource_group.tfstate.location
  resource_group_name = azurerm_resource_group.tfstate.name
  subnet_id           = data.azurerm_subnet.private_endpoints.id
  tags                = local.runner_tags

  private_service_connection {
    name                           = "psc-${azurerm_storage_account.tfstate.name}-blob"
    private_connection_resource_id = azurerm_storage_account.tfstate.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.tfstate_blob.id]
  }
}

resource "azurerm_subnet" "github_runner" {
  name                            = "snet-gh-runner"
  resource_group_name             = data.azurerm_resource_group.jobops.name
  virtual_network_name            = data.azurerm_virtual_network.jobops.name
  address_prefixes                = [var.runner_subnet_prefix]
  default_outbound_access_enabled = false
}

resource "azurerm_network_security_group" "github_runner" {
  name                = "nsg-snet-gh-runner"
  location            = data.azurerm_resource_group.jobops.location
  resource_group_name = data.azurerm_resource_group.jobops.name
  tags                = local.runner_tags

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "github_runner" {
  subnet_id                 = azurerm_subnet.github_runner.id
  network_security_group_id = azurerm_network_security_group.github_runner.id
}

resource "azurerm_public_ip" "github_runner_nat" {
  name                = "pip-jobops-prod-gh-runner-nat"
  location            = data.azurerm_resource_group.jobops.location
  resource_group_name = data.azurerm_resource_group.jobops.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
  tags                = local.runner_tags
}

resource "azurerm_nat_gateway" "github_runner" {
  name                    = "nat-jobops-prod-gh-runner"
  location                = data.azurerm_resource_group.jobops.location
  resource_group_name     = data.azurerm_resource_group.jobops.name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 10
  tags                    = local.runner_tags
}

resource "azurerm_nat_gateway_public_ip_association" "github_runner" {
  nat_gateway_id       = azurerm_nat_gateway.github_runner.id
  public_ip_address_id = azurerm_public_ip.github_runner_nat.id
}

resource "azurerm_subnet_nat_gateway_association" "github_runner" {
  subnet_id      = azurerm_subnet.github_runner.id
  nat_gateway_id = azurerm_nat_gateway.github_runner.id
}

resource "azurerm_network_interface" "github_runner" {
  name                = "nic-${var.runner_vm_name}"
  location            = data.azurerm_resource_group.jobops.location
  resource_group_name = data.azurerm_resource_group.jobops.name
  tags                = local.runner_tags

  ip_configuration {
    name                          = "private"
    subnet_id                     = azurerm_subnet.github_runner.id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_linux_virtual_machine" "github_runner" {
  name                            = var.runner_vm_name
  computer_name                   = "jobops-gh-runner"
  location                        = data.azurerm_resource_group.jobops.location
  resource_group_name             = data.azurerm_resource_group.jobops.name
  size                            = var.runner_vm_size
  admin_username                  = "runneradmin"
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.github_runner.id]
  secure_boot_enabled             = true
  vtpm_enabled                    = true
  patch_assessment_mode           = "AutomaticByPlatform"
  patch_mode                      = "AutomaticByPlatform"
  provision_vm_agent              = true
  allow_extension_operations      = true
  custom_data = base64encode(templatefile("${path.module}/runner-cloud-init.sh.tftpl", {
    github_repository_url = var.github_repository_url
    runner_name           = var.runner_vm_name
    runner_version        = var.github_runner_version
    runner_sha256         = var.github_runner_linux_x64_sha256
  }))
  tags = local.runner_tags

  admin_ssh_key {
    username   = "runneradmin"
    public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGN4aOngIClnxhP7bMZWzrprokRrXlIKZUeOvEKq1wGD jobops-runner-disabled-login"
  }

  os_disk {
    name                 = "osdisk-${var.runner_vm_name}"
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  boot_diagnostics {}

  depends_on = [
    azurerm_private_endpoint.tfstate_blob,
    azurerm_subnet_nat_gateway_association.github_runner,
    azurerm_subnet_network_security_group_association.github_runner,
  ]
}

output "runner_resource_group_name" {
  value = data.azurerm_resource_group.jobops.name
}

output "runner_vm_name" {
  value = azurerm_linux_virtual_machine.github_runner.name
}

output "runner_private_ip_address" {
  value = azurerm_network_interface.github_runner.private_ip_address
}

output "tfstate_blob_private_endpoint_ip" {
  value = azurerm_private_endpoint.tfstate_blob.private_service_connection[0].private_ip_address
}
