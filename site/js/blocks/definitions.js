// Blocs de l'outil (niveaux 1 et 2). Ce fichier reçoit l'objet Blockly en paramètre :
// il sert dans le navigateur ET dans les tests (Node).

import { PINS, PWM_PINS } from '../protocol.js';

// Une couleur par catégorie (texte blanc lisible sur chacune).
export const COLOURS = {
  events: '#965A00', // Événements (texte blanc 5,6:1)
  led: '#2E7D32', // LED et sons (5,1:1)
  control: '#2F64B0', // Contrôle (5,9:1)
  operators: '#00756A', // Opérateurs (5,6:1)
  variables: '#B8175A', // Variables (6,3:1)
  ia: '#6A3FA0', // IA (7,4:1)
  display: '#52616B', // Affichage (6,4:1)
};

export const HAT_TYPES = ['quand_je_vois', 'quand_je_ne_vois_plus', 'au_demarrage'];
export const NOBODY = '__personne__'; // valeur « personne » dans la liste des personnages

// Thème : les blocs déjà fournis par Blockly (si, répéter, comparer, variables…)
// prennent les couleurs de nos catégories.
export function makeTheme(Blockly) {
  const style = (c) => ({ colourPrimary: c });
  return Blockly.Theme.defineTheme('theatre', {
    base: Blockly.Themes.Classic,
    blockStyles: {
      loop_blocks: style(COLOURS.control),
      logic_blocks: style(COLOURS.operators),
      math_blocks: style(COLOURS.operators),
      text_blocks: style(COLOURS.operators),
      variable_blocks: style(COLOURS.variables),
      variable_dynamic_blocks: style(COLOURS.variables),
    },
  });
}

