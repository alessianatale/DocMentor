
const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    ListStyle
} = require('botbuilder-dialogs');
const { ADD_MEDICO_DIALOG, addMedicoDialog } = require('./addMedicoDialog');
const { REMOVE_MEDICO_DIALOG, removeMedicoDialog } = require('./removeMedicoDialog');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const ADMIN_DIALOG = 'ADMIN_DIALOG';

class adminDialog extends ComponentDialog {
    constructor(userState) {
        super(ADMIN_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new addMedicoDialog(ADD_MEDICO_DIALOG));
        this.addDialog(new removeMedicoDialog(REMOVE_MEDICO_DIALOG));

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
        const userName = step.context.activity.from.name;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: `Ciao ${ userName }, cosa desideri fare?`,
            choices: ChoiceFactory.toChoices(['Inserire medico', 'Elimina medico']),
            style: ListStyle.heroCard
        });
    }

    async redirectDialogStep(step) {
        var resultchoice = step.result.value;
        if (resultchoice === 'Inserire medico') {
            return await step.beginDialog(ADD_MEDICO_DIALOG);
        } else if (resultchoice === 'Elimina medico') {
            return await step.beginDialog(REMOVE_MEDICO_DIALOG);
        }
    }

    async loopStep(step) {
        return await step.replaceDialog(this.id);
    }
}

module.exports.adminDialog = adminDialog;
module.exports.ADMIN_DIALOG = ADMIN_DIALOG;
