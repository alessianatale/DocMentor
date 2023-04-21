const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    NumberPrompt,
    ConfirmPrompt,
    DateTimePrompt
} = require('botbuilder-dialogs');
//Mongo Configuration
const config = require('../../config');
const { users, slotorari, prenotazioni } = config;

let utente;
let idmedico;
let slotg;


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PRENOTA_VISITA_DIALOG = 'PRENOTA_VISITA_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';

class prenotaVisitaDialog extends ComponentDialog {
    constructor(userState) {
        super(PRENOTA_VISITA_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.giornoStep.bind(this),
            this.orarioStep.bind(this),
            this.confirmStep.bind(this),

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

    async giornoStep(step) {
        utente = await users.findOne({idutente: step.context.activity.from.id });
        idmedico = utente.idmedico;
        const slots = await slotorari.find({idmedico: idmedico }).toArray();
        const giorni = slots.map(function(i) { return i.giorno });

        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Ecco i giorni disponibili per il tuo medico: ',
            choices: ChoiceFactory.toChoices(giorni)
        });

    }

    async orarioStep(step) {
        step.values.giorno = step.result.value;
        slotg = await slotorari.findOne({idmedico: idmedico, giorno: step.result.value });

        if(slotg.orari.length < 1){
            return await step.context.sendActivity(`Attenzione, sono terminati gli slot per questo giorno`);
        }else {
            return await step.prompt(CHOICE_PROMPT, {
                prompt: 'Ecco i giorni disponibili per il tuo medico: ',
                choices: ChoiceFactory.toChoices(slotg.orari)
            });
        }
    }

    async confirmStep(step) {
        step.values.orario = step.result.value;
        const prenotazioniEffettuate = await prenotazioni.find({idpaziente:step.context.activity.from.id}).toArray();
        if(prenotazioniEffettuate.length > 1){
            return await step.context.sendActivity(`Attenzione, hai superato il numero di prenotazioni effettuabili per questa settimana`);
        }else{
            const index = slotg.orari.indexOf(step.values.orario);
            var orari = slotg.orari;
            orari.splice(index,1);

            var prenotazione = {idpaziente: step.context.activity.from.id, giorno: step.values.giorno, orario: step.values.orario, idmedico: idmedico};

            const slotnew = await slotorari.findOne({idmedico: idmedico, giorno: step.values.giorno });
            await prenotazioni.insertOne(prenotazione);
            console.log(slotnew);
            var neworari = {$set: {orari: orari}};
            await slotorari.updateOne(slotnew, neworari);
            console.log("Ho modificato");

            return await step.context.sendActivity(`Prenotazione effettuata per ${step.values.giorno} alle ore ${step.values.orario} `);

        }


    }

}

module.exports.prenotaVisitaDialog = prenotaVisitaDialog;
module.exports.PRENOTA_VISITA_DIALOG = PRENOTA_VISITA_DIALOG;
