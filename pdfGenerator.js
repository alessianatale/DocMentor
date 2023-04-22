// Import dependencies
var pdf = require("pdf-creator-node");

       function generaPDF() {
                
var html = '<!DOCTYPE html>\n' +
    '<html>\n' +
    '<head>\n' +
    '<link href=\'https://fonts.googleapis.com/css?family=Libre Barcode 39\' rel=\'stylesheet\'>\n' +
    '<style>\n' +
    'h1 {\n' +
    '  text-align: center;\n' +
    '}\n' +
    '\n' +
    'h2 {\n' +
    ' text-align: center;\n' +
    '}\n' +
    '\n' +
    'h3 {\n' +
    ' text-align: center;\n' +
    '}\n' +
    '\n' +
    'p {\n' +
    '    font-family: \'Libre Barcode 39\';font-size: 22px;\n' +
    '}\n' +
    '\n' +
    '\n' +
    '</style>\n' +
    '\n' +
    '\t<title>Ricetta medica italiana</title>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div  style="border: 1px solid black;">\n' +
    '\t<h1 >Ricetta medica italiana</h1>\n' +
    '\n' +
    '\t<table >\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Nome paziente:</th>\n' +
    '\t\t\t<td>Nome Cognome</td>\n' +
    '\t\t\t<td>                   </td>\n' +
    '\t\t\t<td><p>DSTSVR98L03A399F</p></td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Data di nascita:</th>\n' +
    '\t\t\t<td>01/01/1970</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Data di emissione:</th>\n' +
    '\t\t\t<td>22/04/2023</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Medico prescrittore:</th>\n' +
    '\t\t\t<td>Nome Cognome</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Specializzazione:</th>\n' +
    '\t\t\t<td>Specializzazione medica</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Indirizzo:</th>\n' +
    '\t\t\t<td>Via Nome Via, Numero Civico</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Telefono:</th>\n' +
    '\t\t\t<td>000 0000000</td>\n' +
    '\t\t\t\n' +
    '\t\t\t\n' +
    '\t\t</tr>\n' +
    '\t</table>\n' +
    '\t<h2 >Prescrizione</h2>\n' +
    '\t<table style="margin-left: auto;\n' +
    '  margin-right: auto;">\n' +
    '\t\t<thead>\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t<th style="border: 1px solid black;\n' +
    'border-right-style: none">Quantità</th>\n' +
    '\t\t\t\t<th style="border: 1px solid black;">Nome farmaco</th>\n' +
    '\t\t\t\t<th style="border: 1px solid black;">Dosaggio</th>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<th style="border: 1px solid black;">Durata trattamento</th>\n' +
    '\t\t\t\t<th style="border: 1px solid black;">Note</th>\n' +
    '\t\t\t</tr>\n' +
    '\t\t</thead>\n' +
    '\t\t<tbody>\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">1</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">Nome del farmaco 1</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">xxx mg</td>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<td style="border: 1px solid black;">xxx giorni/mesi</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">Da assumere a stomaco vuoto</td>\n' +
    '\t\t\t</tr>\n' +
    '\t\t\t\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">2</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">Nome del farmaco 2</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">yyy mg</td>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<td style="border: 1px solid black;">yyy giorni/mesi</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">Da assumere dopo i pasti</td>\n' +
    '\t\t\t</tr>\n' +
    '</div>\n' +
    '\t\t\t\n' +
    '\t\t\t<!-- Aggiungi altre righe per altri\n';

var options = {
    format: "A5",
    orientation: "portrait",
    border: "1mm",

};


var document = {
    html: html,
    data: {

    },
    path: "./ricetta.pdf",
    type: "",
};

pdf
    .create(document, options)
    .then((res) => {
        console.log(res);
    })
    .catch((error) => {
        console.error(error);
    });


        }
      

//pdfGenerator.generaPDF();

module.exports = generaPDF;
