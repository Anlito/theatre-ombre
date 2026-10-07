// Liaison avec la carte Arduino.
// SerialLink parle le protocole (protocol.js) à travers un « transport » :
//   - WebSerialTransport : le vrai câble USB (Chrome / Edge) ;
//   - SimulatedTransport : la carte simulée (mode démo et tests).

import * as P from './protocol.js';
import { SimulatedBoard } from './simulated-board.js';

export const BOOT_DELAY_MS = 2000; // la carte redémarre quand on ouvre le port
export const PING_EVERY_MS = 1000;
export const REPLY_TIMEOUT_MS = 1000;
export const SILENT_AFTER_MS = 3500; // pas de PONG depuis ce temps -> carte muette

export const MSG = {
  noSerial: "Ce navigateur ne peut pas parler à la carte : ouvre le site avec Chrome ou Edge.",
  notSecure: "Le site doit être ouvert en https:// pour parler à la carte et utiliser la webcam.",
  noPortChosen: "Aucune carte choisie. Vérifie le câble USB, puis clique sur « Connecter l'Arduino ».",
  portBusy:
    "La carte est déjà utilisée par un autre programme (IDE Arduino, autre onglet…). Ferme-le, puis réessaie.",
  openFailed: "Impossible d'ouvrir la carte. Débranche et rebranche le câble USB, puis réessaie.",
  noPong:
    "La carte n'a pas le programme du Théâtre d'ombre (elle a sans doute servi à un autre projet). Clique sur « Carte · Connecter » pour l'installer.",
  badVersion: "Le programme de la carte n'est pas à jour. Clique sur « Carte · Connecter » pour installer le bon programme.",
  unplugged: 'La carte a été débranchée. Rebranche le câble USB, puis clique sur « Connecter l’Arduino ».',
  silent: 'La carte ne répond plus. Vérifie le câble USB.',
};

export function serialSupport() {
  if (typeof navigator === 'undefined' || !('serial' in navigator)) return { ok: false, error: MSG.noSerial };
  if (typeof isSecureContext !== 'undefined' && !isSecureContext) return { ok: false, error: MSG.notSecure };
  return { ok: true };
}

// ---------------------------------------------------------------------------
export class SerialLink {
  // options.ticker(cb, ms) -> fonction d'arrêt. Remplaçable dans les tests.
  // options.sleep(ms) -> Promise. Remplaçable dans les tests.
  constructor({
    ticker = defaultTicker,
    sleep = defaultSleep,
    now = () => Date.now(),
    replyTimeoutMs = REPLY_TIMEOUT_MS,
  } = {}) {
    this.replyTimeoutMs = replyTimeoutMs;
    this.ticker = ticker;
    this.sleep = sleep;
    this.now = now;
    this.transport = null;
    this.state = 'deconnectee'; // 'deconnectee' | 'connexion' | 'connectee' | 'muette'
    this.lastPong = 0;
    this.queue = Promise.resolve();
    this.waiting = null; // { resolve, timer } pour la réponse attendue
    this.stopTicker = null;
    this.listeners = new Set();
    this.lastError = null;
  }

  // Les écouteurs reçoivent ({ state, error }) à chaque changement.
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setState(state, error = null) {
    this.state = state;
    this.lastError = error;
    for (const fn of this.listeners) fn({ state, error });
  }

  get connected() {
    return this.state === 'connectee' || this.state === 'muette';
  }

  async connect(transport, { bootDelayMs = BOOT_DELAY_MS } = {}) {
    if (this.transport) await this.disconnect();
    this.setState('connexion');
    this.transport = transport;
    transport.onLine = (line) => this.handleLine(line);
    transport.onClose = () => this.handleClosed();
    try {
      await transport.open();
    } catch (e) {
      this.transport = null;
      const msg = e && e.name === 'InvalidStateError' ? MSG.portBusy : MSG.openFailed;
      this.setState('deconnectee', msg);
      return { ok: false, error: msg };
    }
    await this.sleep(bootDelayMs);

    // Poignée de main : 3 essais.
    let reply = null;
    for (let i = 0; i < 3 && (!reply || reply.type !== 'pong'); i++) {
      reply = await this.send('PING');
    }
    if (!reply || reply.type !== 'pong') {
      await this.closeTransport();
      this.setState('deconnectee', MSG.noPong);
      return { ok: false, error: MSG.noPong, needsFirmware: true };
    }
    if (reply.version !== P.PROTOCOL_VERSION) {
      await this.closeTransport();
      this.setState('deconnectee', MSG.badVersion);
      return { ok: false, error: MSG.badVersion, needsFirmware: true };
    }
    this.lastPong = this.now();
    this.stopTicker = this.ticker(() => this.heartbeat(), PING_EVERY_MS);
    this.setState('connectee');
    return { ok: true };
  }

  async heartbeat() {
    if (!this.transport) return;
    const reply = await this.send('PING');
    if (reply.type === 'pong') {
      this.lastPong = this.now();
      if (this.state === 'muette') this.setState('connectee');
    } else if (this.now() - this.lastPong > SILENT_AFTER_MS && this.state === 'connectee') {
      this.setState('muette', MSG.silent);
    }
  }

