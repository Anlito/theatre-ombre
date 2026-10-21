// Raccord au parcours et à l'interface communs : aucun exercice ni moteur local.
import { base64ToFloats, floatsToBase64 } from '../project.js';

export function setupProgramScreen(o) {
  const A=globalThis.LaboBlocs;
  const paquet=A.parcoursDefinis.find(p=>p.id==='theatre-ombre');
  if (!paquet || !A.monterTheatre) throw new Error('Le parcours Théâtre d’ombre est indisponible.');
  const broches=()=>[...new Set(paquet.exercices.flatMap(e=>(e.composants||[]).filter(c=>c.type==='led').map(c=>Number(c.broche.replace('D','')))))];
  o.settings.ledPins=broches();
  const hote=document.createElement('div');
  hote.id='parcours-labo';hote.hidden=true;
  hote.style.cssText='position:fixed;inset:0;z-index:1000;';
  document.body.append(hote);
  const listeners=new Set();
  let legacy=null;
  function visibilite(visible){
    document.body.classList.toggle('parcours-ouvert',visible);
    for(const el of document.querySelectorAll('body > header, body > nav, body > main, body > footer'))el.inert=visible;
  }
  const central=A.monterTheatre(hote,{parcours:paquet,listeHote:document.getElementById('theatre-exercices'),media:'https://anlito.github.io/labo-blocs/module/blockly/media/',
    exerciceOuvert:()=>visibilite(true),parcoursAffiche:()=>visibilite(false),
    equipe:o.getTeam,classe:o.getClass,
    retour:()=>{visibilite(false);o.onReturn?.();},enregistrer:()=>o.onSave?.(),nonEnregistre:()=>o.isDirty?.(),
    message:t=>{if(hote.hidden)return o.showMessage(t,'info');const ancien=hote.querySelector('.message-bref');if(ancien)ancien.remove();const p=document.createElement('p');p.className='message-bref';p.setAttribute('role','alert');p.textContent=t;hote.append(p);setTimeout(()=>p.remove(),7000);},
    modifie(){
      const c=central.session.donnees.programmation.camera;
      if(c){
        const noms=['Rien',...(c.etiquettes||[])];
        o.training.replaceAll(noms.map((nom,i)=>({id:i?'labo-'+i:'fond',name:i?nom:'Fond vide',background:i===0,examples:(c.exemples?.[nom]||[]).map((p,j)=>({id:'labo-'+i+'-'+j,features:base64ToFloats(p.f),thumb:p.v||''}))})));
      }
      listeners.forEach(f=>f({isUiEvent:false}));
    },
  });
  return {
    workspace:{addChangeListener:f=>listeners.add(f)},
    runtime:{get running(){return central.ecran.etat.mode!=='arrete';}},
    saveBlocks:()=>legacy,
    loadBlocks:blocks=>{legacy=blocks;},
    saveProgress:()=>central.preparer(),
    loadProgress(programmation,categories=[]){
      central.charger(programmation);
      if(!programmation && categories.some(c=>c.examples.length)){
        const etiquettes=categories.filter(c=>!c.background).map(c=>c.name);
        const exemples=Object.fromEntries(categories.map(c=>[c.background?'Rien':c.name,c.examples.map(e=>({f:floatsToBase64(e.features),v:e.thumb}))]));
        A.noterCamera(central.session.donnees,{modele:'mobilenet_v2_050_224',etiquettes,exemples});
      }
    },
    resize:()=>central.afficher(),openFinal:()=>central.final(),leave:()=>{central.quitter();visibilite(false);},
    applySettings(){o.settings.ledPins=broches();},
    openExercise:id=>central.ouvrir(id),
    isReady:()=>Object.values(central.preparer().exercices).some(e=>e.programme),
    start(){hote.querySelector('.btn-lancer')?.click();},
    stop:()=>central.ecran.arreter(),central,
  };
}
