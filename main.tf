# We strongly recommend using the required_providers block to set the
# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.48.0"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }

  }
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
      value = "DocMentorBot2"
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

resource "random_integer" "ri" {
  min = 10000
  max = 99999
}

resource "azurerm_cosmosdb_account" "cosmodbaccount" {
  name                = "cosmodbaccount-${random_integer.ri.result}"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  #enable_automatic_failover = true

  capabilities {
    name = "EnableAggregationPipeline"
  }

  capabilities {
    name = "mongoEnableDocLevelTTL"
  }

  # capabilities {
  #   name = "MongoDBv3.4"
  # }

  capabilities {
    name = "EnableMongo"
  }

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  # geo_location {
  #   location          = "West Europe"
  #   failover_priority = 1
  # }


  geo_location {
    location          = "north Europe"
    failover_priority = 0
  }

  mongo_server_version = "4.0"
  enable_free_tier = true
  depends_on = [azurerm_resource_group_template_deployment.cloudbotdeployment]
}

data "azurerm_cosmosdb_account" "cosmodbaccount" {
  name                = "cosmodbaccount-${random_integer.ri.result}"
  resource_group_name = azurerm_resource_group.cloudrg.name
  depends_on = [azurerm_cosmosdb_account.cosmodbaccount]
}

resource "azurerm_cosmosdb_mongo_database" "mongodatabase" {
  name                = "mongodatabase"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  depends_on = [data.azurerm_cosmosdb_account.cosmodbaccount]
}

resource "azurerm_cosmosdb_mongo_collection" "userscollection" {
  name                = "users"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  default_ttl_seconds = "777"
  //shard_key           = "uniqueKey"
  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "slotorariscollection" {
  name                = "slotorari"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  default_ttl_seconds = "777"
  //shard_key           = "uniqueKey"
  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "prenotazioniscollection" {
  name                = "prenotazioni"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  default_ttl_seconds = "777"
  //shard_key           = "uniqueKey"
  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "richiestericettecollection" {
  name                = "richiesteRicette"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  default_ttl_seconds = "777"
  //shard_key           = "uniqueKey"
  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "null_resource" "npm_env" {
  provisioner "local-exec" {
    command = "az bot update --resource-group cloudrg --name DocMentorBot2 --endpoint https://cloudas.azurewebsites.net/api/messages"
  }
  provisioner "local-exec" {
    command = "az bot telegram create --resource-group cloudrg --name DocMentorBot2 --access-token 6296149829:AAGL93aAdMIpTrLgtJJjDAT1ihi5riGtGMw --is-validated"
    //command = "az bot telegram create --resource-group cloudrg --name DocMentorBot2 --access-token 6054944368:AAErutT3RsFs-uLAYb2YMZcw-u5vls5JEIE --is-validated"
  }
  provisioner "local-exec" {
    command = "npm install"
  }
  # crea.env
  provisioner "local-exec" {
    command = "az bot prepare-deploy --lang Javascript"
  }

  depends_on = [azurerm_cosmosdb_mongo_collection.richiestericettecollection]
}

/*resource "null_resource" "finaldeploy" {
  provisioner "local-exec" {
    command = "powershell Compress-Archive -Path . -DestinationPath deploy.zip"
  }
  provisioner "local-exec" {
    command = "az webapp deployment source config-zip --resource-group cloudrg --name cloudas --src CloudProject.zip"
  }
  provisioner "local-exec" {
    command = " func azure functionapp publish functionapp24157 --nozip"
  }

  depends_on = [null_resource.npm_env]
}*/





