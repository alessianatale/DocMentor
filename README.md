# DocMentorBot

![ ](immagini/immagine1.png)

Lo scopo di questo bot è quello di fornire un'esperienza diversa e semplificata di quella che è la comunicazione tra medico e paziente, il bot permette di:
 #### Lato paziente
- Prenotare una visita
- Richiedere un farmaco 
- Visualizzare le prescrizioni dei farmaci richiesti
- Chiedere informazioni a HealtBot
- Verificare le informazioni del proprio Medico
- Inviare foto di ricette specialistiche
 ### Lato medico
 - Aggiungere pazienti
 - Eliminare pazienti
 - Stabilire gli orari nei quali si effettuano visite
 - Gestire le richieste di ricette
 - Gestire le visite del giorno
 - Creare prescrizioni ed inviarle al paziente 
 - Possibile selezionare farmaci da una lista esaustiva 

 ### Lato admin
 - Aggiunta e rimozione medici




## Prerequisiti

- [Node.js](https://nodejs.org) versione 10.14 o superiore

    ```bash
    # determina la versione di node
    node --version
    ```
- [Terraform](https://developer.hashicorp.com/terraform/downloads) questo progetto utilizza terraform per la gestione delle risorse la verisone consigliata è Terraform v1.3.9

    ```bash
    # determina la versione di terraform
    terraform version
    ```
- [Azure account](https://azure.microsoft.com/free/?WT.mc_id=A261C142F)    

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) la versione consigliata è 2.39.0 o successive


## Inizializzazione

- Clonare la repository

    ```bash
    git clone https://github.com/alessianatale/CloudProject.git
    ```

- Installare i moduli

    ```bash
    npm install
    ```
- Effettuare il login su azure

    ```bash
    az login
    ```
- Inizializzare Terraform

    ```bash
    terraform init
    ```
- Avviare Terraform

    ```bash
    terraform apply
    ```
-  Grazie all'utilizzo di terraform la creazione e gestione delle risorse è resa estremamente efficente, inoltre dopo l'esecuzione del comando seguente le varie varibili necessarie al funzionamento del bot saranno automaticamente inserite nel file .env


    ```bash
    npm start
    ```

## Deploy

- Per pubblicare il bot eseguire il seguente comando solo dopo aver creato lo zip (CloudProject.zip) di tutti i file ad esclusione della cartella "funzioni"

    ```bash
        command = "az webapp deployment source config-zip --resource-group cloudrg --name cloudas --src CloudProject.zip
    ```
- La pubblicazione della Azure Function è di seguito illustrata, spostarsi nella cartella /funzioni
   ```bash
        cd funzioni
    ```
    ```bash
        func azure functionapp publish <nome della FunctionApp> --nozip
    ```
    

## Testing the bot using Bot Framework Emulator

[Bot Framework Emulator](https://github.com/microsoft/botframework-emulator) is a desktop application that allows bot developers to test and debug their bots on localhost or running remotely through a tunnel.

- Install the latest Bot Framework Emulator from [here](https://github.com/Microsoft/BotFramework-Emulator/releases)

### Connect to the bot using Bot Framework Emulator

- Launch Bot Framework Emulator
- File -> Open Bot
- Enter a Bot URL of `http://localhost:3978/api/messages`

## Interacting with the bot

The primary goal when creating any bot is to engage your user in a meaningful conversation. One of the best ways to achieve this goal is to ensure that from the moment a user first connects, they understand your bot’s main purpose and capabilities, the reason your bot was created. See [Send welcome message to users](https://aka.ms/botframework-welcome-instructions) for additional information on how a bot can welcome users to a conversation.

## Deploy the bot to Azure

To learn more about deploying a bot to Azure, see [Deploy your bot to Azure](https://aka.ms/azuredeployment) for a complete list of deployment instructions.

## Further reading

- [Bot Framework Documentation](https://docs.botframework.com)
- [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
- [Activity processing](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-activity-processing?view=azure-bot-service-4.0)
- [Azure Bot Service Introduction](https://docs.microsoft.com/azure/bot-service/bot-service-overview-introduction?view=azure-bot-service-4.0)
- [Azure Bot Service Documentation](https://docs.microsoft.com/azure/bot-service/?view=azure-bot-service-4.0)
- [Azure CLI](https://docs.microsoft.com/cli/azure/?view=azure-cli-latest)
- [Azure Portal](https://portal.azure.com)
- [Channels and Bot Connector Service](https://docs.microsoft.com/en-us/azure/bot-service/bot-concepts?view=azure-bot-service-4.0)
- [Restify](https://www.npmjs.com/package/restify)
- [dotenv](https://www.npmjs.com/package/dotenv)
