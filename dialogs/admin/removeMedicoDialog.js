const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    NumberPrompt,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

//Mongo Configuration
const config = require('../../config');
const { users } = config;

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const REMOVE_MEDICO_DIALOG = 'REMOVE_MEDICO_DIALOG';

class removeMedicoDialog extends ComponentDialog {
    constructor(userState) {
        super(REMOVE_MEDICO_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.showMediciStep.bind(this),
            this.eliminaMedicoStep.bind(this)
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

    async showMediciStep(step) {
        const query = await ((users.find({ruolo: "medico"})).toArray());
        const medici = query.map(function(i) { return ('id: '+i.idutente +', nome: '+ i.nome +', città: '+ i.citta) });
        var message = "Ecco la lista dei medici:\n\n";
        for(let y=0; y < medici.length; y++)
            message += '• ' + medici[y] + '\n\n';

        await step.context.sendActivity(message);
        return await step.prompt(NUMBER_PROMPT, 'Inserisci l\'id del medico che vuoi eliminare oppure scrivi 0 se non vuoi eliminare nessun medico.');
    }

    async eliminaMedicoStep(step) {
        var idmedico = String(step.result);
        if(idmedico != 0) {
            var query = {idutente: idmedico};
            const medico = await users.findOne(query);
            if (medico != undefined) {
                await users.deleteOne(query);
                await step.context.sendActivity(`Il medico: ${medico.nome} è stato eliminato`);
                // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
                return await step.endDialog();
            } else {
                await step.context.sendActivity(`Hai sbagliato ad inserire id, ricontrolla dalla lista.`);
                return await step.replaceDialog(this.id);
            }
        } else {
            return await step.endDialog();
        }
    }
}

module.exports.removeMedicoDialog = removeMedicoDialog;
module.exports.REMOVE_MEDICO_DIALOG = REMOVE_MEDICO_DIALOG;
