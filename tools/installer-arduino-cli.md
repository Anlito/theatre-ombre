# Installer arduino-cli (poste de développement uniquement)

arduino-cli sert seulement aux **tests automatiques** : il vérifie que le C++ généré au niveau 3 se compile
pour Uno et Nano. Il n'est pas nécessaire en classe ni pour publier le site.

1. Télécharger l'archive Windows 64 bits sur https://arduino.github.io/arduino-cli/latest/installation/
   (fichier `arduino-cli_..._Windows_64bit.zip`).
2. Extraire `arduino-cli.exe` dans le dossier `tools/arduino-cli/` de ce projet.
3. Dans un terminal, dans ce dossier :

```bash
tools/arduino-cli/arduino-cli core update-index
tools/arduino-cli/arduino-cli core install arduino:avr
```

4. Lancer `npm test` : les tests « arduino-cli compile … » ne sont plus sautés.
