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
var moment = require('moment');

const { ADD_PAZIENTE_DIALOG, addPazienteDialog } = require('./addPazienteDialog');
const { REMOVE_PAZIENTE_DIALOG, removePazienteDialog } = require('./removePazienteDialog');
const { MEDICO_SLOTORARI_DIALOG, medicoSlotOrariDialog } = require('./medicoSlotOrariDialog');
const { GENERA_RICETTE_DIALOG, generaRicetteDialog } = require('./generaRicetteDialog');

//Mongo Configuration
const config = require('../../config');
const { users, prenotazioni } = config;

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
        this.addDialog(new medicoSlotOrariDialog(MEDICO_SLOTORARI_DIALOG));
        this.addDialog(new generaRicetteDialog(GENERA_RICETTE_DIALOG));

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
            prompt: `Ciao ${userName}, cosa desideri fare?`,
            choices: ChoiceFactory.toChoices(['Inserire paziente', 'Eliminare paziente', 'Slot orari visite', 'Visite del giorno', 'Richieste ricette']),
            style: ListStyle.heroCard
        });
    }

    async redirectDialogStep(step) {
        var resultchoice = step.result.value;
        if (resultchoice === 'Inserire paziente') {
            return await step.beginDialog(ADD_PAZIENTE_DIALOG);
        } else if (resultchoice === 'Eliminare paziente') {
            return await step.beginDialog(REMOVE_PAZIENTE_DIALOG);
        } else if (resultchoice === 'Slot orari visite') {
            return await step.beginDialog(MEDICO_SLOTORARI_DIALOG);
        } else if (resultchoice === 'Richieste ricette') {
            return await step.beginDialog(GENERA_RICETTE_DIALOG);
        } else if (resultchoice === 'Visite del giorno') {
            var timeStamp = moment();
            timeStamp.locale('it');
            var oggi = timeStamp.format('dddd');

            var idmedico = step.context.activity.from.id;
            const query = await (prenotazioni.find({idmedico: idmedico, giorno: oggi})).toArray();
            const orario = query.map(function(i) { return (', orario: '+ i.orario) });
            const pazienti = query.map(function(i) { return i.idpaziente });
            var message = "Pazienti prenotati oggi:\n\n";
            if(query.length <1){
                await step.context.sendActivity("Non ci sono prenotazioni per oggi");
            }else{
            for(let y=0; y < pazienti.length; y++) {
                var paziente = await users.findOne({idutente: pazienti[y]});
                message += '• ' + paziente.nome + orario[y] + '\n\n';
            }

            await step.context.sendActivity(message);
            }
            return await step.replaceDialog(this.id);
        }
    }

    async loopStep(step) {
        return await step.replaceDialog(this.id);
    }
}

module.exports.medicoDialog = medicoDialog;
module.exports.MEDICO_DIALOG = MEDICO_DIALOG;
