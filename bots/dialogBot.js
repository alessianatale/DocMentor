// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {ActionTypes, ActivityHandler, CardFactory } = require('botbuilder');

class DialogBot extends ActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(conversationState, userState, dialog) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');

           
            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.dialogState);

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            console.log('Running dialog with Message Activity.');

            await this.sendIntroCard(context);
            

            await next();
        });
    }

    async sendIntroCard(context) {
        const card = CardFactory.heroCard(
            'Benvenuto in DocMentorBot',
            'Grazie a questo bot medici e pazienti potranno migliorare le loro interazioni, ad esempio un paziente puo richiedere la ricetta medica direttamente da DocMentorBot',
            ['https://aka.ms/bf-welcome-card-image'],
            [
                { 
                    type: ActionTypes.,
                    title: 'Login',
                    value: 'https://instagram.fnap2-1.fna.fbcdn.net/v/t51.2885…4z9RxFB5W9qRoO7wmHmiKw&oe=641DB5D8&_nc_sid=1527a3'
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Genera ID',
                    value: 'https://instagram.fnap2-1.fna.fbcdn.net/v/t51.2885…4z9RxFB5W9qRoO7wmHmiKw&oe=641DB5D8&_nc_sid=1527a3'
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Consulta HealtBot',
                    value: 'https://instagram.fnap2-1.fna.fbcdn.net/v/t51.2885…4z9RxFB5W9qRoO7wmHmiKw&oe=641DB5D8&_nc_sid=1527a3'
                }
            ]
        );
    
        await context.sendActivity({ attachments: [card] });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.DialogBot = DialogBot;