  // Envoie une ligne et attend la réponse (une seule commande à la fois).
  send(line) {
    const run = async () => {
      if (!this.transport) return { type: 'closed' };
      const reply = new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.waiting = null;
          resolve({ type: 'timeout' });
        }, this.replyTimeoutMs);
        this.waiting = { resolve, timer };
      });
      try {
        await this.transport.write(line + '\n');
      } catch {
        this.resolveWaiting({ type: 'closed' });
      }
      return reply;
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => {});
    return result;
  }

  handleLine(line) {
    const r = P.parseResponse(line);
    if (r.type === 'other') return;
    // Une réponse qui arrive alors qu'on n'attend rien (trop tard) est ignorée.
    this.resolveWaiting(r);
  }

  resolveWaiting(r) {
    if (!this.waiting) return;
    clearTimeout(this.waiting.timer);
    const { resolve } = this.waiting;
    this.waiting = null;
    resolve(r);
  }

  handleClosed() {
    if (!this.transport) return;
    this.cleanup();
    this.setState('deconnectee', MSG.unplugged);
  }

  // --- Ordres pour les blocs ------------------------------------------------
  // Renvoient { ok: true } ou { ok: false, error } (message en français).
  digitalWrite(pin, on) {
    return this.command(P.digital(pin, on));
  }
  analogWrite(pin, value) {
    return this.command(P.analog(pin, value));
  }
  tone(pin, freq, ms) {
    return this.command(P.tone(pin, freq, ms));
  }
  allOff() {
    return this.command(P.off());
  }

  async command(built) {
    if (!built.ok) return built;
    if (!this.connected) return { ok: false, error: "La carte n'est pas connectée.", offline: true };
    const r = await this.send(built.line);
    if (r.type === 'ok') return { ok: true };
    if (r.type === 'err' && r.code === 'PIN') return { ok: false, error: 'La carte refuse cette broche.' };
    if (r.type === 'err') return { ok: false, error: "La carte n'a pas compris l'ordre." };
    return { ok: false, error: MSG.silent };
  }

  async disconnect() {
    if (!this.transport) return;
    if (this.connected) await this.send('OFF');
    await this.closeTransport();
    this.setState('deconnectee');
  }

  async closeTransport() {
    const t = this.transport;
    this.cleanup();
    if (t) {
      try {
        await t.close();
      } catch {
        /* déjà fermé */
      }
    }
  }

  cleanup() {
    if (this.stopTicker) this.stopTicker();
    this.stopTicker = null;
    this.transport = null;
    this.resolveWaiting({ type: 'closed' });
  }
}

// ---------------------------------------------------------------------------
// Le vrai câble USB, avec l'API Web Serial (Chrome et Edge).
export class WebSerialTransport {
  constructor(port) {
    this.port = port;
    this.onLine = () => {};
    this.onClose = () => {};
    this.reader = null;
    this.closing = false;
  }

  // Ouvre la fenêtre du navigateur qui liste les ports (sans filtre : clones CH340, FTDI…).
  static async choosePort() {
    try {
      return await navigator.serial.requestPort();
    } catch {
      return null; // l'élève a fermé la fenêtre sans choisir
    }
  }

  async open() {
    await this.port.open({ baudRate: P.BAUD_RATE });
    this.readLoop();
    this.onDisconnect = (e) => {
      if (e.target === this.port) this.onClose();
    };
    navigator.serial.addEventListener('disconnect', this.onDisconnect);
  }

  async readLoop() {
    const splitter = new P.LineSplitter();
    const decoder = new TextDecoder();
    while (this.port.readable && !this.closing) {
      this.reader = this.port.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          for (const line of splitter.push(decoder.decode(value, { stream: true }))) this.onLine(line);
        }
      } catch {
        // Erreur de lecture (parasite, câble arraché) : on réessaie si le port existe encore.
      } finally {
        this.reader.releaseLock();
        this.reader = null;
      }
    }
    if (!this.closing) this.onClose();
  }

  async write(text) {
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(text));
    } finally {
      writer.releaseLock();
    }
  }

  async close() {
    this.closing = true;
    navigator.serial.removeEventListener('disconnect', this.onDisconnect);
    if (this.reader) await this.reader.cancel().catch(() => {});
    await this.port.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Carte simulée (mode démo sans carte, et tests automatiques).
export class SimulatedTransport {
  constructor(board = new SimulatedBoard()) {
    this.board = board;
    this.onLine = () => {};
    this.onClose = () => {};
    this.splitter = new P.LineSplitter();
    this.timer = null;
    this.mute = false; // pour simuler une carte sans le bon programme
  }
  async open() {
    this.timer = setInterval(() => this.board.tick(), 100);
    this.onLine('PRET v1');
  }
  async write(text) {
    for (const line of this.splitter.push(text)) {
      const reply = this.board.receive(line);
      if (!this.mute) queueMicrotask(() => this.onLine(reply));
    }
  }
  async close() {
    clearInterval(this.timer);
  }
  // Simule un câble arraché.
  unplug() {
    clearInterval(this.timer);
    this.onClose();
  }
}

// ---------------------------------------------------------------------------
// Le signe de vie passe par un « worker » : Chrome ne le ralentit pas quand l'onglet
// est en arrière-plan, contrairement à setInterval.
function defaultTicker(cb, ms) {
  if (typeof Worker !== 'undefined') {
    try {
      const w = new Worker(new URL('./ping-worker.js', import.meta.url));
      w.onmessage = cb;
      w.postMessage({ every: ms });
      return () => w.terminate();
    } catch {
      /* repli ci-dessous */
    }
  }
  const id = setInterval(cb, ms);
  return () => clearInterval(id);
}

function defaultSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
