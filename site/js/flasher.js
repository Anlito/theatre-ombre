// Installation du programme fixe « theatre_ombre.ino » sur la carte, depuis le navigateur.
// Utile quand la carte a servi à un autre projet (mBlock, IDE Arduino…) : son programme a été remplacé.
//
// Le programme est déjà compilé (site/firmware/theatre_ombre.hex, refait par « npm run firmware ») :
// aucun serveur. On parle au « bootloader » de la carte (le petit programme qui démarre pendant
// une seconde après chaque redémarrage) avec le protocole STK500, comme le fait l'IDE Arduino.
//   - Uno et Nano récents (optiboot) : 115200 bauds ;
//   - Nano « Old Bootloader » (clones) : 57600 bauds.

export const FIRMWARE_URL = new URL('../firmware/theatre_ombre.hex', import.meta.url);
export const BOOTLOADER_BAUDS = [115200, 57600];
const PAGE_SIZE = 128; // octets par page de mémoire flash (ATmega328P)
const MAX_SIZE = 32256; // place disponible pour le programme (32 Ko moins le bootloader)

// Codes du protocole STK500.
const STK = {
  OK: 0x10,
  INSYNC: 0x14,
  EOP: 0x20,
  GET_SYNC: 0x30,
  ENTER_PROGMODE: 0x50,
  LEAVE_PROGMODE: 0x51,
  LOAD_ADDRESS: 0x55,
  PROG_PAGE: 0x64,
  READ_PAGE: 0x74,
  READ_SIGN: 0x75,
};

export const FLASH_MSG = {
  noBootloader:
    "La carte ne se laisse pas programmer. Débranche et rebranche le câble USB, puis réessaie. " +
    'Si ça recommence, demande au professeur de téléverser theatre_ombre.ino avec l’IDE Arduino.',
  wrongChip: "Cette carte n'est pas une Arduino Uno ou Nano : impossible d'y installer le programme.",
  verifyFailed: "L'installation n'a pas été vérifiée correctement. Réessaie (sans débrancher le câble).",
  portBusy:
    'La carte est déjà utilisée par un autre programme (IDE Arduino, mBlock, autre onglet…). Ferme-le, puis réessaie.',
  badFile: 'Le fichier du programme est introuvable ou abîmé. Recharge la page, puis réessaie.',
};

class FlashError extends Error {}

// --- Fichier .hex (format Intel HEX) -> image de la mémoire flash ------------------------------
export function parseHex(text) {
  const bytes = new Uint8Array(MAX_SIZE).fill(0xff);
  let size = 0;
  let base = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line[0] !== ':' || line.length < 11) throw new FlashError(FLASH_MSG.badFile);
    const rec = [];
    for (let i = 1; i < line.length; i += 2) rec.push(parseInt(line.slice(i, i + 2), 16));
    if (rec.some(Number.isNaN) || rec.reduce((a, b) => a + b, 0) % 256 !== 0) throw new FlashError(FLASH_MSG.badFile);
    const [len, hi, lo, type] = rec;
    const data = rec.slice(4, 4 + len);
    if (type === 0x00) {
      const addr = base + (hi << 8) + lo;
      if (addr + len > MAX_SIZE) throw new FlashError(FLASH_MSG.badFile);
      bytes.set(data, addr);
      size = Math.max(size, addr + len);
    } else if (type === 0x01) {
      break;
    } else if (type === 0x02) {
      base = ((data[0] << 8) + data[1]) * 16;
    } else if (type === 0x04) {
      base = ((data[0] << 8) + data[1]) * 65536;
    }
  }
  if (size === 0) throw new FlashError(FLASH_MSG.badFile);
  return bytes.slice(0, size);
}

export async function loadFirmware(fetchFn = fetch) {
  try {
    const res = await fetchFn(FIRMWARE_URL);
    if (!res.ok) throw new Error();
    return parseHex(await res.text());
  } catch (e) {
    throw new FlashError(e instanceof FlashError ? e.message : FLASH_MSG.badFile);
  }
}

