# Handoff : Théâtre d'ombre augmenté — refonte graphique (direction 1a « Papier & lanterne »)

## Vue d'ensemble
Site pour collégiens (13-15 ans) : entraîner une IA à reconnaître des silhouettes à la webcam, programmer en blocs (Blockly, rendu zelos) une carte Arduino (LED, sons), puis jouer un spectacle plein écran. **L'outil fonctionne déjà** : cette mission ne porte que sur la partie graphique (identité, lisibilité, cohérence). Le brief complet est dans `BRIEF_CLAUDE_DESIGN.md` (à lire en premier : contraintes non négociables §4, vocabulaire figé §7).

## À propos des fichiers de design
Les fichiers de `maquettes/` sont des **références de design en HTML** : ils montrent l'aspect et le comportement attendus, ce n'est **pas du code à copier**. Le travail consiste à **reporter ce design dans le code existant** : HTML + CSS sans framework, un seul fichier `site/css/style.css`, JavaScript existant inchangé.

**Règle absolue : les `id` et classes utilisés par le JavaScript ne changent pas.** On ajoute des classes ou on restyle, on ne renomme rien. Ne pas ajouter de dépendance, de CDN ni de police web.

Pour ouvrir les maquettes : ouvrir `maquettes/Ecrans 1a.dc.html` dans Chrome, avec `support.js` dans le même dossier. Le canevas se déplace et se zoome. Tous les styles sont en ligne (`style="…"`) : les valeurs exactes se lisent directement dans le source.

## Fidélité
**Haute fidélité** : couleurs, typographie, tailles, espacements et états sont définitifs. Les blocs Blockly dessinés dans les maquettes sont une **approximation** : la forme réelle reste celle de zelos, seules les couleurs de catégorie et l'habillage autour changent.

## Ordre de travail conseillé
1. Remplacer les variables en tête de `style.css` par celles de `tokens.css` (mêmes noms, plus 3 nouvelles variables).
2. Polices : n'utiliser que les polices système (voir Jetons).
3. Remplacer **tous les emojis-icônes** par les SVG de `icones/`, en ligne ou via `<img>`. Ils prennent la couleur `currentColor` s'ils sont mis en ligne.
4. Barre du haut (deux bandes), puis écran par écran dans l'ordre ci-dessous.
5. Couleurs des catégories dans `site/js/blocks/definitions.js`.
6. Favicon + logo.

---

## Structure commune : la barre du haut (problème connu n°1)
Deux bandes fixes de **60 px** chacune, sur une seule ligne à 1366 px. Il n'y a plus de passage sur deux lignes.

### Bande 1 — sombre, identique sur tous les écrans
- Fond `--nuit` #241E1A, texte #F7F1E5, padding 0 16px, `display:flex; align-items:center; gap:10px`.
- De gauche à droite :
  1. **Logo 36×36** (`logo.svg`). Le nom du site n'est pas répété (il figure dans `<title>` et sur l'écran Démarrage).
  2. **3 pastilles d'état** : Carte, Webcam, IA. Hauteur 36, rayon 999, padding 0 12, gap 6, icône 18 px (trait 2,2). Contenu : icône, puis `<b>Carte</b> · à connecter`. Variantes de couleur dans le tableau « États des pastilles ». **Quand la carte est « à connecter », sa pastille est cliquable et remplace le bouton « Connecter l'Arduino ».** « Déconnecter » passe dans le menu de la pastille connectée.
  3. Espaceur `flex:1`.
  4. **Menu équipe** : bouton de 44 px de haut, bordure 2px #5C5247, rayon 6. Contenu : icône `equipe`, prénoms en gras, état, chevron.
     - État non enregistré : pastille 8 px #E9C46A + mot « non enregistré » en #E9C46A.
     - État enregistré : icône `ok` + « enregistré » en #A6D49F.
     - Menu déroulant : carte #FFFDF8, bordure #D9CCB6, rayon 10, ombre `0 1px 0 #D9CCB6, 0 6px 16px rgba(60,40,20,.14)`, padding 6, items de 44 px. Items : **Enregistrer** (`enregistrer`), **Ouvrir / nouveau** (`ouvrir`), **Changer les prénoms** (`renommer`).
  5. **Bouton « ? »** de 44×44, bordure 2px #5C5247. Il ouvre un menu : Aide (`aide`), Comprendre l'IA (`cours`), Câblage des LED (`led`), Diagnostic du poste (`diagnostic`). Le lien « Mode professeur » reste en pied de page, comme aujourd'hui.
  6. **Tout éteindre** : fond `--rouge` #B3261E, texte blanc 700, hauteur 44, padding 0 16, rayon 6, icône `eteindre` 20 px (trait 2,4). **Toujours visible, jamais désactivé**, y compris en plein écran.
