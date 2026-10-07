// Niveau 3 : traduction PÉDAGOGIQUE des blocs en C++ Arduino (lecture seule).
// Ce qui s'exécute vraiment en classe reste le programme en blocs, dans le navigateur.
// Le code produit doit pourtant se compiler tel quel sur une Uno ou une Nano (vérifié par les tests).
//
// La carte n'a pas de webcam : dans ce programme « autonome », l'ordinateur lui enverrait le nom du
// personnage reconnu par le câble USB (une ligne de texte), lu avec Serial.readStringUntil('\n').
//
// generateArduino() renvoie { code, lines } : lines[idBloc] = [[première ligne, dernière ligne], …]
// pour surligner les lignes d'un bloc (et retrouver le bloc d'une ligne).

import { NOBODY } from './definitions.js';

const O = { ATOMIC: 0, CALL: 2, UNARY: 3, MULT: 5, ADD: 6, REL: 8, EQ: 9, AND: 13, OR: 14, ASSIGN: 15, NONE: 99 };
const START = '\u0001';
const END = '\u0002';
const RESERVED =
  'setup,loop,if,else,for,while,do,break,continue,return,int,long,float,double,bool,char,void,String,true,false,' +
  'HIGH,LOW,INPUT,OUTPUT,Serial,delay,digitalWrite,analogWrite,pinMode,random,pow,personnage,personnagePrecedent,' +
  'ecouter,jeVois,personnageVu,confiance,toutEteindre,auto,const,static,switch,case,default,new,delete,class,struct';

let generator = null;

