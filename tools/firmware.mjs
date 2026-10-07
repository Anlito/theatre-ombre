// Recompile le programme fixe de la carte et le range dans le site (site/firmware/theatre_ombre.hex).
// À relancer seulement si arduino/theatre_ombre/theatre_ombre.ino change :  npm run firmware
// Le même fichier sert pour Uno et Nano (même microcontrôleur ATmega328P à 16 MHz).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const local = join('tools', 'arduino-cli', process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli');
const cli = process.env.ARDUINO_CLI || (existsSync(local) ? local : 'arduino-cli');
const out = mkdtempSync(join(tmpdir(), 'theatre-fw-'));
execFileSync(cli, ['compile', '--fqbn', 'arduino:avr:uno', '--output-dir', out, join('arduino', 'theatre_ombre')], { stdio: 'inherit' });
mkdirSync(join('site', 'firmware'), { recursive: true });
copyFileSync(join(out, 'theatre_ombre.ino.hex'), join('site', 'firmware', 'theatre_ombre.hex'));
console.log('OK : site/firmware/theatre_ombre.hex mis à jour.');