- Largeur occupée : environ 1 130 px sur 1 366.

### Bande 2 — papier : étapes et actions de l'écran
- Fond `--carte` #FFFDF8, bordure basse 1px #D9CCB6, padding 0 16, gap 8.
- **Étapes** 1 · Entraîner → 2 · Programmer → 3 · Spectacle, séparées par un chevron tourné de -90° (#D9CCB6, 18 px).
  - Étape **active** : fond #1F4E99, texte blanc 700, hauteur 44, padding 0 16 0 8, rayon 6, pastille numéro 28 px blanche avec chiffre #1F4E99.
  - Étape **faite** : texte #2E6B30 600, pastille 28 px #E3F0DF avec icône `ok`.
  - Étape **à venir** : texte #1E1A16 600, pastille 28 px avec bordure 2px #5C5247.
- **À droite, les commandes propres à l'écran.** Elles remplacent l'ancienne ligne de titre (« 2. Programmer · Niveau… »), ce qui économise de la hauteur.
  - Entraîner : libellé « Nouveau personnage », champ 200×44, bouton secondaire « Ajouter ».
  - Programmer : libellé « Niveau », sélecteur segmenté, puis **Démarrer** (vert) ou **Arrêter** (contour vert) avec l'état « en marche » (pastille 12 px + mot).
  - Spectacle : « Masquer l'image » (secondaire) et « Lancer le spectacle (plein écran) » (principal, icône `pleinecran`).
- **Sélecteur de niveau segmenté** : bordure 2px #D9CCB6, rayon 6, segments de 40 px de haut, padding 0 12. Le segment actif a un fond #EAF0FA, un texte #163A73 700, une icône `ok` 16 px et des bordures latérales 2px #1F4E99.

---

## Écrans (maquettes 1366 × 768, `maquettes/Ecrans 1a.dc.html`)
Chaque maquette porte un `data-screen-label` et des notes numérotées à sa droite. Fond de page `--fond` #F7F1E5. Contenu sous les bandes : padding 16 (ou 12 16 16).

### 01 · Démarrage
- Bande 1 seule, sans menu équipe, puisqu'il n'y a pas encore de projet. Pas de bande 2.
- Corps : grille `600px | 1fr`, gap 56, padding 0 72, centrée verticalement. Ce n'est plus une fenêtre modale posée sur un écran vide.
- **Gauche, illustration de l'écran de théâtre** : cadre #241E1A, rayon 10, padding 14. En haut, un lambrequin de 14 px : `radial-gradient(circle at 10px -3px,#B42A35 8px,transparent 9px) 0 0/20px 14px repeat-x, #8E1B24`. Dessous, l'écran (420 px de haut) : `radial-gradient(ellipse at 50% 42%,#FFF8E6 0%,#F3E2B8 55%,#DFC892 100%)`, avec trois silhouettes #1E1A16 (Sorcière, Loup, Roi) posées en bas. Les polygones sont dans le source.
- **Droite** :
  - Titre « Théâtre d'ombre augmenté », Georgia 40/700, interligne 1.1.
  - Sous-titre 18 px #5C5247. Ce texte est une proposition, à valider.
  - Libellé 600 « Écrivez les prénoms de l'équipe (ils servent à nommer votre fichier) : ».
  - 3 champs de 48 px en grille de 3 colonnes, gap 10.
  - 2 boutons de 52 px en grille de 2 colonnes : **Nouveau projet** (principal, 18 px 700, icône `ajouter`) et **Ouvrir notre projet (.json)** (secondaire, icône `ouvrir`).
  - Ligne « Reprendre le dernier travail » : carte #FFFDF8, bordure #D9CCB6, rayon 10, padding 12 14. Elle contient l'icône `enregistrer` #8A4F00, le titre en gras, la mention « Le dernier travail est une copie de secours gardée sur cet ordinateur : elle ne remplace pas votre fichier. » en #5C5247, et un bouton « Reprendre » à bordure #D9CCB6.

### 02 · 1. Entraîner (problème connu n°4 : la hiérarchie)
- Corps : grille `580px | 1fr`, gap 20.
- **Gauche** :
  - Webcam de 420 px de haut, rayon 10, bordure #D9CCB6. En surimpression en haut à gauche, une pastille « Webcam en direct » (fond #241E1A, point #E9C46A). En haut à droite, le bouton « Masquer l'image » (secondaire, 44 px).
  - Dessous : « Je vois : Loup », Georgia 24/700 #2E6B30. À droite sur la même ligne, le lien-disclosure « L'IA compare avec… » (#1F4E99 600 + chevron), replié par défaut.
  - Barres de confiance en grille `110px | 1fr | 56px`, gap 6×12. Piste de 16 px : fond #EFE7D8, bordure #D9CCB6, rayon 4. Remplissage #2E6B30. La ligne gagnante est en gras vert, préfixée « ✓ ».
- **Droite** :
  - **Un seul personnage ouvert : le personnage en cours.** Carte #FFFDF8 à bordure **2px #1F4E99**, rayon 10, padding 16, gap 12.
    - Vignette-silhouette 72×72, rayon 8, fond `radial-gradient(circle at 50% 45%,#FFF8E6,#E8D6A8)`.
    - Nom en Georgia 24/700, suivi de « personnage en cours » (#1F4E99 600).
    - État en mots, par exemple « 22 photos · prêt (30 conseillées) » avec icône `ok` en vert.
    - Barre de progression de 8 px (nombre de photos / 30).
    - Actions en boutons-icônes 44×44 à bordure #D9CCB6 : `renommer`, `vider`, `supprimer` (rouge). Chacun a un `title` et un `aria-label` : Renommer, Vider, Supprimer.
    - **Ajouter des photos** : bouton principal de 56 px, 18 px 700, icône `photo` 24 px, suivi de « (garder appuyé) » en 16 px 400.
    - Grille de 10 vignettes carrées (gap 6, rayon 4).
    - Disclosure « Pourquoi au moins 15 photos, et variées ? » : fond #FBEBCB, rayon 6, hauteur minimale 44, icône `aide` #8A4F00, chevron. **Replié par défaut.**
  - **Autres personnages** (Fond vide inclus) : liste repliée, un item par ligne de 58 px (séparateur #EFE7D8). Chaque ligne contient une vignette 40×40, le nom en gras (largeur 120), l'état en mots avec icône (`ok` vert, ou `attention` #8A4F00 pour « pas assez (15 minimum) ») et un chevron. Un clic ouvre ce personnage et referme le précédent.
- Objectif : **aucun défilement** en 1366×768 avec 4 personnages.

### 05 · 2. Programmer, niveau 1 (le niveau 2 suit la même grille)
- Corps : grille `340px | 1fr`, gap 16.
- **Colonne webcam (340 px)** :
  - Webcam de 240 px. Bouton-icône « Masquer » 44 px en haut à droite, bouton « Réduire » en haut à gauche.
  - « Je vois : Loup » en Georgia 22, puis les barres de confiance compactes (pistes de 14 px).
  - Séparateur, puis « Ce que la carte a reçu » avec le lien « Brancher les LED ? ».
  - Puces LED en grille 2×2, de 40 px de haut :
    - allumée : fond #FBEBCB, bordure 2px #E9C46A, point 14 px #F5B700 avec halo, texte « 9 · allumée » en 700 ;
    - éteinte : bordure 2px #D9CCB6, cercle vide, texte « 10 · éteinte » en #5C5247.
  - Ligne Sons de 44 px, bordure 2px pointillée #B8A98F. Elle affiche la liste des sons et « + mp3 / wav ». Un clic ouvre le sélecteur de fichiers ; le glisser-déposer reste actif sur la ligne.
- **Zone de blocs** :
  - Palette de 156 px, fond #EFE7D8. Chaque item fait 44 px et porte une barre de couleur de catégorie de 6×26 px.
  - Espace de travail : fond #FFFDF8 avec grille de points #D9CCB6 au pas de 20 px.
  - Contrôles zoom et corbeille : ronds de 44 px.
- **Niveau 2** : même grille, avec le panneau à onglets Messages / Variables (décrit au niveau 3) sous les blocs.

### 03 · 2. Programmer, niveau 3 (problème connu n°2)
- **La colonne webcam devient une bande d'état de 64 px** (fond #FFFDF8, bordure, rayon 10). Elle contient, de gauche à droite :
  - une vignette webcam de 72×52 ;
  - « Je vois : Loup 100 % » ;
  - un séparateur, puis les puces LED en ligne ;
  - un bouton « Sons (2) » ;
  - le bouton secondaire « Agrandir la webcam », qui rouvre la colonne de 340 px.
  Mémoriser ce choix par niveau : les niveaux 1 et 2 ont la colonne ouverte par défaut, le niveau 3 l'a réduite.
- Dessous : grille `1fr | 520px`, gap 12.
  - **Blocs** : environ 640×470 px, contre environ 360 px de large aujourd'hui. Le bloc sélectionné porte un anneau `0 0 0 3px #E9C46A, 0 0 0 5px #1E1A16`.
  - **Panneau code** : fond #241E1A, texte #F7F1E5, rayon 10.
    - En-tête : « Code C++ (Arduino) » 18 px 700, puis « lecture seule » avec l'icône `cadenas` en #D9CCB6. Boutons « Copier » (`copier`) et « .ino » (`telecharger`), de 44 px, bordure 2px #5C5247.
    - Code : Consolas 16 px, interligne 24 px. Numéros de ligne #A89A88 sur 40 px. Coloration : commentaires #B8A98F, mots-clés et contrôle #E9C46A, texte #F7F1E5.
    - **Ligne liée au bloc cliqué** : fond #4A3D24 + barre gauche 4px #E9C46A. Ce n'est jamais une simple couleur de texte.
    - Pied : disclosure « « En direct » ou « autonome » : quelle différence ? », fond #3A322B. Le paragraphe d'introduction actuel du panneau part dans l'Aide du niveau 3.
  - **Messages / Variables** : un seul panneau de 150 px à onglets de 44 px. L'onglet actif est souligné 3px #1F4E99, l'onglet Variables porte un compteur. Le bouton « Effacer » est à droite. Les messages sont en Consolas, l'heure en #5C5247.

### 08 · Aide
- **Panneau à droite** (et non plus centré) : 720 px de large, en haut à 68 px, à droite à 16 px, hauteur 692. Les blocs restent visibles à gauche. Voile `rgba(36,30,26,.55)` sous la bande 1.
- En-tête de 64 px :
  - icône `aide` #8A4F00 ;
  - « Aide » en Georgia 24 ;
  - **onglets Niveau 1 / 2 / 3**, le niveau en cours ouvert ;
  - bouton fermer 44×44.
- Corps défilant (`overflow:auto`), gap 8, interligne 1.35.
- Les emojis du texte sont remplacés par des **mini-blocs** : `<span>` à fond de la couleur de la catégorie, texte blanc 700, rayon 8, padding 0 10. Le cas « bloc entouré de rouge » est un mini-bloc à bordure 3px #B3261E.
- Mini-lexique en grille `110px | 1fr` (Catégorie, Exemple, Confiance, Broche). Texte d'origine conservé.
- Pied fixe de 72 px, fond #F7F1E5 : à gauche le lien « Comprendre comment l'IA reconnaît les personnages » (icône `cours`), à droite le bouton principal « J'ai compris ».
- La consigne « Si la carte ne répond pas… » est déplacée vers Diagnostic du poste.

### 09 · 3. Spectacle, rideau fermé
- Scène : rayon 10.
  - Fronton de 72 px : `linear-gradient(180deg,#B42A35,#8E1B24 70%,#4A0D13)`, bordure basse 3px #E9C46A. Il affiche « Le théâtre d'ombre de {prénoms} » en Georgia 32/700 #E9C46A, espacement des lettres .04em, **dès cet écran**.
  - Festons de 14 px : `radial-gradient(circle at 14px 0,#8E1B24 12px,transparent 13px) 0 0/28px 14px repeat-x`.
  - Rideau : `repeating-linear-gradient(90deg,#4A0D13 0,#8E1B24 22px,#B42A35 40px,#8E1B24 58px,#4A0D13 80px)`, avec une fente centrale de 2px #2A070B.
- Message central sur une plaque : fond #241E1A, bordure 2px #E9C46A, rayon 10, texte 20 px 600, icône `pleinecran` or. Texte : « Cliquez sur « Lancer le spectacle » pour ouvrir le rideau ».
- Aucune image : tout est en dégradés CSS.

### 10 · Spectacle plein écran (point fort, conservé et peaufiné)
- Barre de 56 px sur fond #140F0C : « 3. Spectacle » (Georgia 20), pastille Carte, « Masquer l'image », « Quitter le plein écran » (bordure #5C5247), **Tout éteindre**.
- Salle : `radial-gradient(ellipse at 50% 30%,#2E2219,#170F0B 70%)`, marge 0 12 12, rayon 8.
- Rideaux latéraux de 170 px (même dégradé de plis, bas arrondi `border-radius:0 0 60% 0/0 0 12% 0`). Embrasses dorées de 150×12 : `linear-gradient(180deg,#F3D58A,#B88A2E)`.
- **Projecteurs** (4 colonnes égales, centrées sur l'écran d'ombres) :
  - boîtier de 40×28 : #3A322B, bordure 2px #5C5247, `border-radius:6px 6px 14px 14px` ;
  - lentille de 26×10 : #FFE08A avec halo `0 0 14px 4px #FFD25A` quand allumée, #1E1A16 quand éteinte ;
  - libellé « LED 1 · allumée » en blanc 700, ou « LED 2 · éteinte » en #D9CCB6.
  - **Faisceau** : trapèze `clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)` rempli par `linear-gradient(180deg,rgba(255,214,110,.45),transparent 85%)`. Il prend la couleur de la LED si les LED sont colorées.
- Écran d'ombres de 600×390 : cadre bois 10px #5A3E26, fond `radial-gradient(ellipse at 40% 40%,#FFF8E6,#F3E2B8 60%,#E2CC98)`, ombre `0 10px 30px rgba(0,0,0,.5)`.
- **Plaque** de 360×96 : `linear-gradient(180deg,#2E2219,#1A120D)`, bordure 3px #E9C46A, rayon 10. Elle porte « SUR SCÈNE » (16 px, capitales, espacement .1em, #E9C46A) puis le nom en Georgia 48/700 #F3D58A. Pour le fond vide : « personne ».
- Ouverture du rideau : translation des deux pans en **0,8 s ease-out**. Si `prefers-reduced-motion`, ouverture instantanée.

### 11 · Mode professeur
- Fenêtre centrée de 800 px. En-tête de 64 px : icône `prof`, « Réglages du professeur » en Georgia 24, bouton fermer.
- Grille `240px | 1fr`, gap 16×24. Libellés en gras.
- Champs de 44 px. Case à cocher de 26 px, cochée en #1F4E99 avec l'icône `ok` blanche. Curseur : piste de 8 px #EFE7D8, remplissage #1F4E99, poignée de 24 px.
- L'aide « 4 au maximum · ~ = intensité réglable » passe sous le libellé en 16 px #5C5247.
- Nouvelle phrase sous « Images de suite » : « plus haut = plus stable, mais plus lent ». **À valider avec l'enseignant.**
- Encadré d'information : fond #EFE7D8, icône `info`, texte d'origine.
- Boutons : **Appliquer** (principal) et **Revenir à config.js** (secondaire) à gauche, **Fermer** (neutre, bordure #D9CCB6) écarté à droite.

### Non maquettés (même système, sobres)
- Cours « Comprendre l'IA » (12-13) et Câblage des LED (14-15), **imprimables en noir et blanc** :
  - en `@media print`, fond blanc, texte #000, aucune couleur porteuse de sens ;
  - titres en Georgia, corps 12 pt minimum ;
  - schémas SVG en traits noirs.
- Diagnostic du poste (16-17) :
  - une liste de vérifications, chacune avec l'icône `ok`, `attention` ou `info` et un mot d'état ;
  - y ajouter la consigne « Si la carte ne répond pas : vérifiez le câble USB, puis cliquez de nouveau sur « Connecter l'Arduino » ».

---

## Composants et états (planche `maquettes/Identite Theatre Ombre.dc.html`, colonne 1a)
Tous les boutons font **au moins 44 px de haut**, ont un rayon de 6, sont en 16 px 600 et ont une icône de 20 px avec un gap de 8.

| Variante | Normal | Survol | Actif (appuyé) | Désactivé |
|---|---|---|---|---|
| Principal | fond #1F4E99, texte blanc | fond #163A73 | #163A73 + `inset 0 3px 0 rgba(0,0,0,.25)` + `translateY(1px)` | fond #E4DACA, texte #5C5247, **bordure 2px pointillée #B8A98F** |
| Secondaire | fond #FFFDF8, bordure 2px #1F4E99, texte #1F4E99 | fond #EAF0FA, bordure et texte #163A73 | fond #D6E2F5, `translateY(1px)` | fond #EFE7D8, bordure pointillée #B8A98F, texte #5C5247 |
| Démarrer | fond #2E6B30, texte blanc | #23521F | — | comme le principal désactivé |
| Arrêter | fond #FFFDF8, bordure 2px #2E6B30, texte #2E6B30, icône `stop` | — | — | — |
| Tout éteindre | fond #B3261E, texte blanc 700 | #8C1D17 | #8C1D17 + `inset 0 3px 0 rgba(0,0,0,.3)` | **jamais** |

- **Focus clavier, pour tous les éléments** : `box-shadow: 0 0 0 2px #F7F1E5, 0 0 0 5px #8A4F00`, via `:focus-visible` (voir `tokens.css`).
- **Champ texte** : hauteur 44, bordure 2px #D9CCB6, rayon 6, fond #FFFDF8, placeholder #5C5247.
  - Focus : bordure #1E1A16 + `0 0 0 3px #E9C46A`.
  - Erreur : bordure #B3261E et message dessous (icône `attention` + texte #B3261E, par exemple « Ce personnage existe déjà. »).
  - Désactivé : bordure pointillée, fond #EFE7D8.

### États des pastilles (toujours icône + mot)
| État | Fond | Texte et icône |
|---|---|---|
| OK (connectée, prête) | #E3F0DF | #2E6B30 |
| À faire (à connecter, à entraîner) | #FBEBCB | #8A4F00 |
| Neutre (simulée) | #EFE7D8 | #1E1A16 |
| Erreur (refusée, déconnectée) | #FBE4E1 | #B3261E, **l'icône devient `attention`** |

---

## Jetons de design
Les valeurs complètes et commentées sont dans **`tokens.css`**, à reprendre telles quelles en tête de `style.css`.

- **Couleurs** :
  - surfaces et texte : --fond #F7F1E5 · --carte #FFFDF8 · --texte #1E1A16 · --texte-doux #5C5247 · --bord #D9CCB6 · --gris-clair #EFE7D8 · --nuit #241E1A ;
  - actions : --bleu #1F4E99 · --bleu-fonce #163A73 · --rouge #B3261E · --rouge-fonce #8C1D17 · --vert #2E6B30 · --vert-clair #E3F0DF · --orange #8A4F00 · --orange-clair #FBEBCB ;
  - scène du spectacle : --velours #8E1B24 · --velours-clair #B42A35 · --velours-ombre #4A0D13 · --or #E9C46A ;
  - **nouvelles variables** : --bleu-pale #EAF0FA · --rouge-clair #FBE4E1 · --focus.
- **Contrastes vérifiés** (WCAG AA ou mieux) :
  - texte sur fond : 15,4:1 ;
  - texte-doux sur fond : 6,8:1 ;
  - blanc sur bleu : 8,1:1 ; sur rouge : 6,5:1 ; sur vert : 6,4:1 ; sur nuit : 16,5:1 ;
  - or sur nuit : 9,9:1 ;
  - vert sur vert-clair : 5,5:1 ; orange sur orange-clair : 5,6:1.
- **Typographie (polices système uniquement, aucun fichier à embarquer)** :
  - texte : `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif` ;
  - titres et plaques : `Georgia, "Times New Roman", serif` ;
  - code : `Consolas, "Courier New", monospace`.
  - Échelle : 40 (accueil) · 32 (fronton) · 28 / 24 (titres) · 20-22 (sous-titres) · 18 (gros boutons) · **16 (minimum absolu)**.
- **Rayons** : 10 (cartes) · 6 (boutons, champs) · 4 (vignettes) · 999 (pastilles).
- **Ombre unique** : `0 1px 0 #D9CCB6, 0 3px 8px rgba(60,40,20,.10)`. Pour les menus et fenêtres : `0 12px 40px rgba(0,0,0,.35)`.
- **Espaces** : 4 · 8 · 12 · 16 · 24 · 32.

### Catégories Blockly (`definitions.js`, texte blanc)
| Catégorie | Couleur | Contraste |
|---|---|---|
| Événements | #965A00 | 5,6:1 |
| LED et sons | #2E7D32 | 5,1:1 |
| Contrôle | #2F64B0 | 5,9:1 |
| Opérateurs | #00756A | 5,6:1 |
| Variables | #B8175A | 6,3:1 |
| IA | #6A3FA0 | 7,4:1 |
| Affichage | #52616B | 6,4:1 |

## Interactions et comportement
- **Animations** courtes uniquement : ouverture du rideau 0,8 s, transitions de survol 120 ms. Tout est coupé sous `prefers-reduced-motion: reduce` (règle déjà présente dans `tokens.css`). Aucune vidéo, aucun flou, aucune animation en boucle.
- **Jamais la couleur seule** : chaque état porte un mot ou une icône. C'est le cas des pastilles, des LED (« allumée / éteinte »), du programme (« en marche »), de l'enregistrement et des personnages (« prêt / pas assez »).
- Disclosures « Pourquoi ? » : `<details>/<summary>` natifs, repliés par défaut, chevron tourné de 90° une fois ouvert.
- Menus de la bande 1 : ouverture au clic, fermeture par Échap ou clic extérieur, navigation aux flèches.
- Entraîner : un seul personnage ouvert à la fois.
- Programmer : l'état de la colonne webcam (ouverte ou réduite) est mémorisé par niveau, dans `localStorage`.
- Boutons-icônes seuls : `aria-label` et `title` obligatoires.

## Ressources
- `icones/*.svg` : 32 icônes maison, grille 24, trait 2, extrémités rondes, `stroke="currentColor"`. Elles sont libres, à placer sous la licence du projet (par exemple CC0).
  - Correspondance avec les emojis : 🔌 → `carte`, 📷 → `webcam`, 🧠 → `ia`, 💡 → `led`, 🔊 → `son`, 📸 → `photo`, 🗑️ → `supprimer`, ✏️ → `renommer`, 🎬 → `spectacle` ou `pleinecran`.
  - Autres : `enregistrer`, `ouvrir`, `aide`, `eteindre`, `ajouter`, `masquer`, `lecture`, `stop`, `cours`, `ok`, `attention`, `info`, `personnage`, `equipe`, `cadenas`, `copier`, `telecharger`, `fermer`, `chevron`, `prof`, `diagnostic`, `vider`.
  - Mise en ligne recommandée (`<svg>` dans le HTML) pour hériter de la couleur. Taille 20 px dans les boutons, 18 px dans les pastilles.
- `logo.svg` et `favicon.svg` : à déclarer avec `<link rel="icon" type="image/svg+xml" href="favicon.svg">`. Le logo de la bande 1 fait 36 px.
- Silhouettes (Loup, Sorcière, Roi) : polygones dans le source des maquettes. Elles ne servent qu'à l'illustration de l'accueil et aux vignettes ; en classe, la webcam et les photos réelles les remplacent.

## Fichiers
- `BRIEF_CLAUDE_DESIGN.md` : brief d'origine (contraintes, liste des `id` et classes à conserver).
- `tokens.css` : variables CSS à reprendre.
- `icones/`, `logo.svg`, `favicon.svg` : ressources graphiques.
- `maquettes/Ecrans 1a.dc.html` : écrans 01, 02, 03, 05, 08, 09, 10, 11 en 1366×768, annotés. Il nécessite `support.js` dans le même dossier.
- `maquettes/Identite Theatre Ombre.dc.html` : planche d'identité. **Seule la colonne 1a est retenue** ; la colonne 1b est une alternative écartée.
