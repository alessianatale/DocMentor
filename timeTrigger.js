module.exports = async function (context, myTimer) {
    var timeStamp = new Date().toISOString();

    if (myTimer.isPastDue)
    {
        context.log('Node is running late!');
    }
    context.log('Ciao sono Alexxia!', timeStamp);
};