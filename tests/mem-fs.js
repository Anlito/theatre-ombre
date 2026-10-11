// Faux disque en mémoire : imite les dossiers et fichiers du navigateur (File System Access).
// Partagé par les tests du dossier d'équipe et de l'outil professeur.

export class MemDir {
  constructor(name) {
    this.kind = 'directory';
    this.name = name;
    this.children = new Map();
  }
  async getDirectoryHandle(name, { create = false } = {}) {
    if (!this.children.has(name)) {
      if (!create) throw Object.assign(new Error('absent'), { name: 'NotFoundError' });
      this.children.set(name, new MemDir(name));
    }
    return this.children.get(name);
  }
  async getFileHandle(name, { create = false } = {}) {
    if (!this.children.has(name)) {
      if (!create) throw Object.assign(new Error('absent'), { name: 'NotFoundError' });
      this.children.set(name, new MemFile(name, ''));
    }
    return this.children.get(name);
  }
  async *values() {
    yield* this.children.values();
  }
}
export class MemFile {
  constructor(name, text, lastModified = Date.now()) {
    Object.assign(this, { kind: 'file', name, text, lastModified });
  }
  async getFile() {
    // Le contenu peut être du texte ou des octets (fichier STL).
    return new File([this.text], this.name, { lastModified: this.lastModified });
  }
  async createWritable() {
    let buf = '';
    return { write: async (t) => (buf += t), close: async () => ((this.text = buf), (this.lastModified = Date.now())) };
  }
}
