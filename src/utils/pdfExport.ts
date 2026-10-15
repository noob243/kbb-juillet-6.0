/**
 * Utility service to export records (Fiches) and data tables (Listes)
 * into high-fidelity PDFs matching the Graphical User Interface layout of Cabinet KBB.
 */

export interface AttachmentItem {
  name: string;
  size: string;
  type?: string;
  content?: string;
}

export function formatFieldValue(val: any): string {
  if (val === null || val === undefined || val === '') return 'N/A';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Aucun';
    if (typeof val[0] === 'object') return `${val.length} enregistrement(s)`;
    return val.join(', ');
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Nom complet',
  name: 'Nom',
  client: 'Client associé',
  clientName: 'Client associé',
  caseId: 'Référence du dossier',
  caseName: 'Dossier associé',
  procedure: 'Procédure',
  procedureInstance: 'Instance / juridiction',
  procedureObjet: 'Objet de la procédure',
  instance: 'Instance / juridiction',
  objet: 'Objet',
  dateDebut: 'Date de début',
  dateFin: 'Date de fin',
  nextHearing: 'Prochaine audience',
  status: 'Statut',
  cabinetRole: 'Fonction au cabinet',
  cabinetStatus: 'Statut au cabinet',
  serviceStatus: 'Statut de service',
  onaNumber: 'Numéro ONA',
  mainBar: 'Barreau principal',
  secondaryBar: 'Barreaux secondaires',
  firstOathDate: 'Date du premier serment',
  secondOathDate: 'Date du second serment',
  serviceStartDate: 'Début de service',
  phone: 'Téléphone',
  emails: 'Adresses e-mail',
  email: 'Adresse e-mail',
  contact: 'Contact principal',
  denomination: 'Dénomination',
  secteur: 'Secteur d’activité',
  siege: 'Siège social',
  sieges: 'Adresses sociales',
  rccm: 'Numéro RCCM',
  idNat: 'Identifiant national',
  nImpot: 'Numéro d’impôt',
  typeFacturation: 'Type de facturation',
  totalAmount: 'Montant total',
  paidAmount: 'Montant payé',
  dueDate: 'Date d’échéance',
  adversaire: 'Partie adverse',
  adversaires: 'Parties adverses',
  avocatTitulaire: 'Avocat titulaire',
  avocatsSurDossier: 'Avocats associés au dossier',
  tags: 'Étiquettes',
  notes: 'Notes',
  disciplinaryMeasures: 'Mesures disciplinaires',
  address: 'Adresse',
  role: 'Rôle',
  category: 'Catégorie',
  salary: 'Salaire',
  date: 'Date',
  lieu: 'Lieu',
  subject: 'Objet',
  recipientName: 'Destinataire',
  author: 'Auteur',
  title: 'Titre'
};

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase()).trim();
}

let pdfExportSequence = 0;

function createPdfCaptureId(element: HTMLElement): string {
  const captureId = `kbb-pdf-capture-${Date.now()}-${++pdfExportSequence}`;
  element.id = captureId;
  return captureId;
}

function getPdfRenderDimensions(element?: HTMLElement) {
  const documentWidth = Math.max(document.documentElement?.scrollWidth || 0, document.body?.scrollWidth || 0, 1200);
  const documentHeight = Math.max(document.documentElement?.scrollHeight || 0, document.body?.scrollHeight || 0, 1800);

  if (!element) {
    return { width: documentWidth, height: documentHeight };
  }

  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(Math.ceil(rect.width || element.scrollWidth || documentWidth), documentWidth),
    height: Math.max(Math.ceil(rect.height || element.scrollHeight || documentHeight), documentHeight)
  };
}

function sanitizePdfCaptureElement(element: HTMLElement) {
  const nodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];

  nodes.forEach((node) => {
    const style = node.style;
    Object.assign(style, {
      position: 'static',
      left: 'auto',
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      zIndex: 'auto',
      visibility: 'visible',
      opacity: '1',
      clipPath: 'none',
      filter: 'none',
      transform: 'none',
      overflow: 'visible',
      overflowX: 'visible',
      overflowY: 'visible',
      maxHeight: 'none',
      maxWidth: '100%',
      height: 'auto',
      wordBreak: 'break-word',
      whiteSpace: 'normal'
    });
  });
}

function createHtml2CanvasOptions(captureId: string, scale: number, windowWidth?: number, windowHeight?: number) {
  const dimensions = getPdfRenderDimensions();
  return {
    scale,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: windowWidth ?? Math.max(dimensions.width, window.innerWidth || 1200),
    windowHeight: windowHeight ?? Math.max(dimensions.height, 1800),
    onclone: (clonedDocument: Document) => {
      const captureElement = clonedDocument.getElementById(captureId);
      if (captureElement) {
        sanitizePdfCaptureElement(captureElement);
      }
    }
  };
}

/**
 * Export a single record / fiche to PDF preserving GUI layout styling
 */
