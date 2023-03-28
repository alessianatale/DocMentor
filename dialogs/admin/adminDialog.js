const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { ADD_MEDICO_DIALOG, addMedicoDialog } = require('./addMedicoDialog');
const { REMOVE_MEDICO_DIALOG, removeMedicoDialog } = require('./removeMedicoDialog');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class adminDialog extends ComponentDialog {
    constructor(userState) {
        super('adminDialog');
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new addMedicoDialog());
        this.addDialog(new removeMedicoDialog());

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.welcomeStep.bind(this),
            this.idStep.bind(this),
            this.loopStep.bind(this)
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

    async welcomeStep(step) {
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Ciao admin, cosa desideri fare?',
            choices: ChoiceFactory.toChoices(['Inserire nuovo medico', 'Eliminare medico esistente'])
        });
    }

    async idStep(step) {
        var resultchoice = step.result.value;
        if (resultchoice==='Inserire nuovo medico') {
            return await step.beginDialog(ADD_MEDICO_DIALOG);
        }else if(resultchoice==='Eliminare medico esistente') {
            return await step.beginDialog(REMOVE_MEDICO_DIALOG);
        }
    }

    async loopStep(step) {
        return await step.replaceDialog(this.id);
    }
}

module.exports.adminDialog = adminDialog;
module.exports.ADMIN_DIALOG = ADMIN_DIALOG;