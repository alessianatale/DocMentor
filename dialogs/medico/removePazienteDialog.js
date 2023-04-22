const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    NumberPrompt,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    ListStyle
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

        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona il paziente che vuoi eliminare: ',
            choices: ChoiceFactory.toChoices(pazienti),
            style: ListStyle.heroCard
        });
    }

    async eliminaPazienteStep(step) {
        const paz = step.result.value;
        var idpaziente = paz.substring(
            paz.indexOf(":") + 2, 
            paz.indexOf(",")
        );  
        console.log(idpaziente);
        var idmedico = step.context.activity.from.id;
        if(idpaziente != 0) {
            var query = {idutente: idpaziente, idmedico: idmedico};
            const paziente = await users.findOne(query);
            if (paziente != undefined) {
                await users.deleteOne(query);
                await step.context.sendActivity(`Il paziente: ${paziente.nome} è stato eliminato`);
                return await step.endDialog();
            } else {
                await step.context.sendActivity(`Paziente non trovato`);
                return await step.replaceDialog(this.id);
            }
        } else {
            return await step.endDialog();
        }
    }
}

module.exports.removePazienteDialog = removePazienteDialog;
module.exports.REMOVE_PAZIENTE_DIALOG = REMOVE_PAZIENTE_DIALOG;
