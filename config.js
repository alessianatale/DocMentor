// Read .env file and set environment variables
require('dotenv').config();

var MongoClient = require('mongodb').MongoClient;
//var url = "mongodb://localhost:27017/";
const url = process.env.COSMOS_CONNECTION_STRING;

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  dbo.createCollection("customers", function(err, res) {
    if (err) throw err;
    console.log("Collection created!");
    db.close();
  });
});