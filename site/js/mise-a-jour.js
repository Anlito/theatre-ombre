(async function(global){
  'use strict';const A=global.Atelier;await A.parcoursPret;
  const $=s=>document.querySelector(s);let avant;
  function ouvrir(){avant=[...document.querySelectorAll('.vue')].find(v=>!v.hidden);for(const v of document.querySelectorAll('.vue'))v.hidden=!v.classList.contains('vue-exercices');const p=A.catalogue.paquet().brut;$('.mj-contenu').replaceChildren();const texte=document.createElement('p');texte.textContent='Labo Blocs '+global.LaboBlocs.VERSION_MOTEUR+' · Parcours '+p.versionParcours+' · '+p.exercices.length+' exercices. Le moteur et les exercices sont chargés directement depuis Labo Blocs en ligne. Après une publication dans Labo Blocs, rechargez les pages du projet.';const bouton=document.createElement('button');bouton.className='btn-secondaire';bouton.textContent='Recharger les exercices';bouton.onclick=()=>location.reload();$('.mj-contenu').append(texte,bouton);}
  $('.pb-exercices').addEventListener('click',ouvrir);$('.btn-ouvrir-mise-a-jour').addEventListener('click',ouvrir);$('.btn-retour-exercices').addEventListener('click',()=>{for(const v of document.querySelectorAll('.vue'))v.hidden=v!==avant;});
  const p=A.catalogue.paquet().brut;$('.prof-exercices-version').textContent='Labo Blocs en ligne · moteur '+global.LaboBlocs.VERSION_MOTEUR+' · exercices '+p.versionParcours;
})(this);
