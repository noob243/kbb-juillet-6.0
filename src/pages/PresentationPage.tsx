import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import { generateCabinetPptx } from '../services/presentationGenerator';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  ShieldAlert, 
  FileText, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  Lock, 
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface PresentationPageProps {
  onAddToast?: (type: 'success' | 'error', message: string) => void;
}

export const PresentationPage: FC<PresentationPageProps> = ({ onAddToast }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await generateCabinetPptx();
      onAddToast?.('success', 'Présentation PowerPoint (.pptx) téléchargée avec succès !');
    } catch (err) {
      console.error(err);
      onAddToast?.('error', 'Échec de génération du fichier PowerPoint.');
    } finally {
      setIsDownloading(false);
    }
  };

  const slides = [
    // Slide 1
    {
      id: 1,
      badge: 'CABINET D\'AVOCATS KBB SARL',
      title: 'Plateforme Intégrée de Gestion Métier & Traçabilité Juridique',
      subtitle: 'Guide de Fonctionnement, Bonnes Pratiques d\'Usage & Perspectives de Scalabilité',
      isDark: true,
      content: (
        <div className="space-y-8">
          <div className="border-l-4 border-amber-500 pl-4 py-1">
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Présentation exécutive et technique du progiciel de gestion intégrée du Cabinet d'Avocats KBB SARL. 
              Cet outil centralise le cycle de vie des dossiers contentieux et de conseil, la facturation des honoraires, 
              la conformité légale et le contrôle des accès par rôles (RBAC).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Socle Juridique 360°</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fiches clients complètes avec immatriculation légale (RCCM, ID. NAT, N° IMPÔT), rattachement des dossiers et actes de procédure.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Gouvernance & RBAC</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Matrice des rôles sécurisée : suppression soumise à une habilitation expresse et journal d'audit inviolable.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Haute Scalabilité Cloud</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Architecture Cloud Firestore temps réel, prête pour le déploiement multi-bureaux et l'interconnexion IA Gemini.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 2
    {
      id: 2,
      badge: '1. CARTOGRAPHIE FONCTIONNELLE',
      title: 'Fonctionnement Global de l\'Application KBB',
      subtitle: 'Interconnexion fluide entre les 6 pôles métier du cabinet',
      isDark: false,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              badge: 'SOCLE CLIENT',
              title: 'Clients & Mandataires',
              desc: 'Enregistrement centralisé, immatriculation (RCCM, ID. NAT, N° IMPÔT), adresses des sièges et gestion des contacts décisionnaires.',
              border: 'border-blue-500'
            },
            {
              badge: 'CŒUR DE MÉTIER',
              title: 'Dossiers & Procédures',
              desc: 'Suivi chronologique des affaires en justice, actes d\'assignation, conclusions, pièces communiquées et juridictions saisies.',
              border: 'border-teal-500'
            },
            {
              badge: 'ORGANISATION',
              title: 'Agenda & Audiences',
              desc: 'Calendrier partagé des audiences au tribunal, synchronisation des charges des avocats et alertes d\'échéance légale.',
              border: 'border-amber-500'
            },
            {
              badge: 'FINANCE',
              title: 'Facturation & Honoraires',
              desc: 'Forfaits, taux horaires, provisions et débours. Suivi précis des règlements et émissions de pièces comptables conformes.',
              border: 'border-emerald-500'
            },
            {
              badge: 'COLLABORATION',
              title: 'Chat & Correspondances',
              desc: 'Canaux de discussion internes chiffrés et registre numéroté d\'arrivée et de départ des courriers officiels.',
              border: 'border-purple-500'
            },
            {
              badge: 'GOUVERNANCE',
              title: 'Matrice RBAC & Audit',
              desc: 'Permissions granulaires par utilisateur, habilitation nominative de suppression et historique inviolable des opérations.',
              border: 'border-rose-500'
            }
          ].map((m, idx) => (
            <div key={idx} className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${m.border.replace('border-', 'bg-')}`}></div>
              <div>
                <span className="text-3xs font-black uppercase tracking-widest text-slate-400 mb-1 block">{m.badge}</span>
                <h4 className="text-base font-bold text-slate-900 mb-2">{m.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )
    },

    // Slide 3
    {
      id: 3,
      badge: '2. ENREGISTREMENT CLIENT & IDENTIFIANTS',
      title: 'Fiche Client Complète & Section Immatriculation',
      subtitle: 'Sécurisation juridique des actes grâce à l\'enregistrement des registres officiels',
      isDark: false,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Nouveauté : Bloc Immatriculation Légale</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Le formulaire d'enregistrement client intègre désormais la section réglementaire indispensable pour l'établissement des actes judiciaires et des factures conformes :
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-3">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold text-xs rounded">RCCM</span>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Registre du Commerce et du Crédit Mobilier</h5>
                  <p className="text-[11px] text-slate-500">Immatriculation commerciale officielle (ex: CD/KIN/RCCM/...).</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-3">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-xs rounded">ID. NAT</span>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Identification Nationale</h5>
                  <p className="text-[11px] text-slate-500">Numéro national d'identification officiel de la personne morale.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-3">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono font-bold text-xs rounded">N° IMPÔT</span>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Numéro Fiscal (DGI)</h5>
                  <p className="text-[11px] text-slate-500">Identifiant d'imposition auprès de la Direction Générale des Impôts.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-amber-400 font-mono text-3xs font-black uppercase tracking-widest block mb-2">BÉNÉFICES OPÉRATIONNELS</span>
              <h4 className="text-lg font-bold text-white mb-4">Conformité OHADA & Sécurité des Actes</h4>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Mentions légales automatiques :</strong> Évite les exceptions de nullité lors des assignations en justice pour défaut d'immatriculation du demandeur.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Facturation sans litige :</strong> Les factures d'honoraires intègrent immédiatement les références fiscales requises par les directions financières clientes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Tiroir de détails interactif :</strong> Consultation immédiate de ces 3 identifiants dans la vue rapide du client sur l'interface.</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-3xs font-mono text-slate-400">
              Synchronisé en temps réel avec la collection Firestore <code>clients</code>.
            </div>
          </div>
        </div>
      )
    },

    // Slide 4
    {
      id: 4,
      badge: '3. MATRICE DES RÔLES & SÉCURITÉ',
      title: 'Politique Stricte de Suppression (Opt-In Nominatif)',
      subtitle: 'Protection catégorique contre les pertes d\'archives judiciaires',
      isDark: false,
      content: (
        <div className="space-y-6">
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950">RÈGLE DE GOUVERNANCE MAJEURE : DROIT DE SUPPRESSION NON ATTRIBUÉ PAR DÉFAUT</h4>
              <p className="text-xs text-rose-850 mt-0.5 leading-relaxed">
                Le droit de suppression définitive d'un enregistrement (client, dossier, acte, facture) doit être <strong>expressément et individuellement accordé</strong> dans la matrice des rôles par un administrateur. Aucun rôle standard ne le possède par défaut.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xs font-black uppercase tracking-widest text-indigo-600 block mb-1">1. MINIMALISME DES PRIVILÈGES</span>
              <h5 className="font-bold text-slate-900 text-sm mb-2">Moindre Privilège Actif</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tous les nouveaux collaborateurs reçoivent des accès de consultation et modification, mais sont protégés contre toute suppression intempestive.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xs font-black uppercase tracking-widest text-amber-600 block mb-1">2. INTERFACE VERROUILLÉE</span>
              <h5 className="font-bold text-slate-900 text-sm mb-2">Boutons Protégés & Alertes</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sans ce droit, les boutons de suppression s'affichent grisés et inactifs. Toute tentative déclenche une notification explicite d'accès refusé.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xs font-black uppercase tracking-widest text-emerald-600 block mb-1">3. JOURNAL D'AUDIT</span>
              <h5 className="font-bold text-slate-900 text-sm mb-2">Non-Répudiation Complète</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chaque suppression légitimement exécutée est inscrite dans le journal d'audit avec l'horodatage, l'e-mail de l'opérateur et l'identifiant de la ressource.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 5
    {
      id: 5,
      badge: '4. PILOTAGE DES AFFAIRES CONTENTIEUSES',
      title: 'Workflow des Procédures & Suivi des Audiences',
      subtitle: 'De l\'enrôlement initial jusqu\'à la signification de la décision exécutoire',
      isDark: false,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Enrôlement & Ouverture',
              desc: 'Création du dossier avec rattachement immédiat du client immatriculé. Définition des parties adverses et des juridictions compétentes.',
              color: 'bg-blue-600'
            },
            {
              step: '02',
              title: 'Actes & Conclusions',
              desc: 'Rédaction des mémoires, assignations et requêtes. Dépôt des pièces cotées au greffe et suivi de l\'état d\'avancement de la procédure.',
              color: 'bg-indigo-600'
            },
            {
              step: '03',
              title: 'Audiences & Débats',
              desc: 'Programmation dans l\'agenda collaboratif. Notification des renvois, des plaidoiries et des délibérés avec compte rendu d\'audience.',
              color: 'bg-teal-600'
            },
            {
              step: '04',
              title: 'Signification & Clôture',
              desc: 'Obtention de la grosse et du certificat de non-recours. Archivage électronique du dossier et solde de la facturation d\'honoraires.',
              color: 'bg-emerald-600'
            }
          ].map((st, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className={`w-8 h-8 rounded-lg ${st.color} text-white font-mono font-bold text-xs flex items-center justify-center mb-3`}>
                  {st.step}
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">{st.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )
    },

    // Slide 6
    {
      id: 6,
      badge: '5. GESTION FINANCIÈRE & HONORAIRES',
      title: 'Facturation, Règlements & Conformité Comptable',
      subtitle: 'Maîtrise de la trésorerie et visibilité financière du cabinet',
      isDark: false,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-sm text-indigo-750 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span>Modalités de Facturation du Cabinet</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <strong>Honoraires au Forfait :</strong> Définis à l'ouverture du dossier pour une mission contentieuse ou de conseil globale.
              </p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <strong>Honoraires au Temps Passé :</strong> Saisie des diligences par chaque avocat selon son taux horaire spécifique.
              </p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <strong>Provisions sur Frais :</strong> Appel de provision avant tout acte d'huissier, déplacement ou droit de greffe.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-sm text-indigo-750 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Suivi & Recouvrement</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <strong>Statuts de Règlements :</strong> Visualisation en temps réel (En attente, Partiel, Soldé, En retard).
              </p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <strong>Relances d'Impayés :</strong> Identification immédiate des retards avec édition des courriers de relance d'honoraires.
              </p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <strong>Exports PDF & Tableaux :</strong> Édition des relevés comptables pour les associés et les experts-comptables.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 7
    {
      id: 7,
      badge: '6. RECOMMANDATIONS OPÉRATIONNELLES',
      title: 'Bonnes Pratiques d\'Usage Quotidien pour les Équipes',
      subtitle: 'Les 4 réflexes pour optimiser la productivité et la sécurité des données',
      isDark: false,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              num: '01',
              title: 'Exhaustivité de l\'Immatriculation',
              desc: 'Renseigner systématiquement dès le premier contact client le RCCM, l\'ID. NAT et le N° IMPÔT pour garantir la régularité immédiate des assignations et factures.',
              icon: Building2
            },
            {
              num: '02',
              title: 'Priorité à l\'Archivage sur la Suppression',
              desc: 'Préférer systématiquement le passage d\'un dossier en statut "Archivé" ou "Clôturé" plutôt que sa suppression définitive. La suppression doit être exceptionnelle.',
              icon: ShieldAlert
            },
            {
              num: '03',
              title: 'Mise à Jour Immédiate de l\'Agenda',
              desc: 'Reporter dès l\'issue de l\'audience au palais tout renvoi, délibéré ou date de communication de pièces pour maintenir la vision collective du cabinet.',
              icon: Calendar
            },
            {
              num: '04',
              title: 'Responsabilité des Identifiants RBAC',
              desc: 'Ne jamais partager ses accès ou son mot de passe. Chaque action est consignée dans le journal d\'audit et engage la responsabilité de son titulaire.',
              icon: Lock
            }
          ].map((bp, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                {bp.num}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{bp.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{bp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )
    },

    // Slide 8
    {
      id: 8,
      badge: '7. ÉVOLUTION & SCALABILITÉ (1/2)',
      title: 'Scalabilité Technique & Résilience de l\'Infrastructure',
      subtitle: 'Architecture Cloud conçue pour absorber des volumes massifs de données sans dégradation',
      isDark: true,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-cyan-400 uppercase tracking-widest block mb-1">HAUTE DISPONIBILITÉ</span>
            <h4 className="font-bold text-white text-sm mb-2">Base de Données Firestore Clustérisée</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Modèle distribué NoSQL sans point unique de défaillance (SPOF). Supporte des dizaines de milliers de lectures/écritures concurrentes avec synchronisation temps réel WebSocket multi-appareils.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-1">RÉSILIENCE TERRAIN</span>
            <h4 className="font-bold text-white text-sm mb-2">Architecture Offline-First & Cache Local</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Persistance locale des consultations et des brouillons. Les avocats peuvent travailler en audience ou dans les zones à connectivité instable ; la synchronisation s'effectue automatiquement dès reconnexion.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">INDEXATION DYNAMIQUE</span>
            <h4 className="font-bold text-white text-sm mb-2">Index Composites & Partitionnement</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Indexation optimisée par juridiction, avocat référent et statut de procédure. Temps de réponse maintenus sous les 100 ms même avec un catalogue dépassant les 500 000 dossiers actifs.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-pink-400 uppercase tracking-widest block mb-1">MICROSERVICES SERVERLESS</span>
            <h4 className="font-bold text-white text-sm mb-2">Cloud Functions Découplées</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Déport des traitements lourds (génération de bilans comptables volumineux, compression de pièces jointes judiciaires, exports PDF) vers des fonctions serverless à dimensionnement instantané.
            </p>
          </div>
        </div>
      )
    },

    // Slide 9
    {
      id: 9,
      badge: '8. ÉVOLUTION & SCALABILITÉ (2/2)',
      title: 'Scalabilité Métier : Multi-Sites, IA & Écosystème',
      subtitle: 'Accompagner la croissance du cabinet vers une dimension nationale et panafricaine',
      isDark: true,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-blue-400 uppercase tracking-widest block mb-1">EXPANSION GÉOGRAPHIQUE</span>
            <h4 className="font-bold text-white text-sm mb-2">Déploiement Multi-Bureaux Régionaux</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Partitionnement étanche des dossiers par succursale (Kinshasa, Lubumbashi, Kolwezi, Matadi) avec consolidation automatique des rapports d'activité et des flux financiers au siège.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-purple-400 uppercase tracking-widest block mb-1">INTELLIGENCE ARTIFICIELLE</span>
            <h4 className="font-bold text-white text-sm mb-2">Assistance IA Juridique (Otshudi AI / Gemini)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Recherche instantanée de jurisprudence OHADA, synthèse comparative de contrats complexes et pré-génération de canevas d'actes pour libérer un temps précieux aux avocats seniors.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-teal-400 uppercase tracking-widest block mb-1">INTERCONNEXION API</span>
            <h4 className="font-bold text-white text-sm mb-2">Passerelles Bancaires & Portails Judiciaires</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Rapprochement bancaire automatisé pour le paiement des provisions et interfaçage avec les futurs guichets numériques des tribunaux de commerce et cours d'appel.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
            <span className="text-3xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">EXPÉRIENCE CLIENT 2.0</span>
            <h4 className="font-bold text-white text-sm mb-2">Extranet Client Sécurisé</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Portail dédié pour les directions juridiques clientes : consultation en direct des conclusions d'audience, téléchargement des pièces et validation dématérialisée des conventions d'honoraires.
            </p>
          </div>
        </div>
      )
    },

    // Slide 10
    {
      id: 10,
      badge: 'SYNTHÈSE EXÉCUTIVE',
      title: 'Synthèse des Travaux & Feuille de Route',
      subtitle: 'Excellence opérationnelle, conformité rigoureuse et pérennité technologique',
      isDark: false,
      content: (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Conformité Légale & Fiche Client Immatriculée</h4>
                <p className="text-xs text-slate-600">
                  Intégration du RCCM, ID. NAT et N° IMPÔT dans l'ensemble des formulaires de saisie, d'édition et dans la base de données Firestore.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Gouvernance RBAC & Droit de Suppression Opt-In</h4>
                <p className="text-xs text-slate-600">
                  Le privilège de suppression est désormais découplé des rôles par défaut et doit être explicitement octroyé, avec journalisation d'audit inviolable.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Architecture Robuste & Préparée pour la Croissance</h4>
                <p className="text-xs text-slate-600">
                  Infrastructure Cloud Firestore temps réel, offline-first et prête pour l'expansion régionale multi-bureaux.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const current = slides[currentSlide];

  return (
    <PageContainer
      title="Présentation & Documentation de l'Application"
      description="Support de présentation PowerPoint complet : fonctionnement, bonnes pratiques et scalabilité de l'ERP KBB."
      badge="DOCUMENTATION OFFICIELLE"
      actionButton={
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#15447c] to-indigo-700 hover:from-indigo-800 hover:to-indigo-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Génération du PPTX en cours...' : 'Télécharger la Présentation PowerPoint (.pptx)'}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Presentation Stage Container (16:9 Aspect Ratio Simulation) */}
        <div className={`relative rounded-3xl overflow-hidden shadow-xl border ${
          current.isDark 
            ? 'bg-slate-950 border-slate-800 text-white' 
            : 'bg-slate-50 border-slate-200 text-slate-900'
        } p-8 md:p-12 min-h-[580px] flex flex-col justify-between transition-all duration-300`}>
          
          {/* Header of the Slide */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-3xs font-black tracking-widest uppercase px-2.5 py-1 rounded-md ${
                current.isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
              }`}>
                {current.badge}
              </span>
              <span className={`text-xs font-mono font-bold ${
                current.isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Diapositive {currentSlide + 1} sur {slides.length}
              </span>
            </div>

            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-1.5 ${
              current.isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {current.title}
            </h2>
            <p className={`text-sm md:text-base font-normal mb-8 ${
              current.isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {current.subtitle}
            </p>

            {/* Slide Body */}
            <div>{current.content}</div>
          </div>

          {/* Footer of the Slide with Navigation Controls */}
          <div className="pt-8 mt-8 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                disabled={currentSlide === 0}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Diapositive précédente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlide === slides.length - 1}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Diapositive suivante"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                    currentSlide === idx 
                      ? 'w-8 bg-indigo-600 dark:bg-amber-400' 
                      : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  title={`Aller à la diapositive ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter ce diaporama (.pptx)</span>
            </button>
          </div>
        </div>

        {/* Thumbnail Slide Navigator */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">
            Toutes les diapositives du document ({slides.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                className={`p-2.5 rounded-xl border text-left transition duration-150 cursor-pointer ${
                  currentSlide === idx 
                    ? 'border-indigo-600 bg-indigo-50/75 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 shadow-sm ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-400'
                }`}
              >
                <span className="font-mono text-[10px] font-black block">#{idx + 1}</span>
                <span className="text-[10px] font-bold line-clamp-2 mt-1 leading-tight">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default PresentationPage;
