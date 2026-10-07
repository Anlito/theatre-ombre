/*
  ===========================================================================
   Théâtre d'ombre augmenté — programme FIXE de la carte (Arduino Uno ou Nano)
  ===========================================================================

  À téléverser UNE SEULE FOIS avec l'IDE Arduino (par l'enseignant).
  Ensuite, les élèves n'ont plus rien à téléverser : c'est le site web qui
  envoie des ordres à la carte par le câble USB.

  Réglage du Moniteur série (pour tester à la main) : 115200 bauds,
  « Nouvelle ligne » (NL) en fin de ligne.

  Ordres compris par la carte (un ordre par ligne) :
    PING              -> répond "PONG v1"   (signe de vie)
    D 3 1             -> allume la broche 3  (D 3 0 l'éteint)
    A 5 128           -> intensité 128 sur la broche 5 (0 à 255, broches 3 5 6 9 10 11)
    T 8 440 500       -> note de 440 Hz pendant 500 ms sur un buzzer branché en 8
    OFF               -> éteint toutes les sorties
  Réponses : OK, ERR PIN (broche interdite), ERR CMD (ordre inconnu ou mal écrit).

  Sécurité :
    - Si la carte ne reçoit RIEN pendant 3 secondes (câble débranché, page
      fermée, navigateur planté), elle éteint tout d'elle-même.
    - Seules les broches 2 à 13 sont utilisables. Les broches 0 et 1 servent
      au câble USB : elles sont refusées.

  Remarque : sur Uno/Nano, jouer une note (T) perturbe l'intensité (A) des
  broches 3 et 11 pendant la note. C'est normal (même minuterie interne).

  Ce fichier a un « jumeau » en JavaScript (site/js/simulated-board.js) qui
  sert aux tests automatiques. Toute modification doit être faite dans les deux.
*/

const long VITESSE = 115200;            // vitesse de la liaison USB (bauds)
const unsigned long DELAI_SECURITE = 3000; // ms sans message avant extinction
const byte LONGUEUR_MAX = 32;           // longueur maximale d'un ordre

char ligne[LONGUEUR_MAX + 1];  // ordre en cours de réception
byte longueur = 0;             // nombre de caractères reçus
bool tropLong = false;         // vrai si l'ordre dépasse LONGUEUR_MAX

unsigned long dernierMessage = 0; // moment (ms) du dernier ordre reçu
bool sortiesActives = false;      // vrai si au moins une sortie est allumée

bool brocheUtilisee[14];       // broches déjà réglées en sortie
int brocheNote = -1;           // broche du buzzer (-1 : aucune note)

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(VITESSE);
  for (byte b = 0; b < 14; b++) brocheUtilisee[b] = false;
  dernierMessage = millis();
  Serial.println("PRET v1");
}

// ---------------------------------------------------------------------------
void loop() {
  // 1) Lire les caractères arrivés par le câble USB.
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\r') continue;            // on ignore le retour chariot
    if (c == '\n') {                    // fin de l'ordre : on l'exécute
      ligne[longueur] = '\0';
      dernierMessage = millis();
      if (tropLong || longueur == 0) {
        Serial.println("ERR CMD");
      } else {
        executer(ligne);
      }
      longueur = 0;
      tropLong = false;
    } else if (longueur < LONGUEUR_MAX) {
      ligne[longueur++] = toupper(c);
    } else {
      tropLong = true;                  // ordre trop long : il sera refusé
    }
  }

  // 2) Sécurité : plus de nouvelles du navigateur -> on éteint tout.
  if (sortiesActives && millis() - dernierMessage > DELAI_SECURITE) {
    toutEteindre();
  }
}

