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
    ListStyle
} = require('botbuilder-dialogs');
//Mongo Configuration
const config = require('../../config');
const { users, slotorari, prenotazioni } = config;
const { Slot } = require('../medico/slot');

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

class richiestaRicettaDialog extends ComponentDialog {
    constructor(userState) {
        super(RICHIESTA_RICETTA_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.choiceStep.bind(this),
            this.farmaciUsualiStep.bind(this),
            this.selezioneFarmaciStep.bind(this),
            this.allegatoStep.bind(this),
            this.fotoStep.bind(this)
        ]));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG2, [
            this.lista1Step.bind(this),
            this.lista2Step.bind(this),
            this.lista3Step.bind(this)
        ]));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG3, [
            this.nuoviFarmaci1Step.bind(this),
            this.nuoviFarmaci2Step.bind(this),
            this.nuoviFarmaci3Step.bind(this)
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
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Vuoi allegare solo una foto di farmaci prescritti dal medico o richiederne anche altri? ',
            choices: ChoiceFactory.toChoices(['Inserire solo foto', 'Inserire anche altri'])
        });
    }

    async farmaciUsualiStep(step) {
        if(step.result.value === "Inserire anche altri") {
            paziente = await users.findOne({idutente: step.context.activity.from.id});
            var farmaci = paziente.farmaci;
            var message = "Ecco la lista dei tuoi farmaci usuali:\n\n";
            for (let y = 0; y < farmaci.length; y++)
                message += String(y) + ': ' + farmaci[y] + '\n\n';

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
        const farmaciInseriti = step.result;
        console.log(farmaciInseriti);

        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi allegare una foto di farmaci prescritti dal tuo medico?' });
    }
    async fotoStep(step) {
        if (step.result) {
            // allegare foto
        } else {
            // endDialog
            // salvare nel db la richiesta
        }

    }




    // waterfall 2
    async lista1Step(step) {
        const res = step.options["farmaci"];
        if (res != undefined) {
            step.values.farmaci = res
            console.log("da option: " + res.orari);
        } else {
            step.values.farmaci = new Slot();
        }
        const farmaciUsuali = paziente.farmaci;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un farmaco: ',
            choices: ChoiceFactory.toChoices(farmaciUsuali),
            style: ListStyle.suggestedAction
        });
    }

    async lista2Step(step) {
        if(!step.values.farmaci.orari.includes(step.result.value))
            step.values.farmaci.orari.push(step.result.value);
        else
            await step.context.sendActivity(`Attenzione, questo farmaco è già stato selezionato`);

        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi inserire un altro farmaco della lista precedente?' });
    }

    async lista3Step(step) {
        const farmaci = step.values.farmaci;
        console.log("ho preso il farmaco: "+ farmaci.orari);
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG2, {farmaci: farmaci});
        } else
            return await step.endDialog(farmaci.orari);
    }





    // waterfall 3
    async nuoviFarmaci1Step(step) {
        const res = step.options["farmaci"];
        if (res != undefined) {
            step.values.farmaci = res
            console.log("da option: " + res.orari);
        } else {
            step.values.farmaci = new Slot();
        }
        return await step.prompt(NAME_PROMPT, 'Inserisci un nuovo farmaco che vuoi richiedere');
    }

    async nuoviFarmaci2Step(step) {
        if(!step.values.farmaci.orari.includes(step.result)) {
            step.values.farmaci.orari.push(step.result);
            var message = "Hai richiesto i seguenti farmaci:\n\n";
            for (let y = 0; y < step.values.farmaci.orari.length; y++)
                message += '• ' + step.values.farmaci.orari[y] + '\n\n';

            await step.context.sendActivity(message);
        }
        else
            await step.context.sendActivity(`Attenzione, questo farmaco è già stato inserito`);

        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi richiedere un altro farmaco?' });
    }

    async nuoviFarmaci3Step(step) {
        const farmaci = step.values.farmaci;
        console.log("ho preso il farmaco: "+ farmaci.orari);
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG3, {farmaci: farmaci});
        } else
            return await step.endDialog(farmaci.orari);
    }

}

module.exports.richiestaRicettaDialog = richiestaRicettaDialog;
module.exports.RICHIESTA_RICETTA_DIALOG = RICHIESTA_RICETTA_DIALOG;
