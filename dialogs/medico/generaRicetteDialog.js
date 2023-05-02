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
            this.allegatoStep.bind(this),
            this.fotoStep.bind(this),
            this.confirmStep.bind(this)
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
            this.nuoviFarmaci4Step.bind(this)
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
        const ricette = []
        for (let i=0; i<query.length; i++) {
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
        // console.log(query.foto[0]);
        //console.log( query);

        if(query.farmaci != undefined) {
            // ha inserito farmaci
            // waterfall dove clicca i farmaci richiesti
            return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: query});
        }
        if(query.foto != undefined) {
            // ha inserito foto
            // waterfall dove inserisce i farmaci
            return await step.next();
        }
        return await step.next();
        // var message="";
        // for (let y = 0; y < query.farmaci.length; y++) {
        //     message +="• "+ String(y) + ': ' + query.farmaci[y] + '\n\n';
        // }
       
        // const reply = { type: ActivityTypes.Message };

        // for (let y = 0; y < query.foto.length; y++){
        // reply.attachments = [this.getInternetAttachment(query.foto[y])];
        // await step.context.sendActivity(reply);        
        // }      
        // await step.context.sendActivity(message);




        // if(step.result.value === "Inserire anche altri") {
        //     paziente = await users.findOne({idutente: step.context.activity.from.id});
        //     var farmaci = paziente.farmaci;
        //     var message = "Ecco la lista dei tuoi farmaci usuali:\n\n";
        //     for (let y = 0; y < farmaci.length; y++)
        //         message += String(y) + ': ' + farmaci[y] + '\n\n';

        //     await step.context.sendActivity(message);

        //     return await step.prompt(CONFIRM_PROMPT, {prompt: 'Vuoi richiedere la ricetta per uno o più di questi farmaci?'});
        // } else if (step.result.value === "Inserire solo foto") {
        //     step.values.skippare = true;
        //     return await step.next();
        // }
    }

    async selezioneFarmaciStep(step) {
        console.log("sono ritornato nel main")
        // if (step.values.skippare == true) {
        //     //await step.context.sendActivity("Ho skippato, sei in selezioneFarmaciStep");
        //     return await step.next();
        // } else {
        //     if (step.result) {
        //         // far scegliere dalla lista
        //         return await step.beginDialog(WATERFALL_DIALOG2);
        //     } else {
        //         // far scrivere i farmaci
        //         return await step.beginDialog(WATERFALL_DIALOG3);
        //     }
        // }
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi allegare una foto di farmaci prescritti dal tuo medico?' });
    }

    async allegatoStep(step) {
        //await step.context.sendActivity("Ho skippato, sei in allegatoStep");
        if(step.values.skippare != true) {
            step.values.farmaciInseriti = step.result;
            console.log(step.values.farmaciInseriti.array + ' ' + step.values.farmaciInseriti.qta);
        }

        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi allegare una foto di farmaci prescritti dal tuo medico?' });
    }
    async fotoStep(step) {
        if (step.result) {
            // allegare foto
            var promptOptions = {
                prompt: 'Carica le foto (o digita qualsiasi messaggio per skippare).',
                retryPrompt: 'La foto deve essere in formato jpeg/png'
            };

            return await step.prompt(ATTACHMENT_PROMPT, promptOptions);
        } else {
            // nessuna foto allegata
            const richiesta = {idpaziente: step.context.activity.from.id, farmaci: step.values.farmaciInseriti.array, qta: step.values.farmaciInseriti.qta}
            richiesteRicette.insertOne(richiesta);

            return await step.endDialog();
        }

    }

    async confirmStep(step) {
        step.values.picture = step.result;
        //await step.context.sendActivity({ attachments: step.values.picture[0]})
        //await step.context.sendActivity(MessageFactory.attachment(step.values["picture"], 'This is your profile picture.'));

        //salvo img nel db
        if (!AZURE_STORAGE_CONNECTION_STRING) {
            throw Error('Azure Storage Connection string not found');
        }
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("images");

        const arrayFoto = [];
        for (let i = 0; i < step.values.picture.length; i++) {
            const blobPath = step.values.picture[i].contentUrl;
            //console.log(blobPath);

            const filename = uuidv1() + ".png";
            //console.log("uuid: " + filename);
            const blockBlobClient = containerClient.getBlockBlobClient(filename);

            //let fileStream = fs.createReadStream(blobPath);
            http.get(blobPath, (stream) => {
                const blobOptions = {
                    blobHTTPHeaders: {
                        blobContentType: 'image/png'
                    }
                };
                blockBlobClient.uploadStream(stream, undefined, undefined, blobOptions);
            });

            var foto = 'https://' + STORAGE_ACCOUNT_NAME + '.blob.core.windows.net/images/' + filename;
            arrayFoto.push(foto);
        }
        console.log(arrayFoto);
        let richiesta;
        if (step.values.skippare == true) {
            //ha inserito solo foto
            richiesta = {idpaziente: step.context.activity.from.id, foto: arrayFoto}
        } else {
            richiesta = {idpaziente: step.context.activity.from.id, farmaci: step.values.farmaciInseriti.array, qta: step.values.farmaciInseriti.qta, foto: arrayFoto}
        }
        richiesteRicette.insertOne(richiesta);

        return await step.endDialog();
    }




    // waterfall 2
    async lista1Step(step) {
        const richiesta = step.options["farmaci"];
        const farmacirimanenti = step.options["farmacirimanenti"];
        if (farmacirimanenti != undefined) {
            step.values.farmaci = farmacirimanenti
            console.log("da option: " + step.values.farmaci.array);
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
            console.log ("sto nell if > 1")
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
            console.log("sto nell else")
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
        console.log("sto in lista3")
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
            console.log("ultimo: " + farmacirimanenti)
            return await step.replaceDialog(WATERFALL_DIALOG2, {farmacirimanenti: farmacirimanenti});
        } else {
            console.log("sto nell end dialog")
            return await step.endDialog();
        }
    }

    // async lista4Step(step) {
    //     const farmaci = step.values.farmaci;
    //     //console.log("ho preso il farmaco: "+ farmaci.array);
    //     if (step.result) {
    //         return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: farmaci});
    //     } else
    //         return await step.endDialog(farmaci);
    // }





    // waterfall 3
    async nuoviFarmaci1Step(step) {
        const res = step.options["farmaci"];
        if (res != undefined) {
            step.values.farmaci = res
            //console.log("da option: " + res.array);
        } else {
            step.values.farmaci = new Support();
        }
        return await step.prompt(NAME_PROMPT, 'Inserisci un nuovo farmaco che vuoi richiedere');
    }

    async nuoviFarmaci2Step(step) {
        if(!step.values.farmaci.array.includes(step.result)) {
            step.values.farmaci.array.push(step.result);
        }
        else
            await step.context.sendActivity(`Attenzione, questo farmaco è già stato inserito`);

        const quantita = ["1", "2", "3", "4", "5", "6"];
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona la quantità: ',
            choices: ChoiceFactory.toChoices(quantita)
        });
    }

    async nuoviFarmaci3Step(step) {
        step.values.farmaci.qta.push(step.result.value);
        var message = "Hai richiesto i seguenti farmaci:\n\n";
        for (let y = 0; y < step.values.farmaci.array.length; y++)
            message += '• ' + step.values.farmaci.array[y] + '; qtà: ' + step.values.farmaci.qta[y] + '\n\n';

        await step.context.sendActivity(message);
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi richiedere un altro farmaco?' });
    }

    async nuoviFarmaci4Step(step) {
        const farmaci = step.values.farmaci;
        //console.log("ho preso il farmaco: "+ farmaci.array);
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG3, {farmaci: farmaci});
        } else
            return await step.endDialog(farmaci);
    }



    async choiceValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            // var attachments = promptContext.recognized.value;
            // var validImages = [];

            // attachments.forEach(attachment => {
            //     if (attachment.contentType === 'image/jpeg' || attachment.contentType === 'image/png') {
            //         validImages.push(attachment);
            //     }
            // });

            // promptContext.recognized.value = validImages;

            // // If none of the attachments are valid images, the retry prompt should be sent.
            // return !!validImages.length;
        } else {
            //await promptContext.context.sendActivity('No attachments received. Proceeding without a profile picture...');

            // We can return true from a validator function even if Recognized.Succeeded is false.
            return await step.endDialog();;
        }
    }

}

async function retPaziente(i) {
    const paziente = await users.findOne({idutente: i.idpaziente}).then(function(data) {
        return data; });
    return paziente;
}

module.exports.generaRicetteDialog = generaRicetteDialog;
module.exports.GENERA_RICETTE_DIALOG = GENERA_RICETTE_DIALOG;
