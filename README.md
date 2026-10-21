# Parcours commun Labo Blocs — Théâtre d’ombre

<!-- suivi-maintenance:debut -->
## État du projet et améliorations documentées — 21 octobre 2026

- L’entrée IA et programmation utilise les écrans, blocs, niveaux, caméra, simulateur et panneau Arduino communs de Labo Blocs.
- Six exercices progressifs : fond vide, deux étiquettes IA, première LED, personnage → LED, deux éclairages, puis programme final. Le dernier exercice reprend le programme du cinquième.
- Les exemples d’IA sont partagés entre exercices et conservés avec la progression dans la rubrique programmation du fichier de l’équipe ; le carnet reste dans ce même fichier.
- Le carnet, le suivi professeur en lecture seule et le lien de modification ont été adaptés au nouveau parcours. Les modules du Théâtre sont versionnés à la publication pour éviter un mélange de versions dans le cache.
- Les anciens blocs restent en archive ; leur conversion n’est pas automatique. Les exemples IA historiques sont repris. Les sons personnels sont conservés dans le fichier ; le parcours commun propose un buzzer facultatif.
- Modifier les exercices dans l’éditeur de Labo Blocs, parcours Théâtre d’ombre augmenté : parcours/theatre-ombre/parcours.js. L’intégration commune est dans interface/theatre-parcours.js du dépôt Labo Blocs.
- Validations antérieures : 112 tests logiciels du Théâtre et parcours navigateur des six exercices. La webcam réelle, la liaison Arduino et la scène d’une minute restent à vérifier en classe.

### Référence locale et maintenance

Dossier de travail de référence : **Documents/TheatreDombre**. Dépôt : [Anlito/theatre-ombre](https://github.com/Anlito/theatre-ombre). La branche principale est **main**. Les copies temporaires d’un chat ou les worktrees servent au travail intermédiaire ; elles ne remplacent pas ce dossier.

À chaque intervention :

1. Vérifier les modifications locales et la version publiée avant de commencer ; sauvegarder le travail non enregistré.
2. Décrire dans ce README les améliorations, les vérifications, les limites et les opérations restantes.
3. Publier les changements autorisés, puis synchroniser le dossier local de référence avec le même commit.
4. Contrôler le commit local, le commit distant et les fichiers restants avant d’annoncer que le projet est à jour. Signaler explicitement tout décalage ou travail conservé hors publication.

Cette règle permet de reprendre le projet dans un autre outil local sans perdre les dernières améliorations. Une publication du site ne met pas automatiquement à jour les dossiers du PC.

<!-- suivi-maintenance:fin -->

L’entrée **IA et programmation** ouvre les mêmes écrans, blocs, niveaux, caméra,
simulateur et panneau Arduino que les autres projets Labo Blocs. L’ancien écran
Entraîner/Programmer ne sert plus au parcours élève.

Le parcours **Théâtre d’ombre augmenté** contient six exercices : fond vide,
étiquettes de deux personnages, première LED, personnage → LED, deux éclairages,
puis programme final. Les deux premiers vérifient les exemples enregistrés ; les
quatre suivants vérifient le comportement des programmes dans le simulateur.
Le montage, la reconnaissance réelle et la scène d’une minute sont à tester en classe.

Pour le modifier : [éditeur de Labo Blocs](https://anlito.github.io/labo-blocs/site/editeur.html),
puis choisir **Théâtre d’ombre augmenté**. Les consignes, blocs, composants, tests,
exigences d’apprentissage et programme à reprendre se règlent dans cet éditeur.
Publier le parcours dans Labo Blocs, puis recharger le Théâtre pour le récupérer.
La source est parcours/theatre-ombre/parcours.js dans le dépôt Labo Blocs.

Le Théâtre charge le module et le parcours en ligne, sans les copier dans son site.
Le fichier de l’équipe garde le carnet et une rubrique programmation avec
les six exercices et la caméra partagée. Les étiquettes et les exemples ne sont
pas recommencés à chaque exercice ; l’exercice final reprend les blocs du 5.
Le suivi professeur lit les six exercices et affiche leurs programmes en lecture seule.

Les anciens fichiers restent lisibles : leurs blocs historiques sont conservés,
et leurs exemples d’IA sont repris dans le nouveau parcours. Les blocs de l’ancien
éditeur ne sont pas convertis automatiquement : l’équipe reconstruit son programme
avec les blocs communs, sans effacer l’archive des anciens blocs.

**Arduino :** utiliser le panneau **En direct** de Labo Blocs et son programme de carte.
La webcam et l’IA restent dans l’ordinateur ; le câble USB est nécessaire pendant
la scène. Une LED sur D9, une autre sur D10, avec résistances ou modules adaptés.
Les sons personnels de l’ancien projet restent dans le fichier mais ne sont pas
exécutés par le parcours commun ; l’option sonore du parcours utilise un buzzer.

## Documents complémentaires

RECETTE.md conserve les vérifications historiques. Pour l’organisation et le parcours actuels, suivre les sections de ce README et le dépôt Labo Blocs. Les valeurs d’accès ne sont pas documentées dans ce fichier.