function makeGenerator(Blockly) {
  const gen = new Blockly.CodeGenerator('Arduino');
  gen.INDENT = '  ';
  gen.ORDER_OVERRIDES = [];
  const f = gen.forBlock;
  const v = (b, name, order, fallback = '0') => gen.valueToCode(b, name, order) || fallback;
  const pin = (b) => {
    const p = Number(b.getFieldValue('PIN'));
    gen.state.pins.add(p);
    return p;
  };
  const cstr = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  const body = (b, name) => gen.statementToCode(b, name);

  // Marqueurs invisibles autour de chaque bloc « action » : ils servent à retrouver ses lignes.
  gen.scrub_ = function (block, code, thisOnly) {
    let out = code;
    if (!block.outputConnection && code) out = `${START}${block.id}\n${code}${END}${block.id}\n`;
    const next = block.nextConnection?.targetBlock();
    return thisOnly || !next ? out : out + this.blockToCode(next);
  };
  gen.scrubNakedValue = (line) => `${line};\n`;

  // --- Niveau 1 -------------------------------------------------------------------------------
  f.allumer_led = (b) => `digitalWrite(${pin(b)}, HIGH);  // allume la LED de la broche ${b.getFieldValue('PIN')}\n`;
  f.eteindre_led = (b) => `digitalWrite(${pin(b)}, LOW);  // éteint la LED de la broche ${b.getFieldValue('PIN')}\n`;
  f.attendre = (b) => {
    const s = v(b, 'DUREE', O.MULT);
    if (/^\d+(\.\d+)?$/.test(s)) return `delay(${Math.round(Number(s) * 1000)});  // attendre ${s} s (en millisecondes)\n`;
    return `delay((${s}) * 1000);  // attendre (en millisecondes)\n`;
  };
  f.jouer_son = (b) =>
    `Serial.println(${cstr('SON:' + gen.ctx.soundName(b.getFieldValue('SON')))});  // le son est joué par l'ordinateur : la carte le lui demande\n`;
  f.arreter_sons = () => `Serial.println("SON:STOP");  // demande à l'ordinateur d'arrêter les sons\n`;
  f.tout_eteindre = () => {
    gen.state.helpers.add('toutEteindre');
    return 'toutEteindre();\n';
  };

  // --- Niveau 2 ---------------------------------------------------------------------------------
  f.repeter_toujours = (b) => `while (true) {  // répéter indéfiniment\n${body(b, 'DO')}}\n`;
  f.regler_led = (b) => `analogWrite(${pin(b)}, ${v(b, 'VALEUR', O.NONE)});  // intensité de 0 (éteinte) à 255 (à fond)\n`;
  f.ecrire = (b) => `Serial.println(${v(b, 'TEXTE', O.NONE, '""')});  // message envoyé à l'ordinateur\n`;
  f.controls_repeat_ext = (b) => {
    const i = `i${++gen.state.loops}`;
    return `for (int ${i} = 0; ${i} < ${v(b, 'TIMES', O.REL)}; ${i}++) {  // répéter\n${body(b, 'DO')}}\n`;
  };
  f.controls_whileUntil = (b) => {
    const cond = v(b, 'BOOL', b.getFieldValue('MODE') === 'UNTIL' ? O.UNARY : O.NONE, 'false');
    const test = b.getFieldValue('MODE') === 'UNTIL' ? `!${cond}` : cond;
    return `while (${test}) {  // répéter tant que\n${body(b, 'DO')}}\n`;
  };
  f.controls_if = (b) => {
    let code = '';
    let n = 0;
    while (b.getInput('IF' + n)) {
      code += `${n ? ' else ' : ''}if (${v(b, 'IF' + n, O.NONE, 'false')}) {\n${body(b, 'DO' + n)}}`;
      n++;
    }
    if (b.getInput('ELSE')) code += ` else {\n${body(b, 'ELSE')}}`;
    return code + '\n';
  };
  f.controls_flow_statements = (b) => (b.getFieldValue('FLOW') === 'BREAK' ? 'break;  // quitter la boucle\n' : 'continue;\n');
  f.logic_compare = (b) => {
    const op = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }[b.getFieldValue('OP')];
    const order = op === '==' || op === '!=' ? O.EQ : O.REL;
    return [`${v(b, 'A', order)} ${op} ${v(b, 'B', order)}`, order];
  };
  f.logic_operation = (b) => {
    const and = b.getFieldValue('OP') === 'AND';
    const order = and ? O.AND : O.OR;
    return [`${v(b, 'A', order, 'false')} ${and ? '&&' : '||'} ${v(b, 'B', order, 'false')}`, order];
  };
  f.logic_negate = (b) => [`!${v(b, 'BOOL', O.UNARY, 'true')}`, O.UNARY];
  f.logic_boolean = (b) => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', O.ATOMIC];
  f.math_number = (b) => {
    const n = Number(b.getFieldValue('NUM'));
    return [String(n), n < 0 ? O.UNARY : O.ATOMIC];
  };
  f.math_arithmetic = (b) => {
    const op = b.getFieldValue('OP');
    if (op === 'POWER') return [`pow(${v(b, 'A', O.NONE)}, ${v(b, 'B', O.NONE)})`, O.CALL];
    const [sym, order] = { ADD: ['+', O.ADD], MINUS: ['-', O.ADD], MULTIPLY: ['*', O.MULT], DIVIDE: ['/', O.MULT] }[op];
    return [`${v(b, 'A', order)} ${sym} ${v(b, 'B', order + 0.5)}`, order];
  };
  f.math_random_int = (b) => (gen.state.helpers.add('random'), [`random(${v(b, 'FROM', O.NONE)}, ${v(b, 'TO', O.ADD)} + 1)`, O.CALL]);
  f.text = (b) => [cstr(b.getFieldValue('TEXT')), O.ATOMIC];
  f.variables_get = (b) => [gen.state.varName(b.getFieldValue('VAR')), O.ATOMIC];
  f.variables_set = (b) => `${gen.state.varName(b.getFieldValue('VAR'))} = ${v(b, 'VALUE', O.ASSIGN)};\n`;
  f.math_change = (b) => `${gen.state.varName(b.getFieldValue('VAR'))} = ${gen.state.varName(b.getFieldValue('VAR'))} + ${v(b, 'DELTA', O.ADD)};\n`;
  f.ia_je_vois = (b) => {
    gen.state.helpers.add('jeVois');
    return [`jeVois(${cstr(gen.ctx.characterName(b.getFieldValue('PERSO')))})`, O.CALL];
  };
  f.ia_personnage_vu = () => {
    gen.state.helpers.add('personnageVu');
    return ['personnageVu()', O.CALL];
  };
  f.ia_personnage = (b) => {
    const id = b.getFieldValue('PERSO');
    return [cstr(id === NOBODY ? 'personne' : gen.ctx.characterName(id)), O.ATOMIC];
  };
  f.ia_confiance = (b) => {
    gen.state.helpers.add('confiance');
    return [`confiance(${cstr(gen.ctx.characterName(b.getFieldValue('PERSO')))})`, O.CALL];
  };
  // Blocs « quand… » : traités par generateArduino (ils deviennent setup() et loop()).
  f.quand_je_vois = () => '';
  f.quand_je_ne_vois_plus = () => '';
  f.au_demarrage = () => '';
  return gen;
}

