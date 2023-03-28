const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class removeMedicoDialog extends ComponentDialog {
    constructor(userState) {
        super('addMedicoDialog');
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.welcomeStep.bind(this),
            this.idStep.bind(this),
            this.ruoloStep.bind(this),
            this.nomeStep.bind(this),
            this.dataNascitaStep.bind(this),
            this.codiceFiscaleStep.bind(this),
            this.confirmStep.bind(this)
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

        }else if(resultchoice==='Eliminare medico esistente') {

        }
    }
}

module.exports.removeMedicoDialog = removeMedicoDialog;
module.exports.REMOVE_MEDICO_DIALOG = REMOVE_MEDICO_DIALOG;