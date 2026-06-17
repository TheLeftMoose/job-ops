terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
}

variable "name_base" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${var.name_base}"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.50.0.0/23"]
  tags                = var.tags
}

resource "azurerm_subnet" "aca" {
  name                 = "snet-aca"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.50.0.0/27"]

  # Azure is retiring the implicit default outbound access; pin to false so
  # subnet egress is explicit (via the AzureLoadBalancer / NAT / app-managed
  # outbound). Provider default is still true; without this pin Terraform
  # would try to re-enable the deprecated path on every plan.
  default_outbound_access_enabled = false

  delegation {
    name = "aca-delegation"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "pe" {
  name                              = "snet-pe"
  resource_group_name               = var.resource_group_name
  virtual_network_name              = azurerm_virtual_network.main.name
  address_prefixes                  = ["10.50.0.64/28"]
  private_endpoint_network_policies = "Disabled"
  default_outbound_access_enabled   = false
}

# Policy #8: every subnet should have an NSG. Default platform rules are enough
# for ACA (allows AzureLoadBalancer in, VNet/internet out) and for PE traffic.
resource "azurerm_network_security_group" "aca" {
  name                = "nsg-snet-aca"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_network_security_group" "pe" {
  name                = "nsg-snet-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_subnet_network_security_group_association" "aca" {
  subnet_id                 = azurerm_subnet.aca.id
  network_security_group_id = azurerm_network_security_group.aca.id
}

resource "azurerm_subnet_network_security_group_association" "pe" {
  subnet_id                 = azurerm_subnet.pe.id
  network_security_group_id = azurerm_network_security_group.pe.id
}

resource "azurerm_private_dns_zone" "file" {
  name                = "privatelink.file.core.windows.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "file" {
  name                  = "vnl-file"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.file.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
}

output "vnet_id" { value = azurerm_virtual_network.main.id }
output "aca_subnet_id" { value = azurerm_subnet.aca.id }
output "pe_subnet_id" { value = azurerm_subnet.pe.id }
output "file_dns_zone_id" { value = azurerm_private_dns_zone.file.id }
