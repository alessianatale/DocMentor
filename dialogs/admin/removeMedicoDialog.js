const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

//Mongo Configuration
const config = require('../../config');
const { users } = config;

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const REMOVE_MEDICO_DIALOG = 'REMOVE_MEDICO_DIALOG';

class removeMedicoDialog extends ComponentDialog {
    constructor(userState) {
        super(REMOVE_MEDICO_DIALOG);
        this.userState = userState;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.showMediciStep.bind(this),
            this.idStep.bind(this)
          /*  this.ruoloStep.bind(this),
            this.nomeStep.bind(this),
            this.dataNascitaStep.bind(this),
            this.codiceFiscaleStep.bind(this),
            this.confirmStep.bind(this) */
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
        const medici = query.map(function(i) { return i.nome });
        var message = "Ecco la lista dei medici:\n";
        await step.context.sendActivity(message);




        console.log("length: "+medici.length);

        return  await step.context.sendActivity('nomi: \n' + medici);

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
