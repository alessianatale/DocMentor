// Read .env file and set environment variables
require('dotenv').config();

const { MongoClient } = require('mongodb');
const url = process.env.COSMOS_CONNECTION_STRING;

const client = new MongoClient(url, { useUnifiedTopology: true });

client.connect();
const dbo = client.db("mongodatabase");

var admin1 = { idutente: "110822319", ruolo: "admin", nome: "Saverio De Stefano", citta: "Ariano Irpino", dataNascita: "03/07/1998", codiceFiscale: "DSTFN98PO56"};

dbo.collection("users").insertMany([admin1], function(err, res) {
  if (err) throw err;
  //console.log("1 documents inserted");
  //db.close();
});

const users = dbo.collection("users");
const slotorari = dbo.collection("slotorari");
const prenotazioni = dbo.collection("prenotazioni");
const richiesteRicette = dbo.collection("richiesteRicette")
const farmaci = dbo.collection("farmaci")
const config = { users, slotorari, prenotazioni, richiesteRicette, farmaci }

module.exports = config;
