const { MessageFactory, ActivityHandler, ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');
const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    NumberPrompt,
    ConfirmPrompt,
    DateTimePrompt,
    ListStyle,
    AttachmentPrompt,
} = require('botbuilder-dialogs');

//http request config
const superagent = require('superagent');

//Mongo Configuration
const config = require('../../config');
const { users, richiesteRicette, farmaci } = config;
const { Support } = require('../classes/support');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v1: uuidv1 } = require("uuid");
const path = require('path');
const fs = require('fs');
const http = require('http');
const moment = require('moment')
const { Farmaco } = require('../classes/farmaco');
const { Ricetta } = require('../classes/ricetta');
const generaPDF = require('../pdfGenerator');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;

let paziente;
let idmedico;
let medico;
let qtaricette;
let farmacoVuoto;

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WATERFALL_DIALOG2 = 'WATERFALL_DIALOG2';
const WATERFALL_DIALOG3 = 'WATERFALL_DIALOG3';
const GENERA_RICETTE_DIALOG = 'GENERA_RICETTE_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';

class generaRicetteDialog extends ComponentDialog {
    constructor(userState) {
        super(GENERA_RICETTE_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT), this.choicePromptValidator);
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.choiceStep.bind(this),
            this.farmaciUsualiStep.bind(this),
            this.selezioneFarmaciStep.bind(this),
            this.allegatoStep.bind(this)
        ]));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG2, [
            this.lista1Step.bind(this),
            this.lista2Step.bind(this),
            this.lista3Step.bind(this)
        ]));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG3, [
            this.nuoviFarmaci1Step.bind(this),
            this.nuoviFarmaci2Step.bind(this),
            this.nuoviFarmaci3Step.bind(this),
            this.nuoviFarmaci4Step.bind(this),
            this.nuoviFarmaci5Step.bind(this),
            this.nuoviFarmaci6Step.bind(this),
            this.nuoviFarmaci7Step.bind(this),
            this.nuoviFarmaci8Step.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {

        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async choiceStep(step) {
        farmacoVuoto = new Farmaco(" ", " ", " "," ")
        idmedico = step.context.activity.from.id;
        medico = await users.findOne({idutente: step.context.activity.from.id});
        const query = await ((richiesteRicette.find({idmedico: idmedico})).toArray());
        qtaricette = query.length;
        const ricette = []
        if (qtaricette < 1) {
            await step.context.sendActivity("Non ci sono richieste di ricette");
            return await step.endDialog();
        } else {
            for (let i=0; i<qtaricette; i++) {
                const paziente = await retPaziente(query[i]);
                const val = '['+ String(query[i].id) +'] nome: '+ paziente.nome +'\n cod.fiscale: '+ paziente.codiceFiscale;
                ricette.push(val);
            }
            ricette.push("Torna indietro")

            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Ecco le richieste delle ricette mediche: ',
                choices: ChoiceFactory.toChoices(ricette),
                style: ListStyle.heroCard
            });
        }
    }

    getInternetAttachment(url) {
        const stringa = url;
        const regex = /[^.]+$/; // espressione regolare per selezionare l'ultima parte della stringa dopo l'ultimo "."
        const estensione = stringa.match(regex)[0]; // applica l'espressione regolare alla stringa e seleziona il primo risultato
        

        return {
            contentType: 'image/'+estensione+'',
            contentUrl: url
        };
    }

    async farmaciUsualiStep(step) {
        if (step.result.value == "Torna indietro") {
            return await step.endDialog();
        } else {
            const richiestaRicetta = step.result.value;
            var idRicetta = richiestaRicetta.substring(
                richiestaRicetta.indexOf("[") + 1,
                richiestaRicetta.indexOf("]")
            );
            const query = await richiesteRicette.findOne({id: Number(idRicetta), idmedico: idmedico});
            paziente = await users.findOne({idutente: query.idpaziente});
            step.values.query = query;
            // console.log(query.foto[0]);
            // console.log( query);

            if(query.farmaci != undefined && query.foto == undefined) {
                // ha inserito solo farmaci
                return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: query});
            } else if(query.foto != undefined) {
                // ha inserito foto
                if (query.farmaci != undefined) {
                    // ha inserito anche farmaci
                    step.values.waterfarmaci = true;
                }
                // facciamo visualizzare le foto
                const reply = { type: ActivityTypes.Message };

                for (let y = 0; y < query.foto.length; y++){
                    reply.attachments = [this.getInternetAttachment(query.foto[y])];
                    await step.context.sendActivity(reply);
                }
                return await step.beginDialog(WATERFALL_DIALOG3);
            }
        }
    }

    async selezioneFarmaciStep(step) {
        console.log("sono ritornato nel main - nuovo step")
        if (step.values.waterfarmaci == true) {
            const query = step.values.query;
            await step.context.sendActivity("Ecco i farmaci richiesti da " + paziente.nome);

            return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: query});
        }
        return await step.next();
    }

    async allegatoStep(step) {
        // elimino la richiesta appena vista
        const query = step.values.query;
        var q = {id: query.id, idmedico: idmedico};
        await richiesteRicette.deleteOne(q);
        qtaricette -= 1;
        // rinizio il dialog main se ci sono altre richieste di ricette
        if (qtaricette > 0)
            return await step.beginDialog(this.id);
        else
            return await step.endDialog();
    }




    // waterfall 2
    async lista1Step(step) {
        const richiesta = step.options["farmaci"];
        const farmacirimanenti = step.options["farmacirimanenti"];
        if (farmacirimanenti != undefined) {
            step.values.farmaci = farmacirimanenti
            //console.log("da option: " + step.values.farmaci.array);
        } else {
            step.values.farmaci = new Support();
            step.values.farmaci.array = richiesta.farmaci;
            step.values.farmaci.qta = richiesta.qta;
        }
        var listafarmaci = [];
        step.values.farmacicompleti = [];
        for (let y = 0; y < step.values.farmaci.array.length; y++) {
            var farm = await farmaci.findOne({AIC: step.values.farmaci.array[y]});
            step.values.farmacicompleti.push(farm);
            listafarmaci.push(String("[" + farm.AIC + "] qta: " +step.values.farmaci.qta[y]));
            
            var infofarma = String("\\[" + farm.AIC + "\\] " + farm.Farmaco + "\n Ditta: " + farm.Ditta + "\n " + farm["Confezione di riferimento"] + "\n Quantità: " + step.values.farmaci.qta[y]) ;
            await step.context.sendActivity(infofarma);
        }
        listafarmaci.push("Nessuno")
        console.log("Paziente: "+paziente.nome)
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un farmaco da inserire nella ricetta: \n\noppure seleziona Nessuno se non vuoi inserirne alcuno',
            choices: ChoiceFactory.toChoices(listafarmaci),
            style: ListStyle.suggestedAction
        });
    }

    async lista2Step(step) {
        //console.log(step.values.farmacicompleti)
        if (step.result.value == "Nessuno") {
            return await step.endDialog();
        } else {
            const farmacoselezionato = step.result.value;
            var idFarmacoSelezionato = farmacoselezionato.substring(
                farmacoselezionato.indexOf("[") + 1,
                farmacoselezionato.indexOf("]")
            );
            var qtaFarmacoSelezionato = farmacoselezionato.substring(
                farmacoselezionato.lastIndexOf(":") + 2,
            );
            const farm = step.values.farmacicompleti.find(f => f.AIC == idFarmacoSelezionato);
            //console.log("Il farmaco selezionato è: \n\n"+farm+"\n\n con qta: "+ qtaFarmacoSelezionato);
            // elimino il farmaco appena selezionato
            var index = step.values.farmaci.array.findIndex((el) => el == idFarmacoSelezionato);
                    if (index > -1) {
                        step.values.farmaci.array.splice(index, 1);
                        step.values.farmaci.qta.splice(index, 1);
                    }

            // la ricetta ha il max. numero di quantità (2) oppure non ci sono altri farmaci richiesti con qta = 1
            if(qtaFarmacoSelezionato > 1 || (step.values.farmaci.qta.includes("1") === false)) {
                var farmacoRicetta = new Farmaco(farm.Farmaco, farm["Confezione di riferimento"], qtaFarmacoSelezionato, "--");
                var farmaci = [farmacoRicetta, farmacoVuoto]
                var ricetta = await creaRicetta(paziente, medico, farmaci);
                const filename = uuidv1() + ".pdf";
                await generaPDF(ricetta, filename)
                await updateFarmaciUsuali(farm.AIC)
                await savepdfblob(filename)

                await step.context.sendActivity("Ho generato ricetta...");
                // salvo pdf sul blob e nel paziente - DA FARE

                // controllo se ci sono altri farmaci richiesti rinizio il dialog passando i farmaci richiesti dal paziente senza quello appena inserito nella ricetta
                if (step.values.farmaci.array.length != 0) {
                    const farmacirimanenti = step.values.farmaci;
                    return await step.replaceDialog(WATERFALL_DIALOG2, {farmacirimanenti: farmacirimanenti});
                } else {
                    return await step.endDialog();
                }
            } else {
                // skippo avanti per farne mettere un altro eliminando quelli che hanno qt = 2
                // salvo il primo farmaco inserito
                step.values.farm1 = farm;

                // cerco aic dei farmaci con qta = 1
                var indexes = this.getAllIndexes(step.values.farmaci.qta, "1");
                var listafarmaci = [];
                for(let y=0; y<indexes.length; y++) {
                    var aic1 = step.values.farmaci.array[indexes[y]];
                    const farm = step.values.farmacicompleti.find(f => f.AIC == aic1);

                    listafarmaci.push(String("[" + farm.AIC + "] " ));
            
                    var infofarma = String("\\[" + farm.AIC + "\\] " + farm.Farmaco + "\n Ditta: " + farm.Ditta + "\n " + farm["Confezione di riferimento"] + "\n Quantità: " + step.values.farmaci.qta[indexes[y]]);
                    await step.context.sendActivity(infofarma);

                    
                }
                listafarmaci.push("Nessun altro")

                //console.log(step.values.farmacicompleti)
                return await step.prompt(CHOICE_PROMPT, {
                    prompt: 'Seleziona un secondo farmaco da poter aggiungere alla ricetta: ',
                    choices: ChoiceFactory.toChoices(listafarmaci),
                    style: ListStyle.suggestedAction
                });
            }
        }
    }

    getAllIndexes(arr, val) {
        var indexes = [], i = -1;
        while ((i = arr.indexOf(val, i+1)) != -1){
            indexes.push(i);
        }
        return indexes;
    }

    async lista3Step(step) {
        const farm1 = step.values.farm1;
        if (step.result.value == "Nessun altro") {
            // genero ricetta con un solo farmaco con qta = 1
            var farmacoRicetta = new Farmaco(farm1.Farmaco, farm1["Confezione di riferimento"], "1", "--");
            var farmaci = [farmacoRicetta, farmacoVuoto]
            var ricetta = await creaRicetta(paziente, medico, farmaci);
            const filename = uuidv1() + ".pdf";
            await generaPDF(ricetta, filename);
            await updateFarmaciUsuali(farm1.AIC)
            await savepdfblob(filename)
            await step.context.sendActivity("Ho generato ricetta...");
            // salvo pdf sul blob e nel paziente - DA FARE
        } else {
            // genero ricetta con 2 farmaci con qta = 1
            const farmacoselezionato = step.result.value;
            var idFarmacoSelezionato = farmacoselezionato.substring(
                farmacoselezionato.indexOf("[") + 1,
                farmacoselezionato.indexOf("]")
            );
            const farm2 = step.values.farmacicompleti.find(f => f.AIC == idFarmacoSelezionato);

            var farmacoRicetta1 = new Farmaco(farm1.Farmaco, farm1["Confezione di riferimento"], "1", "--");
            var farmacoRicetta2 = new Farmaco(farm2.Farmaco, farm2["Confezione di riferimento"], "1", "--");
            var farmaci = [farmacoRicetta1, farmacoRicetta2]
            var ricetta = await creaRicetta(paziente, medico, farmaci);
            const filename = uuidv1() + ".pdf";
            await generaPDF(ricetta, filename);
            await updateFarmaciUsuali(farm1.AIC)
            await updateFarmaciUsuali(Number(idFarmacoSelezionato))
            await savepdfblob(filename)
            await step.context.sendActivity("Ho generato ricetta...");
            // salvo pdf sul blob e nel paziente - DA FARE


            // elimino il secondo farmaco dall array
            var index = step.values.farmaci.array.findIndex((el) => el == idFarmacoSelezionato);
                    if (index > -1) {
                        step.values.farmaci.array.splice(index, 1);
                        step.values.farmaci.qta.splice(index, 1);
                    }
        }
        // controllo se ci sono altri farmaci richiesti rinizio il dialog passando i farmaci richiesti dal paziente senza quello appena inserito nella ricetta
        if (step.values.farmaci.array.length != 0) {
            const farmacirimanenti = step.values.farmaci;
            //console.log("ultimo: " + farmacirimanenti)
            return await step.replaceDialog(WATERFALL_DIALOG2, {farmacirimanenti: farmacirimanenti});
        } else {
            return await step.endDialog();
        }
    }





    // waterfall 3
    async nuoviFarmaci1Step(step) {
        step.values.farmaci = new Support();
        return await step.prompt(NAME_PROMPT, 'Inserisci un nuovo farmaco da aggiungere alla ricetta \n\nDigita 0 se non vuoi inserirne alcuno');
    }

    async nuoviFarmaci2Step(step) {
        if (step.result != 0) {
            const farmaciscelti = await farmaci.find({ 'Farmaco' : { '$regex' : step.result, '$options' : 'i' } }).toArray();
            const listafarmaci = farmaciscelti.map(function(i) { return "\\[" + i.AIC + "\\] " + i.Farmaco + "\n Ditta: " + i.Ditta + "\n " + i["Confezione di riferimento"] });

            const listafarmaci2 = farmaciscelti.map(function(i) { return "[" + i.AIC + "] "});

            for (let y = 0; y < listafarmaci.length; y++) {
                await step.context.sendActivity(listafarmaci[y]);
            }

            if(farmaciscelti.length < 1){
                await step.context.sendActivity("Farmaco non trovato");
                return await step.replaceDialog(WATERFALL_DIALOG3);
            }
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Seleziona il farmaco: ',
                choices: ChoiceFactory.toChoices(listafarmaci2),
                style: ListStyle.suggestedAction
            });
        } else {
            return await step.endDialog();
        }
    }

    async nuoviFarmaci3Step(step) {
        const farmacoselezionato = step.result.value;
        var aic = farmacoselezionato.substring(
            farmacoselezionato.indexOf("[") + 1,
            farmacoselezionato.indexOf("]")
        );

            step.values.farmaci.array.push(aic);
            const quantita = ["1", "2"];
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Seleziona la quantità: ',
                choices: ChoiceFactory.toChoices(quantita),
                style: ListStyle.heroCard
            });
    }

    async nuoviFarmaci4Step(step) {
        step.values.farmaci.qta.push(step.result.value);

        // controllo se qta = 2 genero ricetta e chiedo se vuoi reinserire un altro
        if(step.result.value == "2") {
            const farm1 = await farmaci.findOne({AIC: Number(step.values.farmaci.array[0])});
            var farmacoRicetta = new Farmaco(farm1.Farmaco, farm1["Confezione di riferimento"], "2", "--");
            var farmaciric = [farmacoRicetta, farmacoVuoto]
            var ricetta = await creaRicetta(paziente, medico, farmaciric);
            const filename = uuidv1() + ".pdf";
            await generaPDF(ricetta, filename);
            await updateFarmaciUsuali(Number(step.values.farmaci.array[0]))
            await savepdfblob(filename)
            await step.context.sendActivity("Ho generato ricetta...");

            step.values.restart = true;
            return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi generare una nuova ricetta?' });
        } else {
            // altrimenti chiedo se vuoi inserire un altro farmaco
            step.values.anotherfarmaco = true;
            return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi inserire un altro farmaco nella ricetta?' });
        }
    }

    async nuoviFarmaci5Step(step) {
        if (step.values.restart == true) {
            if (step.result)
                return await step.replaceDialog(WATERFALL_DIALOG3);
            else
                return await step.endDialog();
        } else if (step.values.anotherfarmaco == true) {
            if (step.result) {
                // faccio inserire il secondo farmaco
                return await step.prompt(NAME_PROMPT, 'Inserisci un secondo farmaco da aggiungere alla ricetta \n\nNota: il farmaco che selezionerai avrà quantità = 1');
            } else {
                // genero ricetta con un solo farmaco
                const farm1 = await farmaci.findOne({AIC: Number(step.values.farmaci.array[0])});
                const qta1 = step.values.farmaci.qta[0];
                var farmacoRicetta = new Farmaco(farm1.Farmaco, farm1["Confezione di riferimento"], qta1, "--");
                var farmaciric = [farmacoRicetta, farmacoVuoto]
                var ricetta = await creaRicetta(paziente, medico, farmaciric);
                const filename = uuidv1() + ".pdf";
                await generaPDF(ricetta, filename);
                await updateFarmaciUsuali(Number(step.values.farmaci.array[0]))
                await savepdfblob(filename)
                await step.context.sendActivity("Ho generato ricetta...");

                step.values.restart = true;
                return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi generare una nuova ricetta?' });
            }
        }
    }

    async nuoviFarmaci6Step(step) {
        if (step.values.restart == true) {
            if (step.result)
                return await step.replaceDialog(WATERFALL_DIALOG3);
            else
                return await step.endDialog();
        } else {
            const farmaciscelti = await farmaci.find({ 'Farmaco' : { '$regex' : step.result, '$options' : 'i' } }).toArray();
            const listafarmaci = farmaciscelti.map(function(i) { return "\\[" + i.AIC + "\\] " + i.Farmaco + "\n Ditta: " + i.Ditta + "\n " + i["Confezione di riferimento"] });

            const listafarmaci2 = farmaciscelti.map(function(i) { return "[" + i.AIC + "] "});

            for (let y = 0; y < listafarmaci.length; y++) {
                await step.context.sendActivity(listafarmaci[y]);
            }

            if(farmaciscelti.length < 1){
                await step.context.sendActivity("Farmaco non trovato");
                return await step.replaceDialog(WATERFALL_DIALOG3);
            }
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Seleziona il farmaco: ',
                choices: ChoiceFactory.toChoices(listafarmaci2),
                style: ListStyle.suggestedAction
            });
        }
    }

    async nuoviFarmaci7Step(step) {
        const farmacoselezionato = step.result.value;
        var aic = farmacoselezionato.substring(
            farmacoselezionato.indexOf("[") + 1,
            farmacoselezionato.indexOf("]")
        );

        step.values.farmaci.array.push(aic);
        // genero ricetta con 2 farmaci con qta = 1
        const farm1 = await farmaci.findOne({AIC: Number(step.values.farmaci.array[0])});
        const farm2 = await farmaci.findOne({AIC: Number(step.values.farmaci.array[1])});
        var farmacoRicetta1 = new Farmaco(farm1.Farmaco, farm1["Confezione di riferimento"], "1", "--");
        var farmacoRicetta2 = new Farmaco(farm2.Farmaco, farm2["Confezione di riferimento"], "1", "--");
        var farmaciric = [farmacoRicetta1, farmacoRicetta2]
        var ricetta = await creaRicetta(paziente, medico, farmaciric);
        const filename = uuidv1() + ".pdf";
        await generaPDF(ricetta, filename);
        await updateFarmaciUsuali(Number(step.values.farmaci.array[0]))
        await updateFarmaciUsuali(Number(step.values.farmaci.array[1]))
        await savepdfblob(filename)

        await step.context.sendActivity("Ho generato ricetta...");


        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi generare una nuova ricetta?' });
    }

    async nuoviFarmaci8Step(step) {
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG3);
        } else
            return await step.endDialog();
    }

}