// ctx.characters() -> [{ id, name }] ; ctx.sounds() -> [{ id, name }] ; ctx.ledPins() -> [9, 10, …]
export function defineBlocks(Blockly, ctx) {
  // Liste déroulante qui se met à jour (personnages, sons). Si l'élément choisi a été
  // supprimé, il reste affiché « (supprimé) » pour que l'élève le voie.
  function dynamicMenu(list, emptyLabel) {
    return function () {
      const items = list().map((x) => [x.name, x.id]);
      const current = this.getValue?.();
      if (current && !items.some(([, id]) => id === current)) items.push(['(supprimé)', current]);
      return items.length ? items : [[emptyLabel, '']];
    };
  }
  const characterMenu = dynamicMenu(ctx.characters, '(aucun personnage)');
  // Pour comparer « personnage vu = … » : les personnages + « personne ».
  const characterOrNobodyMenu = function () {
    const items = characterMenu.call(this).filter(([, id]) => id !== '' && id !== NOBODY);
    return [...items, ['personne', NOBODY]];
  };
  const soundMenu = dynamicMenu(ctx.sounds, '(aucun son)');
  // Broches proposées : celles choisies par le professeur (4 au maximum).
  // Une broche hors de la liste (projet ancien, réglage changé) reste visible et utilisable.
  const pinMenu = function () {
    const items = (ctx.ledPins?.() ?? PINS).map((p) => [String(p), String(p)]);
    const current = this.getValue?.();
    if (current && !items.some(([, v]) => v === current)) items.push([`${current} (non prévue)`, current]);
    return items;
  };
  // Liste déroulante qui accepte toute broche 2..13 au chargement d'un projet,
  // même si elle n'est plus dans la liste du professeur.
  class FieldPin extends Blockly.FieldDropdown {
    doClassValidation_(value) {
      return PINS.includes(Number(value)) ? String(value) : null;
    }
  }

  const defs = {
    quand_je_vois: {
      init() {
        this.appendDummyInput()
          .appendField('quand je vois')
          .appendField(new Blockly.FieldDropdown(characterMenu), 'PERSO');
        this.setNextStatement(true);
        this.hat = 'cap';
        this.setColour(COLOURS.events);
        this.setTooltip("Les blocs accrochés dessous s'exécutent quand l'IA reconnaît ce personnage.");
      },
    },
    quand_je_ne_vois_plus: {
      init() {
        this.appendDummyInput()
          .appendField('quand je ne vois plus')
          .appendField(new Blockly.FieldDropdown(characterMenu), 'PERSO');
        this.setNextStatement(true);
        this.hat = 'cap';
        this.setColour(COLOURS.events);
        this.setTooltip("Les blocs accrochés dessous s'exécutent quand ce personnage quitte l'écran.");
      },
    },
    allumer_led: {
      init() {
        this.appendDummyInput()
          .appendField('allumer la LED broche')
          .appendField(new FieldPin(pinMenu), 'PIN');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.led);
        this.setTooltip('Allume la LED branchée sur cette broche de la carte (2 à 13).');
      },
    },
    eteindre_led: {
      init() {
        this.appendDummyInput()
          .appendField('éteindre la LED broche')
          .appendField(new FieldPin(pinMenu), 'PIN');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.led);
        this.setTooltip('Éteint la LED branchée sur cette broche de la carte.');
      },
    },
    jouer_son: {
      init() {
        this.appendDummyInput()
          .appendField('jouer le son')
          .appendField(new Blockly.FieldDropdown(soundMenu), 'SON');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.led);
        this.setTooltip("Joue ce son sur l'ordinateur. Le son précédent s'arrête.");
      },
    },
    arreter_sons: {
      init() {
        this.appendDummyInput().appendField('arrêter les sons');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.led);
        this.setTooltip('Arrête tous les sons.');
      },
    },
    tout_eteindre: {
      init() {
        this.appendDummyInput().appendField('tout éteindre');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.led);
        this.setTooltip('Éteint toutes les LED et arrête les sons.');
      },
    },
    attendre: {
      init() {
        this.appendValueInput('DUREE').setCheck('Number').appendField('attendre');
        this.appendDummyInput().appendField('secondes');
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.control);
        this.setTooltip('Attend ce nombre de secondes avant le bloc suivant (1.5 = une seconde et demie).');
      },
    },

    // ----- Niveau 2 -------------------------------------------------------------------
    au_demarrage: {
      init() {
        this.appendDummyInput().appendField('quand le programme démarre');
        this.setNextStatement(true);
        this.hat = 'cap';
        this.setColour(COLOURS.events);
        this.setTooltip('Les blocs accrochés dessous s’exécutent quand on clique sur « Démarrer le programme ».');
      },
    },
    repeter_toujours: {
      init() {
        this.appendDummyInput().appendField('répéter indéfiniment');
        this.appendStatementInput('DO');
        this.setPreviousStatement(true);
        this.setColour(COLOURS.control);
        this.setTooltip('Répète les blocs à l’intérieur sans jamais s’arrêter (jusqu’au bouton Arrêter).');
      },
    },
    regler_led: {
      init() {
        this.appendDummyInput().appendField('régler la LED broche').appendField(new FieldPin(pinMenu), 'PIN');
        this.appendValueInput('VALEUR').setCheck('Number').appendField('à');
        this.appendDummyInput().appendField('(0 à 255)');
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.led);
        this.setTooltip('Règle la luminosité : 0 = éteinte, 255 = à fond. Seulement sur les broches marquées ~ (3, 5, 6, 9, 10, 11).');
      },
    },
    ia_je_vois: {
      init() {
        this.appendDummyInput()
          .appendField('je vois')
          .appendField(new Blockly.FieldDropdown(characterMenu), 'PERSO')
          .appendField('?');
        this.setOutput(true, 'Boolean');
        this.setColour(COLOURS.ia);
        this.setTooltip('Vrai si l’IA voit ce personnage en ce moment.');
      },
    },
    ia_personnage_vu: {
      init() {
        this.appendDummyInput().appendField('personnage vu');
        this.setOutput(true, 'String');
        this.setColour(COLOURS.ia);
        this.setTooltip('Le nom du personnage que l’IA voit, ou « personne ».');
      },
    },
    ia_personnage: {
      init() {
        this.appendDummyInput().appendField(new Blockly.FieldDropdown(characterOrNobodyMenu), 'PERSO');
        this.setOutput(true, 'String');
        this.setColour(COLOURS.ia);
        this.setTooltip('Un nom de personnage, à comparer avec « personnage vu ».');
      },
    },
    ia_confiance: {
      init() {
        this.appendDummyInput()
          .appendField('confiance de')
          .appendField(new Blockly.FieldDropdown(characterMenu), 'PERSO')
          .appendField('en %');
        this.setOutput(true, 'Number');
        this.setColour(COLOURS.ia);
        this.setTooltip('À quel point l’IA est sûre de voir ce personnage, de 0 à 100.');
      },
    },
    ecrire: {
      init() {
        this.appendValueInput('TEXTE').appendField('écrire');
        this.appendDummyInput().appendField('à l’écran');
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(COLOURS.display);
        this.setTooltip('Affiche un message dans la zone « Messages », sous les blocs. Pratique pour comprendre ce que fait le programme.');
      },
    },
  };

  for (const [type, def] of Object.entries(defs)) Blockly.Blocks[type] = def;

  // « si… alors » de Blockly : même couleur que la catégorie Contrôle.
  const original = Blockly.Blocks.controls_if;
  if (original && !original.__theatre) {
    Blockly.Blocks.controls_if = {
      ...original,
      __theatre: true,
      init() {
        original.init.call(this);
        this.setColour(COLOURS.control);
      },
    };
  }
}

// Catégorie « Variables » à nous : comme dans mBlock, « définir … à » et « ajouter … à »
// arrivent avec une valeur déjà écrite, modifiable directement (0 et 1).
export const VARIABLES_CATEGORY = 'VARIABLES_THEATRE';
export const CREATE_VARIABLE_BUTTON = 'CREER_VARIABLE';

