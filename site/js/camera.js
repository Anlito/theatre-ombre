// Webcam : démarrage, choix de la caméra (portable + webcam USB), messages en français.

const STORAGE_KEY = 'theatre-ombre.camera';

export class Camera {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.state = 'off'; // 'off' | 'busy' | 'on' | 'error'
    this.error = null;
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setState(state, error = null) {
    this.state = state;
    this.error = error;
    for (const fn of this.listeners) fn({ state, error });
  }

  get ready() {
    return this.state === 'on' && this.video.readyState >= 2 && this.video.videoWidth > 0;
  }

  async start(deviceId = loadChoice()) {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setState('error', 'Ce navigateur ne peut pas utiliser la webcam : ouvre le site avec Chrome ou Edge, en https.');
      return false;
    }
    this.stop();
    this.setState('busy');
    const video = { width: { ideal: 640 }, height: { ideal: 480 } };
    if (deviceId) video.deviceId = { exact: deviceId };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (e) {
      // La caméra mémorisée a disparu : on reprend la caméra par défaut.
      if (deviceId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {
        saveChoice('');
        return this.start('');
      }
      this.setState('error', cameraError(e));
      return false;
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    this.stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      this.setState('error', 'La webcam a été débranchée. Rebranche-la, puis clique sur « Activer la webcam ».');
    });
    this.setState('on');
    return true;
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  currentDeviceId() {
    return this.stream?.getVideoTracks()[0]?.getSettings().deviceId ?? '';
  }

  async listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Webcam ${i + 1}` }));
  }

  async choose(deviceId) {
    saveChoice(deviceId);
    return this.start(deviceId);
  }
}

function cameraError(e) {
  switch (e.name) {
    case 'NotAllowedError':
      return "La webcam est refusée. Clique sur l'icône 📷 dans la barre d'adresse, choisis « Autoriser », puis recharge la page.";
    case 'NotFoundError':
      return 'Aucune webcam trouvée. Vérifie le câble USB de la webcam, puis clique sur « Activer la webcam ».';
    case 'NotReadableError':
      return 'La webcam est déjà utilisée par un autre logiciel ou un autre onglet. Ferme-le, puis clique sur « Activer la webcam ».';
    default:
      return `La webcam ne démarre pas (${e.name}). Débranche-la et rebranche-la, puis réessaie.`;
  }
}

// Le choix de la webcam est mémorisé sur ce poste (simple confort).
function loadChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}
function saveChoice(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* stockage indisponible : tant pis */
  }
}
