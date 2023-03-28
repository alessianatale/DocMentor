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
  var admin1 = { idutente: "110822319", ruolo: "admin", nome: "Saverio De Stefano", dataNascita: "03/07/98", codiceFiscale: "DSTFN98PO56", pdf: "url"};
  dbo.collection("users").insertOne(admin1, function(err, res) {
    if (err) throw err;
    console.log("1 document inserted");
    db.close();
  });
});
const users = dbo.collection("users");
const config = { users }

module.exports = config;