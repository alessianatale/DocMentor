
class Ricetta {
    constructor(nomePaziente,nomeMedico,dataNascita,dataEmissione,indirizzo,codiceFiscale,farmaci) {
        
        this.nomePaziente = nomePaziente;
        this.nomeMedico = nomeMedico;
        this.dataNascita = dataNascita;
        this.dataEmissione=dataEmissione;
        this.indirizzo = indirizzo;
        this.codiceFiscale=codiceFiscale;
        this.farmaci=farmaci;
        
        
    }
}

module.exports.Ricetta = Ricetta;