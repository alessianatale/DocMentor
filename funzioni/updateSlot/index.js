const { MongoClient } = require('mongodb');


module.exports = async function(context) {

    //const url = 'mongodb://cosmodbaccount-93411:xTdN0waIPogMQC5HP2U8UGH1KjEM1W5JkCl0XabyA4rLCfRyrVC4WLv27xi9ZDv9wSoii4CloVS8ACDbSZJznA==@cosmodbaccount-93411.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@cosmodbaccount-93411@';
    const url = 'mongodb+srv://savede:passw@cluster0.hchpxcl.mongodb.net/test';
    const client = new MongoClient(url);
    var moment = require('moment');

    var timeStamp = moment();
    timeStamp.locale('it');
    var giorno = timeStamp.format('dddd');

    client.connect();

    const database = client.db("mongodatabase");

    const slotorari = database.collection("slotorari");
    const prenotazioni = database.collection("prenotazioni");

    const prenotazioniEffettuate = await prenotazioni.find({giorno:giorno}).toArray();
    const mediciPrenotati = prenotazioniEffettuate.map(function(i) { return i.idmedico  });
    const orariGiornoCorrente = prenotazioniEffettuate.map(function(i) { return i.orario  });
    if(mediciPrenotati != undefined){
        for(let y=0; y < mediciPrenotati.length; y++){
            const slot = await slotorari.findOne({idmedico: mediciPrenotati[y], giorno: giorno });

            console.log(mediciPrenotati[y])
            console.log(orariGiornoCorrente[y])
            console.log(giorno)

            var updatedorari = {$push: {orari:orariGiornoCorrente[y] }};
            await slotorari.updateOne(slot, updatedorari);
        }
        prenotazioni.deleteMany({giorno:giorno})
    }else{
        console.log(`non sono presenti prenotazioni per ${giorno} `);
    }

    context.log('Ciao sono Alexxia!', timeStamp);
};
