# We strongly recommend using the required_providers block to set the
# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
}

# Create a resource group
resource "azurerm_resource_group" "cloudrg" {
  name     = "cloudrg"
  location = "West Europe"
}

# Identità gestita dall'utente
resource "azurerm_user_assigned_identity" "cloudidentity" {
  location            = azurerm_resource_group.cloudrg.location
  name                = "cloudidentity"
  resource_group_name = azurerm_resource_group.cloudrg.name
}

# App Service deployment
resource "azurerm_resource_group_template_deployment" "cloudasdeployment" {
  name                = "cloudasdeployment"
  resource_group_name = azurerm_resource_group.cloudrg.name
  deployment_mode     = "Incremental"
  parameters_content = jsonencode({
    "appServiceName" = {
      value = "cloudas"
    }
    "newAppServicePlanName" = {
      value = "cloudappserviceplan"
    }
    "newAppServicePlanLocation" = {
      value = "westeurope"
    }
    "newAppServicePlanSku" = {
      value = {
        "name": "S1",
        "tier": "Standard",
        "size": "S1",
        "family": "S",
        "capacity": 1
      }
    }
    "appType" = {
      value = "UserAssignedMSI"
    }
    "appId" = {
      value = azurerm_user_assigned_identity.cloudidentity.client_id
    }
    "UMSIName" = {
      value = "cloudidentity"
    }
    "UMSIResourceGroupName" = {
      value = "cloudrg"
    }
    "tenantId" = {
      value = azurerm_user_assigned_identity.cloudidentity.tenant_id
    }
  })
  
  template_content = file("C:\\Users\\Alessia\\Desktop\\DocMentorBot\\CloudProject\\deploymentTemplates\\deployUseExistResourceGroup\\template-BotApp-with-rg.json")
  depends_on = [azurerm_user_assigned_identity.cloudidentity]
}

# Azure Bot deployment
resource "azurerm_resource_group_template_deployment" "cloudbotdeployment" {
  name                = "cloudbotdeployment"
  resource_group_name = azurerm_resource_group.cloudrg.name
  deployment_mode     = "Incremental"
  parameters_content = jsonencode({
    "azureBotId" = {
      value = "DocMentorBot"
    }
    "azureBotSku" = {
      value = "S1"
    }
    "azureBotRegion" = {
      value = "global"
    }
    "botEndpoint" = {
      value = "https://cloudas.azurewebsites.net/api/messages"
    }
    "appType" = {
      value = "UserAssignedMSI"
    }
    "appId" = {
      value = azurerm_user_assigned_identity.cloudidentity.client_id
    }
    "UMSIName" = {
      value = "cloudidentity"
    }
    "UMSIResourceGroupName" = {
      value = "cloudrg"
    }
    "tenantId" = {
      value = azurerm_user_assigned_identity.cloudidentity.tenant_id
    }
  })
  
  template_content = file("C:\\Users\\Alessia\\Desktop\\DocMentorBot\\CloudProject\\deploymentTemplates\\deployUseExistResourceGroup\\template-AzureBot-with-rg.json")
  depends_on = [azurerm_resource_group_template_deployment.cloudasdeployment]
}

resource "null_resource" "npm_env" {
  provisioner "local-exec" {
    command = "cd C:/Users/Alessia/Desktop/DocMentorBot/CloudProject"
  }
  provisioner "local-exec" {
    command = "az bot update --resource-group cloudrg --name DocMentorBot --endpoint https://cloudas.azurewebsites.net/api/messages"
  }
  provisioner "local-exec" {
    command = "az bot telegram create --resource-group cloudrg --name DocMentorBot --access-token 6054944368:AAErutT3RsFs-uLAYb2YMZcw-u5vls5JEIE --is-validated"
  }
  provisioner "local-exec" {
    command = "npm install"
  }
  # crea.env
  provisioner "local-exec" {
    command = "az bot prepare-deploy --lang Javascript"
  }

  depends_on = [azurerm_resource_group_template_deployment.cloudbotdeployment]
}
/*
resource "null_resource" "finaldeploy" {
  provisioner "local-exec" {
    command = "powershell Compress-Archive -Path . -DestinationPath deploy.zip"
  }
  provisioner "local-exec" {
    command = "az webapp deployment source config-zip --resource-group cloudrg --name cloudas --src deploy.zip"
  }

  depends_on = [null_resource.npm_env]
}
*/



