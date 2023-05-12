# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.48.0"
    }
    azapi = {
      source = "Azure/azapi"
    }
  }
}

provider "azapi" {
}
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    cognitive_account {
      purge_soft_delete_on_destroy = true
    }
  }
}

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

# App Service
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

  template_content = file(".\\deploymentTemplates\\deployUseExistResourceGroup\\template-BotApp-with-rg.json")
  depends_on = [azurerm_user_assigned_identity.cloudidentity]
}

output "MicrosoftAppId" {
  value = azurerm_user_assigned_identity.cloudidentity.client_id
}
output "MicrosoftAppTenantId" {
  value = azurerm_user_assigned_identity.cloudidentity.tenant_id
}

# Azure Bot 
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

  template_content = file(".\\deploymentTemplates\\deployUseExistResourceGroup\\template-AzureBot-with-rg.json")
  depends_on = [azurerm_resource_group_template_deployment.cloudasdeployment]
}

resource "random_integer" "ri" {
  min = 10000
  max = 99999
}


# CosmoDB per MongoDB
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
  capabilities {
    name = "EnableMongo"
  }
  capabilities {
    name = "DisableRateLimitingResponses"
  }

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }
  geo_location {
    location          = "north Europe"
    failover_priority = 0
  }
  mongo_server_version = "4.0"
  enable_free_tier = true
  //depends_on = [azurerm_resource_group_template_deployment.cloudbotdeployment]
}

data "azurerm_cosmosdb_account" "cosmodbaccount" {
  name                = "cosmodbaccount-${random_integer.ri.result}"
  resource_group_name = azurerm_resource_group.cloudrg.name
  depends_on = [azurerm_cosmosdb_account.cosmodbaccount]
}

output "COSMOS_CONNECTION_STRING" {
  value       = azurerm_cosmosdb_account.cosmodbaccount.connection_strings[0]
  sensitive = true
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

  //default_ttl_seconds = "777"
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

  //default_ttl_seconds = "777"
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

  //default_ttl_seconds = "777"
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

  //default_ttl_seconds = "777"
  //shard_key           = "uniqueKey"
  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "farmacicollection" {
  name                = "farmaci"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  //default_ttl_seconds = "777"
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
    //command = "az bot telegram create --resource-group cloudrg --name DocMentorBot2 --access-token 6296149829:AAGL93aAdMIpTrLgtJJjDAT1ihi5riGtGMw --is-validated"
    command = "az bot telegram create --resource-group cloudrg --name DocMentorBot2 --access-token ${var.telegramtoken} --is-validated"
  }
  provisioner "local-exec" {
    command = "npm install"
  }
  # crea.env
  provisioner "local-exec" {
    command = "az bot prepare-deploy --lang Javascript"
  }
  depends_on = [azurerm_cosmosdb_mongo_collection.farmacicollection]
}


# installare mongodb community: https://www.mongodb.com/try/download/community
# installare database tools: https://www.mongodb.com/try/download/database-tools
# inserire mongoimport.exe nella directory di mongodb
# inserire il path nelle variabili d'ambiente
// speramm che la porta è sempre 10255
resource "null_resource" "uploadfarmaci" {
  provisioner "local-exec" {
    command = "mongoimport -h ${azurerm_cosmosdb_account.cosmodbaccount.name}.mongo.cosmos.azure.com:10255 -d mongodatabase -c farmaci -u ${azurerm_cosmosdb_account.cosmodbaccount.name} -p ${nonsensitive(azurerm_cosmosdb_account.cosmodbaccount.primary_key)} --ssl --jsonArray --writeConcern=\"{w:0}\" --file ./utils/farmaci.json --quiet"
  }
  depends_on = [azurerm_cosmosdb_mongo_collection.farmacicollection]
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

  terraform output > file.txt
  terraform output -json > env.json
  
  mongoimport -h cosmodbaccount-73543.mongo.cosmos.azure.com:10255 -d mongodatabase -c farmaci -u cosmodbaccount-73543 -p EcL1zA0d82UCUsDRs71cESOUHSbTnRfzkjgsbk4koVLL1g16sNtStieY7x9cszpLGTJWCQkX3MbiACDbOGepsg== --ssl --jsonArray --writeConcern="{w:0}" --file farmaci.json --quiet
}*/





