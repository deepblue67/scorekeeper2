# ScoreKeeper

Documentation de reprise et carnet de bord officiel de l'application ScoreKeeper.

Ce fichier sert deux objectifs :

- aider Christophe a se rappeler comment fonctionne l'application ;
- donner a Codex, ou a tout autre intervenant, le contexte necessaire pour reprendre le projet sans repartir de zero.

Derniere version documentee : `V20261101 15H00`.

Derniere mise a jour du README : 2026-11-01.

Fichiers de production a deployer : `index.html` et `sw.js`.

Les autres fichiers (`tests`, `scripts`, `package.json`, `playwright.config.js`, `node_modules`, etc.) servent uniquement au travail local et aux tests. Ils ne sont pas necessaires pour utiliser l'application en production.

## Role Officiel De Ce README

A partir du 2026-06-18, ce fichier est le carnet de bord officiel du projet.

Il doit etre mis a jour a chaque evolution, meme petite, afin de rester utile :

- a Christophe, pour comprendre et se rememorer le fonctionnement de l'application ;
- a Codex, pour reprendre le projet rapidement sans redecouvrir toute l'architecture ;
- a toute personne qui regarderait le depot GitHub.

A chaque modification future, mettre a jour au minimum :

- la description de ce qui existe si le comportement change ;
- la version documentee si `index.html` ou `sw.js` changent ;
- le nombre de tests si la suite evolue ;
- l'historique des evolutions ;
- les tableaux de suivi en fin de fichier ;
- le statut, la priorite et la version/remarque des sujets concernes.

Les deux tableaux de suivi officiels sont :

- `Technique et architecture` ;
- `Gameplay et usage`.

Chaque ligne de tableau doit indiquer :

- le sujet ;
- la description ;
- le statut : `Fait`, `A faire`, `Moyen terme`, `A eviter pour l'instant`, etc. ;
- la priorite ;
- la version ou une remarque.

## Resume Du Projet

ScoreKeeper est une application web autonome de suivi de scores pour jeux de societe ou jeux de cartes.

Elle permet de :

- creer une partie ;
- choisir un jeu ;
- nommer une partie ;
- selectionner des joueurs ;
- saisir les scores manche par manche ;
- modifier ou supprimer un score deja saisi ;
- passer aux manches suivantes ou revenir aux precedentes ;
- terminer une partie ;
- conserver l'historique ;
- consulter des statistiques ;
- gerer la liste des joueurs et des jeux ;
- exporter et importer toutes les donnees ;
- fonctionner hors ligne apres installation/cache ;
- choisir un theme visuel.

L'application est volontairement simple cote deploiement : elle tient dans deux fichiers principaux, `index.html` et `sw.js`.

## Intention Initiale

Le besoin fonctionnel etait deja satisfait par l'application de depart. La consigne forte etait donc :

> Ne surtout pas changer les fonctionnalites de l'application.

Les interventions ont porte sur :

- la securite ;
- la robustesse du stockage ;
- l'autonomie hors ligne ;
- la structure interne du code ;
- les tests ;
- l'apparence visuelle ;
- l'ajout de themes sans supprimer les existants.

Les fichiers originaux fournis au depart etaient :

- `C:\Users\cdesmottes\Downloads\index.html`
- `C:\Users\cdesmottes\Downloads\sw.js`

Ils n'ont pas vocation a etre modifies directement. La livraison travaillee se trouve ici :

```text
C:\Users\cdesmottes\Documents\Codex\2026-06-11\files-mentioned-by-the-user-index\outputs\scorekeeper
```

## Structure Des Fichiers

```text
scorekeeper/
  index.html
  sw.js
  README.md
  package.json
  package-lock.json
  playwright.config.js
  scripts/
    serve.mjs
  tests/
    scorekeeper.spec.js
    service-worker.unit.test.js
```

### `index.html`

Fichier principal de l'application.

Il contient :

- le HTML racine ;
- les meta tags PWA ;
- l'icone integree en base64 ;
- la librairie QR Code integree ;
- tous les styles CSS ;
- tous les themes ;
- toute la logique JavaScript ;
- la creation dynamique du manifest PWA ;
- l'enregistrement du service worker.

Il n'y a pas de framework externe.

### `sw.js`

Service worker de l'application.

Il gere :

- le cache de l'application ;
- le fonctionnement hors ligne ;
- la suppression des anciens caches ;
- la mise a jour forcee via `APP_VERSION`.

### `tests/scorekeeper.spec.js`

Tests Playwright de l'application dans un navigateur mobile simule.

Ils couvrent les principaux parcours utilisateur :

- creation d'une partie ;
- saisie de scores positifs et negatifs ;
- modification d'un score deja saisi ;
- modification depuis le tableau de detail ;
- suppression d'un score ;
- fin de partie ;
- historique apres rechargement ;
- export complet ;
- protection contre injection HTML ;
- resilience en cas d'echec de `localStorage` ;
- rejet d'un import invalide ;
- import valide avec sauvegarde prealable ;
- persistance du theme ;
- ajout de joueurs, groupes et jeux ;
- edition de joueurs depuis les reglages.

### `tests/service-worker.unit.test.js`

Tests unitaires du service worker.

Ils couvrent :

- installation et cache initial ;
- activation et nettoyage des anciens caches ;
- fallback hors ligne pour la navigation ;
- non-interception des requetes externes ;
- strategie cache-first pour les ressources locales ;
- verification de l'absence de dependances externes dans la livraison.

### `scripts/serve.mjs`

Petit serveur local de test.

Il sert l'application sur :

```text
http://127.0.0.1:4173
```

Il renvoie `Cache-Control: no-store`, ce qui evite les confusions pendant les tests locaux.

## Architecture Generale De L'Application

L'application est une Single Page Application faite en JavaScript natif.

Elle n'utilise ni React, ni Vue, ni Angular.

Le HTML contient seulement le squelette :

- une zone `#pages` ;
- trois pages internes (`#p-play`, `#p-history`, `#p-settings`) ;
- une navigation basse ;
- une racine de modale.

Les pages sont reconstruites dynamiquement par JavaScript.

Pages principales :

- `play` : preparation, partie en cours et resultats ;
- `history` : historique et statistiques ;
- `settings` : reglages.

