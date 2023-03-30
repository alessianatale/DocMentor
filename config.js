// Read .env file and set environment variables
require('dotenv').config();

var MongoClient = require('mongodb').MongoClient;
const url = process.env.COSMOS_CONNECTION_STRING;

const client = new MongoClient(url);
client.connect();
const dbo = client.db("mongodatabase");

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  //var dbo = db.db("mongodatabase");
  var admin1 = { idutente: "110822319", ruolo: "admin", nome: "Saverio De Stefano", citta: "Ariano Irpino", dataNascita: "03/07/98", codiceFiscale: "DSTFN98PO56"};
  var medico1 = { idutente: "407896048", ruolo: "medico", nome: "Alessia Natale", citta: "Caserta", indirizzo: "via santissimo nome di maria, 34", codiceFiscale: "NTLSSDN98PO8H"};
  dbo.collection("users").insertMany([admin1, medico1], function(err, res) {
    if (err) throw err;
    console.log("2 documents inserted");
    db.close();
  });
});
const users = dbo.collection("users");
const config = { users }

module.exports = config;