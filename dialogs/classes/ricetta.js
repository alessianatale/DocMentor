
class Ricetta {
    constructor(nomePaziente,dataNascita,citta,indirizzo,codiceFiscale,farmaci,nomeMedico,codiceFiscaleMedico,dataEmissione,esenzione) {
        
        //dati paziente
        this.nomePaziente = nomePaziente;
        this.dataNascita = dataNascita;
        this.citta=citta;
        this.indirizzo = indirizzo;
        this.codiceFiscale=codiceFiscale;
        this.esenzione = esenzione;
        //array farmaci
        this.farmaci=farmaci;

        //dati medico
        this.nomeMedico = nomeMedico;
        this.codiceFiscaleMedico=codiceFiscaleMedico;

        this.dataEmissione=dataEmissione;

    }
}

module.exports.Ricetta = Ricetta;