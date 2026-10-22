// Fichier Excel (.xlsx) minimal, sans bibliothèque : quelques feuilles de texte et de nombres,
// première ligne en gras et figée. Un .xlsx est un ZIP de fichiers XML (ici sans compression).

(function (global) {
  'use strict';

  const encodeur = new TextEncoder();

  // ---------- ZIP (méthode « stockée ») ----------

  const TABLE_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(octets) {
    let c = 0xffffffff;
    for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function zip(fichiers) {
    const morceaux = [];
    const central = [];
    let decalage = 0;
    for (const f of fichiers) {
      const nom = encodeur.encode(f.nom);
      const donnees = typeof f.contenu === 'string' ? encodeur.encode(f.contenu) : f.contenu;
      const crc = crc32(donnees);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // noms en UTF-8
      local.setUint16(8, 0, true); // stocké
      local.setUint32(14, crc, true);
      local.setUint32(18, donnees.length, true);
      local.setUint32(22, donnees.length, true);
      local.setUint16(26, nom.length, true);
      morceaux.push(new Uint8Array(local.buffer), nom, donnees);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, donnees.length, true);
      c.setUint32(24, donnees.length, true);
      c.setUint16(28, nom.length, true);
      c.setUint32(42, decalage, true);
      central.push(new Uint8Array(c.buffer), nom);
      decalage += 30 + nom.length + donnees.length;
    }
    const tailleCentral = central.reduce((t, m) => t + m.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, fichiers.length, true);
    fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentral, true);
    fin.setUint32(16, decalage, true);
    const tout = [...morceaux, ...central, new Uint8Array(fin.buffer)];
    const sortie = new Uint8Array(tout.reduce((t, m) => t + m.length, 0));
    let i = 0;
    for (const m of tout) {
      sortie.set(m, i);
      i += m.length;
    }
    return sortie;
  }

  // ---------- Classeur ----------

  const xml = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      // caractères interdits en XML
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  function colonne(n) {
    let s = '';
    for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  }

  function feuilleXml(feuille) {
    const lignes = [feuille.entete, ...feuille.lignes];
    const largeurs = feuille.entete.map((_, j) =>
      Math.min(60, Math.max(6, ...lignes.map((l) => String(l[j] === undefined || l[j] === null ? '' : l[j]).length + 2))),
    );
    let x =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' +
      largeurs.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('') +
      '</cols><sheetData>';
    lignes.forEach((l, i) => {
      x += `<row r="${i + 1}">`;
      l.forEach((v, j) => {
        const ref = colonne(j) + (i + 1);
        const style = i === 0 ? ' s="1"' : '';
        if (typeof v === 'number' && Number.isFinite(v)) x += `<c r="${ref}"${style}><v>${v}</v></c>`;
        else if (v !== '' && v !== null && v !== undefined) x += `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      });
      x += '</row>';
    });
    return x + '</sheetData></worksheet>';
  }

  // feuilles : [{ nom, entete: [...], lignes: [[...]] }] → Uint8Array du fichier .xlsx
  function classeur(feuilles) {
    const fichiers = [
      {
        nom: '[Content_Types].xml',
        contenu:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          feuilles
            .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
            .join('') +
          '</Types>',
      },
      {
        nom: '_rels/.rels',
        contenu:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      },
      {
        nom: 'xl/workbook.xml',
        contenu:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
          feuilles.map((f, i) => `<sheet name="${xml(f.nom.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
          '</sheets></workbook>',
      },
      {
        nom: 'xl/_rels/workbook.xml.rels',
        contenu:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          feuilles
            .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
            .join('') +
          `<Relationship Id="rId${feuilles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          '</Relationships>',
      },
      {
        nom: 'xl/styles.xml',
        contenu:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
          '</styleSheet>',
      },
      ...feuilles.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: feuilleXml(f) })),
    ];
    return zip(fichiers);
  }

  const api = { classeurXlsx: classeur, crc32, zip };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);
