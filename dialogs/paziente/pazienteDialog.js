
const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { PRENOTA_VISITA_DIALOG, prenotaVisitaDialog } = require('./prenotaVisitaDialog.js');
const { RICHIESTA_RICETTA_DIALOG, richiestaRicettaDialog } = require('./richiestaRicettaDialog.js');


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PAZIENTE_DIALOG = 'PAZIENTE_DIALOG';


class pazienteDialog extends ComponentDialog {
    constructor(userState) {
        super(PAZIENTE_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new prenotaVisitaDialog(PRENOTA_VISITA_DIALOG));
        this.addDialog(new richiestaRicettaDialog(RICHIESTA_RICETTA_DIALOG));

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
            choices: ChoiceFactory.toChoices(['Prenotare Visita', 'Richiedi Ricetta', 'Richiedi info'])
        });
    }

    async redirectDialogStep(step) {
        var resultchoice = step.result.value;
        if (resultchoice === 'Prenotare Visita') {
            return await step.beginDialog(PRENOTA_VISITA_DIALOG);
        } else if (resultchoice === 'Richiedi Ricetta') {
            return await step.beginDialog(RICHIESTA_RICETTA_DIALOG);
        } else if (resultchoice === 'Richiedi info') {
           // return await step.beginDialog(MEDICO_SLOTORARI_DIALOG);
        }
    }

    async loopStep(step) {
        return await step.replaceDialog(this.id);
    }
}

module.exports.pazienteDialog = pazienteDialog;
module.exports.PAZIENTE_DIALOG = PAZIENTE_DIALOG;