// --- Lecture des octets reçus, avec délai maximal ----------------------------------------------
class ByteReader {
  constructor(readable) {
    this.buf = [];
    this.wake = null;
    this.reader = readable.getReader();
    this.done = this.loop();
  }
  async loop() {
    try {
      for (;;) {
        const { value, done } = await this.reader.read();
        if (done) break;
        for (const b of value) this.buf.push(b);
        this.wake?.();
      }
    } catch {
      /* port fermé ou câble arraché */
    } finally {
      this.reader.releaseLock();
      this.wake?.();
    }
  }
  // n octets, ou null si rien n'arrive à temps.
  async read(n, ms) {
    const end = Date.now() + ms;
    while (this.buf.length < n) {
      const left = end - Date.now();
      if (left <= 0) return null;
      await new Promise((r) => {
        const t = setTimeout(r, left);
        this.wake = () => {
          clearTimeout(t);
          r();
        };
      });
      this.wake = null;
    }
    return this.buf.splice(0, n);
  }
  clear() {
    this.buf.length = 0;
  }
  async stop() {
    await this.reader.cancel().catch(() => {});
    await this.done;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Une séance avec le bootloader, à une vitesse donnée ---------------------------------------
class Session {
  constructor(port) {
    this.port = port;
  }
  async open(baudRate) {
    try {
      await this.port.open({ baudRate });
    } catch (e) {
      throw new FlashError(e && e.name === 'InvalidStateError' ? FLASH_MSG.portBusy : FLASH_MSG.noBootloader);
    }
    this.in = new ByteReader(this.port.readable);
    this.out = this.port.writable.getWriter();
  }
  async close() {
    await this.in?.stop();
    try {
      this.out?.releaseLock();
    } catch {
      /* déjà libéré */
    }
    await this.port.close().catch(() => {});
    this.in = this.out = null;
  }
  // Redémarre la carte (comme l'IDE Arduino) : le bootloader écoute pendant environ une seconde.
  async reset() {
    await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(250);
    await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    await sleep(50);
    this.in.clear();
  }
  async send(bytes) {
    await this.out.write(Uint8Array.from(bytes));
  }
  // Envoie une commande, attend INSYNC, `extra` octets de données, puis OK.
  async command(bytes, extra = 0, ms = 500) {
    await this.send([...bytes, STK.EOP]);
    const r = await this.in.read(extra + 2, ms);
    if (!r || r[0] !== STK.INSYNC || r[r.length - 1] !== STK.OK) return null;
    return r.slice(1, -1);
  }
  // Juste après le redémarrage, le bootloader fait clignoter la LED L (environ 0,4 s) sans lire :
  // une seule demande à la fois, sinon les octets en trop le désynchronisent et il s'arrête.
  async sync() {
    for (let i = 0; i < 5; i++) {
      if (await this.command([STK.GET_SYNC], 0, i === 0 ? 800 : 300)) {
        // Les essais précédents ont pu laisser des réponses en retard : on vide, puis on revérifie.
        await sleep(50);
        this.in.clear();
        if (await this.command([STK.GET_SYNC], 0, 300)) return true;
      }
    }
    return false;
  }
  loadAddress(byteAddr) {
    const word = byteAddr >> 1; // le bootloader compte en mots de 2 octets
    return this.command([STK.LOAD_ADDRESS, word & 0xff, word >> 8]);
  }
}

// --- Installation complète ---------------------------------------------------------------------
// port : objet SerialPort de Web Serial (fermé). image : octets du programme (parseHex).
// onProgress({ phase: 'connexion' | 'ecriture' | 'verification' | 'fin', fraction }).
// Renvoie { ok: true, baudRate } ou { ok: false, error } (message en français).
export async function flashFirmware(port, image, { onProgress = () => {}, bauds = BOOTLOADER_BAUDS } = {}) {
  const s = new Session(port);
  try {
    onProgress({ phase: 'connexion', fraction: 0 });
    let baudRate = null;
    for (const baud of bauds) {
      await s.open(baud);
      await s.reset();
      if (await s.sync()) {
        baudRate = baud;
        break;
      }
      await s.close();
      await sleep(200);
    }
    if (!baudRate) throw new FlashError(FLASH_MSG.noBootloader);

    // Signature du microcontrôleur : 1E 95 xx = ATmega328 / 328P (Uno, Nano).
    const sig = await s.command([STK.READ_SIGN], 3);
    if (!sig || sig[0] !== 0x1e || sig[1] !== 0x95) throw new FlashError(FLASH_MSG.wrongChip);
    if (!(await s.command([STK.ENTER_PROGMODE]))) throw new FlashError(FLASH_MSG.noBootloader);

    const pages = Math.ceil(image.length / PAGE_SIZE);
    const page = (i) => {
      const p = new Uint8Array(PAGE_SIZE).fill(0xff);
      p.set(image.subarray(i * PAGE_SIZE, (i + 1) * PAGE_SIZE));
      return p;
    };

    for (let i = 0; i < pages; i++) {
      const ok =
        (await s.loadAddress(i * PAGE_SIZE)) &&
        (await s.command([STK.PROG_PAGE, 0, PAGE_SIZE, 0x46, ...page(i)], 0, 1000));
      if (!ok) throw new FlashError(FLASH_MSG.noBootloader);
      onProgress({ phase: 'ecriture', fraction: (i + 1) / pages });
    }

    for (let i = 0; i < pages; i++) {
      const read = (await s.loadAddress(i * PAGE_SIZE)) && (await s.command([STK.READ_PAGE, 0, PAGE_SIZE, 0x46], PAGE_SIZE, 1000));
      if (!read) throw new FlashError(FLASH_MSG.noBootloader);
      const expected = page(i);
      if (read.some((b, k) => b !== expected[k])) throw new FlashError(FLASH_MSG.verifyFailed);
      onProgress({ phase: 'verification', fraction: (i + 1) / pages });
    }

    await s.command([STK.LEAVE_PROGMODE]); // la carte démarre le nouveau programme
    onProgress({ phase: 'fin', fraction: 1 });
    return { ok: true, baudRate };
  } catch (e) {
    return { ok: false, error: e instanceof FlashError ? e.message : FLASH_MSG.noBootloader };
  } finally {
    await s.close();
  }
}