// ---------------------------------------------------------------------------
// Découpe l'ordre en mots et exécute la commande correspondante.
void executer(char *texte) {
  char *mots[5];
  byte nbMots = 0;
  char *mot = strtok(texte, " ");
  while (mot != NULL) {
    if (nbMots == 5) { Serial.println("ERR CMD"); return; }
    mots[nbMots++] = mot;
    mot = strtok(NULL, " ");
  }
  if (nbMots == 0) { Serial.println("ERR CMD"); return; }

  // PING : signe de vie
  if (strcmp(mots[0], "PING") == 0 && nbMots == 1) {
    Serial.println("PONG v1");
    return;
  }

  // OFF : tout éteindre
  if (strcmp(mots[0], "OFF") == 0 && nbMots == 1) {
    toutEteindre();
    Serial.println("OK");
    return;
  }

  // Les autres ordres n'ont que des nombres après la lettre.
  long n[3];
  for (byte i = 1; i < nbMots; i++) {
    if (!lireNombre(mots[i], &n[i - 1])) { Serial.println("ERR CMD"); return; }
  }

  // D <broche> <0 ou 1> : allumer / éteindre
  if (strcmp(mots[0], "D") == 0 && nbMots == 3) {
    if (!brocheAutorisee(n[0])) { Serial.println("ERR PIN"); return; }
    if (n[1] != 0 && n[1] != 1) { Serial.println("ERR CMD"); return; }
    preparerSortie(n[0]);
    digitalWrite(n[0], n[1] == 1 ? HIGH : LOW);
    if (n[1] == 1) sortiesActives = true;
    Serial.println("OK");
    return;
  }

  // A <broche> <0 à 255> : intensité (seulement sur les broches PWM)
  if (strcmp(mots[0], "A") == 0 && nbMots == 3) {
    if (!brochePWM(n[0])) { Serial.println("ERR PIN"); return; }
    if (n[1] < 0 || n[1] > 255) { Serial.println("ERR CMD"); return; }
    preparerSortie(n[0]);
    analogWrite(n[0], n[1]);
    if (n[1] > 0) sortiesActives = true;
    Serial.println("OK");
    return;
  }

  // T <broche> <fréquence> <durée ms> : note sur un buzzer
  if (strcmp(mots[0], "T") == 0 && nbMots == 4) {
    if (!brocheAutorisee(n[0])) { Serial.println("ERR PIN"); return; }
    if (n[1] < 31 || n[1] > 20000 || n[2] < 1 || n[2] > 10000) {
      Serial.println("ERR CMD");
      return;
    }
    preparerSortie(n[0]);
    if (brocheNote >= 0 && brocheNote != n[0]) noTone(brocheNote);
    tone(n[0], n[1], n[2]);
    brocheNote = n[0];
    sortiesActives = true;
    Serial.println("OK");
    return;
  }

  Serial.println("ERR CMD");  // ordre inconnu ou mauvais nombre de mots
}

// ---------------------------------------------------------------------------
// Éteint toutes les broches utilisées et coupe le buzzer.
void toutEteindre() {
  if (brocheNote >= 0) {
    noTone(brocheNote);
    brocheNote = -1;
  }
  for (byte b = 2; b <= 13; b++) {
    if (brocheUtilisee[b]) digitalWrite(b, LOW);  // coupe aussi l'intensité (PWM)
  }
  sortiesActives = false;
}

// Règle la broche en sortie la première fois qu'on s'en sert.
void preparerSortie(long broche) {
  if (!brocheUtilisee[broche]) {
    pinMode(broche, OUTPUT);
    brocheUtilisee[broche] = true;
  }
}

bool brocheAutorisee(long broche) {
  return broche >= 2 && broche <= 13;
}

bool brochePWM(long broche) {
  return broche == 3 || broche == 5 || broche == 6 ||
         broche == 9 || broche == 10 || broche == 11;
}

// Lit un nombre écrit uniquement avec des chiffres (1 à 5 chiffres).
// Renvoie false si le texte contient autre chose.
bool lireNombre(const char *texte, long *resultat) {
  byte nbChiffres = 0;
  long valeur = 0;
  for (const char *p = texte; *p != '\0'; p++) {
    if (*p < '0' || *p > '9') return false;
    if (++nbChiffres > 5) return false;
    valeur = valeur * 10 + (*p - '0');
  }
  if (nbChiffres == 0) return false;
  *resultat = valeur;
  return true;
}
