let prixMensuel = 60;


function calculerMois(dateDebut,dateFin){


let debut = new Date(dateDebut);
let fin = new Date(dateFin);


let difference =
fin - debut;


let jours =
difference /
(1000*60*60*24);



let mois =
Math.ceil(jours/30);



return mois;


}



function afficherResume(dateDebut,dateFin){


let mois =
calculerMois(
dateDebut,
dateFin
);



let total =
mois * prixMensuel;



document.getElementById("prix").innerHTML =

"Durée : "
+
mois
+
" mois<br>"
+
"Prix total : "
+
total
+
" €";


}
