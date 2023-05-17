# DocMentorBot

![ ](immagini/immagine.png)

## Indice

- [Introduzione](#introduzione)
- [Terraform](#terraform)
- [Prerequisiti](#prerequisiti)
- [Inizializzazione](#inizializzazione)
- [Deploy](#deploy)
- [Architettura](#architettura)

## Introduzione
DocMentor è un bot telegram creato con lo scopo di semplificare il processo di comunicazione tra medico di base e paziente.

Attraverso il bot, i medici possono stabilire gli slot orari per le visite al proprio studio, inserendo giorno e ora a proprio piacimento, mentre i pazienti possono prenotare comodamente le visite allo studio del proprio medico con pochi semplici comandi. Basta selezionare la data e l'ora desiderata e il bot registrerà automaticamente la prenotazione, che sarà visibile al medico. Inoltre, l'app integra Google Maps per fornire indicazioni precise per raggiungere lo studio, eliminando così la possibilità di smarrirsi o arrivare in ritardo.

Uno dei principali vantaggi dell'utilizzo di questo bot è la possibilità di richiedere ricette in modo rapido ed efficiente. I pazienti possono inviare la richiesta tramite il bot, specificando i farmaci tramite la ricerca per nome e/o inserendo foto di ricette speciaistiche. Il medico può quindi elaborarla e inviarla direttamente alla chat del paziente, il quale sarà notificato quando sarà pronta. Questo processo elimina il bisogno di chiamate telefoniche o visite aggiuntive per ottenere una ricetta, risparmiando tempo sia per il medico che per il paziente.

Un altro aspetto principale è l'integrazione con Health Bot, un bot progettato per migliorare l'assistenza sanitaria consentendo ai pazienti di interagire con il sistema sanitario senza la necessità di una presenza fisica. I pazienti possono accedere al bot 24/7, chiedere informazioni mediche, ricevere consigli di salute e altro ancora, ottenendo così consigli medici tempestivi senza la necessità di contattare e attendere il proprio medico.

In sintesi ecco mostrate le funzionalità del bot:

 ### Lato paziente
- Prenotare una visita
- Richiedere un farmaco 
- Inviare foto di ricette specialistiche
- Visualizzare le prescrizioni dei farmaci richiesti
- Chiedere informazioni a HealtBot
- Verificare le informazioni del proprio Medico
- Raggiungere lo studio tramite Google Maps

 ### Lato medico
 - Aggiungere ed eliminare pazienti
 - Stabilire gli orari nei quali si effettuano visite
 - Visualizzare le visite del giorno
 - Creare prescrizioni ed inviarle al paziente

 ### Lato admin
 - Aggiungere ed eliminare medici


## Terraform
![ ](immagini/terraform.png)
Terraform è uno strumento di provisioning e gestione dell'infrastruttura che permette di creare, modificare e gestire l'infrastruttura come codice. 

L'utilizzo di Terraform con Azure presenta diversi vantaggi:

- Automazione dell'infrastruttura: Terraform consente di definire l'infrastruttura come codice, consentendo di automatizzare il provisioning e la gestione delle risorse di Azure. Questo permette di creare, aggiornare e distruggere l'infrastruttura in modo ripetibile e coerente, riducendo gli errori umani e migliorando l'efficienza.

- Gestione dello stato: Terraform tiene traccia dello stato dell'infrastruttura gestita, consentendo di gestire in modo efficace le modifiche all'infrastruttura esistente. 

- Riproducibilità e coerenza: L'approccio di Terraform basato su codice offre la possibilità di definire l'infrastruttura in modo dichiarativo. Ciò significa che l'infrastruttura viene creata in base alla specifica fornita nel codice Terraform, garantendo la coerenza tra gli ambienti e consentendo una riproducibilità affidabile.

- Integrazione con il processo di sviluppo: Terraform può essere integrato nel processo di sviluppo delle applicazioni, consentendo di definire l'infrastruttura come parte del codice sorgente dell'applicazione.


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

- [Mongodb](https://www.mongodb.com/try/download/community) installare mongodb community

- [Mongo Import](https://www.mongodb.com/try/download/database-tools) scaricando "MongoDB Command Line Database Tools Download"
    - inserire mongoimport.exe nella directory di mongodb
    - inserire il path nelle variabili d'ambiente

- [Azure Function Core tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2)


## Inizializzazione

- Clonare la repository 

    ```bash
    git clone https://github.com/alessianatale/CloudProject.git
    ```
- Effettuare il login su azure

    ```bash
    az login
    ```
- Inserire le proprie variabili nel file 'var.tf' ovvero:

    - _subscription_: sottoscrizione di Azure
    - _telegramtoken_: token del bot di Telegram

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
        az webapp deployment source config-zip --resource-group cloudrg --name <nome app service> --src CloudProject.zip
    ```
- La pubblicazione della Azure Function è di seguito illustrata, spostarsi nella cartella /funzioni
   ```bash
        cd funzioni
    ```
    ```bash
        func azure functionapp publish <nome Function App> --nozip
    ```
    
- Collegare HealthBot a telegram nel portale dedicato:
   
   - recarsi sulla risorsa HealthBot su Azure
   - cliccare sul link 'portale di gestione'
   - cliccare _integration_ nella barra laterale a sinistra
   - cliccare _channels_
   - abilitare Telegram, inserire il token del bot (diverso da quello inserito all'interno di var.tf) e cliccare 'create'

## Architettura

![ ](immagini/diagramma.png)

### App Service
L'app service è un servizio per l'hosting di siti e applicazioni web, nel nostro progetto è stato utilizzato per ospitare la risorsa del bot.

### Bot Service
 Azure Bot Service è una risorsa che fornisce un ambiente di sviluppo, distribuzione e gestione dei bot intelligenti. È progettato per semplificare la creazione di bot conversazionali, consentendo agli sviluppatori di concentrarsi sulla logica del bot anziché sulle complessità dell'infrastruttura sottostante.

### Health Bot
Azure Health Bot è un servizio offerto da Microsoft Azure che consente alle organizzazioni del settore sanitario di creare e gestire bot conversazionali intelligenti per la gestione delle cure e la consulenza sanitaria. Il servizio combina l'intelligenza artificiale (AI) con le migliori pratiche cliniche per fornire assistenza virtuale e supporto ai pazienti.

Nel nostro progetto è stato utilizzato per fornire le informazioni mediche quando il medico non è disponibile 

### CLU
La comprensione del linguaggio di conversazione è una delle funzionalità personalizzate offerte dal servizio cognitivo di Azure per la lingua. Si tratta di un servizio API basato sul cloud che applica l'intelligence di Machine Learning per consentire di creare un componente di comprensione del linguaggio naturale da usare in un'applicazione di conversazione end-to-end.

Nel nostro progetto viene utilzzato per capire le intenzioni del paziente per poi mostragli la funzionalità richiesta.

### CosmosDB
Cosmos DB è un servizio di database multi-modello distribuito offerto da Microsoft Azure. È progettato per fornire prestazioni elevate, scalabilità globale e disponibilità elevata per le applicazioni moderne che richiedono un'elaborazione dei dati a livello globale. 

Nel nostro progetto ospita un database MongoDB il quale ci permette di salvare tutti i dati di cui il bot ha bisogno, ovvero le seguenti collection:
- farmaci
- utenti
- slot orari delle visite
- prenotazioni delle visite
- richieste delle ricette

### Azure Function
Azure Functions è un servizio di elaborazione serverless offerto da Microsoft Azure. Si tratta di un framework di calcolo event-driven che consente di scrivere e ospitare piccoli pezzi di codice, chiamati funzioni, senza la necessità di gestire l'infrastruttura sottostante.

Le funzioni Azure sono progettate per rispondere a eventi specifici, come l'arrivo di un nuovo messaggio in una coda, un trigger di un timer programmato o una richiesta HTTP. Ogni volta che si verifica l'evento specificato, la funzione viene eseguita in modo scalabile e automatico.

Nel nostro caso viene avviata una funzione al trigger di un timer, la quale ogni giorno alle 20 aggiorna la collection "slotOrari" rendendo nuovamente disponibili gli slot orari inseriti dal medico.

### Blob Storage
Azure Blob Storage è un servizio di archiviazione scalabile e sicuro offerto da Microsoft Azure. È progettato per archiviare grandi quantità di dati non strutturati, come file di immagini, video, documenti, backup di database e altro ancora. Il termine "blob" si riferisce a "Binary Large Object", ovvero oggetti binari di grandi dimensioni.

Nel nostro caso questa risorsa viene usata per immagazinare le immagini delle ricette inviate dal paziente e i pdf delle prescrizioni create dal medico per il paziente.

Inoltre, grazie a "storage lifecycle management" riusciamo ad eliminare i file dopo 30 giorni dall'ultima modifica senza utilizzare ulteriori servizi, al fine di ridurre lo spazio di archiviazione.

### Api Connection
Azure API Connection è un componente di Microsoft Azure che consente di connettere le applicazioni a servizi esterni o risorse, facilitando l'integrazione e lo scambio di dati tra di essi.

Un'API Connection di Azure fornisce una connessione sicura e configurabile a un servizio o a una risorsa esterna. Questo può includere servizi come Azure Logic Apps.

L'API di Telegram bot è un'interfaccia basata su HTTP che ci permette di collegarci al bot di telegram per poter inviare messaggi nella chat.

### Logic App
Azure Logic App è un servizio di integrazione serverless offerto da Microsoft Azure. Consente di creare flussi di lavoro automatizzati, chiamati logic app, per connettere e orchestrare facilmente i dati, le applicazioni e i servizi tra loro.

Con il flusso di lavoro è stato creato un http trigger in modo che, alla ricezione di una richiesta http viene inviato un messaggio nella chat del bot di telegram tramite l'API Connection. Nello specifico viene effettuata una richiesta http contentente nel body l'id della chat a cui inviare il messaggio e il messaggio stesso; queste informazioni vengono poi passate nell'action per poter inviare il messaggio.

Logic App viene utilizzata per inviare due messaggi di notifica differenti:
- quando il medico riceve le richieste delle ricette
- quando il paziente riceve la prescrizione dal medico
