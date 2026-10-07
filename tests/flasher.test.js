// Installation du programme fixe depuis le navigateur (protocole STK500).
// Un faux bootloader joue le rôle de la carte : vitesse, redémarrage, signature, mémoire flash.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHex, flashFirmware, FLASH_MSG } from '../site/js/flasher.js';

const HEX = readFileSync(new URL('../site/firmware/theatre_ombre.hex', import.meta.url), 'utf8');

// Faux port Web Serial avec un bootloader derrière.
class FakeBootloaderPort {
  constructor({ baud = 115200, signature = [0x1e, 0x95, 0x0f], corrupt = false, busy = false, silent = false } = {}) {
    Object.assign(this, { baud, signature, corrupt, busy, silent });
    this.flash = new Uint8Array(32768).fill(0xff);
    this.opens = [];
    this.isOpen = false;
  }
  async open({ baudRate }) {
    if (this.busy) throw Object.assign(new Error('busy'), { name: 'InvalidStateError' });
    if (this.isOpen) throw new Error('déjà ouvert');
    this.isOpen = true;
    this.opens.push(baudRate);
    this.rate = baudRate;
    this.inBoot = false;
    this.rx = [];
    this.readable = new ReadableStream({
      start: (c) => (this.ctrl = c),
      cancel: () => (this.ctrl = null),
    });
    this.writable = new WritableStream({ write: (chunk) => this.receive(chunk) });
  }
  async close() {
    this.isOpen = false;
  }
  async setSignals({ dataTerminalReady }) {
    if (this.dtr === false && dataTerminalReady) this.inBoot = !this.silent; // front montant : redémarrage
    this.dtr = dataTerminalReady;
  }
  reply(bytes) {
    // À la mauvaise vitesse, la carte ne reçoit que du charabia : pas de réponse.
    if (this.rate === this.baud) queueMicrotask(() => this.ctrl?.enqueue(Uint8Array.from(bytes)));
  }
  receive(chunk) {
    if (!this.inBoot) return;
    this.rx.push(...chunk);
    for (;;) {
      const end = this.rx.indexOf(0x20, this.commandLength());
      if (end < 0) return;
      const cmd = this.rx.splice(0, end + 1);
      this.handle(cmd);
    }
  }
  commandLength() {
    // Les pages de données peuvent contenir 0x20 : on attend la longueur annoncée.
    const c = this.rx[0];
    if (c === 0x64) return 4 + ((this.rx[1] << 8) | this.rx[2]);
    if (c === 0x55) return 3;
    if (c === 0x74) return 4;
    return 1;
  }
  handle(cmd) {
    const [c] = cmd;
    if (c === 0x30 || c === 0x50 || c === 0x51) return this.reply([0x14, 0x10]);
    if (c === 0x75) return this.reply([0x14, ...this.signature, 0x10]);
    if (c === 0x55) {
      this.addr = (cmd[1] | (cmd[2] << 8)) * 2;
      return this.reply([0x14, 0x10]);
    }
    if (c === 0x64) {
      const n = (cmd[1] << 8) | cmd[2];
      const data = cmd.slice(4, 4 + n);
      if (this.corrupt) data[0] ^= 0xff;
      this.flash.set(data, this.addr);
      return this.reply([0x14, 0x10]);
    }
    if (c === 0x74) {
      const n = (cmd[1] << 8) | cmd[2];
      return this.reply([0x14, ...this.flash.slice(this.addr, this.addr + n), 0x10]);
    }
    this.reply([0x15]);
  }
}

test('le fichier .hex du site se lit (programme de quelques Ko)', () => {
  const image = parseHex(HEX);
  assert.ok(image.length > 2000 && image.length < 32256, `taille ${image.length}`);
  // Un programme AVR commence par la table des vecteurs : des « jmp » (0C 94).
  assert.deepEqual([...image.slice(0, 2)], [0x0c, 0x94]);
});

test('un fichier abîmé est refusé avec un message simple', () => {
  assert.throws(() => parseHex(':10000000FFFF\n'), { message: FLASH_MSG.badFile });
  assert.throws(() => parseHex(''), { message: FLASH_MSG.badFile });
});

test('installation sur une Uno (115200 bauds) : écrit puis vérifie toute la mémoire', async () => {
  const image = parseHex(HEX);
  const port = new FakeBootloaderPort({ baud: 115200 });
  const phases = new Set();
  const r = await flashFirmware(port, image, { onProgress: ({ phase }) => phases.add(phase) });
  assert.deepEqual(r, { ok: true, baudRate: 115200 });
  assert.deepEqual([...port.flash.slice(0, image.length)], [...image]);
  assert.deepEqual([...phases], ['connexion', 'ecriture', 'verification', 'fin']);
  assert.equal(port.isOpen, false, 'le port est refermé pour la connexion normale');
});

test('installation sur une Nano « Old Bootloader » : essaie 115200 puis 57600', async () => {
  const image = parseHex(HEX);
  const port = new FakeBootloaderPort({ baud: 57600 });
  const r = await flashFirmware(port, image);
  assert.deepEqual(r, { ok: true, baudRate: 57600 });
  assert.deepEqual(port.opens, [115200, 57600]);
  assert.deepEqual([...port.flash.slice(0, image.length)], [...image]);
});

test('une autre carte (Mega) est refusée sans rien écrire', async () => {
  const port = new FakeBootloaderPort({ signature: [0x1e, 0x98, 0x01] });
  const r = await flashFirmware(port, parseHex(HEX));
  assert.deepEqual(r, { ok: false, error: FLASH_MSG.wrongChip });
  assert.ok(port.flash.every((b) => b === 0xff));
});

test('une écriture ratée est détectée à la vérification', async () => {
  const port = new FakeBootloaderPort({ corrupt: true });
  const r = await flashFirmware(port, parseHex(HEX));
  assert.deepEqual(r, { ok: false, error: FLASH_MSG.verifyFailed });
});

test('carte muette ou port occupé : message en français, port refermé', async () => {
  const silent = new FakeBootloaderPort({ silent: true });
  assert.deepEqual(await flashFirmware(silent, parseHex(HEX)), { ok: false, error: FLASH_MSG.noBootloader });
  assert.equal(silent.isOpen, false);
  const busy = new FakeBootloaderPort({ busy: true });
  assert.deepEqual(await flashFirmware(busy, parseHex(HEX)), { ok: false, error: FLASH_MSG.portBusy });
});
