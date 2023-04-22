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
const { users, slotorari } = config;
const { Support } = require('../support');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG1 = 'WATERFALL_DIALOG1';
const WATERFALL_DIALOG2 = 'WATERFALL_DIALOG2';
const MEDICO_SLOTORARI_DIALOG = 'MEDICO_SLOTORARI_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';

let idmedico;

class medicoSlotOrariDialog extends ComponentDialog {
    constructor(userState) {
        super(MEDICO_SLOTORARI_DIALOG);
        this.userState = userState;
        //this.slotAccessor = userState.createProperty(SLOT_PROPERTY);

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG1, [
            this.giornoStep.bind(this),
            this.redirectOrariStep.bind(this),
            this.prendiOrariStep.bind(this),
            this.loopGiornoStep.bind(this)
        ]));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG2, [
            this.orarioStep.bind(this),
            this.firstOrarioStep.bind(this),
            this.waitingOrarioStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG1;
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

    async giornoStep(step) {
        const slots = await slotorari.find({idmedico: idmedico }).toArray();
        if (slots.length != 0) {
            const giorni = slots.map(function(i) { return i.giorno + " ora: " + i.orari });
            var message = "Ecco i tuoi slot:\n\n";
            for (let y = 0; y < slots.length; y++)
                message += '• ' + giorni[y] + '\n\n';

            await step.context.sendActivity(message);
        }
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un giorno di visita: ',
            choices: ChoiceFactory.toChoices(['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']),
            style: ListStyle.heroCard
        });
    }

    async redirectOrariStep(step) {
        step.values.giorno = step.result.value;
        return await step.beginDialog(WATERFALL_DIALOG2);
    }

    async prendiOrariStep(step) {
        // mi prendo i valore che ho passato all'end dialog dell'altro waterfall
        const orari = step.result;
        //console.log(array);

        // salvo nel db il giorno e gli array insieme a idmedico
        idmedico = step.context.activity.from.id;
        var slot = {idmedico: idmedico, giorno: step.values.giorno, orari: orari};

        const giornoesistente = await slotorari.findOne({ idmedico: step.context.activity.from.id, giorno: step.values.giorno});
        if (giornoesistente == undefined) {
            slotorari.insertOne(slot);
            //console.log("Ho inserito");
        } else {
            var neworari = {$set: {orari: orari}};
            slotorari.updateOne(giornoesistente, neworari);
            //console.log("Ho modificato");
        }

        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi inserire un altro giorno?' });

    }

    async loopGiornoStep(step) {
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG1);
        } else {
            const slots = await slotorari.find({idmedico: idmedico }).toArray();
            const giorni = slots.map(function(i) { return i.giorno + " ora: " + i.orari });
            var message = "Ecco gli slot che hai inserito:\n\n";
            for (let y = 0; y < slots.length; y++)
                message += '• ' + giorni[y] + '\n\n';

            await step.context.sendActivity(message);
            return await step.endDialog();
        }
    }

    // waterfall 2
    async orarioStep(step) {
        const res = step.options["slot"];
        if (res != undefined) {
            step.values.slot = res
            //console.log("da option: " + res.array);
        } else {
            step.values.slot = new Support();
        }
        const oraridisponibili = ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un orario di visita: ',
            choices: ChoiceFactory.toChoices(oraridisponibili),
            style: ListStyle.heroCard
        });
    }

    async firstOrarioStep(step) {
        if(!step.values.slot.array.includes(step.result.value))
            step.values.slot.array.push(step.result.value);
        else
            await step.context.sendActivity(`Attenzione, questo orario è già stato inserito`);

        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi inserire un altro orario di questo giorno?' });
    }

    async waitingOrarioStep(step) {
        const slot = step.values.slot;
        //console.log("ho preso l'ora: "+slot.array);
        if (step.result) {
            return await step.beginDialog(WATERFALL_DIALOG2, {slot: slot});
        } else
            return await step.endDialog(slot.array);
    }


}

module.exports.medicoSlotOrariDialog = medicoSlotOrariDialog;
module.exports.MEDICO_SLOTORARI_DIALOG = MEDICO_SLOTORARI_DIALOG;