// variables : [{ id, name }] -> contenu du volet de la catégorie.
export function variablesFlyout(variables) {
  const items = [{ kind: 'button', text: '➕ Créer une variable', callbackKey: CREATE_VARIABLE_BUTTON }];
  if (variables.length === 0) return items;
  const first = { VAR: { id: variables[0].id } };
  const shadowNum = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
  items.push(
    { kind: 'block', type: 'variables_set', fields: first, inputs: { VALUE: shadowNum(0) } },
    { kind: 'block', type: 'math_change', fields: first, inputs: { DELTA: shadowNum(1) } },
    ...variables.map((v) => ({ kind: 'block', type: 'variables_get', fields: { VAR: { id: v.id } } })),
  );
  return items;
}

export function isPwmPin(pin) {
  return PWM_PINS.includes(Number(pin));
}

// Boîte à outils selon le niveau choisi par le professeur.
export function toolbox(level = 1, ledPins = [9]) {
  const pin = String(ledPins[0] ?? 9);
  const num = (n) => ({ DUREE: { shadow: { type: 'math_number', fields: { NUM: n } } } });
  const categories = [
    {
      kind: 'category',
      name: 'Événements',
      colour: COLOURS.events,
      contents: [
        { kind: 'block', type: 'quand_je_vois' },
        { kind: 'block', type: 'quand_je_ne_vois_plus' },
      ],
    },
    {
      kind: 'category',
      name: 'LED et sons',
      colour: COLOURS.led,
      contents: [
        { kind: 'block', type: 'allumer_led', fields: { PIN: pin } },
        { kind: 'block', type: 'eteindre_led', fields: { PIN: pin } },
        { kind: 'block', type: 'jouer_son' },
        { kind: 'block', type: 'arreter_sons' },
        { kind: 'block', type: 'tout_eteindre' },
      ],
    },
    {
      kind: 'category',
      name: 'Contrôle',
      colour: COLOURS.control,
      contents: [{ kind: 'block', type: 'attendre', inputs: num(1) }],
    },
  ];
  if (level >= 2) addLevel2(categories, pin);
  return { kind: 'categoryToolbox', contents: categories };
}

// Niveau 2 : la « vraie » programmation, comme dans mBlock ou Vittascience.
function addLevel2(categories, pin) {
  const shadowNum = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
  const byName = (start) => categories.find((c) => c.name.includes(start));
  // Au niveau 2, le programme part de « quand le programme démarre » et teste lui-même ce que
  // voit l'IA (« si je vois … ? ») : plus de blocs « quand je vois / ne vois plus ».
  byName('Événements').contents = [{ kind: 'block', type: 'au_demarrage' }];
  byName('LED et sons').contents.splice(2, 0, {
    kind: 'block',
    type: 'regler_led',
    fields: { PIN: pin },
    inputs: { VALEUR: shadowNum(128) },
  });
  const control = byName('Contrôle');
  control.name = 'Contrôle';
  control.contents.push(
    { kind: 'block', type: 'repeter_toujours' },
    { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: shadowNum(3) } },
    { kind: 'block', type: 'controls_whileUntil' },
    { kind: 'block', type: 'controls_if' },
    { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
    { kind: 'block', type: 'controls_flow_statements', fields: { FLOW: 'BREAK' } },
  );
  categories.push(
    {
      kind: 'category',
      name: 'Opérateurs',
      colour: COLOURS.operators,
      contents: [
        { kind: 'block', type: 'logic_compare', fields: { OP: 'EQ' } },
        { kind: 'block', type: 'logic_compare', fields: { OP: 'GT' }, inputs: { B: shadowNum(80) } },
        { kind: 'block', type: 'logic_operation', fields: { OP: 'AND' } },
        { kind: 'block', type: 'logic_operation', fields: { OP: 'OR' } },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'math_number', fields: { NUM: 0 } },
        { kind: 'block', type: 'math_arithmetic', inputs: { A: shadowNum(1), B: shadowNum(1) } },
        { kind: 'block', type: 'math_random_int', inputs: { FROM: shadowNum(1), TO: shadowNum(10) } },
        { kind: 'block', type: 'text', fields: { TEXT: '' } },
      ],
    },
    { kind: 'category', name: 'Variables', colour: COLOURS.variables, custom: VARIABLES_CATEGORY },
    {
      kind: 'category',
      name: 'IA',
      colour: COLOURS.ia,
      contents: [
        { kind: 'block', type: 'ia_je_vois' },
        { kind: 'block', type: 'ia_personnage_vu' },
        { kind: 'block', type: 'ia_personnage' },
        { kind: 'block', type: 'ia_confiance' },
      ],
    },
    {
      kind: 'category',
      name: 'Affichage',
      colour: COLOURS.display,
      contents: [
        { kind: 'block', type: 'ecrire', inputs: { TEXTE: { shadow: { type: 'text', fields: { TEXT: 'bonjour' } } } } },
      ],
    },
  );
}
