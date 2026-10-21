import {test} from 'node:test';
import assert from 'node:assert/strict';
import {versionnerModules} from '../tools/preparer-publication.mjs';
test('publication : les dépendances ES partagent la révision, sans figer les imports centraux',()=>{
 const source="import {a} from './ui/program.js';\nimport {\n b\n} from '../config.js?v=ancien';\nexport {c} from './project.js';\nconst d=import('./prof/main.js');\nimport x from 'https://anlito.github.io/labo-blocs/module/x.js';";
 const resultat=versionnerModules(source,'nouveau');
 for(const nom of ['ui/program','../config','project','prof/main'])assert(resultat.includes(nom+'.js?v=nouveau'));
 assert.equal(versionnerModules(resultat,'nouveau'),resultat);
 assert(resultat.includes("from 'https://anlito.github.io/labo-blocs/module/x.js'"));
});
