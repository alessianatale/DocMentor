const { app } = require('@azure/functions');

app.timer('timeprova', {
    schedule: '*/30 * * * * *',
    handler: (context, myTimer) => {
        var timeStamp = new Date().toISOString();

        if (myTimer.isPastDue)
        {
            context.log('Node is running late!');
        }
        context.log('Ciao sono Alexxia!', timeStamp);
    }
});
