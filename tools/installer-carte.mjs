// Essai de l'installation du programme sur une vraie carte, depuis Node (sans navigateur).
// Utilise le MÊME code que le site (site/js/flasher.js), avec le paquet « serialport »
// enveloppé pour ressembler au port Web Serial de Chrome.
//
//   node tools/installer-carte.mjs COM14
//
// Puis vérifie que le programme répond : PING -> PONG v1.
import { readFileSync } from 'node:fs';
import { SerialPort } from 'serialport';
import { parseHex, flashFirmware } from '../site/js/flasher.js';

const path = process.argv[2];
if (!path) {
  console.log('Usage : node tools/installer-carte.mjs COM14');
  process.exit(1);
}

// Port « façon Web Serial » : open({ baudRate }), setSignals, readable, writable, close.
class NodeWebSerialPort {
  constructor(path) {
    this.path = path;
  }
  open({ baudRate }) {
    return new Promise((resolve, reject) => {
      this.sp = new SerialPort({ path: this.path, baudRate, autoOpen: false });
      this.sp.open((err) => {
        if (err) return reject(err);
        this.readable = new ReadableStream({
          start: (c) => {
            this.sp.on('data', (d) => {
              try {
                c.enqueue(new Uint8Array(d));
              } catch {
                /* flux annulé */
              }
            });
          },
        });
        this.writable = new WritableStream({
          write: (chunk) => new Promise((res, rej) => this.sp.write(Buffer.from(chunk), (e) => (e ? rej(e) : this.sp.drain(res)))),
        });
        resolve();
      });
    });
  }
  setSignals({ dataTerminalReady, requestToSend }) {
    return new Promise((res, rej) => this.sp.set({ dtr: dataTerminalReady, rts: requestToSend }, (e) => (e ? rej(e) : res())));
  }
  close() {
    return new Promise((res) => (this.sp?.isOpen ? this.sp.close(() => res()) : res()));
  }
}

async function ping() {
  const sp = new SerialPort({ path, baudRate: 115200 });
  let text = '';
  sp.on('data', (d) => (text += d.toString()));
  await new Promise((r) => setTimeout(r, 2000)); // la carte redémarre à l'ouverture
  for (let i = 0; i < 3 && !text.includes('PONG'); i++) {
    sp.write('PING\n');
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise((r) => sp.close(r));
  return text.trim();
}

console.log(`Avant : ${JSON.stringify(await ping()) || '(rien)'}`);
const image = parseHex(readFileSync(new URL('../site/firmware/theatre_ombre.hex', import.meta.url), 'utf8'));
const t0 = Date.now();
let last = '';
const r = await flashFirmware(new NodeWebSerialPort(path), image, {
  onProgress: ({ phase, fraction }) => {
    const step = `${phase} ${Math.round(fraction * 100)} %`;
    if (phase !== last.split(' ')[0] || fraction === 1) console.log('  ' + step);
    last = step;
  },
});
console.log(r, `${((Date.now() - t0) / 1000).toFixed(1)} s`);
await new Promise((res) => setTimeout(res, 500));
console.log(`Après : ${JSON.stringify(await ping())}`);
