import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serialize,parse} from '../site/js/project.js';
test('le fichier Théâtre conserve le parcours, les photos IA et les anciens blocs',()=>{
  const programmation={format:'labo-blocs/sauvegarde',version:1,parcours:{id:'theatre-ombre',version:'1.0.0'},exerciceCourant:'theatre-04',exercices:{'theatre-03':{statut:'reussi',programme:{blocks:{languageVersion:0,blocks:[]}}}},camera:{modele:'mobilenet_v2_050_224',etiquettes:['Loup','Roi'],exemples:{Rien:[{f:'AAAAAA==',v:''}]}}};
  const legacy={parNiveau:{1:{blocks:{blocks:[{type:'quand_je_vois'}]}}}};
  const fichier=serialize({team:['Test'],settings:{},categories:[],blocks:legacy,programmation,carnet:{}});
  const r=parse(JSON.stringify(fichier));assert(r.ok);assert.deepEqual(r.project.programmation,programmation);assert.deepEqual(r.project.blocks,legacy);
});
