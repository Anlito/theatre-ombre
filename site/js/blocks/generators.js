// Traduction des blocs en petit code JavaScript, exécuté ensuite par l'interpréteur isolé
// (runtime.js). Ce code n'a accès qu'aux fonctions de l'outil :
//   allumer, eteindre, regler, attendre, jouerSon, arreterSons, toutEteindre, ecrire,
//   jeVois, personnageVu, confiance, lireVariable, fixerVariable, surligner.

import { HAT_TYPES, NOBODY, isPwmPin } from './definitions.js';

const API = [
  'allumer', 'eteindre', 'regler', 'attendre', 'jouerSon', 'arreterSons', 'toutEteindre', 'ecrire',
  'jeVois', 'personnageVu', 'confiance', 'lireVariable', 'fixerVariable', 'surligner',
];

// ctx.characterName(id) -> nom actuel du personnage (pour « personnage vu = Loup »).
export function defineGenerators(gen, Order, ctx = {}) {
  // Avant chaque bloc : surligner(id) pour montrer à l'élève le bloc en cours.
  gen.STATEMENT_PREFIX = 'surligner(%1);\n';
  gen.addReservedWords(API.join(','));
  const q = (v) => gen.quote_(String(v ?? ''));
  const pin = (b) => Number(b.getFieldValue('PIN'));
  const value = (b, name, fallback = '0') => gen.valueToCode(b, name, Order.NONE) || fallback;

  const f = gen.forBlock;
  // Niveau 1
  f.quand_je_vois = () => '';
  f.quand_je_ne_vois_plus = () => '';
  f.allumer_led = (b) => `allumer(${pin(b)});\n`;
  f.eteindre_led = (b) => `eteindre(${pin(b)});\n`;
  f.jouer_son = (b) => `jouerSon(${q(b.getFieldValue('SON'))});\n`;
  f.arreter_sons = () => 'arreterSons();\n';
  f.tout_eteindre = () => 'toutEteindre();\n';
  f.attendre = (b) => `attendre(${value(b, 'DUREE')});\n`;

  // Niveau 2
  f.au_demarrage = () => '';
  f.repeter_toujours = (b) => `while (true) {\n${gen.statementToCode(b, 'DO')}}\n`;
  f.regler_led = (b) => `regler(${pin(b)}, ${value(b, 'VALEUR')});\n`;
  f.ecrire = (b) => `ecrire(${value(b, 'TEXTE', "''")});\n`;
  f.ia_je_vois = (b) => [`jeVois(${q(b.getFieldValue('PERSO'))})`, Order.FUNCTION_CALL];
  f.ia_personnage_vu = () => ['personnageVu()', Order.FUNCTION_CALL];
  f.ia_personnage = (b) => {
    const id = b.getFieldValue('PERSO');
    return [q(id === NOBODY ? 'personne' : ctx.characterName?.(id) ?? id), Order.ATOMIC];
  };
  f.ia_confiance = (b) => [`confiance(${q(b.getFieldValue('PERSO'))})`, Order.FUNCTION_CALL];

  // Les variables sont partagées entre tous les blocs « quand… » : elles sont rangées
  // par l'outil (pas dans chaque petit programme), et affichées à l'écran.
  f.variables_get = (b) => [`lireVariable(${q(b.getFieldValue('VAR'))})`, Order.FUNCTION_CALL];
  f.variables_set = (b) => `fixerVariable(${q(b.getFieldValue('VAR'))}, ${value(b, 'VALUE')});\n`;
  f.math_change = (b) => {
    const id = q(b.getFieldValue('VAR'));
    return `fixerVariable(${id}, (Number(lireVariable(${id})) || 0) + (${value(b, 'DELTA')}));\n`;
  };
}

// Blocs qui ont besoin d'un personnage choisi.
const NEEDS_CHARACTER = ['quand_je_vois', 'quand_je_ne_vois_plus', 'ia_je_vois', 'ia_confiance', 'ia_personnage'];

// Prépare les « gestionnaires » : un par bloc « quand… », avec son code.
// Renvoie { handlers: [{ hatId, event: 'vu'|'plus-vu'|'start', perso, code }],
//           problems: [{ blockId, message, level: 'erreur'|'conseil' }] }
// Une « erreur » (bloc incomplet) empêche de démarrer ; un « conseil » non.
export function compile(workspace, gen) {
  gen.init(workspace);
  const handlers = [];
  const problems = [];
  const add = (block, message, level = 'erreur') => problems.push({ blockId: block.id, message, level });

  for (const top of workspace.getTopBlocks(true)) {
    if (top.isShadow() || !top.isEnabled()) continue;
    if (!HAT_TYPES.includes(top.type)) {
      add(top, 'Ce bloc n’est accroché à aucun bloc « quand… » : il ne fera rien.', 'conseil');
      continue;
    }
    // Vérification de tous les blocs de ce programme.
    let complete = true;
    for (const b of top.getDescendants(false)) {
      if (b.isShadow()) continue;
      if (NEEDS_CHARACTER.includes(b.type) && !b.getFieldValue('PERSO')) {
        add(b, "Choisis un personnage (crée-le d'abord à l'étape 1).");
        complete = false;
      }
      // Une case « valeur » vide (condition, nombre…) : il manque une pièce.
      const empty = b.inputList.filter((i) => i.connection?.type === 1 && !i.connection.targetBlock());
      if (empty.length) {
        add(b, 'Il manque une pièce dans ce bloc : remplis la case vide avant de démarrer.');
        complete = false;
      }
      if (b.type === 'regler_led' && !isPwmPin(b.getFieldValue('PIN'))) {
        add(b, `La broche ${b.getFieldValue('PIN')} ne sait pas régler l’intensité : utilise « allumer / éteindre », ou une broche marquée ~ (9, 10, 11…).`);
        complete = false;
      }
    }
    if (!top.getNextBlock()) add(top, 'Accroche des actions sous ce bloc.', 'conseil');
    if (!complete) continue;

    let code = gen.blockToCode(top);
    if (Array.isArray(code)) code = code[0];
    handlers.push({
      hatId: top.id,
      event: top.type === 'quand_je_vois' ? 'vu' : top.type === 'quand_je_ne_vois_plus' ? 'plus-vu' : 'start',
      perso: top.type === 'au_demarrage' ? null : top.getFieldValue('PERSO'),
      code: gen.finish(code),
    });
    gen.init(workspace); // remet à zéro pour le gestionnaire suivant
  }
  return { handlers, problems };
}