// Nom de variable C++ valide et lisible (sans accents ni espaces), unique.
function makeVarNames(workspace) {
  const names = new Map();
  const used = new Set(RESERVED.split(','));
  for (const variable of workspace.getVariableMap().getAllVariables()) {
    let base = variable
      .getName()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!base || /^\d/.test(base)) base = 'v_' + base;
    let name = base;
    for (let i = 2; used.has(name); i++) name = `${base}${i}`;
    used.add(name);
    names.set(variable.getId(), { name, label: variable.getName() });
  }
  return names;
}

// Une variable reçoit-elle du texte (personnage vu, texte…) ? Sinon c'est un nombre entier (int).
function isTextVariable(workspace, id) {
  return workspace
    .getAllBlocks(false)
    .some((b) => b.type === 'variables_set' && b.getFieldValue('VAR') === id && (b.getInputTargetBlock('VALUE')?.outputConnection?.getCheck() ?? []).includes('String'));
}

const indent = (code, n = 1) =>
  code
    .split('\n')
    .map((l) => (l ? '  '.repeat(n) + l : l))
    .join('\n');
const wrap = (id, code) => `${START}${id}\n${code}${END}${id}\n`;

// ctx : { characterName(id), soundName(id), team: [], ledPins: [] }
export function generateArduino(Blockly, workspace, ctx) {
  if (!generator) generator = makeGenerator(Blockly);
  const gen = generator;
  gen.init(workspace);
  const vars = makeVarNames(workspace);
  gen.ctx = ctx;
  gen.state = { pins: new Set(), helpers: new Set(), loops: 0, varName: (id) => vars.get(id)?.name ?? 'variable' };

  const chain = (first) => {
    let code = '';
    for (let b = first; b; b = b.getNextBlock()) code += gen.blockToCode(b, true);
    return code;
  };
  const setupParts = [];
  const loopParts = [];
  const seeParts = [];
  const unseeParts = [];
  const name = (hat) => ctx.characterName(hat.getFieldValue('PERSO'));
  const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

  for (const hat of workspace.getTopBlocks(true)) {
    if (!hat.isEnabled() || hat.isShadow()) continue;
    if (hat.type === 'au_demarrage') {
      // Ce qui est avant « répéter indéfiniment » va dans setup() ; l'intérieur de la boucle, dans loop().
      let before = '';
      let forever = null;
      for (let b = hat.getNextBlock(); b; b = b.getNextBlock()) {
        if (b.type === 'repeter_toujours') {
          forever = b;
          break;
        }
        before += gen.blockToCode(b, true);
      }
      setupParts.push(wrap(hat.id, `// quand le programme démarre\n${before}`));
      if (forever) {
        loopParts.push(wrap(hat.id, wrap(forever.id, `// répéter indéfiniment : loop() recommence sans arrêt\n${chain(forever.getInputTargetBlock('DO'))}`)));
      }
    } else if (hat.type === 'quand_je_vois' && hat.getFieldValue('PERSO')) {
      seeParts.push(wrap(hat.id, `if (personnage == ${q(name(hat))}) {  // quand je vois ${name(hat)}\n${indent(chain(hat.getNextBlock()))}}\n`));
    } else if (hat.type === 'quand_je_ne_vois_plus' && hat.getFieldValue('PERSO')) {
      unseeParts.push(wrap(hat.id, `if (personnagePrecedent == ${q(name(hat))}) {  // quand je ne vois plus ${name(hat)}\n${indent(chain(hat.getNextBlock()))}}\n`));
    }
  }

  const pins = gen.state.pins.size ? [...gen.state.pins].sort((a, b) => a - b) : [...(ctx.ledPins ?? [])];
  const h = gen.state.helpers;
  const out = [];
  out.push(
    '// ======================================================================',
    "//  Théâtre d'ombre augmenté : programme traduit en C++ pour Arduino",
    `//  Équipe : ${ctx.team?.length ? ctx.team.join(', ') : '(sans nom)'}`,
    '//',
    "//  ATTENTION : c'est une TRADUCTION pour comprendre. En classe, c'est le",
    '//  programme en blocs qui s\'exécute, dans le navigateur ("en direct").',
    "//  La carte n'a pas de webcam : la reconnaissance se fait sur l'ordinateur,",
    '//  qui lui envoie le nom du personnage par le câble USB (une ligne de texte).',
    '// ======================================================================',
    '',
    'String personnage = "personne";          // personnage reconnu, reçu de l\'ordinateur',
    'String personnagePrecedent = "personne"; // personnage reconnu juste avant',
  );
  for (const [id, { name: varName, label }] of vars) {
    out.push(isTextVariable(workspace, id) ? `String ${varName} = "";  // variable « ${label} »` : `int ${varName} = 0;  // variable « ${label} »`);
  }
  out.push(
    '',
    "// Lit le nom du personnage envoyé par l'ordinateur, s'il y en a un.",
    'void ecouter() {',
    '  if (Serial.available() > 0) {',
    "    personnage = Serial.readStringUntil('\\n');",
    '    personnage.trim();  // enlève les espaces et retours à la ligne',
    '  }',
    '}',
  );
  if (h.has('jeVois')) out.push('', '// Vrai si le personnage reconnu est celui demandé.', 'bool jeVois(String nom) {', '  ecouter();', '  return personnage == nom;', '}');
  if (h.has('personnageVu')) out.push('', 'String personnageVu() {', '  ecouter();', '  return personnage;', '}');
  if (h.has('confiance')) {
    out.push('', "// Simplifié : la carte ne reçoit que le nom, pas la confiance calculée par l'IA.", 'int confiance(String nom) {', '  ecouter();', '  return (personnage == nom) ? 100 : 0;', '}');
  }
  if (h.has('toutEteindre')) {
    out.push('', '// Éteint toutes les LED et demande à l\'ordinateur d\'arrêter les sons.', 'void toutEteindre() {');
    for (const p of pins) out.push(`  digitalWrite(${p}, LOW);`);
    out.push('  Serial.println("SON:STOP");', '}');
  }
  out.push('', '// setup() : exécuté une seule fois, au démarrage de la carte.', 'void setup() {', '  Serial.begin(115200);  // même vitesse que l\'ordinateur');
  for (const p of pins) out.push(`  pinMode(${p}, OUTPUT);  // broche ${p} : sortie (LED)`);
  if (h.has('random')) out.push('  randomSeed(analogRead(A0));  // pour des nombres vraiment aléatoires');
  const text = (parts) => parts.join('').replace(/\n$/, '');
  if (setupParts.length) out.push(indent(text(setupParts)));
  out.push('}', '', '// loop() : répétée sans arrêt, tant que la carte est alimentée.', 'void loop() {', "  ecouter();  // lit le nom du personnage envoyé par l'ordinateur");
  if (seeParts.length || unseeParts.length) {
    out.push('  if (personnage != personnagePrecedent) {  // le personnage a changé');
    if (unseeParts.length) out.push(indent(text(unseeParts), 2));
    if (seeParts.length) out.push(indent(text(seeParts), 2));
    out.push('    personnagePrecedent = personnage;', '  }');
  }
  if (loopParts.length) out.push(indent(text(loopParts)));
  out.push('}', '');

  return extractLines(out.join('\n'));
}

// Enlève les marqueurs et note, pour chaque bloc, ses lignes (numérotées à partir de 1).
function extractLines(raw) {
  const lines = [];
  const map = {};
  const open = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t.startsWith(START)) {
      open.push({ id: t.slice(1), start: lines.length + 1 });
    } else if (t.startsWith(END)) {
      const m = open.pop();
      if (m && lines.length >= m.start) (map[m.id] ??= []).push([m.start, lines.length]);
    } else lines.push(line.replace(/[\u0001\u0002]/g, ''));
  }
  return { code: lines.join('\n'), lines: map };
}
