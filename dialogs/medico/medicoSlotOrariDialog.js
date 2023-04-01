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
    DateTimePrompt
} = require('botbuilder-dialogs');
//Mongo Configuration
const config = require('../../config');
const { users, slotorari } = config;
const { Slot } = require('./slot');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG1 = 'WATERFALL_DIALOG1';
const WATERFALL_DIALOG2 = 'WATERFALL_DIALOG2';
const MEDICO_SLOTORARI_DIALOG = 'MEDICO_SLOTORARI_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const SLOT_PROPERTY = 'SLOT_PROPERTY';

class medicoSlotOrariDialog extends ComponentDialog {
    constructor(userState) {
        super(MEDICO_SLOTORARI_DIALOG);
        this.userState = userState;
        this.slotAccessor = userState.createProperty(SLOT_PROPERTY);

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG1, [
            this.giornoStep.bind(this),
            this.redirectOrariStep.bind(this),
            this.prendiOrariStep.bind(this)
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
        const slot = await slotorari.find({ idmedico: step.context.activity.from.id}).toArray();
        //const slot = query.map();
        if (slot.length < 1) {
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Seleziona un giorno di visita: ',
                choices: ChoiceFactory.toChoices(['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'])
            });
        }

    }

    async redirectOrariStep(step) {
        step.values.giorno = step.result;
        return await step.beginDialog(WATERFALL_DIALOG2);
    }

    async prendiOrariStep(step) {
        // mi prendo i valore che ho passato all'end dialog dell'altro waterfall
        //step.values.orari = [];
        /*const slotobject = await this.slot.get(step.context, new Slot());
        slotobject.giorno = step.values.giorno;*/
        await this.slotAccessor.set(step.context, step.result);
        const returnvalues = step.result;
        console.log(returnvalues);
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }



    // waterfall 2
    async orarioStep(step) {
        if (step.result != null){
            console.log("result è null")
            step.values.slot = step.result;
        } else {
            console.log("primo new slot");
            step.values.slot = new Slot();
        }
        const oraridisponibili = ["9", "10", "11", "12"];
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona un orario di visita: ',
            choices: ChoiceFactory.toChoices(oraridisponibili)
        });
    }

    async firstOrarioStep(step) {
        step.values.slot.orari.push(step.result.value);
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Vuoi inserire un altro orario di questo giorno?' });
    }

    async waitingOrarioStep(step) {
        const slot = step.values.slot;
        console.log("ho preso l'ora: "+slot.orari);
        if (step.result) {
            return await step.replaceDialog(WATERFALL_DIALOG2, slot);
        } else
            return await step.endDialog(slot);
    }


}

module.exports.medicoSlotOrariDialog = medicoSlotOrariDialog;
module.exports.MEDICO_SLOTORARI_DIALOG = MEDICO_SLOTORARI_DIALOG;
