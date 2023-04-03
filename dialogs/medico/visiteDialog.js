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
var moment = require('moment');

//Mongo Configuration
const config = require('../../config');
const { users, prenotazioni } = config;

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const VISITE_DIALOG = 'VISITE_DIALOG';

class visiteDialog extends ComponentDialog {
    constructor(userState) {
        super(VISITE_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.showVisiteStep.bind(this)
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

    async showVisiteStep(step) {
        var timeStamp = moment();
        timeStamp.locale('it');
        var oggi = timeStamp.format('dddd');

        var idmedico = step.context.activity.from.id;
        const query = await (prenotazioni.find({idmedico: idmedico, giorno: oggi})).toArray();
        const orario = query.map(function(i) { return (' ora: '+ i.orario) });
        const pazienti = query.map(function(i) { return i.idpaziente });
        var message = "Pazienti prenotati oggi:\n\n";
        for(let y=0; y < pazienti.length; y++) {
            var paziente = await users.findOne({idutente: pazienti[y]});
            message += '• ' + paziente.nome + orario[y] + '\n\n';
        }

        await step.context.sendActivity(message);
        return await this.endDialog();
    }

}

module.exports.visiteDialog = visiteDialog;
module.exports.VISITE_DIALOG = VISITE_DIALOG;
