# Brief graphique — « Théâtre d'ombre augmenté »

> À transmettre à Claude Design, avec le dossier `captures/` (17 captures, 1440 × 900).
> L'outil **fonctionne déjà** : la mission porte sur la **partie graphique** (identité, lisibilité,
> cohérence), pas sur les fonctionnalités.

## 1. Le projet en deux phrases

Un site web pour des élèves de collège (cycle 4, 13-15 ans, cours de technologie) : ils **entraînent une IA**
à reconnaître les silhouettes de leur théâtre d'ombre avec la webcam, puis **programment en blocs** (comme
Scratch) ce que fait une carte Arduino (LED, sons) quand un personnage est reconnu. Le spectacle final est joué
devant la classe, en plein écran.

## 2. Public et conditions d'utilisation

- **Élèves de 13 à 15 ans**, en équipes de 2 ou 3 autour d'un même écran ; l'enseignant passe dans les rangs.
- **PC du collège** : Chrome ou Edge, écrans souvent **1366 × 768** (prévoir aussi 1920 × 1080), **pavé tactile
  ou souris**, parfois **vidéoprojecteur** (contrastes forts indispensables). Machines modestes : pas d'effets lourds.
- Usage **en classe, bruyant, avec des élèves pressés** : il faut comprendre l'écran **d'un coup d'œil**.
- Tout est **en français**, vocabulaire du cours de technologie (broche, LED, catégorie, confiance…).

## 3. Ce qu'on attend de Claude Design

1. **Une identité visuelle** légère et cohérente, évoquant le **théâtre d'ombre** (lumière chaude, papier,
   silhouettes, rideau rouge…) **sans nuire à la lisibilité** des écrans de travail.
2. **Des maquettes** des écrans listés en §5, en **1366 × 768** (priorité) et 1920 × 1080.
3. **Les « jetons » de design** : palette (avec contrastes vérifiés), typographie, rayons, ombres, espacements —
   idéalement sous forme de variables CSS (voir §8).
4. **Un jeu d'icônes cohérent** (SVG, licence libre) pour remplacer les **emojis** actuels
   (🔌 📷 🧠 💡 🔊 📸 🗑️ ✏️ 🎬 …), dont le rendu varie selon les PC.
5. **Les états** de chaque composant : normal, survol, focus clavier, actif, désactivé, erreur.
6. Un **logo / icône** simple pour l'onglet du navigateur et l'en-tête.

## 4. Contraintes à respecter (non négociables)

| Contrainte | Détail |
|---|---|
| Lisibilité | Texte **16 px minimum**, contrastes **WCAG AA** au moins (le vidéoprojecteur délave les couleurs). |
| Jamais la couleur seule | Chaque état a **un mot ou une icône** en plus de la couleur (ex. pastille « Carte · connectée »). |
| Grandes cibles | Boutons **≥ 44 px** de haut (pavé tactile, élèves pressés). |
| « Tout éteindre » | Bouton **rouge, toujours visible** sur tous les écrans, y compris en plein écran. |
| Trois pastilles d'état | Carte, Webcam, IA : toujours visibles en haut, icône + mot. |
| Pas de CDN | Polices et icônes **embarquées dans le site** (fichiers locaux, licence libre type OFL). Sinon, polices système. |
| Légèreté | Pas de vidéo de fond, pas d'animations coûteuses ; animations courtes, désactivables (`prefers-reduced-motion`). |
| Technique | HTML + CSS sans framework. Les **identifiants (`id`) et classes utilisés par le JavaScript ne changent pas** (liste en §8). |
| Blocs de programmation | L'éditeur de blocs est **Blockly** (rendu « zelos », proche de Scratch) : on peut changer les **couleurs des catégories** (texte blanc lisible dessus) et l'habillage autour, pas la forme des blocs. |

## 5. Les écrans (voir `captures/`)

L'outil suit **3 étapes toujours visibles** : **1. Entraîner → 2. Programmer → 3. Spectacle**.