export async function exportFicheToPdf(type: string, item: any, customTitle?: string): Promise<void> {
  if (!item) return;

  const typeLabels: Record<string, string> = {
    client: 'Fiche Client',
    case: 'Dossier Judiciaire',
    procedure: 'Fiche Procédure',
    avocat: 'Fiche Avocat',
    personnel: 'Fiche Personnel',
    event: 'Fiche Événement',
    task: 'Fiche Tâche',
    invoice: 'Fiche Facture',
    fournisseur: 'Fiche Fournisseur',
    correspondance: 'Correspondance & Courrier'
  };

  const titleText = customTitle || typeLabels[type] || `Fiche ${type.toUpperCase()}`;
  const recordId = item.id || item.dossierId || 'EXPORT';
  const safeRecordId = String(recordId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportDate = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const photoOrLogo = item.photoUrl || item.logoUrl || item.photo || '';
  const pieces = item.piecesJointes || item.attachments || [];
  const bankAccounts = item.bankAccounts || [];
  const procedures = item.procedures || [];

  // Exclude non-display keys
  const hiddenKeys = new Set([
    'id', 'photo', 'photoUrl', 'logoUrl', 'piecesJointes', 'attachments',
    'bankAccounts', 'procedures', 'reports', 'financements', 'evolutionFinancement',
    'permissions', 'password', 'tempPassword'
  ]);

  const fieldEntries = Object.entries(item).filter(([k, v]) => !hiddenKeys.has(k) && v !== undefined);

  // Construct styled HTML container
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.left = 'auto';
  container.style.top = 'auto';
  container.style.clipPath = 'inset(100%)';
  container.style.pointerEvents = 'none';
  container.style.zIndex = 'auto';
  container.style.width = '800px';
  container.style.padding = '32px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  container.style.color = '#1e293b';
  const captureId = createPdfCaptureId(container);

  container.innerHTML = `
    <div style="border: 2px solid #15447c; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 20px; font-weight: 900; color: #15447c; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px;">
            CABINET D’AVOCATS KBB LAW FIRM scp
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            Réf. <strong>${escapeHtml(recordId)}</strong> · Exporté le ${escapeHtml(exportDate)}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="background-color: #15447c; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block;">
            ${escapeHtml(titleText)}
          </div>
        </div>
      </div>

      <!-- Main Profile / Title Banner -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px;">
        ${photoOrLogo ? `
          <div style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; border: 2px solid #15447c; flex-shrink: 0; background: #ffffff;">
            <img src="${escapeHtml(photoOrLogo)}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        ` : `
          <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #e0e7ff; color: #3730a3; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; flex-shrink: 0;">
            📂
          </div>
        `}
        <div>
          <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
            ${escapeHtml(item.fullName || item.name || item.nomComplet || item.subject || 'Fiche Enregistrement')}
          </h2>
          <p style="font-size: 12px; font-weight: 600; color: #475569; margin: 4px 0 0 0;">
            ${escapeHtml(item.cabinetStatus || item.role || item.client || item.secteur || item.status || 'Cabinet KBB LAW FIRM scp')}
          </p>
        </div>
      </div>

      <!-- Grid of Attributes -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #15447c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">
          Informations Détaillées
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          ${fieldEntries.map(([key, val]) => `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
              <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">
                ${escapeHtml(formatFieldLabel(key))}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #1e293b;">
                ${escapeHtml(formatFieldValue(val))}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      ${bankAccounts.length > 0 ? `
        <!-- Bank Accounts -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12px; font-weight: 800; color: #15447c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">
            💳 Comptes Bancaires (${bankAccounts.length})
          </h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            ${bankAccounts.map((b: any) => `
              <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px 12px;">
                <div style="font-size: 11px; font-weight: 800; color: #1e1b4b;">${escapeHtml(b.bankName || 'Banque')}</div>
                <div style="font-size: 10px; font-family: monospace; font-weight: 700; color: #3730a3;">${escapeHtml(b.accountNumber || 'N/A')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${procedures.length > 0 ? `
        <!-- Procedures -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12px; font-weight: 800; color: #15447c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">
            ⚖️ Procédures Rattachées (${procedures.length})
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${procedures.map((p: any) => `
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 11px;">
                <strong>${escapeHtml(p.name || 'Procédure')}</strong> - <span style="color: #475569;">Instance: ${escapeHtml(p.instance || 'N/A')}</span>
                ${p.objet ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">Objet: ${escapeHtml(p.objet)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Attachments Section -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #15447c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">
          📎 Pièces Jointes Associées (${pieces.length})
        </h3>
        ${pieces.length === 0 ? `
          <div style="font-size: 11px; color: #94a3b8; font-style: italic; background-color: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            Aucune pièce jointe liée à cette fiche.
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            ${pieces.map((p: any) => `
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a;">📄 ${escapeHtml(p.name || 'Fichier')}</div>
                  <div style="font-size: 9px; color: #64748b; font-family: monospace;">Taille: ${escapeHtml(p.size || 'N/A')}</div>
                </div>
                <div style="background-color: #dcfce7; color: #166534; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
                  Enregistré
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Footer Sign-off -->
      <div style="margin-top: 28px; border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 9px; color: #94a3b8; line-height: 1.4;">
        Document officiel généré depuis l'App du Cabinet KBB LAW FIRM scp.<br/>
        </div>
        <div style="text-align: center; border-top: 1px solid #0f172a; width: 160px; padding-top: 4px; font-size: 10px; font-weight: 800; color: #15447c;">
          Cachet & Signature KBB
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      const captureDimensions = getPdfRenderDimensions(container);
      const opt = {
        margin: 8,
        filename: `fiche_${type}_${safeRecordId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: createHtml2CanvasOptions(captureId, 2, captureDimensions.width, captureDimensions.height),
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().from(container).set(opt).save();
    } else {
      // Fallback: jsPDF standard print window
      window.print();
    }
  } catch (err) {
    console.error("Error generating PDF with html2pdf:", err);
    window.print();
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Export a list / table to PDF preserving GUI table layout styling
 */
export async function exportListToPdf(
  titleText: string,
  columns: string[],
  rows: (string | number)[][],
  filenamePrefix: string = 'liste'
): Promise<void> {
  if (!rows || rows.length === 0) {
    alert("Aucune donnée disponible dans cette liste à exporter.");
    return;
  }

  const exportDate = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.left = 'auto';
  container.style.top = 'auto';
  container.style.clipPath = 'inset(100%)';
  container.style.pointerEvents = 'none';
  container.style.zIndex = 'auto';
  container.style.width = '1000px';
  container.style.padding = '32px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  container.style.color = '#1e293b';
  const captureId = createPdfCaptureId(container);

  container.innerHTML = `
    <div style="border: 2px solid #15447c; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 20px; font-weight: 900; color: #15447c; letter-spacing: -0.5px;">
            CABINET D’AVOCATS KBB LAW FIRM scp
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #d97706; margin-top: 2px; text-transform: uppercase;">
            Cabinet d'Avocats
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            Exporté le : ${exportDate} | Total enregistrements : <strong>${rows.length}</strong>
          </div>
        </div>
        <div style="background-color: #15447c; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 800;">
          ${titleText}
        </div>
      </div>

      <!-- Table -->
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #15447c; color: #ffffff; text-align: left;">
              ${columns.map(col => `
                <th style="padding: 8px 10px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #0f3460;">
                  ${col}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                ${row.map(cell => `
                  <td style="padding: 8px 10px; font-weight: 600; color: #334155;">
                    ${cell !== undefined && cell !== null ? String(cell) : '-'}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8;">
        <div>Cabinet KBB LAW FIRM scp</div>
        <div>Page 1 sur 1</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      const captureDimensions = getPdfRenderDimensions(container);
      const opt = {
        margin: 8,
        filename: `${filenamePrefix}_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: createHtml2CanvasOptions(captureId, 2, captureDimensions.width, captureDimensions.height),
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      await html2pdf().from(container).set(opt).save();
    } else {
      window.print();
    }
  } catch (err) {
    console.error("Error exporting list PDF:", err);
    window.print();
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export async function exportElementToPdf(element: HTMLElement, filenamePrefix: string, captureWidth = 1060): Promise<void> {
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    window.print();
    return;
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const captureId = createPdfCaptureId(clone);
  clone.querySelectorAll('[data-pdf-ignore]').forEach(node => node.remove());
  clone.querySelectorAll('table').forEach(table => {
    const headerCells = table.querySelectorAll('thead th');
    if (headerCells.length > 0 && headerCells[headerCells.length - 1].textContent?.trim().toLowerCase() === 'actions') {
      table.querySelectorAll('tr').forEach(row => row.lastElementChild?.remove());
    }
  });
  clone.querySelectorAll<HTMLElement>('[class*="overflow-y-auto"], [class*="overflow-y-scroll"]').forEach(node => {
    node.style.maxHeight = 'none';
    node.style.height = 'auto';
    node.style.overflowY = 'visible';
  });
  const captureDimensions = getPdfRenderDimensions(element);
  Object.assign(clone.style, {
    position: 'relative',
    left: 'auto',
    top: 'auto',
    clipPath: 'none',
    pointerEvents: 'none',
    zIndex: 'auto',
    width: `${captureWidth}px`,
    maxWidth: '100%',
    maxHeight: 'none',
    height: 'auto',
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    backgroundColor: '#ffffff'
  });
  sanitizePdfCaptureElement(clone);
  document.body.appendChild(clone);

  try {
    await html2pdf().from(clone).set({
      margin: 8,
      filename: `${filenamePrefix}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: createHtml2CanvasOptions(captureId, 1.5, Math.max(captureWidth, captureDimensions.width), captureDimensions.height),
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).save();
  } catch (err) {
    console.error('Error exporting page PDF:', err);
    window.print();
  } finally {
    clone.remove();
  }
}
