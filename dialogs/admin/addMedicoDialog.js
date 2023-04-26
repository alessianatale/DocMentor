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
const { users } = config;

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const ADD_MEDICO_DIALOG = 'ADD_MEDICO_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';

class addMedicoDialog extends ComponentDialog {
    constructor(userState) {
        super(ADD_MEDICO_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.idStep.bind(this),
            this.nomeStep.bind(this),
            this.cittaStep.bind(this),
            this.indirizzoStep.bind(this),
            this.cfStep.bind(this),
            this.confirmStep.bind(this),
            this.summaryStep.bind(this)
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

    async idStep(step) {
        return await step.prompt(NUMBER_PROMPT, 'Inserisci l\'id comunicato dal medico');
    }

    async nomeStep(step) {
        step.values.id = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci il nome del medico (nome e cognome)');
    }

    async cittaStep(step) {
        step.values.nome = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci la città del medico');
    }

    async indirizzoStep(step) {
        step.values.citta = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci \'indirizzo e il numero civico dello studio del medico');
    }

    async cfStep(step) {
        step.values.indirizzo = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci il codice fiscale del medico');
    }

    async confirmStep(step) {
        step.values.cf = step.result;

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Confermi?' });
    }

    async summaryStep(step) {

        if (step.result) {
            // Get the current profile object from user state.

            var newuser = {idutente: String(step.values.id) , ruolo: "medico", nome: step.values.nome, citta: step.values.citta, indirizzo: step.values.indirizzo, codiceFiscale: step.values.cf, counter: 0};
            users.insertOne(newuser);

            let msg = `è stato aggiunto il seguente medico: \n\n ${ step.values.nome } \n\n id: ${ step.values.id }` +
              `\n\n codice fiscale: ${ step.values.cf } \n\n studio: ${ step.values.citta } , ${ step.values.indirizzo }`;


            msg += '.';
            await step.context.sendActivity(msg);

        } else {
            await step.context.sendActivity('Prego, inserisci di nuovo i campi');
            return await step.replaceDialog(this.id);

        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }


}

module.exports.addMedicoDialog = addMedicoDialog;
module.exports.ADD_MEDICO_DIALOG = ADD_MEDICO_DIALOG;
