// Les catégories (personnages) et leurs exemples d'entraînement.
// Aucune dépendance à la page ni à TensorFlow : testable et sauvegardable tel quel.

export const BACKGROUND_ID = 'fond';
export const BACKGROUND_NAME = 'Fond vide';
export const MIN_EXAMPLES = 15; // en dessous, la catégorie n'est pas utilisée
export const ADVISED_EXAMPLES = 30;
export const MAX_CATEGORIES = 8; // fond vide compris
export const MAX_NAME_LENGTH = 20;

let counter = 0;
export function newId(prefix) {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

export class Training {
  constructor() {
    // Une catégorie : { id, name, background, examples: [{ id, features: Float32Array (normée), thumb }] }
    this.categories = [{ id: BACKGROUND_ID, name: BACKGROUND_NAME, background: true, examples: [] }];
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(what) {
    for (const fn of this.listeners) fn(what);
  }

  get(id) {
    return this.categories.find((c) => c.id === id) ?? null;
  }

  byName(name) {
    const key = normalizeName(name);
    return this.categories.find((c) => normalizeName(c.name) === key) ?? null;
  }

  // Personnages (sans le fond vide).
  get characters() {
    return this.categories.filter((c) => !c.background);
  }

  checkName(name, exceptId = null) {
    const n = String(name ?? '').trim();
    if (!n) return 'Donne un nom au personnage.';
    if (n.length > MAX_NAME_LENGTH) return `Le nom est trop long (${MAX_NAME_LENGTH} lettres au maximum).`;
    const other = this.byName(n);
    if (other && other.id !== exceptId) return `Il y a déjà un personnage qui s'appelle « ${other.name} ».`;
    return null;
  }

  addCategory(name) {
    if (this.categories.length >= MAX_CATEGORIES) {
      return { ok: false, error: `${MAX_CATEGORIES - 1} personnages au maximum.` };
    }
    const error = this.checkName(name);
    if (error) return { ok: false, error };
    const cat = { id: newId('c'), name: String(name).trim(), background: false, examples: [] };
    this.categories.push(cat);
    this.emit('categories');
    return { ok: true, category: cat };
  }

  renameCategory(id, name) {
    const cat = this.get(id);
    if (!cat || cat.background) return { ok: false, error: 'Le fond vide ne peut pas être renommé.' };
    const error = this.checkName(name, id);
    if (error) return { ok: false, error };
    const old = cat.name;
    cat.name = String(name).trim();
    this.emit('categories');
    return { ok: true, old };
  }

  removeCategory(id) {
    const cat = this.get(id);
    if (!cat || cat.background) return false;
    this.categories = this.categories.filter((c) => c.id !== id);
    this.emit('categories');
    return true;
  }

  addExample(categoryId, features, thumb = '') {
    const cat = this.get(categoryId);
    if (!cat) return null;
    const ex = { id: newId('e'), features: normalize(features), thumb };
    cat.examples.push(ex);
    this.emit('examples');
    return ex;
  }

  removeExample(categoryId, exampleId) {
    const cat = this.get(categoryId);
    if (!cat) return;
    cat.examples = cat.examples.filter((e) => e.id !== exampleId);
    this.emit('examples');
  }

  clearExamples(categoryId) {
    const cat = this.get(categoryId);
    if (!cat) return;
    cat.examples = [];
    this.emit('examples');
  }

  isUsable(cat) {
    return cat.examples.length >= MIN_EXAMPLES;
  }

  // L'IA est prête quand le fond vide et au moins un personnage ont assez d'exemples.
  get ready() {
    return this.isUsable(this.get(BACKGROUND_ID)) && this.characters.some((c) => this.isUsable(c));
  }

  // Remplace tout le contenu (rechargement d'un projet).
  replaceAll(categories) {
    this.categories = categories;
    if (!this.get(BACKGROUND_ID)) {
      this.categories.unshift({ id: BACKGROUND_ID, name: BACKGROUND_NAME, background: true, examples: [] });
    }
    this.emit('categories');
  }
}

// Comparaison des noms sans tenir compte des majuscules ni des accents.
export function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Vecteur de longueur 1 : la comparaison devient un simple produit scalaire.
export function normalize(features) {
  const v = Float32Array.from(features);
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const len = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= len;
  return v;
}
