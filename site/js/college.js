// Réglages du collège, communs à tous les outils de la classe (Labo Blocs, distributeur, Concept Store…) :
// la liste des classes et le chemin des dossiers de classe. Le professeur les modifie dans l'accueil de
// Labo Blocs (« Réglages du collège »). Le site lit d'abord sa copie de secours (site/college.js), puis la
// version en ligne si internet répond (simple lecture : rien n'est envoyé). Bibliothèque commune : https://anlito.github.io/labo-blocs/interface/college.js.

// Le théâtre d'ombre est un projet de 4e et de 3e : seules les classes de ces niveaux sont proposées.
export const NIVEAUX = ['4', '3'];

const labo = () => window.LaboBlocs || {};

// Classes proposées à l'accueil (toutes les classes si les réglages n'en ont aucune de 4e ni de 3e).
export function classesProposees() {
  const c = labo().college;
  if (!c || !labo().classesDuCollege) return [];
  const duNiveau = labo().classesDuCollege(c, NIVEAUX);
  return duNiveau.length ? duNiveau : c.classes;
}

// Chemin jusqu'au dossier d'une classe (ex. ['Bureau', 'Classe', '{classe}', 'COMMUN', 'TECHNOLOGIE']).
export const cheminClasse = () => labo().college?.cheminClasse;

// La version en ligne arrive après l'ouverture de la page : on redessine.
export const surCollege = (fn) => document.addEventListener(labo().EVENEMENT_COLLEGE || 'labo-blocs:college', fn);
