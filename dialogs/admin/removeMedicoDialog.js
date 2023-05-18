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
        
        if(query.length < 1){
            await step.context.sendActivity(`Non sono presenti medici da eliminare`);
            return await step.endDialog();
        }
        medici.push("Torna indietro")

        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona il medico che vuoi eliminare: ',
            choices: ChoiceFactory.toChoices(medici),
            style: ListStyle.heroCard
        });
    }

    async eliminaMedicoStep(step) {
        if (step.result.value == "Torna indietro") {
            return await step.endDialog();
        } else {
            const med = step.result.value;
            var idmedico = med.substring(
                med.indexOf(":") + 2, 
                med.indexOf(",")
            );
            var query = {idutente: idmedico};
            const medico = await users.findOne(query);
            if (medico != undefined) {
                await users.deleteOne(query);
                await step.context.sendActivity(`Il medico: ${medico.nome} è stato eliminato`);
                return await step.endDialog();
            } else {
                await step.context.sendActivity(`Medico non trovato`);
                return await step.replaceDialog(this.id);
            }
        }
    }
}

module.exports.removeMedicoDialog = removeMedicoDialog;
module.exports.REMOVE_MEDICO_DIALOG = REMOVE_MEDICO_DIALOG;
