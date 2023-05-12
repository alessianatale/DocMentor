const { MongoClient } = require('mongodb');


module.exports = async function(context) {

    const urlenv = process.env.MONGOURL
    const client = new MongoClient(urlenv);
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

            var updatedorari = {$push: {orari:orariGiornoCorrente[y] }};
            await slotorari.updateOne(slot, updatedorari);
        }
        prenotazioni.deleteMany({giorno:giorno})
    }else{
        console.log(`non sono presenti prenotazioni per ${giorno} `);
    }
    console.log("func in esecuzione")
};
