// Read .env file and set environment variables
require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');
//const MongoClient = require('mongodb');
const url = process.env.COSMOS_CONNECTION_STRING;

const client = new MongoClient(url);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
/*const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});*/

client.connect();
const dbo = client.db("mongodatabase");

/*
var admin1 = { idutente: "110822319", ruolo: "admin", nome: "Saverio De Stefano", citta: "Ariano Irpino", dataNascita: "03/07/1998", codiceFiscale: "DSTFN98PO56"};
var medico1 = { idutente: "407896048", ruolo: "medico", nome: "Alessia Natale", citta: "Caserta", indirizzo: "via santissimo nome di maria, 34", codiceFiscale: "NTLSSDN98PO8H"};
var paziente1 = {idutente: "1234567" , ruolo: "paziente", nome: "Viviana Veccia", dataNascita: "14/06/1968", citta: "Caserta", indirizzo: "Via ss 9", codiceFiscale: "VCCVN89H45SD", pdf: "", idmedico:"407896048"};
var prenotazione1 = { idpaziente: "407896048", giorno: "mercoledì", orario: "8", idmedico: "407896048"}
var prenotazione2 = { idpaziente: "407896048", giorno: "mercoledì", orario: "9", idmedico: "407896048"}
var prenotazione3 = { idpaziente: "407896048", giorno: "lunedì", orario: "9", idmedico: "407896048"}
var slot = {idmedico: "407896048", giorno: "mercoledì", array: ["2","4"]};


dbo.collection("users").insertMany([admin1], function(err, res) {
  if (err) throw err;
  console.log("1 documents inserted");
  //db.close();
});

dbo.collection("prenotazioni").insertMany([prenotazione1,prenotazione2,prenotazione3], function(err, res) {
  if (err) throw err;
  console.log("1 document inserted");
  //db.close();
});

dbo.collection("slotorari").insertMany([slot], function(err, res) {
  if (err) throw err;
  console.log("1 document inserted");
  //db.close();
});*/

const users = dbo.collection("users");
const slotorari = dbo.collection("slotorari");
const prenotazioni = dbo.collection("prenotazioni");
const richiesteRicette = dbo.collection("richiesteRicette")
const farmaci = dbo.collection("farmaci")
const config = { users, slotorari, prenotazioni, richiesteRicette, farmaci }

module.exports = config;