| Capture | Écran | Rôle | Points à améliorer |
|---|---|---|---|
| `01` | **Démarrage** | Prénoms de l'équipe, puis Nouveau projet / Ouvrir / Reprendre | Accueil un peu austère : c'est la première impression, l'occasion de poser l'univers. |
| `02`–`04` | **1. Entraîner** | Webcam en grand, création des personnages, bouton « Ajouter des photos » (à garder appuyé), vignettes, barres de confiance, encadrés « Pourquoi ? » | Beaucoup d'informations : hiérarchiser (webcam + personnage en cours d'abord). Les cartes « personnage » pourraient être plus visuelles. |
| `05` | **2. Programmer — niveau 1 « Premiers pas »** | Blocs simples, webcam réduite, état de la carte (LED), sons | Colonne de gauche longue ; la zone de blocs doit rester la plus grande possible. |
| `06` | **Niveau 2 « Boucles et conditions »** | Plus de catégories de blocs, zones « Messages » et « Variables » sous les blocs | Écran dense en 1366 × 768. |
| `07` | **Niveau 3 « Code Arduino »** | Blocs + panneau **code C++** (lecture seule, coloration, ligne surlignée quand on clique un bloc) | **Trop serré** : la colonne webcam réduit la zone de blocs ; proposer une disposition adaptée (ex. webcam repliable). |
| `08` | **Aide** (bouton « ? ») | Une dizaine de lignes + mini-lexique | Fenêtre fonctionnelle, à harmoniser. |
| `09`–`10` | **3. Spectacle** | Scène de théâtre : rideaux qui s'ouvrent, projecteurs = LED de la carte, écran d'ombres (webcam), plaque « Sur scène : Loup », plein écran | **Point fort apprécié** de l'enseignant : à conserver et peaufiner (rideaux, projecteurs, plaque). |
| `11` | **Mode professeur** | Code, niveau, verrouillage du niveau, seuil, stabilité, broches des LED | Usage enseignant : sobre et clair suffit. |
| `12`–`13` | **Cours « Comprendre l'IA »** (imprimable) | 8 sections, schémas SVG, quiz, lexique | Doit rester **imprimable en noir et blanc**. |
| `14`–`15` | **Câblage des LED** (imprimable) | Tableau des broches, schéma Tinkercad, photo du montage | Idem : imprimable. |
| `16`–`17` | **Diagnostic du poste** | Vérifications techniques (navigateur, webcam, IA, carte) | Usage technique ponctuel : sobre. |

## 6. Problèmes connus (à résoudre dans les maquettes)

1. **La barre du haut passe sur deux lignes** en 1440 px (et plus encore en 1366 px) : étapes + équipe +
   Enregistrer + Ouvrir + Comprendre l'IA + « ? ». Proposer une organisation (regroupement, menu…).
2. **Niveau 3 trop serré** (voir capture 07).
3. **Emojis** utilisés comme icônes : rendu inégal selon les PC → jeu d'icônes SVG.
4. Hiérarchie de l'écran **Entraîner** à clarifier.
5. Cohérence générale : l'écran Spectacle a une vraie identité « théâtre », le reste est neutre ;
   trouver un lien entre les deux **sans charger les écrans de travail**.

## 7. Ce qui ne doit pas changer

- Le parcours en **3 étapes** et leur ordre ; les **3 pastilles d'état** ; le bouton rouge **Tout éteindre**.
- Le **vocabulaire** (Entraîner, Programmer, Spectacle, personnage, Fond vide, broche, confiance, niveaux
  « 1 · Premiers pas », « 2 · Boucles et conditions », « 3 · Code Arduino »).
- Les **couleurs des catégories de blocs** peuvent évoluer, mais doivent rester **distinctes entre elles**
  et lisibles avec du texte blanc : Événements, LED et sons, Contrôle, Opérateurs, Variables, IA, Affichage.
- Les captures montrent une **fausse webcam** (silhouettes dessinées) et une **carte simulée** : en classe,
  c'est une vraie webcam filmant un écran de théâtre d'ombre.

## 8. Pour la remise en code (handoff)

Les styles sont dans un seul fichier, `site/css/style.css`, avec des variables en tête :

```css
--fond, --carte, --texte, --texte-doux, --bord, --nuit,
--bleu, --bleu-fonce, --rouge, --rouge-fonce, --vert, --vert-clair,
--orange, --orange-clair, --gris-clair, --rayon,
--velours, --velours-clair, --velours-ombre, --or   (scène du spectacle)
```

Couleurs des catégories de blocs (dans `site/js/blocks/definitions.js`) :
Événements `#A86500`, LED et sons `#2E7D32`, Contrôle `#3B6FB6`, Opérateurs `#00796B`,
Variables `#C2185B`, IA `#6A3FA0`, Affichage `#546E7A`.

Le plus simple pour la suite : que Claude Design livre **une nouvelle palette de variables**, **les polices
(fichiers .woff2 libres)**, **les icônes SVG** et **les maquettes annotées** ; le développeur reportera ensuite
dans le code en gardant les `id` / classes existants.
