const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog,
    ListStyle
} = require('botbuilder-dialogs');
const { CardFactory, InputHints } = require('botbuilder');

//Mongo Configuration
const config = require('../config');
const { ADMIN_DIALOG, adminDialog } = require('./admin/adminDialog');
const { MEDICO_DIALOG, medicoDialog } = require('./medico/medicoDialog');
const { PAZIENTE_DIALOG, pazienteDialog } = require('./paziente/pazienteDialog');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

const { users, slotorari, richiesteRicette } = config;

class main extends ComponentDialog {
    constructor(cluRecognizer,userState) {
        super('main');

        if (!cluRecognizer) throw new Error('[MainDialog]: Missing parameter \'cluRecognizer\' is required');
        this.cluRecognizer = cluRecognizer;

        this.userState = userState;
        //this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new adminDialog(ADMIN_DIALOG));
        this.addDialog(new medicoDialog(MEDICO_DIALOG));
        this.addDialog(new pazienteDialog(cluRecognizer));
        // this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        // this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        // this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.choiceStep.bind(this),
            this.redirectDialog.bind(this)
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
        if (!this.cluRecognizer) {
            const messageText = 'NOTE: CLU is not configured. To enable all capabilities, add `CluAPIKey` and `CluAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(messageText, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona cosa vuoi fare',
            choices: ChoiceFactory.toChoices(['Login', 'Genera ID', 'Apri HealtBot']),
            style: ListStyle.heroCard
        });
    }

    async redirectDialog(step) {

        const value = step.result.value;
        if(value=== 'Login'){
            return await this.chooseDialog(step);
           // return await step.beginDialog(NOMEDIALOGO)
        }else if(value=== 'Genera ID'){
            await step.context.sendActivity(step.context.activity.from.id);
            return await step.replaceDialog(this.id);
        }else if(value=== 'Apri HealtBot'){
            await step.context.sendActivity({ attachments: [this.createSignInCard()] });
            return await step.replaceDialog(this.id);
        }
        return await step.replaceDialog(this.id);
    }

    async showusername(step) {
        const query = await ((users.find({})).toArray());
        const nomiutenti = query.map(function(i) { return i.nome });
        await step.context.sendActivity('nomi: \n' + nomiutenti);

    }

    async chooseDialog(step) {
        var idutentecorrente = step.context.activity.from.id;
        var query = { idutente: idutentecorrente };
        const utente = await users.findOne(query);
        //controllo che l'utente sia presente nel db
        if(utente != null) {
            switch (utente.ruolo) {
                case 'admin':
                    return await step.beginDialog(ADMIN_DIALOG);
                case 'medico':
                    return await step.beginDialog(MEDICO_DIALOG);
                case 'paziente':
                    return await step.beginDialog(PAZIENTE_DIALOG);
            }
        } else{
            await step.context.sendActivity(`Non sei registrato, comunica il tuo ID al medico/admin.`);
            return await step.replaceDialog(this.id);
        }
    }
    createSignInCard() {
        return CardFactory.signinCard(
            'Clicca qui per aprire Healtbot',
            'http://t.me/DocHealtBot',
            
        );
    }
}

module.exports.main = main;
