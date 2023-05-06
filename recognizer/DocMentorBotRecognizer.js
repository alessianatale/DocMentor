// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { CluRecognizer } = require('../clu/cluRecognizer');

class DocMentorBotRecognizer {
    constructor(config) {
        const cluIsConfigured = config && config.endpointKey && config.endpoint && config.projectName && config.deploymentName;
        if (cluIsConfigured) {
            this.recognizer = new CluRecognizer(config);
        }
    }

    get isConfigured() {
        return (this.recognizer !== undefined);
    }

    /**
     * Returns an object with preformatted CLU results for the bot's dialogs to consume.
     * @param {TurnContext} context
     */
    async executeCluQuery(context) {
        return await this.recognizer.recognizeAsync(context);
    }


    topIntent(response) {
        return response.result.prediction.topIntent;
    }
}

module.exports.DocMentorBotRecognizer = DocMentorBotRecognizer;
