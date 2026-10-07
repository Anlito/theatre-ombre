// Jeu de 10 programmes types (cahier des charges, jalon 3) : chacun doit se traduire en C++
// qui compile sur Uno / Nano, et chaque bloc doit retrouver ses lignes.

export const CHARACTERS = [
  { id: 'loup', name: 'Loup' },
  { id: 'roi', name: 'Roi' },
  { id: 'sorciere', name: 'Sorcière' },
];
export const SOUNDS = [
  { id: 'b:fanfare', name: 'Fanfare' },
  { id: 'b:rire', name: 'Rire' },
];

const b = (type, extra = {}) => ({ block: { type, ...extra } });
const num = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const txt = (t) => ({ shadow: { type: 'text', fields: { TEXT: t } } });
const led = (type, pin, next) => b(type, { fields: { PIN: String(pin) }, ...(next ? { next } : {}) });
const wait = (s, next) => b('attendre', { inputs: { DUREE: num(s) }, ...(next ? { next } : {}) });
const ws = (blocks, variables = []) => ({ variables, blocks: { languageVersion: 0, blocks } });

export const PROGRAMMES = [
  {
    nom: '1. Niveau 1 : une LED et un son par personnage',
    state: ws([
      { type: 'quand_je_vois', x: 0, y: 0, fields: { PERSO: 'loup' }, next: led('allumer_led', 9, b('jouer_son', { fields: { SON: 'b:fanfare' } })) },
      { type: 'quand_je_ne_vois_plus', x: 0, y: 200, fields: { PERSO: 'loup' }, next: led('eteindre_led', 9) },
    ]),
  },
  {
    nom: '2. Niveau 1 : trois personnages, trois LED, attente',
    state: ws([
      { type: 'quand_je_vois', fields: { PERSO: 'loup' }, next: led('allumer_led', 9, wait(1.5, led('eteindre_led', 9))) },
      { type: 'quand_je_vois', fields: { PERSO: 'roi' }, next: led('allumer_led', 10, wait(2, led('eteindre_led', 10))) },
      { type: 'quand_je_vois', fields: { PERSO: 'sorciere' }, next: led('allumer_led', 11, b('jouer_son', { fields: { SON: 'b:rire' } })) },
      { type: 'quand_je_ne_vois_plus', fields: { PERSO: 'sorciere' }, next: led('eteindre_led', 11) },
    ]),
  },
  {
    nom: '3. Niveau 1 : tout éteindre et arrêter les sons',
    state: ws([
      { type: 'quand_je_vois', fields: { PERSO: 'roi' }, next: led('allumer_led', 12, led('allumer_led', 9)) },
      { type: 'quand_je_ne_vois_plus', fields: { PERSO: 'roi' }, next: b('arreter_sons', { next: b('tout_eteindre') }) },
    ]),
  },
  {
    nom: '4. Niveau 2 : répéter indéfiniment, si je vois… alors… sinon',
    state: ws([
      {
        type: 'au_demarrage',
        next: b('repeter_toujours', {
          inputs: {
            DO: b('controls_if', {
              extraState: { hasElse: true },
              inputs: { IF0: b('ia_je_vois', { fields: { PERSO: 'loup' } }), DO0: led('allumer_led', 9), ELSE: led('eteindre_led', 9) },
            }),
          },
        }),
      },
    ]),
  },
  {
    nom: '5. Niveau 2 : compteur de passages (variable)',
    state: ws(
      [
        { type: 'au_demarrage', next: b('variables_set', { fields: { VAR: { id: 'v1' } }, inputs: { VALUE: num(0) } }) },
        {
          type: 'quand_je_vois',
          fields: { PERSO: 'roi' },
          next: b('math_change', {
            fields: { VAR: { id: 'v1' } },
            inputs: { DELTA: num(1) },
            next: b('ecrire', {
              inputs: { TEXTE: b('variables_get', { fields: { VAR: { id: 'v1' } } }) },
              next: b('controls_if', {
                inputs: {
                  IF0: b('logic_compare', { fields: { OP: 'EQ' }, inputs: { A: b('variables_get', { fields: { VAR: { id: 'v1' } } }), B: num(3) } }),
                  DO0: b('tout_eteindre'),
                },
              }),
            }),
          }),
        },
      ],
      [{ name: 'passages', id: 'v1' }],
    ),
  },
  {
    nom: '6. Niveau 2 : clignoter 3 fois (répéter n fois)',
    state: ws([
      {
        type: 'quand_je_vois',
        fields: { PERSO: 'sorciere' },
        next: b('controls_repeat_ext', {
          inputs: { TIMES: num(3), DO: led('allumer_led', 10, wait(0.2, led('eteindre_led', 10, wait(0.2)))) },
        }),
      },
    ]),
  },
  {
    nom: '7. Niveau 2 : allumage progressif (tant que, intensité)',
    state: ws(
      [
        {
          type: 'au_demarrage',
          next: b('variables_set', {
            fields: { VAR: { id: 'lum' } },
            inputs: { VALUE: num(0) },
            next: b('controls_whileUntil', {
              fields: { MODE: 'WHILE' },
              inputs: {
                BOOL: b('logic_compare', { fields: { OP: 'LT' }, inputs: { A: b('variables_get', { fields: { VAR: { id: 'lum' } } }), B: num(255) } }),
                DO: b('regler_led', {
                  fields: { PIN: '11' },
                  inputs: { VALEUR: b('variables_get', { fields: { VAR: { id: 'lum' } } }) },
                  next: b('math_change', { fields: { VAR: { id: 'lum' } }, inputs: { DELTA: num(5) }, next: wait(0.05) }),
                }),
              },
            }),
          }),
        },
      ],
      [{ name: 'luminosité', id: 'lum' }],
    ),
  },
  {
    nom: '8. Niveau 2 : personnage vu = Loup et confiance > 80',
    state: ws([
      {
        type: 'au_demarrage',
        next: b('repeter_toujours', {
          inputs: {
            DO: b('controls_if', {
              extraState: { hasElse: true },
              inputs: {
                IF0: b('logic_operation', {
                  fields: { OP: 'AND' },
                  inputs: {
                    A: b('logic_compare', { fields: { OP: 'EQ' }, inputs: { A: b('ia_personnage_vu'), B: b('ia_personnage', { fields: { PERSO: 'loup' } }) } }),
                    B: b('logic_compare', { fields: { OP: 'GT' }, inputs: { A: b('ia_confiance', { fields: { PERSO: 'loup' } }), B: num(80) } }),
                  },
                }),
                DO0: b('regler_led', { fields: { PIN: '9' }, inputs: { VALEUR: num(255) } }),
                ELSE: b('regler_led', { fields: { PIN: '9' }, inputs: { VALEUR: num(20) } }),
              },
            }),
          },
        }),
      },
    ]),
  },
  {
    nom: '9. Niveau 2 : variable texte (personnage vu) et message',
    state: ws(
      [
        {
          type: 'au_demarrage',
          next: b('repeter_toujours', {
            inputs: {
              DO: b('variables_set', {
                fields: { VAR: { id: 'c' } },
                inputs: { VALUE: b('ia_personnage_vu') },
                next: b('controls_if', {
                  inputs: {
                    IF0: b('logic_compare', { fields: { OP: 'NEQ' }, inputs: { A: b('variables_get', { fields: { VAR: { id: 'c' } } }), B: b('ia_personnage', { fields: { PERSO: '__personne__' } }) } }),
                    DO0: b('ecrire', { inputs: { TEXTE: b('variables_get', { fields: { VAR: { id: 'c' } } }) }, next: wait(1) }),
                  },
                }),
              }),
            },
          }),
        },
      ],
      [{ name: 'choix', id: 'c' }],
    ),
  },
  {
    nom: '10. Niveau 2 : hasard, calcul, non / ou, quitter la boucle, répéter jusqu’à',
    state: ws(
      [
        {
          type: 'au_demarrage',
          next: b('variables_set', {
            fields: { VAR: { id: 'n' } },
            inputs: { VALUE: b('math_random_int', { inputs: { FROM: num(1), TO: num(4) } }) },
            next: b('controls_whileUntil', {
              fields: { MODE: 'UNTIL' },
              inputs: {
                BOOL: b('logic_operation', {
                  fields: { OP: 'OR' },
                  inputs: {
                    A: b('logic_negate', { inputs: { BOOL: b('logic_boolean', { fields: { BOOL: 'TRUE' } }) } }),
                    B: b('logic_compare', { fields: { OP: 'GTE' }, inputs: { A: b('variables_get', { fields: { VAR: { id: 'n' } } }), B: num(10) } }),
                  },
                }),
                DO: b('variables_set', {
                  fields: { VAR: { id: 'n' } },
                  inputs: {
                    VALUE: b('math_arithmetic', {
                      fields: { OP: 'MULTIPLY' },
                      inputs: { A: b('variables_get', { fields: { VAR: { id: 'n' } } }), B: b('math_arithmetic', { fields: { OP: 'ADD' }, inputs: { A: num(1), B: num(1) } }) },
                    }),
                  },
                  next: b('ecrire', {
                    inputs: { TEXTE: txt('encore') },
                    next: b('controls_if', {
                      inputs: { IF0: b('ia_je_vois', { fields: { PERSO: 'roi' } }), DO0: b('controls_flow_statements', { fields: { FLOW: 'BREAK' } }) },
                    }),
                  }),
                }),
              },
            }),
          }),
        },
      ],
      [{ name: 'nombre 1', id: 'n' }],
    ),
  },
];
