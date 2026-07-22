let calendrier;



const DUREE_MINIMUM = 30;



async function chargerReservations(){

const reponse = await fetch("data/reservations.json");

const donnees = await reponse.json();

return donnees.reservations;

}





async function chargerBoxes(){

const reponse = await fetch("data/boxes.json");

const donnees = await reponse.json();

return donnees.boxes;

}





function ajouterJours(date, jours){


let nouvelleDate = new Date(date);


nouvelleDate.setDate(
nouvelleDate.getDate()+jours
);


return nouvelleDate.toISOString().split("T")[0];

}





function periodeDisponible(debut,fin,reservations,box){


return !reservations.some(res=>{


if(res.box !== box){

return false;

}


let debutReserve =
new Date(res.debut);


let finReserve =
new Date(res.fin);



return (

new Date(debut)<=finReserve

&&

new Date(fin)>=debutReserve

);


});


}






async function afficherCalendrier(boxId){


let reservations =
await chargerReservations();



let evenements = [];



reservations.forEach(res=>{


if(res.box === boxId){


evenements.push({

title:"Occupé",

start:res.debut,

end:res.fin,

display:"background",

backgroundColor:"#e74c3c"

});


}


});





if(calendrier){

calendrier.destroy();

}





calendrier = new FullCalendar.Calendar(

document.getElementById("calendar"),

{


initialView:"dayGridMonth",

locale:"fr",


events:evenements,



dateClick:function(info){


let debut = info.dateStr;


let fin = ajouterJours(
debut,
DUREE_MINIMUM
);



document.getElementById("dateDebut").innerHTML =
"Début : "+debut;



document.getElementById("dateFin").innerHTML =
"Fin minimum : "+fin;



if(
periodeDisponible(
debut,
fin,
reservations,
boxId
)

){


document.getElementById("resultatReservation").innerHTML =

"🟢 Votre box est disponible";


}

else{


document.getElementById("resultatReservation").innerHTML =

"🔴 Cette période est indisponible";


}



}


}

);


calendrier.render();


}




document
.getElementById("choixBox")
.addEventListener(
"change",
function(){

afficherCalendrier(this.value);

}

);



afficherCalendrier("box1");
