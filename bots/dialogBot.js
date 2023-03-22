// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActionTypes, ActivityHandler, CardFactory } = require('botbuilder');

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

        this.onMembersAdded(async (context, next) => {
            // Iterate over all new members added to the conversation
            for (const idx in context.activity.membersAdded) {
                if (context.activity.membersAdded[idx].id !== context.activity.recipient.id) {
                    /*await context.sendActivity(`You can use the activity's 'locale' property to welcome the user ` +
                        `using the locale received from the channel. ` +
                        `If you are using the Emulator, you can set this value in Settings. ` +
                        `Current locale is '${ context.activity.locale }'`);*/
                        await context.sendActivity(`Benvenuto, questo bot fa queste cose: .........`);
                        await context.sendActivity(`Scrivi qualsiasi cosa per avviare il bot`);
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
        
        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');

            //first time ever for a user
            const didBotWelcomedUser = await this.dialogState.get(context, false);

            if (didBotWelcomedUser === false) {
                // The channel should send the user name in the 'From' object
                const userName = context.activity.from.name;
                await context.sendActivity(`Welcome ${ userName }.`);
                await context.sendActivity(`Scrivi "intro"`);

                // Set the flag indicating the bot handled the user's first message.
                await this.dialogState.set(context, true);
            } else {
                const text = context.activity.text.toLowerCase();
                switch (text) {
                case 'hello':
                case 'hi':
                    await context.sendActivity(`You said "${ context.activity.text }"`);
                    break;
                case 'intro':
                case 'help':
                    await this.sendIntroCard(context);
                    break;
                default:
                    await context.sendActivity(`This is a simple Welcome Bot sample. You can say 'intro' to
                                                    see the introduction card. If you are running this bot in the Bot
                                                    Framework Emulator, press the 'Start Over' button to simulate user joining a bot or a channel`);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }


    async sendIntroCard(context) {
        const card = CardFactory.heroCard(
            'Welcome to Bot Framework!',
            'Welcome to Welcome Users bot sample! This Introduction card is a great way to introduce your Bot to the user and suggest some things to get them started. We use this opportunity to recommend a few next steps for learning more creating and deploying bots.',
            ['https://aka.ms/bf-welcome-card-image'],
            [
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Login',
                    value: 'https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0'
                },
                {
                    type: ActionTypes.ImBack,
                    title: 'Genera ID',
                    value: 'ecco il tuo id: ' + context.activity.from.id
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Avvia Healthbot',
                    value: 'https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-deploy-azure?view=azure-bot-service-4.0'
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