async function retPaziente(i) {
    const paziente = await users.findOne({idutente: i.idpaziente}).then(function(data) {
        return data; });
    return paziente;
}

async function updateFarmaciUsuali(aic) {
    // forse meglio prendersi di nuovo l oggetto paziente per vedere se farmaci è stato aggiornato
    const aicpaziente = paziente.farmaci;
    if (!aicpaziente.includes(aic)) {
        console.log("non c'è aic - lo aggiungo")
        paziente = await users.findOneAndUpdate(
            { idutente: paziente.idutente },
            { $push: { farmaci: aic } },
            { returnNewDocument: true }
        ).then(function(data) {
            return data.value;
        });
    }
}
async function sendRequest(data) {
    try {
       const res = await superagent.post(process.env.CallbackUrl).send(data);

     } catch (err) {
       console.error(err);
     }
   }

async function creaRicetta(paziente, medico, farmaci) {
    var timeStamp = moment();
    timeStamp.locale('it');
    var data = timeStamp.format("DD/MM/YYYY");
    const ricetta = new Ricetta(paziente.nome, paziente.dataNascita, paziente.citta, paziente.indirizzo, paziente.codiceFiscale, farmaci, medico.nome, medico.codiceFiscale, data, paziente.esenzione)
    return ricetta;
}

