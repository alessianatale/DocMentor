// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory } = require('botbuilder');
const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog,
    ListStyle
} = require('botbuilder-dialogs');
const { Channels } = require('botbuilder-core');

//Mongo Configuration
const config = require('../config');
const { ADMIN_DIALOG, adminDialog } = require('./admin/adminDialog');
const { MEDICO_DIALOG, medicoDialog } = require('./medico/medicoDialog');
const { PAZIENTE_DIALOG, pazienteDialog } = require('./paziente/pazienteDialog');

const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

const { users, slotorari } = config;

class main extends ComponentDialog {
    constructor(userState) {
        super('main');
        this.userState = userState;
        //this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new adminDialog(ADMIN_DIALOG));
        this.addDialog(new medicoDialog(MEDICO_DIALOG));
        this.addDialog(new pazienteDialog(PAZIENTE_DIALOG));
        // this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        // this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        // this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.choiceStep.bind(this),
            this.redirectDialog.bind(this)
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
        this.utenteEmulatore(step);
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Seleziona cosa vuoi fare',
            choices: ChoiceFactory.toChoices(['Login', 'Genera ID', 'Apri HealtBot', 'Elimina tutto',]),
            style: ListStyle.heroCard
        });
    }

    async redirectDialog(step) {

        const value = step.result.value;
        if(value=== 'Login'){
            return await this.chooseDialog(step);
           // return await step.beginDialog(NOMEDIALOGO)
        }else if(value=== 'Genera ID'){
            await step.context.sendActivity(step.context.activity.from.id);
            return await step.replaceDialog(this.id);
        }else if(value=== 'Apri HealtBot'){
            await step.context.sendActivity('sei in healtbot');
           // return await step.beginDialog(NOMEDIALOGO)
        }else if(value=== 'Elimina tutto'){
            // elimina tutto - da rimuovere dopo
            await users.deleteMany({});
            await slotorari.deleteMany({});
        }

        return await step.endDialog();
    }

    async showusername(step) {
        const query = await ((users.find({})).toArray());
        const nomiutenti = query.map(function(i) { return i.nome });
        await step.context.sendActivity('nomi: \n' + nomiutenti);

    }

    async chooseDialog(step) {
        var idutentecorrente = step.context.activity.from.id;
        var query = { idutente: idutentecorrente };
        const utente = await users.findOne(query);
        //controllo che l'utente sia presente nel db
        if(utente != null) {
            switch (utente.ruolo) {
                case 'admin':
                    return await step.beginDialog(ADMIN_DIALOG);
                case 'medico':
                    return await step.beginDialog(MEDICO_DIALOG);
                case 'paziente':
                    return await step.beginDialog(PAZIENTE_DIALOG);
                    break;
            }
        } else
            await step.context.sendActivity(`Non sei registrato, comunica il tuo ID al medico/admin.`);
    }

    async utenteEmulatore(step) {
        var idutentecorrente = step.context.activity.from.id;
        var newuser = { idutente: idutentecorrente, ruolo: "medico", nome: "Emulatore", citta: "fantasma", dataNascita: "03/07/00", codiceFiscale: "MMMMMMMM", pdf: "url", idmedico: "2b6a7adf-6ea1-4417-8912-47aef6d61870", farmaci: ["efferaaaaaaaaaaaaaaaaaaaaaaaaaaalgan", "insulina", "tachipirina 1000", "vitamina C"], esenzioni: ["E20"]};
        users.insertOne(newuser);

        // da aggiungere se mettiamo ruolo medico
        var paziente = {idutente: "1234567" , ruolo: "paziente", nome: "Viviana Veccia", dataNascita: "14/06/1968", citta: "Caserta", indirizzo: "Via ss 9", codiceFiscale: "VCCVN89H45SD", pdf: "", idmedico: idutentecorrente};
        users.insertOne(paziente);
        
    }

}

module.exports.main = main;