La navigation est construite par `buildNav()`.

Le rendu global passe par :

- `render()`
- `renderPage(id)` (conserve la position de defilement lors d'un re-rendu)
- `goTab(id)` (remonte en haut de page lors d'un changement d'onglet)

Chaque page a une fonction de construction dediee :

- `buildPlay(pg)`, qui aiguille vers `buildSetup(pg)`, `buildGame(pg)` ou `buildResults(pg, session)`
- `buildHistory(pg)`, qui inclut `buildStats(wrap, rerender)`
- `buildSettings(pg)`

Les modales sont construites par `showModal(...)`.

## Donnees Et Stockage

Les donnees sont stockees dans `localStorage`.

Cle principale :

```text
sk_v3
```

Cle du theme selectionne :

```text
sk_theme
```

Cle de sauvegarde avant import :

```text
sk_v3_backup
```

### Modele De Donnees

La structure principale ressemble a ceci :

```js
{
  games: ["Belote", "UNO", "..."],
  players: [
    {
      id: "p1",
      name: "Alice",
      emoji: "🦊",
      color: "av0",
      groups: ["famille"]
    }
  ],
  sessions: [],
  current: null
}
```

### Partie En Cours

Quand une partie est demarree, `current` contient une session active :

```js
{
  id: "...",
  gameName: "Belote",
  date: "2026-06-11",
  startedAt: 1710000000000,
  round: 1,
  players: [
    {
      id: "...",
      name: "Alice",
      emoji: "🦊",
      color: "av0",
      groups: ["famille"],
      scores: [],
      total: 0
    }
  ]
}
```

### Scores

Les scores sont stockes par joueur et par manche.

Format actuel :

```js
scores: [
  { r: 1, v: 42 },
  { r: 2, v: -7 }
]
```

`r` est le numero de manche.

`v` est la valeur du score.

Le total d'un joueur est recalcule a partir de ses scores.

La fonction centrale pour modifier un score est :

```js
updatePlayerRoundScore(data, playerId, round, score)
```

Si `score` est absent, le score de la manche est supprime.

Si `score` est fourni, il remplace le score existant pour cette manche.

Cette logique evite les doublons pour une meme manche.

## Gestion Des Mises A Jour

L'application utilise une constante :

```js
const APP_VERSION = 'V20261101 15H00';
```

Elle est presente dans :

- `index.html`
- `sw.js`

Elle sert a forcer la mise a jour du cache du service worker.

Quand on livre une nouvelle version, il faut toujours synchroniser cette constante dans les deux fichiers.

Le nom du cache est construit ainsi dans `sw.js` :

```js
const CACHE_PREFIX = 'scorekeeper-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
```

Le test `tests/service-worker.unit.test.js` contient aussi le nom attendu du cache :

```js
const currentCacheName = "scorekeeper-V20261101 15H00";
```

Quand on change `APP_VERSION`, il faut donc mettre a jour :

- `index.html`
- `sw.js`
- `tests/service-worker.unit.test.js`

## Service Worker Et Hors Ligne

Le service worker met en cache :

```js
const CORE_ASSETS = [
  './',
  './index.html',
  './sw.js'
];
```

Strategie utilisee :

- navigation : network-first, puis fallback vers `index.html` en cache ;
- ressources locales : cache-first ;
- requetes externes : ignorees ;
- requetes non-GET : ignorees ;
- anciens caches ScoreKeeper : supprimes a l'activation ;
- activation d'une nouvelle version : message `SKIP_WAITING` envoye depuis l'application apres confirmation utilisateur.

Cela signifie que l'application peut fonctionner hors ligne apres avoir ete chargee au moins une fois.

Quand une nouvelle version est installee en attente, l'application affiche un petit message `Nouvelle version disponible`. Le bouton `Mettre a jour` envoie `SKIP_WAITING` au service worker, puis la page se recharge quand le nouveau worker prend le controle.

## Fonctionnement Des Pages

Depuis `V20261101 15H00`, la barre de navigation n'a plus que 3 onglets :

- `Jouer` : preparation, partie en cours et resultats, sur un seul onglet ;
- `Historique` : parties terminees, avec un selecteur `Parties / Stats` ;
- `Reglages`.

Les anciens onglets `Accueil`, `Partie` et `Stats` ont ete fusionnes pour supprimer les allers-retours.

### Jouer

Fonction d'aiguillage :

```js
buildPlay(pg)
```

Elle affiche, selon l'etat :

- la partie en cours si `D.current` existe (`buildGame`) ;
- l'ecran de resultats juste apres une fin de partie (`buildResults`) ;
- sinon l'ecran de preparation (`buildSetup`).

### Preparation D'Une Partie

Fonction :

```js
buildSetup(pg)
```

Tout se fait sur un seul ecran, sans modale obligatoire :

- carte `Rejouer` en haut : relance en un appui le dernier jeu avec les memes joueurs, dans le meme ordre ;
- jeux affiches en pastilles, les plus recemment joues en premier (11 visibles, bouton `Tous les jeux` au-dela) ;
- pastille `+ Autre jeu` : recherche ou ajout d'un jeu (le nouveau jeu est enregistre dans la liste) ;
- joueurs affiches en pastilles a cocher, avec filtre par groupe et `Tout selectionner` ;
- l'ordre de jeu suit l'ordre des appuis, modifiable avec les boutons monter/descendre ;
- pastille `+ Nouveau joueur` : creation du joueur sur place (emoji, prenom, groupes), directement ajoute a la partie ;
- nom de partie **facultatif** (si vide, l'historique affiche le nom du jeu) ;
- bouton `Demarrer` toujours visible en bas de l'ecran, qui resume la partie (`Demarrer · Belote · 3 joueurs`).

La selection en cours est conservee dans la variable `setup` : creer un joueur ou un jeu ne la fait plus perdre.

Si des informations manquent (jeu ou joueur), le bouton explique ce qui manque.

### Partie

Fonction :

```js
buildGame(pg)
```

Un seul ecran avec une bascule `Scores / Tableau` (l'ancien onglet `Classement` a disparu) :

- chaque joueur, dans l'ordre de jeu, affiche son rang (medaille, rangs partages en cas d'egalite), son total en gros et son score de la manche ;
- bouton principal `Saisir la manche N` : ouvre le pave sur le premier joueur qui n'a pas encore saisi ;
- `Tableau` : detail par manche, chaque case est modifiable ;
- navigation secondaire `← M` / `M →` conservee pour revenir sur une manche ou sauter une manche sans score.

### Saisie De Score

Fonctions :

```js
openScoreEntry(playerId)
showEditScore(player, round, existingVal, onDone)
```

Le pave de saisie permet :

- d'entrer un nombre ;
- de passer en negatif avec `±` ;
- de supprimer avec `⌫` ;
- de modifier ou supprimer un score existant.

Saisie en chaine : le bouton affiche `Valider → Bob`. Apres validation, le pave reste ouvert et passe au joueur suivant qui n'a pas encore saisi.

Quand tous les joueurs ont saisi, la manche suivante demarre automatiquement. Un bandeau `Manche N complete → manche N+1 · Annuler` permet de revenir en arriere pendant 6 secondes.

Modifier un score deja saisi ne declenche ni la chaine ni le passage automatique.

### Fin De Partie Et Resultats

Fonction :

```js
buildResults(pg, session)
```

Apres confirmation, la partie est enregistree dans l'historique et l'ecran de resultats s'affiche sur place :

- vainqueur (ou egalite) et classement final ;
- `Rejouer` : meme jeu, memes joueurs, meme ordre ;
- `Changer de jeu` : retour a la preparation avec les memes joueurs deja coches ;
- `Partager` : image du classement ;
- liens `Nouvelle partie` et `Detail des manches`.

Si la derniere manche a ete ouverte automatiquement mais n'a pas ete jouee, elle n'est pas comptee dans la partie enregistree.

### Historique

Fonction :

```js
buildHistory(pg)
```

L'historique affiche les parties terminees, regroupees par jeu.

Chaque entree contient :

- le libelle de partie (ou le jeu si pas de libelle) ;
- le jeu (si un libelle existe) et la date automatique ;
- le nombre de joueurs ;
- le gagnant ;
- le score du gagnant.

Le detail d'une partie propose `Rejouer`, `Partager` et la suppression.

### Statistiques

Fonction :

```js
buildStats(wrap, rerender)
```

Les statistiques sont affichees dans l'onglet `Historique`, via le selecteur `Parties / Stats`.

L'application distingue notamment :

- statistiques par jeu ;
- statistiques par joueur ;
- parties jouees ;
- victoires ;
- taux de victoire ;
- scores moyens.

### Reglages

Fonction :

```js
buildSettings(pg)
```

Les reglages permettent de :

- changer de theme ;
- ajouter un joueur ;
- modifier un joueur ;
- supprimer un joueur ;
- ajouter un jeu ;
- gerer les groupes de joueurs ;
- exporter les donnees ;
- importer des donnees.

## Themes

Les themes sont definis dans le tableau :

```js
const THEMES = [...]
```

Theme par defaut :

```js
let currentTheme = "teal";
```

Le theme est applique par :

```js
applyTheme(id)
```

Cette fonction :

- memorise le theme dans `localStorage` ;
- applique `data-theme` sur `document.documentElement` ;
- met a jour les variables CSS ;
- met a jour la couleur du navigateur ;
- adapte les champs de formulaire visibles.

Themes disponibles dans la version `V20260619 17H33` :

1. `material` - Material
2. `teal` - Teal
3. `night` - Nuit
4. `sunset` - Sunset
5. `candy` - Candy
6. `jungle` - Jungle
7. `fiesta` - Fiesta
8. `myrtille` - Myrtille
9. `plage` - Plage
10. `agrume` - Agrume
11. `sakura` - Sakura
12. `minuit` - Minuit
13. `mercure` - Mercure

### Teal

Le theme Teal a ete modernise en style "Soft Modern".

Il est clair, calme, tactile, avec :

- fond tres doux ;
- cartes blanches ;
- coins arrondis ;
- bouton principal teal ;
- accueil compact ;
- tuiles joueurs modernes ;
- navigation basse claire.

### Mercure

Le theme Mercure a ete ajoute ensuite.

Objectif visuel :

- chrome ;
- mercure ;
- acier brosse ;
- graphite ;
- reflet miroir ;
- accent cyan.

La premiere implementation etait trop sombre et trop graphite. Elle a ete corrigee pour se rapprocher de la proposition visuelle :

- titre chromé ;
- logo desature façon metal ;
- cartes d'accueil argent clair ;
- champs type acier brosse ;
- tuiles joueurs metalliques ;
- avatars façon medaillon ;
- bouton principal effet miroir ;
- fond sombre a texture subtile ;
- navigation basse sombre.

Important : les styles Mercure sont isoles sous :

```css
[data-theme="mercure"] ...
```

Ils ne doivent pas modifier les autres themes.

## Export Et Import

L'export utilise le format :

```text
SK1:<base64 JSON>
```

L'export contient :

- `version: 1`
- les jeux ;
- les joueurs ;
- les sessions terminees.

L'application peut afficher l'export :

- sous forme de QR Code ;
- sous forme de texte a copier.

La librairie QR Code est integree directement dans `index.html`, afin de ne pas dependre du reseau.

Avant import, les donnees sont validees par :

```js
validateImportData(data)
```

Un import invalide est refuse.

Avant un import valide, l'ancien etat est sauvegarde dans :

```text
sk_v3_backup
```

## Securite Et Robustesse

Plusieurs points ont ete corriges ou consolides :

### Protection Contre Injection HTML

Les valeurs utilisateur ou stockees sont echappees via :

```js
esc(value)
```

Objectif : eviter qu'un nom de joueur ou de jeu contenant du HTML soit execute.

Un test Playwright verifie ce comportement.

### Mise A Jour Atomique Des Donnees

Les modifications passent par :

```js
upd(fn)
```

Cette fonction :

- clone l'etat courant ;
- applique la modification ;
- tente de sauvegarder ;
- ne remplace l'etat en memoire que si la sauvegarde a reussi ;
- affiche une alerte si `localStorage` refuse l'ecriture.

Objectif : eviter de perdre l'etat en cas de quota depasse ou d'erreur de stockage.

### Validation Des Imports

Les imports sont valides avant remplacement des donnees.

Un import invalide ne remplace pas l'etat existant.

Un import valide cree une sauvegarde prealable.

### Autonomie Hors Ligne

La livraison ne doit pas contenir de dependances reseau critiques.

Un test verifie :

- aucun `<script src="https://...">` ;
- aucun `<link href="https://...">` ;
- service worker local.

## PWA Et Manifest

Le manifest n'est pas un fichier separe.

Il est genere dans `index.html` sous forme de Blob JavaScript.

Il contient notamment :

- `name`
- `short_name`
- `start_url`
- `display: standalone`
- `orientation`
- icone integree.

L'enregistrement du service worker se fait en fin de fichier :

```js
navigator.serviceWorker.register('./sw.js')
```

## Installation Et Tests Locaux

Depuis le dossier :

```text
C:\Users\cdesmottes\Documents\Codex\2026-06-11\files-mentioned-by-the-user-index\outputs\scorekeeper
```

Installer les dependances de test :

```powershell
npm install
```

Lancer tous les tests :

```powershell
npm test
```

Lancer seulement les tests du service worker :

```powershell
npm run test:sw
```

Lancer les tests Playwright en mode visible :

```powershell
npm run test:headed
```

Lancer le serveur local :

```powershell
npm run serve
```

URL locale :

```text
http://127.0.0.1:4173
```

Les tests Playwright utilisent Chrome et une taille d'ecran mobile :

```js
viewport: { width: 390, height: 844 }
```

## Etat Des Tests

Lors de la derniere validation de la version `V20261101 15H00` :

- 18 tests Playwright reussis ;
- 6 tests service worker reussis ;
- total : 24 tests reussis.

Remarque : les fichiers de tests recuperes depuis GitHub le 2026-11-01 etaient plus anciens que ce README (13 tests Playwright et 6 tests service worker, dont un qui attendait encore une activation immediate du service worker). Ils ont ete realignes sur le comportement reel : parcours `Jouer`, saisie en chaine, resultats, `Rejouer`, et mise a jour guidee du service worker.

Commandes utilisees :

```powershell
npm.cmd run test:sw
```

et :

```powershell
$server = Start-Process -FilePath node -ArgumentList 'scripts/serve.mjs' -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
try {
  Start-Sleep -Seconds 2
  $env:CI='1'
  $env:PLAYWRIGHT_NO_SERVER='1'
  npx.cmd playwright test --trace=off --reporter=dot
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
```

Cette seconde forme est utile quand on veut controler explicitement le serveur de test.

## Deploiement

Pour deployer l'application, seuls ces deux fichiers sont necessaires :

```text
index.html
sw.js
```

Ils doivent etre places au meme niveau.

Le commentaire en haut de `sw.js` rappelle :

```js
// À placer à la RACINE du dépôt GitHub (même niveau qu'index.html)
```

Apres remplacement des fichiers en production :

1. ouvrir l'application ;
2. utiliser le bouton `Mettre a jour` si le message de nouvelle version apparait ;
3. verifier que la version affichee dans Reglages correspond a la nouvelle version.

## Regles Importantes Pour Une Future Modification

### Ne Pas Casser Les Fonctionnalites Existantes

L'application repond aux besoins fonctionnels.

Les modifications futures doivent donc etre prudentes :

- pas de changement de comportement sans demande explicite ;
- pas de refonte generale non necessaire ;
- pas de suppression de theme existant ;
- pas de changement de format d'export sans migration ;
- pas de dependance reseau pour une fonctionnalite essentielle.

### Toujours Incrementer La Version

Pour toute livraison modifiant `index.html` ou `sw.js`, incrementer :

- `APP_VERSION` dans `index.html` ;
- `APP_VERSION` dans `sw.js` ;
- `currentCacheName` dans `tests/service-worker.unit.test.js`.

Format actuellement utilise :

```text
VYYYYMMDD HHHH
```

Exemple :

```text
V20261101 15H00
```

### Toujours Lancer Les Tests

Avant de livrer :

```powershell
npm.cmd run test:sw
```

Puis :

```powershell
npx.cmd playwright test --trace=off --reporter=dot
```

ou :

```powershell
npm test
```

### Preserver L'Autonomie

Ne pas ajouter :

- script externe ;
- CSS externe ;
- police Google Fonts ;
- CDN ;
- dependance necessaire au runtime.

Si une librairie est necessaire en production, elle doit etre integree localement ou remplacee par du code natif.

### Attention Aux Themes

Les themes sont sensibles car beaucoup de styles sont globaux.

Pour un theme specifique, preferer des regles scoppées :

```css
[data-theme="nom-du-theme"] ...
```

Ne pas modifier les styles globaux si le changement concerne un seul theme.

### Attention A `innerHTML`

Le code utilise parfois `innerHTML` pour generer rapidement des blocs.

Quand une valeur vient de l'utilisateur ou de `localStorage`, utiliser `esc(...)` ou construire le texte via `textContent`.

## Historique Des Ameliorations Faites Dans Cette Conversation

### 1. Revue De Code

Une revue a ete faite avec l'objectif de ne pas modifier les fonctionnalites.

Points identifies :

- securiser les affichages ;
- fiabiliser `localStorage` ;
- valider les imports ;
- rendre l'application autonome hors ligne ;
- ajouter des tests de caracterisation.

### 2. Tests De Caracterisation

Une suite Playwright a ete ajoutee pour verrouiller les comportements existants.

Des tests unitaires du service worker ont aussi ete ajoutes.

### 3. Securite Des Affichages

Les donnees stockees et les noms utilisateurs ont ete echappes pour eviter l'execution de HTML ou JavaScript injecte.

### 4. Stockage Plus Robuste

Les mises a jour de l'etat passent par `upd(fn)`.

Une modification n'est prise en compte en memoire que si l'ecriture `localStorage` reussit.

### 5. Import Plus Sur

Les imports sont valides.

Une sauvegarde prealable est creee avant remplacement.

### 6. Application Autonome

La dependance QR Code a ete integree dans `index.html`.

Les tests verifient qu'il n'existe pas de dependance externe essentielle.

### 7. Refonte Visuelle Teal

Le theme Teal a ete modernise en style Soft Modern.

La premiere version etait trop eloignee de la maquette ; elle a ete corrigee avec :

- en-tete centre ;
- cartes Jeu et Date separees ;
- joueurs en tuiles ;
- bouton principal plus moderne ;
- navigation basse plus douce.

### 8. Ajout Du Theme Mercure

Un theme Mercure a ete imagine puis ajoute.

La premiere implementation etait trop sombre et trop graphite.

Elle a ensuite ete corrigee pour correspondre davantage a la proposition :

- chrome ;
- acier clair ;
- effet miroir ;
- titre metallique ;
- bouton principal noir/argent ;
- cartes claires en metal brosse.

### 9. Validation Finale

La derniere version validee est :

```text
V20260619 17H33
```

Avec :

- 13 themes disponibles ;
- 26 tests reussis ;
- aucun script externe ;
- aucun lien CSS externe ;
- fonctionnement hors ligne conserve.

### 10. Passe De Lisibilite Des Themes

Une passe visuelle ciblee a ete faite apres retour d'usage sur mobile.

Objectif :

- rendre les zones de saisie plus evidentes ;
- renforcer les contours des cartes, champs, onglets et lignes de score ;
- ameliorer la lisibilite des textes secondaires et placeholders ;
- corriger l'effet trop ton sur ton de certains themes, en particulier les themes sombres.

Cette evolution ne change pas les fonctionnalites, le stockage, l'import/export ni le fonctionnement hors ligne.

### 11. Reorganisation Des Reglages

La page Reglages a ete reorganisee apres retour visuel sur mobile.

Changements :

- la version de l'application n'est plus affichee dans le bandeau de titre ;
- une carte Application presente maintenant la version et le support hors ligne ;
- la section Joueurs apparait en second ;
- la section Apparence apparait en troisieme ;
- les sections Jeux et Synchronisation restent disponibles plus bas.

Cette evolution ne change pas les donnees, le service worker, l'import/export ni les themes disponibles.

### 12. Mise A Jour Guidee Et Ordre Des Joueurs

Deux ameliorations ciblees ont ete ajoutees :

- le service worker n'active plus automatiquement une nouvelle version des l'installation ;
- l'application affiche un message de mise a jour et envoie `SKIP_WAITING` quand l'utilisateur choisit `Mettre a jour` ;
- la liste des joueurs selectionnes utilise maintenant des boutons monter/descendre plutot que le glisser/deposer mobile ;
- l'ordre visible des joueurs reste l'ordre utilise au demarrage de la partie.

Cette evolution conserve le stockage local, le mode hors ligne et les themes existants.

### 13. Liste Joueurs Verticale Dans Les Themes Specifiques

Correction visuelle apres retour sur le theme Teal :

- la liste des joueurs selectionnes n'est plus forcee en grille deux colonnes ;
- les themes Teal et Mercure affichent maintenant les joueurs les uns sous les autres ;
- les boutons monter/descendre restent visibles dans chaque ligne ;
- l'ordre de demarrage de la partie reste identique a l'ordre affiche.

Cette correction ne change pas le stockage, les donnees ni le fonctionnement hors ligne.

### 14. Libelle De Partie Et Gestion Historique

Le flux de creation de partie a ete ajuste :

- la date n'est plus saisie manuellement ;
- la date du jour est affectee automatiquement au demarrage de la partie ;
- un champ `Nom de la partie` apparait avant le choix du jeu ;
- ce libelle est affiche dans l'historique avec le jeu et la date ;
- le bouton de demarrage explique les champs manquants au lieu de rester silencieux ;
- une partie terminee peut etre supprimee directement depuis la liste d'historique.

Cette evolution conserve la compatibilite avec les anciens exports qui n'ont pas encore de libelle de partie.

### 15. Groupe Vacances

Le groupe de joueurs `Vacances` a ete ajoute a la liste des groupes disponibles.

Il apparait dans :

- la selection des joueurs ;
- l'ajout et l'edition de joueurs ;
- les filtres par groupe.

### 16. Historique Par Jeu Et Creation Verrouillee

Le flux de creation et l'historique ont ete ajustes :

- l'exemple du nom de partie devient `Ex. Soiree BBQ at home` ;
- l'historique regroupe les parties par jeu ;
- chaque groupe de jeu peut etre plie ou deplie ;
- les parties d'un meme jeu sont affichees par date decroissante ;
- si une partie est en cours, le nom de partie, le choix du jeu et l'ajout de joueurs sont verrouilles jusqu'a la fin de la partie.

Deux tests Playwright couvrent le verrouillage de creation et le pliage de l'historique.

### 17. Navigation Simplifiee Et Parcours Fluide

Objectif : supprimer les allers-retours inutiles entre onglets.

- 3 onglets au lieu de 5 : `Jouer`, `Historique`, `Reglages` ;
- `Accueil` et `Partie` fusionnes dans `Jouer` ; `Stats` integre a `Historique` ;
- preparation en un ecran : carte `Rejouer`, jeux et joueurs en pastilles, creation de joueur sur place, nom de partie facultatif, bouton `Demarrer` toujours visible ;
- la selection n'est plus perdue quand on cree un joueur ou un jeu ;
- partie en un ecran : rang et total visibles en permanence, bascule `Scores / Tableau` ;
- saisie en chaine d'un joueur a l'autre et passage automatique a la manche suivante, annulable ;
- ecran de resultats sur place avec `Rejouer`, `Changer de jeu` et `Partager` ;
- `Rejouer` aussi disponible depuis le detail d'une partie de l'historique ;
- medailles partagees en cas d'egalite ;
- le code mort de glisser-deposer de l'ancien accueil a ete retire (les boutons monter/descendre restent).

Aucun changement du format de donnees `sk_v3` ni de l'export `SK1:` : les donnees existantes restent compatibles.

Version : `V20261101 15H00`.

## Points Connus Et Limites

### Application Monofichier

`index.html` est volumineux car il contient tout :

- CSS ;
- JS ;
- QR Code ;
- logo ;
- manifest dynamique.

C'est volontaire pour simplifier le deploiement.

Avantage :

- seulement `index.html` et `sw.js` a deployer.

Inconvenient :

- fichier long a maintenir.

### Pas De Backend

Toutes les donnees sont locales au navigateur.

Il n'y a pas :

- compte utilisateur ;
- synchronisation automatique ;
- base de donnees distante.

Pour transferer les donnees, utiliser l'export/import.

### Export QR Limite Par Taille

Si les donnees sont trop volumineuses, le QR Code peut devenir impossible ou peu pratique.

Dans ce cas, l'application propose le mode texte.

### Service Worker Et Cache

Le cache peut donner l'impression que la mise a jour n'est pas immediate.

Solution :

- incrementer `APP_VERSION` ;
- deployer `index.html` et `sw.js` ;
- fermer puis relancer l'application.

## Checklist Pour Une Future Livraison

Avant de livrer :

- [ ] modifier uniquement ce qui est demande ;
- [ ] conserver les fonctionnalites existantes ;
- [ ] incrementer `APP_VERSION` dans `index.html` ;
- [ ] incrementer `APP_VERSION` dans `sw.js` ;
- [ ] mettre a jour `currentCacheName` dans `tests/service-worker.unit.test.js` ;
- [ ] lancer les 6 tests service worker ;
- [ ] lancer les 18 tests Playwright ;
- [ ] verifier qu'il n'y a pas de dependance externe ;
- [ ] verifier visuellement les ecrans touches ;
- [ ] deployer uniquement `index.html` et `sw.js`.

## Commandes Utiles

Afficher la version dans les deux fichiers :

```powershell
Select-String -Path index.html,sw.js -Pattern "const APP_VERSION" |
  ForEach-Object { "{0}: {1}" -f $_.Filename,$_.Line.Trim() }
```

Verifier l'absence de scripts et liens externes :

```powershell
$externalScripts = Select-String -Path index.html -Pattern '<script\b[^>]*\bsrc=["'']https?://' -AllMatches
$externalLinks = Select-String -Path index.html -Pattern '<link\b[^>]*\bhref=["'']https?://' -AllMatches
"External scripts: $($externalScripts.Count)"
"External links: $($externalLinks.Count)"
```

Lancer le serveur local :

```powershell
npm.cmd run serve
```

Lancer les tests :

```powershell
npm.cmd test
```

## Pour Reprendre Le Projet Plus Tard

Lire dans cet ordre :

1. ce README ;
2. `index.html`, sections `VERSION`, `THEMES`, `STORE`, `RENDER`, puis les fonctions `buildPlay`, `buildSetup`, `buildGame`, `openScoreEntry`, `buildResults`, `buildHistory`, `buildSettings` ;
3. `sw.js` ;
4. `tests/scorekeeper.spec.js` ;
5. `tests/service-worker.unit.test.js`.

Regle d'or : ScoreKeeper fonctionne deja comme souhaite. Toute evolution doit etre une amelioration ciblee, verifiee par tests, et sans regression fonctionnelle.

## Tableau De Suivi - Technique Et Architecture

Ce tableau est le suivi officiel des sujets techniques, d'architecture, de qualite, de securite, de tests et de deploiement.

| Sujet | Description | Statut | Priorite | Version / remarque |
|---|---|---:|---:|---|
| Revue de code initiale | Lecture de l'application existante pour comprendre son fonctionnement avant modification. | Fait | Haute | Realise au debut de la conversation. |
| Ne pas modifier les originaux | Les fichiers originaux dans `Downloads` ne doivent pas etre modifies directement. La livraison travaillee est dans `outputs/scorekeeper`. | Fait | Haute | Regle de travail conservee. |
| Fichiers de production minimaux | L'application deployee a besoin uniquement de `index.html` et `sw.js`. | Fait | Haute | README recommande aussi de versionner les tests/outils sur GitHub. |
| Depot GitHub complet hors `node_modules` | Pour garder le README coherent et conserver les tests, versionner tout le dossier sauf `node_modules`. | Fait | Moyenne | Structure recommandee : `index.html`, `sw.js`, `README.md`, `package*.json`, `playwright.config.js`, `scripts/`, `tests/`, `.gitignore`. |
| Tests Playwright de caracterisation | Ajout de tests navigateur pour verrouiller les parcours principaux. | Fait | Haute | 18 tests Playwright dans `tests/scorekeeper.spec.js` (realignes en `V20261101 15H00`). |
| Tests unitaires service worker | Ajout de tests dedies au cache et au comportement hors ligne. | Fait | Haute | 6 tests dans `tests/service-worker.unit.test.js`, test d'installation aligne sur la mise a jour guidee. |
| Total de tests | Suite actuelle composee de tests fonctionnels et service worker. | Fait | Haute | 24 tests valides sur `V20261101 15H00`. |
| Serveur local de test | Ajout d'un serveur Node local pour tester l'application sans cache parasite. | Fait | Moyenne | `scripts/serve.mjs`, port `4173`. |
| Configuration Playwright | Tests en viewport mobile Chrome, service workers bloques dans les tests UI. | Fait | Moyenne | `playwright.config.js`, viewport 390 x 844. |
| Mise a jour atomique du stockage | Les changements passent par `upd(fn)` et ne remplacent l'etat en memoire que si `localStorage` accepte l'ecriture. | Fait | Haute | Evite les pertes d'etat en cas d'erreur de stockage. |
| Validation des imports | Les imports sont controles avant remplacement des donnees. | Fait | Haute | `validateImportData(data)`. |
| Sauvegarde avant import | Avant import valide, l'ancien etat est conserve dans `sk_v3_backup`. | Fait | Haute | Permet de recuperer les donnees precedentes si besoin. |
| Protection XSS | Echappement des valeurs utilisateur ou stockees avant insertion HTML. | Fait | Haute | Fonction `esc(value)` + test Playwright dedie. |
| QR Code autonome | La librairie QR Code est integree dans `index.html` pour supprimer la dependance reseau. | Fait | Haute | Export QR disponible hors ligne. |
| Suppression des dependances externes runtime | La livraison ne doit pas dependre de scripts, CSS, CDN ou polices externes. | Fait | Haute | Test dedie : aucun script externe, aucun lien CSS externe. |
| Service worker autonome | Cache de `./`, `index.html` et `sw.js`, navigation network-first puis fallback cache. | Fait | Haute | `sw.js`, cache prefixe `scorekeeper-`. |
| Nettoyage des anciens caches | A l'activation, les anciens caches ScoreKeeper sont supprimes. | Fait | Haute | Evite les conflits entre versions. |
| Version forcee dans les deux fichiers | `APP_VERSION` existe dans `index.html` et `sw.js` pour forcer les mises a jour. | Fait | Haute | Derniere version : `V20261101 15H00`. |
| Mise a jour du cache attendu en test | Quand `APP_VERSION` change, `currentCacheName` doit changer aussi dans le test service worker. | Fait | Haute | Regle documentee dans le README. |
| Activation guidee du service worker | Une nouvelle version installee attend le clic utilisateur, puis l'app envoie `SKIP_WAITING` et recharge apres `controllerchange`. | Fait | Haute | Version `V20260618 23H59`. |
| Manifest PWA dynamique | Le manifest est genere dans `index.html` sous forme de Blob. | Fait | Moyenne | Pas de fichier `manifest.json` separe. |
| Application monofichier | Toute la logique, le style, les themes, QR Code et manifest sont dans `index.html`. | Fait | Moyenne | Choix assume pour simplifier le deploiement. |
| Refactor score par manche | Centralisation de la mise a jour/suppression d'un score par manche. | Fait | Haute | `updatePlayerRoundScore(...)`, evite les doublons. |
| Themes isoles par `data-theme` | Les styles specifiques aux themes modernes sont scopes pour ne pas casser les autres. | Fait | Haute | `teal` et `mercure` utilisent des blocs dedies. |
| Theme Teal Soft Modern | Refonte visuelle claire du theme Teal sans toucher aux autres themes. | Fait | Moyenne | Version autour de `V20260611 23H43`. |
| Theme Mercure | Ajout puis correction d'un theme chrome/acier/mercure plus proche de la maquette. | Fait | Moyenne | Version finale documentee : `V20260612 00H12`. |
| Coherence liste joueurs par theme | Les themes Teal et Mercure conservent la liste verticale des joueurs selectionnes. | Fait | Moyenne | Correction `V20260619 12H31`. |
| Lisibilite des themes | Renforcement global des bordures, champs, textes secondaires et contrastes, avec attention particuliere aux themes sombres. | Fait | Haute | Version `V20260618 21H37`. |
| Carte Application des reglages | La page Reglages presente la version et le support hors ligne dans une carte dediee au lieu du bandeau de titre. | Fait | Moyenne | Version `V20260618 23H39`. |
| README comme carnet officiel | Le README doit etre mis a jour a chaque evolution. | Fait | Haute | Ajoute le 2026-06-18. |
| Tableaux de suivi officiels | Ajout de deux tableaux : technique/architecture et gameplay/usage. | Fait | Haute | Ajoute le 2026-06-18. |
| Etat de preparation hors stockage | La selection en cours (jeu, joueurs, ordre, nom) vit dans la variable `setup` et survit aux re-rendus declenches par `upd()`. | Fait | Haute | Version `V20261101 15H00`. |
| Separation future du code | Extraire JS/CSS dans des fichiers separes pour faciliter la maintenance. | Moyen terme | Moyenne | A evaluer seulement si le deploiement accepte plus que deux fichiers. |
| Migration de donnees versionnee | Ajouter une vraie couche de migration si le schema `sk_v3` evolue. | Moyen terme | Haute si schema modifie | A faire avant tout changement incompatible de donnees. |
| Sauvegarde/restauration plus visible | Ajouter une interface pour restaurer `sk_v3_backup`. | A faire | Haute | Priorite conseillee apres l'historique : rassure avant/apres import. |
| Synchronisation cloud | Synchronisation multi-appareils automatique. | A eviter pour l'instant | Basse | Complexifie fortement : backend, comptes, securite. |
| Authentification utilisateur | Comptes utilisateurs et connexion. | A eviter pour l'instant | Basse | Hors besoin actuel. |
| Base de donnees distante | Stockage serveur des parties. | A eviter pour l'instant | Basse | L'application est volontairement locale/offline. |
| Ajout de dependances runtime externes | CDN, Google Fonts, librairies chargees via internet. | A eviter pour l'instant | Haute | Casserait l'autonomie et la simplicite. |

## Tableau De Suivi - Gameplay Et Usage

Ce tableau est le suivi officiel des sujets lies a l'usage, aux parcours joueur, aux ecrans, aux options visibles et a l'experience utilisateur.

| Sujet | Description | Statut | Priorite | Version / remarque |
|---|---|---:|---:|---|
| Navigation a 3 onglets | `Jouer` (preparation + partie + resultats), `Historique` (+ stats), `Reglages`. | Fait | Haute | Version `V20261101 15H00`. |
| Creation d'une partie | Choisir un jeu et des joueurs en pastilles sur un seul ecran, puis demarrer. Nom de partie facultatif, date automatique. | Fait | Haute | Refonte en `V20261101 15H00`. |
| Rejouer | Relancer en un appui le meme jeu avec les memes joueurs depuis la preparation, les resultats ou le detail d'historique. | Fait | Haute | Version `V20261101 15H00`, couvert par tests. |
| Creation de joueur sur place | `+ Nouveau joueur` depuis la preparation, sans passer par Reglages ni perdre la selection. | Fait | Haute | Version `V20261101 15H00`, couvert par test. |
| Blocage si informations manquantes | Le demarrage est bloque tant qu'il manque le jeu ou les joueurs (le nom de partie n'est plus obligatoire). | Fait | Haute | Nom facultatif depuis `V20261101 15H00`. |
| Message si demarrage impossible | Le bouton de demarrage indique ce qui manque (jeu ou joueur). | Fait | Haute | Version `V20261101 15H00`. |
| Blocage si partie active | Tant qu'une partie est en cours, l'onglet `Jouer` affiche directement la partie : impossible d'en demarrer une autre. | Fait | Haute | Simplifie en `V20261101 15H00` (plus d'ecran grise). |
| Selection des joueurs | Pastilles a cocher directement sur l'ecran, avec filtres par groupe. | Fait | Haute | Plus de modale depuis `V20261101 15H00`. |
| Reordonner les joueurs | Les joueurs selectionnes peuvent etre reordonnes avec des boutons monter/descendre et restent en liste verticale. | Fait | Haute | Plus fiable sur mobile, correction theme `V20260619 12H31`. |
| Saisie des scores | Saisie via pave numerique tactile, en chaine d'un joueur au suivant. | Fait | Haute | `openScoreEntry(playerId)`, version `V20261101 15H00`. |
| Manche suivante automatique | Quand tout le monde a saisi, la manche suivante demarre seule, avec bandeau `Annuler`. | Fait | Haute | Version `V20261101 15H00`, couvert par test. |
| Scores negatifs | Le bouton `±` permet de saisir un score negatif. | Fait | Haute | Couvert par test. |
| Modification d'un score existant | Cliquer un joueur deja saisi permet de modifier son score. | Fait | Haute | Evite les doublons de manche. |
| Suppression d'un score | Un score deja saisi peut etre supprime et le total est recalcule. | Fait | Haute | Couvert par test. |
| Detail par manche | Vue `Tableau` avec modification possible depuis chaque case. | Fait | Moyenne | Renomme en `V20261101 15H00`, couvert par test. |
| Classement | Rang et total affiches en permanence sur chaque ligne joueur pendant la partie. | Fait | Moyenne | Onglet dedie supprime en `V20261101 15H00`. |
| Navigation de manches | Aller a la manche precedente ou suivante. | Fait | Haute | Boutons de navigation autour de la manche courante. |
| Indicateur de progression de manche | Affiche combien de joueurs ont saisi leur score pour la manche. | Fait | Moyenne | Exemple : `0/2 ont saisi`. |
| Fin de partie | Terminer une partie, l'envoyer dans l'historique et afficher les resultats sur place. | Fait | Haute | Ecran de resultats depuis `V20261101 15H00`. |
| Historique persistant | Les parties terminees restent visibles apres rechargement, avec libelle, jeu et date. | Fait | Haute | Couvert par test. |
| Historique par jeu | Les parties terminees sont regroupees par jeu, pliables/depliables, avec les parties de chaque jeu par date decroissante. | Fait | Haute | Version `V20260619 17H33`, couvert par test. |
| Suppression d'une partie historique | Une partie terminee peut etre supprimee depuis la liste d'historique ou depuis son detail. | Fait | Haute | Version `V20260619 14H30`, couvert par test. |
| Statistiques | Statistiques par joueur et par jeu, dans l'onglet Historique. | Fait | Moyenne | Integrees a l'historique en `V20261101 15H00`. |
| Gestion des joueurs | Ajouter, modifier, supprimer des joueurs depuis Reglages. | Fait | Haute | Ajout et edition couverts par tests. |
| Gestion des jeux | Ajouter des jeux personnalises. | Fait | Moyenne | Couvert par test de persistance. |
| Groupes de joueurs | Associer des joueurs a Famille, Amis, Travail, Vacances. | Fait | Moyenne | Groupe Vacances ajoute en `V20260619 15H08`. |
| Export QR Code | Export des donnees via QR Code quand la taille le permet. | Fait | Moyenne | QR integre localement. |
| Export texte | Export alternatif sous forme de code texte `SK1:...`. | Fait | Moyenne | Utile si QR trop volumineux. |
| Import de donnees | Importer un export valide et remplacer les donnees actuelles. | Fait | Haute | Avec validation et sauvegarde prealable. |
| Themes visuels | Choisir un theme dans Reglages > Apparence. | Fait | Moyenne | 13 themes disponibles. |
| Persistance du theme | Le theme choisi reste actif apres rechargement. | Fait | Moyenne | Couvert par test. |
| Refonte visuelle Teal | Apparence plus moderne, claire et tactile. | Fait | Moyenne | Corrigee apres ecart avec la maquette. |
| Theme Mercure | Theme chrome/acier/mercure inspire d'une maquette visuelle. | Fait | Moyenne | Corrige pour correspondre davantage a la proposition. |
| Confort de saisie visuelle | Les cartes, champs, lignes joueur, onglets et textes secondaires sont plus marques pour eviter l'effet ton sur ton. | Fait | Haute | Passe de lisibilite `V20260618 21H37`. |
| Application offline | L'application peut etre utilisee sans reseau apres cache. | Fait | Haute | Service worker + absence de dependance externe. |
| Affichage de la version | La version est visible dans Reglages, dans la carte Application. | Fait | Moyenne | Version `V20260618 23H39`. |
| Ordre des reglages | Les reglages affichent Application, puis Joueurs, puis Apparence avant les autres sections. | Fait | Moyenne | Version `V20260618 23H39`. |
| Restaurer la sauvegarde d'import | Ajouter un bouton de restauration depuis `sk_v3_backup`. | A faire | Haute | Deuxieme amelioration conseillee : securise les manipulations de donnees. |
| Mode export fichier | Exporter/importer via fichier local en plus du QR/texte. | Moyen terme | Moyenne | Utile pour gros historiques et sauvegardes longues, sans remplacer QR/texte. |
| Recherche et filtres dans l'historique | Ajouter des filtres par joueur, jeu, periode, gagnant et libelle de partie. | Moyen terme | Haute | Premiere amelioration conseillee pour rendre un gros historique vraiment exploitable. |
| Statistiques enrichies | Ajouter victoires par joueur, moyenne, meilleur score, regularite et classement par jeu. | Moyen terme | Moyenne | A faire apres les filtres d'historique, car les stats s'appuient sur ces donnees. |
| Filtre statistiques avance | Filtrer les stats par periode, jeu, joueur ou groupe. | Moyen terme | Moyenne | A envisager avec les statistiques enrichies. |
| Annuler la derniere action | Undo simple apres saisie/modification/suppression de score. | Moyen terme | Moyenne | Partiel : le passage automatique de manche est annulable depuis `V20261101 15H00`. |
| Modeles de regles par jeu | Regles de scoring specifiques selon le jeu. | A eviter pour l'instant | Basse | Risque de complexifier l'application. |
| Synchronisation automatique multi-appareils | Partage en temps reel entre appareils. | A eviter pour l'instant | Basse | Hors philosophie locale/offline actuelle. |
| Comptes utilisateurs | Gestion de profils connectes. | A eviter pour l'instant | Basse | Non necessaire au besoin actuel. |