async function savepdfblob(filename) {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
        throw Error('Azure Storage Connection string not found');
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("pdf");

    // prendo il pdf salvato
    const filePath = "./filepdf/"+filename;

    const blockBlobClient = containerClient.getBlockBlobClient(filename);
                const blobOptions = {
                    blobHTTPHeaders: {
                        blobContentType: 'application/octetstream'
                    }
                };
    await blockBlobClient.uploadFile(filePath, blobOptions);

    var pdf = 'https://' + STORAGE_ACCOUNT_NAME + '.blob.core.windows.net/pdf/' + filename;

    // elimino il pdf in locale
    await fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err)
            return
        }
    })

    // aggiungo l'url del pdf tra i pdf del paziente
    paziente = await users.findOneAndUpdate(
        { idutente: paziente.idutente },
        { $push: { pdf: pdf } },
        { returnNewDocument: true }
    ).then(function(data) {
        return data.value;
    });



      //richiesta http vesro logicapp
    const data = {
        Id:Number(paziente.idutente),
        Message: "La tua prescrizione è pronta!, Vai nella sezione \'le mie prescrizioni\' per visionarla."
    }


     await sendRequest(data)

}

module.exports.generaRicetteDialog = generaRicetteDialog;
module.exports.GENERA_RICETTE_DIALOG = GENERA_RICETTE_DIALOG;
