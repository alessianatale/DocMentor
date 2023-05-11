// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');
const os = require("os");
const fs = require("fs");

const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

const restify = require('restify');

const { 
    CloudAdapter,
    MemoryStorage,
    ConversationState,
    UserState,
    ConfigurationBotFrameworkAuthentication
} = require('botbuilder');

const { DocMentorBotRecognizer } = require('./recognizer/DocMentorBotRecognizer.js');
const { WelcomeBot } = require('./bots/welcomeBot');


// read .env file & convert to array
const readEnvVars = () => fs.readFileSync(ENV_FILE, "utf-8").split(os.EOL);

const setEnvValue = (key, value) => {
    const envVars = readEnvVars();
    const targetLine = envVars.find((line) => line.split("=")[0] === key);
    if (targetLine !== undefined) {
      // update existing line
      const targetLineIndex = envVars.indexOf(targetLine);
      // replace the key/value with the new value
      envVars.splice(targetLineIndex, 1, `${key}="${value}"`);
    } else {
      // create new key value
      envVars.push(`${key}="${value}"`);
    }
    // write everything back to the file system
    fs.writeFileSync(ENV_FILE, envVars.join(os.EOL));
  };

// salvo gli output di terraform nel .env
varfile = "./terraform.tfstate"
if(fs.existsSync(varfile)) {
  console.log("File found");
  var outputtf = fs.readFileSync(varfile, "utf-8")
  var obj = JSON.parse(outputtf);
  Object.entries(obj.outputs).forEach((entry) => {
    const [key, value] = entry;
    //console.log(`${key}: ${value.value}`);
    setEnvValue(key,value.value)
  });
}

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
const cluConfig = { endpointKey: CluAPIKey, endpoint: CluAPIHostName, projectName: CluProjectName, deploymentName: CluDeploymentName };

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


