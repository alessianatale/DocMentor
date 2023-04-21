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
const REMOVE_PAZIENTE_DIALOG = 'REMOVE_PAZIENTE_DIALOG';

class removePazienteDialog extends ComponentDialog {
    constructor(userState) {
        super(REMOVE_PAZIENTE_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.showPazientiStep.bind(this),
            this.eliminaPazienteStep.bind(this)
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

    async showPazientiStep(step) {
        var idmedico = step.context.activity.from.id;
        const query = await ((users.find({ruolo: "paziente", idmedico: idmedico})).toArray());
        const pazienti = query.map(function(i) { return ('id: '+i.idutente +', nome: '+ i.nome +', città: '+ i.citta) });
        var message = "Ecco la lista dei tuoi pazienti:\n\n";
        for(let y=0; y < pazienti.length; y++)
            message += '• ' + pazienti[y] + '\n\n';

        await step.context.sendActivity(message);
        return await step.prompt(NUMBER_PROMPT, 'Inserisci l\'id del paziente che vuoi eliminare oppure scrivi 0 se non vuoi eliminare nessun paziente.');
    }

    async eliminaPazienteStep(step) {
        var idpaziente = String(step.result);
        var idmedico = step.context.activity.from.id;
        if(idpaziente != 0) {
            var query = {idutente: idpaziente, idmedico: idmedico};
            const paziente = await users.findOne(query);
            if (paziente != undefined) {
                await users.deleteOne(query);
                await step.context.sendActivity(`Il paziente: ${paziente.nome} è stato eliminato`);
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

module.exports.removePazienteDialog = removePazienteDialog;
module.exports.REMOVE_PAZIENTE_DIALOG = REMOVE_PAZIENTE_DIALOG;
