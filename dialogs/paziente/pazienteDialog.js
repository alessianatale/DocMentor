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
const {  CardFactory } = require('botbuilder');
const { PRENOTA_VISITA_DIALOG, prenotaVisitaDialog } = require('./prenotaVisitaDialog.js');
const { RICHIESTA_RICETTA_DIALOG, richiestaRicettaDialog } = require('./richiestaRicettaDialog.js');


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PAZIENTE_DIALOG = 'PAZIENTE_DIALOG';


class pazienteDialog extends ComponentDialog {
    constructor(cluRecognizer, userState) {
        super(PAZIENTE_DIALOG);
        this.cluRecognizer =cluRecognizer;
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

        // return await step.prompt(CHOICE_PROMPT, {
        //     prompt: `Ciao ${ userName }, cosa desideri fare?`,
        //     choices: ChoiceFactory.toChoices(['Prenotare Visita', 'Richiedi Ricetta', 'Richiedi info']),
        //     style: ListStyle.heroCard
        // });

        // prenotare una viista, richiedere una ricetta, infotmazioni del medico, aprire healtbot, le mie ricette

         return await step.prompt(NAME_PROMPT, 'Ora ti bastrà dialogare con il bot e scegliere l\'operazione desiderata tra queste presenti:\n\n • Prenotare una visita\n\n• Richiedere una ricetta\n\n•  Ottenere informazioni sul tuo medico\n\n • Visualizzare le tue prescrizioni\n\n•  Aprire l\'Healtbot ');
    }

    async redirectDialogStep(step) {
        var resultchoice = step.result.value;

       
        
        const cluResult = await this.cluRecognizer.executeCluQuery(step.context);
        console.log("Ecco il top intent: "+this.cluRecognizer.topIntent(cluResult));
        switch (this.cluRecognizer.topIntent(cluResult)) {
            case 'Richiedi Ricetta': {
                return await step.beginDialog(RICHIESTA_RICETTA_DIALOG);
            }
            case 'Prenotare Visita': {
                return await step.beginDialog(PRENOTA_VISITA_DIALOG);
            }
            case 'None': {
                await context.sendActivity('Mi dispiace ma non ho capito, Riprova.');
                return await step.replaceDialog(this.id);
            }
            case 'healthBot': {
                await step.context.sendActivity({ attachments: [this.createSignInCard()] });
                break;
            }
            case 'info medico': {
                console.log("infomedico");
                break;
            }

        }
        


        
    }

    async loopStep(step) {
        return await step.replaceDialog(this.id);
    }

    createSignInCard() {
        return CardFactory.signinCard(
            'Clicca qui per aprire Healtbot',
            'https://www.youtube.com/watch?v=CqAq2WFcy_Q&ab_channel=ValoremReply',
            
        );
    }
}

module.exports.pazienteDialog = pazienteDialog;
module.exports.PAZIENTE_DIALOG = PAZIENTE_DIALOG;
