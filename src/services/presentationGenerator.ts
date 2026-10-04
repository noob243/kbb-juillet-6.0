import pptxgen from 'pptxgenjs';

export async function generateCabinetPptx(): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Cabinet KBB SARL';
  pptx.company = 'Cabinet d\'Avocats KBB SARL';
  pptx.title = 'Fonctionnement, Bonnes Pratiques & Scalabilité - ERP KBB';
  pptx.subject = 'Présentation Institutionnelle et Technique du Logiciel Métier';

  const NAVY = '0F2B48';
  const PRIMARY_BLUE = '15447C';
  const ACCENT_GOLD = 'D97706';
  const DARK_BG = '0A192F';
  const LIGHT_BG = 'F8FAFC';
  const CARD_BG = 'FFFFFF';
  const TEXT_DARK = '1E293B';
  const TEXT_MUTED = '64748B';
  const EMERALD = '059669';
  const ROSE = 'E11D48';

  // SLIDE 1: Page de Garde
  {
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };

    // Accent header line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 0.8, w: 1.5, h: 0.08,
      fill: { color: ACCENT_GOLD }
    });

    slide.addText('CABINET D\'AVOCATS KBB SARL', {
      x: 0.8, y: 1.1, w: 10.0, h: 0.4,
      fontSize: 16, fontFace: 'Calibri', color: '93C5FD', bold: true, charSpacing: 3
    });

    slide.addText('Plateforme Intégrée de Gestion Métier\n& Traçabilité Juridique', {
      x: 0.8, y: 1.7, w: 11.5, h: 1.8,
      fontSize: 34, fontFace: 'Calibri', color: 'FFFFFF', bold: true, lineSpacing: 42
    });

    slide.addText('Guide de Fonctionnement, Bonnes Pratiques d\'Usage & Perspectives de Scalabilité', {
      x: 0.8, y: 3.7, w: 11.0, h: 0.6,
      fontSize: 18, fontFace: 'Calibri', color: 'CBD5E1'
    });

    // Info cards at bottom
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 5.0, w: 3.4, h: 1.4, rectRadius: 0.1,
      fill: { color: '172554' }, line: { color: '1E40AF', width: 1 }
    });
    slide.addText('MODULES MÉTIER', {
      x: 1.0, y: 5.2, w: 3.0, h: 0.3,
      fontSize: 11, fontFace: 'Calibri', color: ACCENT_GOLD, bold: true
    });
    slide.addText('Clients, Dossiers, Procédures,\nAgenda, Facturation, Fournisseurs', {
      x: 1.0, y: 5.55, w: 3.0, h: 0.7,
      fontSize: 12, fontFace: 'Calibri', color: 'E2E8F0'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.6, y: 5.0, w: 3.4, h: 1.4, rectRadius: 0.1,
      fill: { color: '172554' }, line: { color: '1E40AF', width: 1 }
    });
    slide.addText('SÉCURITÉ & AUDIT', {
      x: 4.8, y: 5.2, w: 3.0, h: 0.3,
      fontSize: 11, fontFace: 'Calibri', color: '6EE7B7', bold: true
    });
    slide.addText('RBAC Granulaire, Règle stricte\nde suppression & Journal d\'audit', {
      x: 4.8, y: 5.55, w: 3.0, h: 0.7,
      fontSize: 12, fontFace: 'Calibri', color: 'E2E8F0'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.4, y: 5.0, w: 3.8, h: 1.4, rectRadius: 0.1,
      fill: { color: '172554' }, line: { color: '1E40AF', width: 1 }
    });
    slide.addText('ARCHITECTURE CLOUD', {
      x: 8.6, y: 5.2, w: 3.4, h: 0.3,
      fontSize: 11, fontFace: 'Calibri', color: '93C5FD', bold: true
    });
    slide.addText('Firestore temps réel, Haute\nDisponibilité & Scalabilité multitenant', {
      x: 8.6, y: 5.55, w: 3.4, h: 0.7,
      fontSize: 12, fontFace: 'Calibri', color: 'E2E8F0'
    });
  }

  // SLIDE 2: Cartographie & Fonctionnement Global
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('1. CARTOGRAPHIE FONCTIONNELLE', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Fonctionnement Global de l\'Application KBB', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    const modules = [
      {
        title: 'Clients & Mandataires',
        desc: 'Fiches 360°, immatriculation légale (RCCM, ID. NAT, N° IMPÔT), sièges multiples et contacts clés.',
        badge: 'SOCLE CLIENT', color: '1E3A8A'
      },
      {
        title: 'Dossiers & Procédures',
        desc: 'Suivi chronologique des instances, constitution des pièces, calendrier des débats et conclusions.',
        badge: 'CŒUR DE MÉTIER', color: '0D9488'
      },
      {
        title: 'Agenda & Audiences',
        desc: 'Calendrier partagé des audiences, rappels automatiques et planification des diligences judiciaires.',
        badge: 'ORGANISATION', color: 'B45309'
      },
      {
        title: 'Facturation & Honoraires',
        desc: 'Suivi des forfaits et temps passés, émissions de devis, factures et suivi strict des encaissements.',
        badge: 'FINANCE', color: '047857'
      },
      {
        title: 'Chat & Correspondance',
        desc: 'Messagerie sécurisée interne, canaux thématiques, registre d\'arrivée et départ des courriers officiels.',
        badge: 'COLLABORATION', color: '6D28D9'
      },
      {
        title: 'Matrice de Rôles & Audit',
        desc: 'Gestion granulaire des permissions, habilitation de suppression nominative et traçabilité inviolable.',
        badge: 'GOUVERNANCE', color: 'BE123C'
      }
    ];

    modules.forEach((mod, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 0.8 + col * 3.85;
      const y = 1.8 + row * 2.4;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 3.6, h: 2.15, rectRadius: 0.08,
        fill: { color: CARD_BG }, line: { color: 'E2E8F0', width: 1 }
      });

      slide.addShape(pptx.ShapeType.rect, {
        x, y, w: 0.12, h: 2.15,
        fill: { color: mod.color }
      });

      slide.addText(mod.badge, {
        x: x + 0.3, y: y + 0.2, w: 3.0, h: 0.25,
        fontSize: 9, fontFace: 'Calibri', color: mod.color, bold: true, charSpacing: 1.5
      });

      slide.addText(mod.title, {
        x: x + 0.3, y: y + 0.5, w: 3.0, h: 0.4,
        fontSize: 14, fontFace: 'Calibri', color: NAVY, bold: true
      });

      slide.addText(mod.desc, {
        x: x + 0.3, y: y + 0.95, w: 3.0, h: 1.05,
        fontSize: 11, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 15
      });
    });
  }

  // SLIDE 3: Module Fiche Client & Immatriculation Légale
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('2. ENREGISTREMENT CLIENT & IDENTIFIANTS', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Fiche Client Complète & Section Immatriculation', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    // Left card: Structure of client form
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.8, w: 5.6, h: 4.8, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: 'CBD5E1', width: 1 }
    });

    slide.addText('Nouveauté : Bloc Immatriculation Légale', {
      x: 1.1, y: 2.1, w: 5.0, h: 0.35,
      fontSize: 15, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true
    });

    slide.addText('La fiche client intègre désormais la section d\'immatriculation obligatoire pour garantir la conformité juridique et fiscale du cabinet :', {
      x: 1.1, y: 2.5, w: 5.0, h: 0.8,
      fontSize: 12, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 16
    });

    const fields = [
      { name: 'RCCM', desc: 'Registre du Commerce et du Crédit Mobilier (ex: CD/KIN/RCCM/...)', color: '1E40AF' },
      { name: 'ID. NAT', desc: 'Numéro d\'Identification Nationale officiel (ex: 01-83-N-...)', color: '047857' },
      { name: 'N° IMPÔT', desc: 'Numéro fiscal auprès de la Direction Générale des Impôts (DGI)', color: 'B45309' }
    ];

    fields.forEach((f, idx) => {
      const fy = 3.4 + idx * 1.0;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.1, y: fy, w: 5.0, h: 0.85, rectRadius: 0.06,
        fill: { color: 'F1F5F9' }, line: { color: 'E2E8F0', width: 1 }
      });
      slide.addText(f.name, {
        x: 1.3, y: fy + 0.12, w: 1.6, h: 0.3,
        fontSize: 12, fontFace: 'Calibri', color: f.color, bold: true
      });
      slide.addText(f.desc, {
        x: 1.3, y: fy + 0.42, w: 4.6, h: 0.35,
        fontSize: 10, fontFace: 'Calibri', color: TEXT_MUTED
      });
    });

    // Right card: Process and impact
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.8, y: 1.8, w: 5.4, h: 4.8, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: 'CBD5E1', width: 1 }
    });

    slide.addText('Bénéfices Opérationnels Immédiats', {
      x: 7.1, y: 2.1, w: 4.8, h: 0.35,
      fontSize: 15, fontFace: 'Calibri', color: NAVY, bold: true
    });

    const benefits = [
      'Sécurisation des actes judiciaires : Mention exacte des identifiants dans les exploits et assignations.',
      'Facturation conforme OHADA : Émission immédiate de factures d\'honoraires avec mentions fiscales légales.',
      'Traçabilité dans toute l\'application : Affichage de l\'immatriculation dans le tiroir de détails et les exports.',
      'Synchronisation Firestore native : Persistance en temps réel avec validation automatique de schéma.'
    ];

    benefits.forEach((b, idx) => {
      const by = 2.65 + idx * 0.95;
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 7.1, y: by + 0.05, w: 0.18, h: 0.18,
        fill: { color: ACCENT_GOLD }
      });
      slide.addText(b, {
        x: 7.45, y: by, w: 4.4, h: 0.8,
        fontSize: 11.5, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 15
      });
    });
  }

  // SLIDE 4: Sécurité & Matrice de Rôles (RBAC) - Règle de Suppression
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('3. MATRICE DES RÔLES & GOUVERNANCE', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Politique Stricte de Suppression (Opt-In Obligatoire)', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    // Principle banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.8, w: 11.4, h: 1.1, rectRadius: 0.08,
      fill: { color: 'FFF1F2' }, line: { color: 'FECDD3', width: 1.5 }
    });
    slide.addText('RÈGLE DE SÉCURITÉ MAJEURE : DROIT DE SUPPRESSION NON ACCORDÉ PAR DÉFAUT', {
      x: 1.1, y: 2.0, w: 10.8, h: 0.3,
      fontSize: 11, fontFace: 'Calibri', color: ROSE, bold: true, charSpacing: 1
    });
    slide.addText('Contrairement aux droits de lecture et d\'écriture, le privilège de suppression définitive (clients, dossiers, pièces, factures) doit obligatoirement faire l\'objet d\'une attribution expresse et nominative dans la matrice des rôles.', {
      x: 1.1, y: 2.35, w: 10.8, h: 0.5,
      fontSize: 11.5, fontFace: 'Calibri', color: TEXT_DARK
    });

    // 3 columns
    const rbacCols = [
      {
        title: 'Principe du Moindre Privilège',
        points: [
          'Aucun rôle par défaut (même Avocat ou Associé) ne reçoit automatiquement le droit de supprimer.',
          'Prévient les effacements accidentels ou malveillants d\'archives judiciaires sensibles.'
        ],
        badge: 'PROTECTION', color: PRIMARY_BLUE
      },
      {
        title: 'Boutons Sécurisés & Toast Alert',
        points: [
          'Si le droit n\'est pas octroyé, les boutons de suppression sont désactivés ou verrouillés.',
          'Une notification claire informe l\'utilisateur que son profil ne dispose pas de cette habilitation.'
        ],
        badge: 'UI SÉCURISÉE', color: '9333EA'
      },
      {
        title: 'Piste d\'Audit Intégrale',
        points: [
          'Chaque suppression accordée génère un enregistrement inaltérable dans le journal d\'audit.',
          'Horodatage précis, identité de l\'exécutant et référence de l\'élément supprimé.'
        ],
        badge: 'CONFORMITÉ', color: '059669'
      }
    ];

    rbacCols.forEach((col, idx) => {
      const x = 0.8 + idx * 3.9;
      const y = 3.2;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 3.6, h: 3.4, rectRadius: 0.08,
        fill: { color: CARD_BG }, line: { color: 'E2E8F0', width: 1 }
      });

      slide.addText(col.badge, {
        x: x + 0.3, y: y + 0.3, w: 3.0, h: 0.25,
        fontSize: 9, fontFace: 'Calibri', color: col.color, bold: true, charSpacing: 1.5
      });

      slide.addText(col.title, {
        x: x + 0.3, y: y + 0.6, w: 3.0, h: 0.45,
        fontSize: 13, fontFace: 'Calibri', color: NAVY, bold: true
      });

      col.points.forEach((pt, pIdx) => {
        const py = y + 1.2 + pIdx * 1.0;
        slide.addShape(pptx.ShapeType.rect, {
          x: x + 0.3, y: py + 0.08, w: 0.1, h: 0.1,
          fill: { color: col.color }
        });
        slide.addText(pt, {
          x: x + 0.55, y: py, w: 2.75, h: 0.9,
          fontSize: 11, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 14
        });
      });
    });
  }

  // SLIDE 5: Suivi des Procédures Judiciaires & Audiences
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('4. PILOTAGE DES AFFAIRES CONTENTIEUSES', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Workflow Opérationnel des Procédures & Audiences', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    const workflowSteps = [
      { step: 'ÉTAPE 1', title: 'Création du Dossier', desc: 'Enregistrement du client avec ses identifiants légaux, qualification juridique du litige et affectation d\'un avocat référent.' },
      { step: 'ÉTAPE 2', title: 'Actes & Instances', desc: 'Définition des juridictions compétentes (Tribunal de Commerce, Cour d\'Appel, TGI), rédaction et téléversement des conclusions.' },
      { step: 'ÉTAPE 3', title: 'Agenda des Audiences', desc: 'Programmation des dates de plaidoirie ou de mise en état. Synchronisation avec le calendrier de la juridiction.' },
      { step: 'ÉTAPE 4', title: 'Clôture & Recouvrement', desc: 'Notification du jugement ou de l\'arrêt, archivage du dossier et émission de la facture de clôture ou solde d\'honoraires.' }
    ];

    workflowSteps.forEach((s, idx) => {
      const x = 0.8 + idx * 2.9;
      const y = 2.0;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 2.7, h: 4.4, rectRadius: 0.08,
        fill: { color: CARD_BG }, line: { color: 'CBD5E1', width: 1 }
      });

      slide.addShape(pptx.ShapeType.rect, {
        x, y, w: 2.7, h: 0.5,
        fill: { color: idx % 2 === 0 ? PRIMARY_BLUE : NAVY }
      });

      slide.addText(s.step, {
        x: x + 0.2, y: y + 0.12, w: 2.3, h: 0.3,
        fontSize: 11, fontFace: 'Calibri', color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(s.title, {
        x: x + 0.25, y: y + 0.8, w: 2.2, h: 0.6,
        fontSize: 14, fontFace: 'Calibri', color: NAVY, bold: true
      });

      slide.addText(s.desc, {
        x: x + 0.25, y: y + 1.5, w: 2.2, h: 2.6,
        fontSize: 11.5, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 16
      });
    });
  }

  // SLIDE 6: Facturation, Honoraires & Recouvrement
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('5. GESTION FINANCIÈRE & HONORAIRES', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Facturation, Suivi des Règlements & Conformité Comptable', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    // 2 large panels
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.8, w: 5.6, h: 4.8, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: 'CBD5E1', width: 1 }
    });

    slide.addText('Fonctionnalités Clés du Module Facturation', {
      x: 1.1, y: 2.1, w: 5.0, h: 0.35,
      fontSize: 15, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true
    });

    const finPoints = [
      'Modalités multiples : Forfait global, facturation horaire ou honoraire de résultat.',
      'Gestion des provisions : Appel de fonds initial avant toute diligence de procédure.',
      'Suivi des encaissements : Statuts clairs (Payé, Partiel, En attente, En retard).',
      'Export comptable & PDF : Génération de documents formels avec en-tête officiel du cabinet.'
    ];

    finPoints.forEach((p, idx) => {
      const py = 2.65 + idx * 0.9;
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 1.1, y: py + 0.05, w: 0.15, h: 0.15,
        fill: { color: PRIMARY_BLUE }
      });
      slide.addText(p, {
        x: 1.4, y: py, w: 4.7, h: 0.75,
        fontSize: 11.5, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 15
      });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.8, y: 1.8, w: 5.4, h: 4.8, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: 'CBD5E1', width: 1 }
    });

    slide.addText('Indicateurs Financiers & Pilotage', {
      x: 7.1, y: 2.1, w: 4.8, h: 0.35,
      fontSize: 15, fontFace: 'Calibri', color: NAVY, bold: true
    });

    const kpis = [
      { label: 'Chiffre d\'Affaires Engagé', val: 'Visualisation immédiate du total facturé sur le trimestre/exercice.' },
      { label: 'Taux de Recouvrement', val: 'Mesure du délai moyen de règlement et relances automatiques.' },
      { label: 'Rentabilité par Dossier', val: 'Comparaison entre temps d\'avocats consacrés et honoraires perçus.' }
    ];

    kpis.forEach((k, idx) => {
      const ky = 2.65 + idx * 1.25;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.1, y: ky, w: 4.8, h: 1.05, rectRadius: 0.06,
        fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }
      });
      slide.addText(k.label, {
        x: 7.3, y: ky + 0.15, w: 4.4, h: 0.3,
        fontSize: 12, fontFace: 'Calibri', color: ACCENT_GOLD, bold: true
      });
      slide.addText(k.val, {
        x: 7.3, y: ky + 0.45, w: 4.4, h: 0.5,
        fontSize: 11, fontFace: 'Calibri', color: TEXT_MUTED
      });
    });
  }

  // SLIDE 7: Bonnes Pratiques d'Usage Quotidien
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('6. RECOMMANDATIONS OPÉRATIONNELLES', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Bonnes Pratiques d\'Usage Quotidien pour les Équipes', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    const practices = [
      {
        num: '01',
        title: 'Exhaustivité à l\'Enregistrement',
        text: 'Renseigner systématiquement dès le premier contact l\'immatriculation complète (RCCM, ID. NAT, N° IMPÔT) et l\'adresse du siège afin d\'éviter des blocages lors de la rédaction d\'actes.'
      },
      {
        num: '02',
        title: 'Gestion Prudente des Suppressions',
        text: 'Privilégier l\'archivage des dossiers plutôt que la suppression définitive. La suppression doit être réservée aux erreurs manifestes de saisie et validée par un associé.'
      },
      {
        num: '03',
        title: 'Mise à Jour Rigoureuse de l\'Agenda',
        text: 'Reporter immédiatement tout renvoi ou décision d\'audience dans l\'agenda partagé afin que les collaborateurs et associés disposent d\'une visibilité en temps réel.'
      },
      {
        num: '04',
        title: 'Respect des Rôles & Confidentialité',
        text: 'Ne jamais partager ses identifiants personnels. Les droits accordés dans la matrice RBAC engagent la responsabilité professionnelle de l\'utilisateur dans le journal d\'audit.'
      }
    ];

    practices.forEach((bp, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 5.85;
      const y = 1.8 + row * 2.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 5.6, h: 2.25, rectRadius: 0.08,
        fill: { color: CARD_BG }, line: { color: 'E2E8F0', width: 1 }
      });

      slide.addText(bp.num, {
        x: x + 0.3, y: y + 0.2, w: 0.8, h: 0.4,
        fontSize: 20, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true
      });

      slide.addText(bp.title, {
        x: x + 1.1, y: y + 0.22, w: 4.2, h: 0.35,
        fontSize: 14, fontFace: 'Calibri', color: NAVY, bold: true
      });

      slide.addText(bp.text, {
        x: x + 0.3, y: y + 0.7, w: 5.0, h: 1.4,
        fontSize: 11.5, fontFace: 'Calibri', color: TEXT_DARK, lineSpacing: 16
      });
    });
  }

  // SLIDE 8: Scalabilité - Architecture Système & Performance (Slide 1/2)
  {
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };

    slide.addText('7. ÉVOLUTION & SCALABILITÉ (1/2)', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: ACCENT_GOLD, bold: true, charSpacing: 2
    });
    slide.addText('Scalabilité Technique & Résilience de l\'Infrastructure', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: 'FFFFFF', bold: true
    });

    const techPillars = [
      {
        title: 'Modèle de Données Distribué (Firestore)',
        desc: 'Architecture NoSQL haute disponibilité sans point unique de défaillance (SPOF). Capacité de montée en charge jusqu\'à des dizaines de milliers de requêtes par seconde sans dégradation.',
        badge: 'HAUTE CONCURRENCE', color: '38BDF8'
      },
      {
        title: 'Stratégie Cache & Mode Déconnecté',
        desc: 'Support hors-ligne natif avec synchronisation bidirectionnelle dès reconnexion réseau. Idéal pour les avocats en déplacement au tribunal ou en juridiction de province.',
        badge: 'OFFLINE-FIRST', color: '34D399'
      },
      {
        title: 'Microservices & Cloud Functions Serverless',
        desc: 'Découplage des traitements lourds (génération de rapports PDF, exports comptables volumineux, indexation de documents) via des fonctions sans serveur auto-dimensionnées.',
        badge: 'SERVERLESS', color: 'F472B6'
      },
      {
        title: 'Partitionnement & Indexation Automatique',
        desc: 'Index composites Firestore optimisés par client, statut et juridiction pour garantir des temps de réponse inférieurs à 100ms même avec 500 000 dossiers actifs.',
        badge: 'OPTIMISATION', color: 'FBBF24'
      }
    ];

    techPillars.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 5.85;
      const y = 1.8 + row * 2.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 5.6, h: 2.25, rectRadius: 0.08,
        fill: { color: '172554' }, line: { color: '1E40AF', width: 1 }
      });

      slide.addText(p.badge, {
        x: x + 0.3, y: y + 0.2, w: 3.5, h: 0.25,
        fontSize: 9, fontFace: 'Calibri', color: p.color, bold: true, charSpacing: 1.5
      });

      slide.addText(p.title, {
        x: x + 0.3, y: y + 0.5, w: 5.0, h: 0.35,
        fontSize: 14, fontFace: 'Calibri', color: 'FFFFFF', bold: true
      });

      slide.addText(p.desc, {
        x: x + 0.3, y: y + 0.95, w: 5.0, h: 1.15,
        fontSize: 11, fontFace: 'Calibri', color: 'CBD5E1', lineSpacing: 15
      });
    });
  }

  // SLIDE 9: Scalabilité - Croissance Métier & Intégrations Futures (Slide 2/2)
  {
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };

    slide.addText('8. ÉVOLUTION & SCALABILITÉ (2/2)', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: ACCENT_GOLD, bold: true, charSpacing: 2
    });
    slide.addText('Scalabilité Métier : Multi-Sites, IA & Écosystème', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: 'FFFFFF', bold: true
    });

    const businessPillars = [
      {
        title: 'Déploiement Multi-Bureaux (Bureaux Régionaux)',
        desc: 'Partitionnement étanche des données par cabinet secondaire (Kinshasa, Lubumbashi, Kolwezi, Matadi) avec consolidation des indicateurs au niveau de la Direction Associée.',
        tag: 'EXPANSION GÉOGRAPHIQUE', color: '60A5FA'
      },
      {
        title: 'Assistance IA Générative (Otshudi AI / Gemini)',
        desc: 'Montée en puissance de l\'intelligence artificielle pour la recherche de jurisprudence OHADA, l\'analyse de contrats complexes et la pré-rédaction d\'actes de procédure.',
        tag: 'INTELLIGENCE ARTIFICIELLE', color: 'A78BFA'
      },
      {
        title: 'Passerelles Bancaires & Portails Tribunaux',
        desc: 'Interconnexion API directe avec les systèmes de paiement bancaires (relevés automatiques des honoraires) et les plateformes numériques de greffe pour le dépôt électronique.',
        tag: 'INTERCONNEXION API', color: '34D399'
      },
      {
        title: 'Portail Collaboratif Client Sécurisé',
        desc: 'Espace extranet dédié aux entreprises clientes pour le suivi en temps réel de leurs dossiers, consultation des conclusions et règlement en ligne des factures.',
        tag: 'RELATION CLIENT 2.0', color: 'F472B6'
      }
    ];

    businessPillars.forEach((bp, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 5.85;
      const y = 1.8 + row * 2.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 5.6, h: 2.25, rectRadius: 0.08,
        fill: { color: '172554' }, line: { color: '1E40AF', width: 1 }
      });

      slide.addText(bp.tag, {
        x: x + 0.3, y: y + 0.2, w: 3.5, h: 0.25,
        fontSize: 9, fontFace: 'Calibri', color: bp.color, bold: true, charSpacing: 1.5
      });

      slide.addText(bp.title, {
        x: x + 0.3, y: y + 0.5, w: 5.0, h: 0.35,
        fontSize: 14, fontFace: 'Calibri', color: 'FFFFFF', bold: true
      });

      slide.addText(bp.desc, {
        x: x + 0.3, y: y + 0.95, w: 5.0, h: 1.15,
        fontSize: 11, fontFace: 'Calibri', color: 'CBD5E1', lineSpacing: 15
      });
    });
  }

  // SLIDE 10: Synthèse & Prochaines Étapes
  {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };

    slide.addText('SYNTHÈSE EXÉCUTIVE', {
      x: 0.8, y: 0.6, w: 8.0, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', color: PRIMARY_BLUE, bold: true, charSpacing: 2
    });
    slide.addText('Feuille de Route & Conclusion Opérationnelle', {
      x: 0.8, y: 0.95, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', color: NAVY, bold: true
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.8, w: 11.4, h: 4.8, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: 'CBD5E1', width: 1 }
    });

    const summaryPoints = [
      {
        title: 'Modernisation Complète du Cabinet KBB',
        desc: 'L\'application offre une plateforme unifiée alliant rigueur juridique, gestion comptable fluide et traçabilité inviolable.',
        icon: '⚖️'
      },
      {
        title: 'Conformité d\'Immatriculation Immédiate',
        desc: 'L\'ajout des champs RCCM, ID. NAT et N° IMPÔT sécurise les dossiers clients et répond aux exigences légales de la RDC et de l\'OHADA.',
        icon: '🏛️'
      },
      {
        title: 'Sécurité RBAC Renforcée & Non-Répudiation',
        desc: 'Le droit de suppression obligatoirement octroyé garantit la pérennité des archives sans risque de perte accidentelle.',
        icon: '🔒'
      },
      {
        title: 'Prêt pour la Montée en Charge',
        desc: 'Grâce à Cloud Firestore et à une architecture modulaire, le cabinet dispose d\'un outil prêt pour ouvrir de nouveaux bureaux et servir des centaines de clients corporatifs.',
        icon: '🚀'
      }
    ];

    summaryPoints.forEach((sp, idx) => {
      const y = 2.1 + idx * 1.05;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.1, y, w: 10.8, h: 0.9, rectRadius: 0.06,
        fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }
      });
      slide.addText(`${sp.icon}  ${sp.title}`, {
        x: 1.3, y: y + 0.12, w: 10.4, h: 0.3,
        fontSize: 13, fontFace: 'Calibri', color: NAVY, bold: true
      });
      slide.addText(sp.desc, {
        x: 1.3, y: y + 0.45, w: 10.4, h: 0.35,
        fontSize: 11, fontFace: 'Calibri', color: TEXT_DARK
      });
    });
  }

  // Trigger browser download
  await pptx.writeFile({ fileName: 'Cabinet_KBB_Presentation_Application_Scalabilite.pptx' });
}
