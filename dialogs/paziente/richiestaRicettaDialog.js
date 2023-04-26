const { MessageFactory } = require('botbuilder');
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
    AttachmentPrompt
} = require('botbuilder-dialogs');
//Mongo Configuration
const config = require('../../config');
const { users, richiesteRicette } = config;
const { Support } = require('../support');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v1: uuidv1 } = require("uuid");
const fs = require('fs');
const http = require('http');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;

let paziente;
let idmedico;

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WATERFALL_DIALOG2 = 'WATERFALL_DIALOG2';
const WATERFALL_DIALOG3 = 'WATERFALL_DIALOG3';
const RICHIESTA_RICETTA_DIALOG = 'RICHIESTA_RICETTA_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';

class richiestaRicettaDialog extends ComponentDialog {
    constructor(userState) {
        super(RICHIESTA_RICETTA_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
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
            this.lista3Step.bind(this),
            this.lista4Step.bind(this)
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
        paziente = await users.findOne({idutente: step.context.activity.from.id});
        await step.context.sendActivity(`Ciao ${paziente.nome}, per richiedere la ricetta medica di farmaci ti ricordiamo che puoi inserire farmaci sia manualmente, scegliendo da una lista di farmaci che solitamente richiedi o inserendo nuovi farmaci, sia inviando una o più foto di farmaci prescritti dal tuo medico!`);
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Vuoi allegare solo una foto di farmaci prescritti dal medico o richiederne anche altri?',
            choices: ChoiceFactory.toChoices(['Inserire solo foto', 'Inserire anche altri manualmente']),
            style: ListStyle.suggestedAction
        });
    }

    async farmaciUsualiStep(step) {
        if(step.result.value === "Inserire anche altri manualmente") {
            //paziente = await users.findOne({idutente: step.context.activity.from.id});
            var farmaci = paziente.farmaci;
            var message = "Ecco la lista dei tuoi farmaci usuali:\n\n";
            for (let y = 0; y < farmaci.length; y++)
                message += '• ' + farmaci[y] + '\n\n';

            await step.context.sendActivity(message);

            return await step.prompt(CONFIRM_PROMPT, {prompt: 'Vuoi richiedere la ricetta per uno o più di questi farmaci?'});
        } else if (step.result.value === "Inserire solo foto") {
            step.values.skippare = true;
            return await step.next();
        }
    }

    async selezioneFarmaciStep(step) {
        if (step.values.skippare == true) {
            //await step.context.sendActivity("Ho skippato, sei in selezioneFarmaciStep");
            return await step.next();
        } else {
            if (step.result) {
                // far scegliere dalla lista
                return await step.beginDialog(WATERFALL_DIALOG2);
            } else {
                // far scrivere i farmaci
                return await step.beginDialog(WATERFALL_DIALOG3);
            }
        }
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
            var newid = await getNextSequence(paziente.idmedico);

            const richiesta = {id: newid, idpaziente: paziente.idutente, farmaci: step.values.farmaciInseriti.array, qta: step.values.farmaciInseriti.qta, idmedico: paziente.idmedico}
            richiesteRicette.insertOne(richiesta);
            await step.context.sendActivity(`Richiesta inviata con successo!`);

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
        if(step.values.picture != undefined) {
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
        }
        let richiesta;
        var newid = await getNextSequence(paziente.idmedico);
        if (step.values.skippare == true) {
            //ha inserito solo foto
            richiesta = {id: newid, idpaziente: paziente.idutente, foto: arrayFoto, idmedico: paziente.idmedico}
        } else {
            richiesta = {id: newid, idpaziente: paziente.idutente, farmaci: step.values.farmaciInseriti.array, qta: step.values.farmaciInseriti.qta, foto: arrayFoto, idmedico: paziente.idmedico}
        }
        richiesteRicette.insertOne(richiesta);
        await step.context.sendActivity(`Richiesta inviata con successo!`);

        return await step.endDialog();
    }




    // waterfall 2
    async lista1Step(step) {
        const res = step.options["farmaci"];
        if (res != undefined) {
            step.values.farmaci = res
            //console.log("da option: " + res.array);
        } else {
            step.values.farmaci = new Support();
        }
        //style: ListStyle.suggestedAction
        const farmaciUsuali = paziente.farmaci;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un farmaco: ',
            choices: ChoiceFactory.toChoices(farmaciUsuali),
            style: ListStyle.heroCard
        });
    }

    async lista2Step(step) {
        if(!step.values.farmaci.array.includes(step.result.value))
            step.values.farmaci.array.push(step.result.value);
        else
            await step.context.sendActivity(`Attenzione, questo farmaco è già stato selezionato`);

        const quantita = ["1", "2", "3", "4", "5", "6"];
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona la quantità: ',
            choices: ChoiceFactory.toChoices(quantita),
            style: ListStyle.heroCard
        });
    }

    async lista3Step(step) {
        step.values.farmaci.qta.push(step.result.value);
        var message = "Hai richiesto i seguenti farmaci:\n\n";
        for (let y = 0; y < step.values.farmaci.array.length; y++)
            message += '• ' + step.values.farmaci.array[y] + ', qtà: ' + step.values.farmaci.qta[y] + '\n\n';

        await step.context.sendActivity(message);
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi inserire un altro farmaco della lista precedente?' });
    }

    async lista4Step(step) {
        const farmaci = step.values.farmaci;
        //console.log("ho preso il farmaco: "+ farmaci.array);
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: farmaci});
        } else
            return await step.endDialog(farmaci);
    }





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
            choices: ChoiceFactory.toChoices(quantita),
            style: ListStyle.heroCard
        });
    }

    async nuoviFarmaci3Step(step) {
        step.values.farmaci.qta.push(step.result.value);
        var message = "Hai richiesto i seguenti farmaci:\n\n";
        for (let y = 0; y < step.values.farmaci.array.length; y++)
            message += '• ' + step.values.farmaci.array[y] + ', qtà: ' + step.values.farmaci.qta[y] + '\n\n';

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



    async picturePromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var attachments = promptContext.recognized.value;
            var validImages = [];

            attachments.forEach(attachment => {
                if (attachment.contentType === 'image/jpeg' || attachment.contentType === 'image/png') {
                    validImages.push(attachment);
                }
            });

            promptContext.recognized.value = validImages;

            // If none of the attachments are valid images, the retry prompt should be sent.
            return !!validImages.length;
        } else {
            await promptContext.context.sendActivity('Nessuna foto inserita.');

            // We can return true from a validator function even if Recognized.Succeeded is false.
            return true;
        }
    }

}

async function getNextSequence(name) {
    var res = await users.findOneAndUpdate(
        { idutente: name },
        { $inc: { counter: 1 } },
        { returnNewDocument: true }
    ).then(function(data) {
        return data.value.counter + 1;
    });
    return res;
}

module.exports.richiestaRicettaDialog = richiestaRicettaDialog;
module.exports.RICHIESTA_RICETTA_DIALOG = RICHIESTA_RICETTA_DIALOG;
