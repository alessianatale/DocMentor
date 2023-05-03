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
//Mongo Configuration
const config = require('../../config');
const { users, richiesteRicette, farmaci } = config;
const { Support } = require('../support');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v1: uuidv1 } = require("uuid");
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Farmaco } = require('../farmaco');
const { Ricetta } = require('../ricetta');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;

let paziente;
let idmedico;
let medico;
let qtaricette;

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
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT), this.choiceValidator);
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
        idmedico = step.context.activity.from.id;
        medico = await users.findOne({idutente: step.context.activity.from.id});
        const query = await ((richiesteRicette.find({idmedico: idmedico})).toArray());
        qtaricette = query.length;
        const ricette = []
        for (let i=0; i<qtaricette; i++) {
            const paziente = await retPaziente(query[i]);
            const val = '['+ String(query[i].id) +'] nome: '+ paziente.nome +'\n cod.fiscale: '+ paziente.codiceFiscale;
            //console.log(val);
            ricette.push(val);
        }
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Ecco le ricette mediche: ',
            choices: ChoiceFactory.toChoices(ricette),
            style: ListStyle.heroCard
        });
    }
    
    getInternetAttachment(url) {
        return {
            contentType: 'image/png',
            contentUrl: url
        };
    }

    async farmaciUsualiStep(step) {
        const richiestaRicetta = step.result.value;
        var idRicetta = richiestaRicetta.substring(
            richiestaRicetta.indexOf("[") + 1, 
            richiestaRicetta.indexOf("]")
        );   
        const query = await richiesteRicette.findOne({id: Number(idRicetta), idmedico: idmedico});
        paziente = await users.findOne({idutente: query.idpaziente});
        step.values.query = query;
        // console.log(query.foto[0]);
        //console.log( query);

        if(query.farmaci != undefined && query.foto == undefined) {
            // ha inserito solo farmaci
            return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: query});
        }
        if(query.foto != undefined) {
            // ha inserito foto
            //await step.context.sendActivity("");
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
        return await step.next();
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
            listafarmaci.push(String("[" + farm.AIC + "] " + farm.Farmaco + "\n Ditta: " + farm.Ditta + "\n " + farm["Confezione di riferimento"] + "\n Quantità: " + step.values.farmaci.qta[y]));
        }
        console.log("Paziente: "+paziente.nome)
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un farmaco da inserire nella ricetta: ',
            choices: ChoiceFactory.toChoices(listafarmaci),
            style: ListStyle.heroCard
        });
    }

    async lista2Step(step) {
        //console.log(step.values.farmacicompleti)
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
            //console.log ("sto nell if > 1")
            var farmacoRicetta = new Farmaco(farm.Farmaco, farm["Confezione di riferimento"], qtaFarmacoSelezionato, "--")
            var ricetta = new Ricetta();
            await step.context.sendActivity("Ho generato ricetta...");
            // genero ricetta - DA FARE

            // controllo se ci sono altri farmaci richiesti rinizio il dialog passando i farmaci richiesti dal paziente senza quello appena inserito nella ricetta
            if (step.values.farmaci.array.length != 0) {
                const farmacirimanenti = step.values.farmaci;
                return await step.replaceDialog(WATERFALL_DIALOG2, {farmacirimanenti: farmacirimanenti});
            } else {
                return await step.endDialog();
            }
        } else {
            // skippo avanti per farne mettere un altro eliminando quelli che hanno qt = 2
            //console.log("sto nell else")
            // salvo il primo farmaco inserito
            step.values.farm1 = farm;
            
            // cerco aic dei farmaci con qta = 1
            var indexes = this.getAllIndexes(step.values.farmaci.qta, "1");
            var listafarmaci = [];
            for(let y=0; y<indexes.length; y++) {
                var aic1 = step.values.farmaci.array[indexes[y]];
                const farm = step.values.farmacicompleti.find(f => f.AIC == aic1);
                listafarmaci.push(String("[" + farm.AIC + "] " + farm.Farmaco + "\n Ditta: " + farm.Ditta + "\n " + farm["Confezione di riferimento"] + "\n Quantità: " + step.values.farmaci.qta[indexes[y]]));
            }
            
            //console.log(step.values.farmacicompleti)
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Seleziona un secondo farmaco da poter aggiungere alla ricetta: ',
                choices: ChoiceFactory.toChoices(listafarmaci),
                style: ListStyle.heroCard
            });
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
        console.log(step.result.value)
        const farmacoselezionato = step.result.value;
        var idFarmacoSelezionato = farmacoselezionato.substring(
            farmacoselezionato.indexOf("[") + 1, 
            farmacoselezionato.indexOf("]")
        );
        const farm2 = step.values.farmacicompleti.find(f => f.AIC == idFarmacoSelezionato);
        const farm1 = step.values.farm1;
        await step.context.sendActivity("Ho generato ricetta...");
        // creo ricetta - DA FARE

        // elimino il secondo farmaco dall array
        var index = step.values.farmaci.array.findIndex((el) => el == idFarmacoSelezionato);
                if (index > -1) {
                    step.values.farmaci.array.splice(index, 1);
                    step.values.farmaci.qta.splice(index, 1);
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
        return await step.prompt(NAME_PROMPT, 'Inserisci un nuovo farmaco che vuoi richiedere');
    }

    async nuoviFarmaci2Step(step) {
        const farmaciscelti = await farmaci.find({ 'Farmaco' : { '$regex' : step.result, '$options' : 'i' } }).toArray();
        const listafarmaci = farmaciscelti.map(function(i) { return "[" + i.AIC + "] " + i.Farmaco + "\n Ditta: " + i.Ditta + "\n " + i["Confezione di riferimento"] });

        if(farmaciscelti.length < 1){
            await step.context.sendActivity("Farmaco non trovato!");
            return await step.replaceDialog(WATERFALL_DIALOG3);
        }
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona il farmaco: ',
            choices: ChoiceFactory.toChoices(listafarmaci),
            style: ListStyle.heroCard
        });
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
            // genero ricetta - DA FARE
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
                // genero ricetta con un solo farmaco - DA FARE
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
            const listafarmaci = farmaciscelti.map(function(i) { return "[" + i.AIC + "] " + i.Farmaco + "\n Ditta: " + i.Ditta + "\n " + i["Confezione di riferimento"] });

            if(farmaciscelti.length < 1){
                await step.context.sendActivity("Farmaco non trovato!");
                return await step.replaceDialog(WATERFALL_DIALOG3);
            }
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Seleziona il farmaco: ',
                choices: ChoiceFactory.toChoices(listafarmaci),
                style: ListStyle.heroCard
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
        // genero ricetta - DA FARE
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

module.exports.generaRicetteDialog = generaRicetteDialog;
module.exports.GENERA_RICETTE_DIALOG = GENERA_RICETTE_DIALOG;
