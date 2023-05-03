// Import dependencies

var pdf = require("pdf-creator-node");

       function generaPDF(ricetta) {



var html = '<!DOCTYPE html>\n' +
    '<html>\n' +
    '<head>\n' +
    '<link href=\'https://fonts.googleapis.com/css?family=Libre Barcode 39\' rel=\'stylesheet\'>\n' +
    '<style>\n' +
    '\n' +
    '\n' +
    '#table, #th, #td {\n' +
    '  border: 1px solid black;\n' +
    '  border-collapse: collapse;\n' +
    '}\n' +
    '\n' +
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
    '\n' +
    '\n' +
    '</style>\n' +
    '\n' +
    '\t<title>Ricetta medica italiana</title>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div  class="div3" style="border: 1px solid black;">\n' +
    '\t<h1 >Servizio Sanitario Nazionale</h1>\n' +
    '\n' +
    '\t<table >\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Nome paziente:</th>\n' +
    '\t\t\t<td>'+ricetta.nomePaziente+'</td>\n' +
    '\t\t\t<td>                   </td>\n' +
    '\t\t\t<td style = " font-family: \'Libre Barcode 39\';font-size: 22px;"><p>'+ricetta.codiceFiscale+'</p></td>\n' +
    '\t\t</tr>\n' +
    '        <tr>\n' +
    '\t\t\t<th>Esenzione: </th>\n' +
    '\t\t\t<td>'+ricetta.esenzione+'</td>\n' +
    '\t\t</tr>\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Data di nascita:</th>\n' +
    '\t\t\t<td>'+ricetta.dataNascita+'</td>\n' +
    '\t\t</tr>\n' +
    '\t\t\n' +
    '\t\t\n' +
    '\t\t<tr>\n' +
    '\t\t\t<th>Indirizzo:</th>\n' +
    '\t\t\t<td>'+ricetta.indirizzo+'</td>\n' +
    '\t\t</tr>\n' +
    '\t\t\n' +
    '\t</table>\n' +
    '\t<h2 >Prescrizione</h2>\n' +
    '\t<table id ="table"style="margin-left: auto;\n' +
    '  margin-right: auto; width:100%">\n' +
    '\t\t<thead>\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<th id="th" >Nome farmaco</th>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<th id="th">Quantità</th>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<th id="th">Note</th>\n' +
    '\t\t\t</tr>\n' +
    '\t\t</thead>\n' +
    '\t\t<tbody>\n' +
    '\t\t\t<tr>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].nome+'  '+ricetta.farmaci[0].dosaggio+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[0].quantita+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">---</td>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t\n' +
    '\t\t\t</tr>\n' +
    '\t\t\t\n' +
    '\t\t\t<tr >\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[1].nome+'  '+ricetta.farmaci[1].dosaggio+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">'+ricetta.farmaci[1].quantita+'</td>\n' +
    '\t\t\t\t<td style="border: 1px solid black;">---</td>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t\n' +
    '\t\t\t</tr>\n' +
    '\n' +
    '\t\t\t</tbody>\n' +
    '\n' +
    '</table>\n' +
    '\n' +
    '</div>\n' +
    '<div  class="div4">\n' +
    '<p  align=" center"> \n' +
    'TIPO RICETTA:Assist.SSN DATA:  '+ricetta.dataEmissione+' CODICE FISCALE DEL MEDICO:'+ricetta.codiceFiscaleMedico+'<br>\n' +
    'COGNOME E NOME DEL MEDICO: '+ricetta.nomeMedico+'<br>\n' +
    'Rilasciato ai sensi dell\'art.11, comma 16 del DL 31 mag 2010, n.78 e dell’art.1, comma 4 del DM 2 nov 2011 </p>\n' +
    ' </div>\n' +
    '\n' +
    '</body>';



var options = {
    format: "A5",
    orientation: "portrait",
    border: "1mm",
    footer: {
        height: "28mm",
        contents: {
            first: "",

        }
    }


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
