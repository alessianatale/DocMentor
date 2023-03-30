
const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { ADD_PAZIENTE_DIALOG, addPazienteDialog } = require('./addPazienteDialog');
const { REMOVE_PAZIENTE_DIALOG, removePazienteDialog } = require('./removePazienteDialog');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const MEDICO_DIALOG = 'MEDICO_DIALOG';

class medicoDialog extends ComponentDialog {
    constructor(userState) {
        super(MEDICO_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new addPazienteDialog(ADD_PAZIENTE_DIALOG));
        this.addDialog(new removePazienteDialog(REMOVE_PAZIENTE_DIALOG));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.choiceStep.bind(this),
            this.redirectDialogStep.bind(this),
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


    async choiceStep(step) {
         return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Ciao medico, cosa desideri fare?',
            choices: ChoiceFactory.toChoices(['Inserire paziente', 'Eliminare paziente'])
        });
    }

    async redirectDialogStep(step) {
        var resultchoice = step.result.value;
        if (resultchoice === 'Inserire paziente') {
            return await step.beginDialog(ADD_PAZIENTE_DIALOG);
        } else if (resultchoice === 'Eliminare paziente') {
            return await step.beginDialog(REMOVE_PAZIENTE_DIALOG);
        }
    }

    async loopStep(step) {
        return await step.replaceDialog(this.id);
    }
}

module.exports.medicoDialog = medicoDialog;
module.exports.MEDICO_DIALOG = MEDICO_DIALOG;
