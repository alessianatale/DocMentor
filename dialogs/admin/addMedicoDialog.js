const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    NumberPrompt,
    ConfirmPrompt
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

class addMedicoDialog extends ComponentDialog {
    constructor(userState) {
        super(ADD_MEDICO_DIALOG);
        this.userState = userState;


        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.idStep.bind(this),
            this.nomeStep.bind(this),
            this.cittaStep.bind(this),
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

    async cfStep(step) {
        step.values.citta = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci il codice fiscale del medico');
    }

    async confirmStep(step) {
        step.values.cf = step.result;

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Is this okay?' });
    }

    async summaryStep(step) {

        if (step.result) {
            // Get the current profile object from user state.

            var newuser = {idutente: String(step.values.id) , ruolo: "medico", nome: step.values.nome, citta: step.values.citta, dataNascita: "", codiceFiscale: step.values.cf, pdf: ""};
            users.insertOne(newuser);

            let msg = `è stato aggiunto ${ step.values.nome } , il suo id è ${ step.values.id } , il suo codice fiscale ${ step.values.cf } e la sua città ${ step.values.citta }`;


            msg += '.';
            await step.context.sendActivity(msg);

        } else {
            await step.context.sendActivity('Prego, inserisci di nuovo i campi');
            return await dialogContext.beginDialog(this.id);

        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }


}

module.exports.addMedicoDialog = addMedicoDialog;
module.exports.ADD_MEDICO_DIALOG = ADD_MEDICO_DIALOG;
