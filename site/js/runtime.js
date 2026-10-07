// Exécution du programme des élèves.
//
// Sécurité : le code tiré des blocs tourne dans JS-Interpreter, un interpréteur « en boîte » :
// pas d'eval, aucun accès à la page ni à Internet, seulement les fonctions données ci-dessous.
// Fluidité : l'interpréteur avance par petits morceaux (quelques millisecondes) puis rend la main
// au navigateur. La page ne fige jamais et le bouton Stop marche même dans une boucle infinie.
//
// Comme dans Scratch, chaque bloc « quand… » est un petit programme indépendant (un « fil ») ;
// si son événement revient pendant qu'il tourne, il recommence au début.

const SLICE_MS = 8; // durée d'un morceau d'exécution
const MAX_WAIT_S = 600;

export class Runtime {
  // Interpreter : la classe JS-Interpreter.
  // actions : actions qui prennent du temps (peuvent renvoyer une promesse) :
  //             allumer(pin), eteindre(pin), regler(pin, v), jouerSon(id), arreterSons(), toutEteindre()
  //           actions immédiates :
  //             surligner(fil, blockId), ecrire(texte), jeVois(id) -> bool,
  //             personnageVu() -> nom, confiance(id) -> 0..100
  // onError(message) : erreur à afficher ; onChange(running) : programme démarré / arrêté ;
  // onVariables(Map nom -> valeur) : les variables ont changé.
  constructor({ Interpreter, actions, onError = () => {}, onChange = () => {}, onVariables = () => {}, now = () => performance.now() }) {
    this.onVariables = onVariables;
    this.vars = new Map(); // variables partagées par tous les blocs « quand… » (id -> valeur)
    this.Interpreter = Interpreter;
    this.actions = actions;
    this.onError = onError;
    this.onChange = onChange;
    this.now = now;
    this.handlers = [];
    this.threads = new Map(); // hatId -> fil
    this.running = false;
    this.timer = null;
    this.serial = 0;
  }

  load(handlers) {
    this.handlers = handlers;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.vars.clear(); // chaque démarrage repart de zéro
    this.onVariables(this.vars);
    this.onChange(true);
    this.trigger('start', null); // blocs « quand le programme démarre »
  }

  stop() {
    for (const t of this.threads.values()) this.kill(t);
    this.threads.clear();
    clearTimeout(this.timer);
    this.timer = null;
    if (this.running) {
      this.running = false;
      this.onChange(false);
    }
  }

  // event : 'vu', 'plus-vu' ou 'start' ; perso : id de la catégorie (null pour 'start').
  trigger(event, perso) {
    if (!this.running) return;
    for (const h of this.handlers) {
      if (h.event === event && (event === 'start' || h.perso === perso)) this.spawn(h);
    }
  }

  get busy() {
    return this.threads.size > 0;
  }

  spawn(handler) {
    const old = this.threads.get(handler.hatId);
    if (old) this.kill(old);
    const thread = { id: ++this.serial, hatId: handler.hatId, alive: true, timers: new Set(), interp: null };
    try {
      thread.interp = new this.Interpreter(handler.code, (interp, globals) => this.installApi(interp, globals, thread));
    } catch {
      this.onError("Le programme contient une erreur : vérifie tes blocs.");
      return;
    }
    this.threads.set(handler.hatId, thread);
    this.schedule();
  }

  kill(thread) {
    thread.alive = false;
    for (const t of thread.timers) clearTimeout(t);
    thread.timers.clear();
    this.actions.surligner(thread.id, null);
  }

  // Les seules fonctions que le programme des élèves peut appeler.
  installApi(interp, globals, thread) {
    const self = this;
    const resume = (callback, value) => {
      if (!thread.alive) return; // fil arrêté entre-temps : on ne le réveille pas
      callback(value);
      self.schedule();
    };
    // JS-Interpreter compte les paramètres de la fonction : il faut une version par nombre d'arguments.
    const run = (name, args, callback) =>
      Promise.resolve()
        .then(() => self.actions[name](...args))
        .catch(() => {})
        .then(() => resume(callback));
    const action1 = (name) => interp.createAsyncFunction((arg, callback) => run(name, [arg], callback));
    const action0 = (name) => interp.createAsyncFunction((callback) => run(name, [], callback));

    interp.setProperty(globals, 'allumer', action1('allumer'));
    interp.setProperty(globals, 'eteindre', action1('eteindre'));
    interp.setProperty(globals, 'jouerSon', action1('jouerSon'));
    const action2 = (name) => interp.createAsyncFunction((a, b, callback) => run(name, [a, b], callback));
    interp.setProperty(globals, 'regler', action2('regler'));
    interp.setProperty(globals, 'arreterSons', action0('arreterSons'));
    interp.setProperty(globals, 'toutEteindre', action0('toutEteindre'));
    interp.setProperty(
      globals,
      'attendre',
      interp.createAsyncFunction(function (seconds, callback) {
        let s = Number(seconds);
        if (!Number.isFinite(s) || s < 0) s = 0;
        s = Math.min(s, MAX_WAIT_S);
        const t = setTimeout(() => {
          thread.timers.delete(t);
          resume(callback);
        }, s * 1000);
        thread.timers.add(t);
      }),
    );
    // Fonctions immédiates (lecture de l'IA, affichage, variables). Seules des valeurs
    // simples (nombre, texte, vrai/faux) entrent et sortent de la boîte.
    const simple = (v) => (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' ? v : String(v ?? ''));
    const sync = (name, fn) => interp.setProperty(globals, name, interp.createNativeFunction((...args) => (thread.alive ? fn(...args) : undefined)));
    sync('ecrire', (texte) => self.actions.ecrire?.(String(simple(texte))));
    sync('jeVois', (id) => !!self.actions.jeVois?.(String(id)));
    sync('personnageVu', () => String(self.actions.personnageVu?.() ?? 'personne'));
    sync('confiance', (id) => Number(self.actions.confiance?.(String(id)) ?? 0));
    sync('lireVariable', (id) => (self.vars.has(id) ? self.vars.get(id) : 0));
    sync('fixerVariable', (id, v) => {
      self.vars.set(id, simple(v));
      self.onVariables(self.vars);
    });

    interp.setProperty(
      globals,
      'surligner',
      interp.createNativeFunction((blockId) => {
        if (thread.alive) self.actions.surligner(thread.id, blockId);
      }),
    );
  }

  schedule() {
    if (this.timer === null && this.threads.size > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.slice();
      }, 0);
    }
  }

    // Chaque fil reçoit sa part du temps : une boucle infinie ne prive pas les autres.
  slice() {
    const share = Math.max(1, SLICE_MS / Math.max(1, this.threads.size));
    let runnable = false;
    for (const [hatId, t] of this.threads) {
      if (!t.alive) {
        this.threads.delete(hatId);
        continue;
      }
      const end = this.now() + share;
      try {
        while (!t.interp.paused_ && this.now() < end) {
          if (!t.interp.step()) {
            // Fil terminé.
            this.kill(t);
            this.threads.delete(hatId);
            break;
          }
        }
      } catch (e) {
        this.kill(t);
        this.threads.delete(hatId);
        this.onError(friendlyError(e));
        continue;
      }
      if (t.alive && !t.interp.paused_) runnable = true;
    }
    if (runnable) this.schedule();
  }
}

function friendlyError(e) {
  const text = String(e && e.message ? e.message : e);
  return `Le programme s'est arrêté à cause d'une erreur (${text}). Vérifie tes blocs.`;
}
