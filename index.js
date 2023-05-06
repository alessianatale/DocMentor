// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Import required packages
const path = require('path');
// const axios = require('axios');

// Read botFilePath and botFileSecret from .env file
const ENV_FILE = path.join(__dirname, '.env');
const generaPDF = require('./pdfGenerator');
require('dotenv').config({ path: ENV_FILE });
const {Ricetta} = require('./dialogs/ricetta.js');
const {Farmaco} = require('./dialogs/farmaco.js');

const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { 
    CloudAdapter,
    MemoryStorage,
    ConversationState,
    UserState,
    ConfigurationBotFrameworkAuthentication
} = require('botbuilder');

const { DocMentorBotRecognizer } = require('./recognizer/DocMentorBotRecognizer.js');

const { WelcomeBot } = require('./bots/welcomeBot');
const { main } = require('./dialogs/main');

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);

// Create bot adapter.
// See https://aka.ms/about-bot-adapter to learn more about bot adapter.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights. See https://aka.ms/bottelemetry for telemetry
    //       configuration instructions.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
    // Clear out state
    await conversationState.delete(context);
};

// var farmaci =[];
// farmaci.push(new Farmaco("zuzu",1,3));
// farmaci.push(new Farmaco("zuzu",1,3));
// generaPDF(new Ricetta("saverio de stefano","03/07/1998","ariano" ,"via 4 nonvembre","dstsvrmnnj399f",farmaci, "grazia peluso", "plsgrzvghbhs399f", "01/05/2023","E200"));
// Send a POST request

// axios
//   .post("https://prod-90.westeurope.logic.azure.com:443/workflows/0aad7b728738441b932696f1d5740b38/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=TeIj5fgJ1LeNw5JxP7Loo3sTQCZxV-hmxhUbAQ0-2NI", {
//     Id: 110822319,
//   })
//   .then((response) => displayOutput(response))
//   .catch((err) => console.log(err));
// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// If configured, pass in the DocMentorBotRecognizer.  (Defining it externally allows it to be mocked for tests)
const { CluAPIKey, CluAPIHostName, CluProjectName, CluDeploymentName } = process.env;
const cluConfig = { endpointKey: CluAPIKey, endpoint: `https://${ CluAPIHostName }`, projectName: CluProjectName, deploymentName: CluDeploymentName };

const cluRecognizer = new DocMentorBotRecognizer(cluConfig);

// Create the main dialog.
const dialog = new main(cluRecognizer,userState);
const bot = new WelcomeBot(conversationState, userState, dialog);



// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');

});

// Listen for incoming activities and route them to your bot main dialog.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => bot.run(context));
});
