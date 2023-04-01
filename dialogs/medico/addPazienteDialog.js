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
const ADD_PAZIENTE_DIALOG = 'ADD_PAZIENTE_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';

class addPazienteDialog extends ComponentDialog {
    constructor(userState) {
        super(ADD_PAZIENTE_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.idStep.bind(this),
            this.nomeStep.bind(this),
            this.dataNascitaStep.bind(this),
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
        return await step.prompt(NUMBER_PROMPT, 'Inserisci l\'id del paziente');
    }

    async nomeStep(step) {
        step.values.id = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci il nome del paziente (nome e cognome)');
    }

    async dataNascitaStep(step) {
        step.values.nome = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci la data di nascita nel formato GG/MM/AAAA');
    }

    async cittaStep(step) {
        step.values.dataNascita = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci la città');
    }

    async indirizzoStep(step) {
        step.values.citta = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci l\'indirizzo e il numero civico');
    }

    async cfStep(step) {
        step.values.indirizzo = step.result;
        return await step.prompt(NAME_PROMPT, 'Inserisci il codice fiscale');
    }

    async confirmStep(step) {
        step.values.cf = step.result;

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Confermi?' });
    }

    async summaryStep(step) {

        if (step.result) {
            // Get the current profile object from user state.

            var newuser = {idutente: String(step.values.id) , ruolo: "paziente", nome: step.values.nome, dataNascita: step.values.dataNascita, citta: step.values.citta, indirizzo: step.values.indirizzo, codiceFiscale: step.values.cf, pdf: "", idmedico: step.context.activity.from.id};
            users.insertOne(newuser);

            let msg = `è stato aggiunto il seguente paziente: \n\n ${ step.values.nome } \n\n id: ${ step.values.id } \n\n data nascita: ${ step.values.dataNascita }` +
              `\n\n codice fiscale: ${ step.values.cf } \n\n indirizzo: ${ step.values.citta } , ${ step.values.indirizzo }`;


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

module.exports.addPazienteDialog = addPazienteDialog;
module.exports.ADD_PAZIENTE_DIALOG = ADD_PAZIENTE_DIALOG;
