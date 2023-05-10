const { MessageFactory, ActivityHandler, ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');
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
    DateTimePrompt,
    ListStyle,
    AttachmentPrompt,
} = require('botbuilder-dialogs');

//http request config
const superagent = require('superagent');

//Mongo Configuration
const config = require('../../config');
const { users, richiesteRicette, farmaci } = config;





const CHOICE_PROMPT = 'CHOICE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PRESCRIZIONI_DIALOG = 'PRESCRIZIONI_DIALOG';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';

class prescrizioniDialog extends ComponentDialog {
    constructor(userState) {
        super(PRESCRIZIONI_DIALOG);
        this.userState = userState;

        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT), this.choicePromptValidator);
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getPrescrizioni.bind(this)
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

   
    
    getInternetAttachment(url,nome) {
        return {
            name: nome,
            contentType: 'application/pdf',
            contentUrl: url
        };
    }

    async getPrescrizioni(step) {
        let idpaziente  = step.context.activity.from.id;
            
             
            const query = await users.findOne({ idutente: idpaziente});
            
          

            if( query.pdf != undefined) {
                const reply = { type: ActivityTypes.Message };
            
                for (let y = 0; y < query.pdf.length; y++){
                    const stringa = query.pdf[y];
                    const regex = /[^/]*$/; // espressione regolare per selezionare l'ultima parte della stringa dopo l'ultimo "/"
                    const nomeFile = stringa.match(regex)[0]; // applica l'espressione regolare alla stringa e seleziona il primo risultato

                    reply.attachments = [this.getInternetAttachment(query.pdf[y],nomeFile)];
                    await step.context.sendActivity(reply);
                }
                return await step.endDialog();
            }
        
    }


}

module.exports.prescrizioniDialog = prescrizioniDialog;
module.exports.PRESCRIZIONI_DIALOG = PRESCRIZIONI_DIALOG;
