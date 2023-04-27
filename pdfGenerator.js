// Import dependencies

var pdf = require("pdf-creator-node");

       function generaPDF(ricetta) {
        

                
var html = '<!DOCTYPE html>\n' +
    '<html>\n' +
    '<head>\n' +
    '<link href=\'https://fonts.googleapis.com/css?family=Libre Barcode 39\' type="text/css" rel=\'stylesheet\'>\n' +
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
    '\t<h1 >Servizio Sanitario Nazionale</h1>\n' +
    '\n' +
    '\t<table >\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Nome paziente:</th>\n' +
    '\t\t\t<td>'+ricetta.nomePaziente+'</td>\n' +
    '\t\t\t<td>                   </td>\n' +
    '\t\t\t<td><p>'+ricetta.codiceFiscale+'</p></td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Data di nascita:</th>\n' +
    '\t\t\t<td>'+ricetta.dataNascita+'</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Data di emissione:</th>\n' +
    '\t\t\t<td>'+ricetta.dataEmissione+'</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Medico prescrittore:</th>\n' +
    '\t\t\t<td>'+ricetta.nomeMedico+'</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Indirizzo:</th>\n' +
    '\t\t\t<td>'+ricetta.indirzzo+'</td>\n' +
    '\t\t</tr>\n' +
    
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
    '\t\t\t\t<th style="border: 1px solid black;">Note</th>\n' +
    '\t\t\t</tr>\n' +
    '\t\t</thead>\n' +
    '\t\t<tbody>\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].quantita+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].nome+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].dosaggio+'</td>\n' +
    '\t\t\t\t\n' +
    
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].note+'</td>\n' +
    '\t\t\t</tr>\n' +
    '\t\t\t\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].quantita+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].nome+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].dosaggio+'</td>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].note+'</td>\n' +
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
