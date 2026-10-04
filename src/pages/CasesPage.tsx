
import React, { FC, useRef, useState } from 'react';
import PageContainer from '../components/PageContainer';
import CaseModal from '../components/modals/CaseModal';
import InvoiceDetailModal from '../components/modals/InvoiceDetailModal';
import { Case, Client, Avocat, Task, Invoice, Correspondance } from '../types';
import { AppUser } from '../types/rbac';
import { Download, Eye, Mail, Lock, Unlock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { isCaseContentMasked, canManageCaseConfidentiality, canViewRestrictedCaseContent } from '../services/rbacService';
import { DetailedEditModal } from '../components/DetailedEditModal';
import { exportElementToPdf } from '../utils/pdfExport';

interface CasesPageProps {
  cases: Case[];
  clients: Client[];
  tasks?: Task[]; // Made optional for compatibility
  onAddCase: (dossier: Case, tasks?: Omit<Task, 'id'>[]) => void;
  onExport: () => void;
  avocats: Avocat[];
  invoices?: Invoice[];
  correspondances?: Correspondance[];
  onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
  onNavigate?: (pageName: string, query?: string) => void;
  onUpdateCase?: (updated: Case) => void;
  currentUser?: AppUser | null;
  currentUserInfo?: { name: string; role: string; email: string } | null;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const getInvoiceStatusClass = (status: string) => {
    switch (status) {
        case 'Réglée': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'Non réglée': return 'bg-rose-50 text-rose-700 border-rose-100';
        case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-100';
        default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
};

const CasesPage: FC<CasesPageProps> = ({ 
    cases = [], 
    clients = [], 
    tasks = [], 
    onAddCase, 
    onExport, 
    avocats = [], 
    invoices = [], 
    correspondances = [],
    onSendEmail, 
    onNavigate,
    onUpdateCase,
    currentUser,
    currentUserInfo
}) => {
    const safeCases = Array.isArray(cases) ? cases : [];
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const safeAvocats = Array.isArray(avocats) ? avocats : [];

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [editingCase, setEditingCase] = useState<Case | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [displayLimit, setDisplayLimit] = useState<number>(40);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const selectedCaseContentRef = useRef<HTMLDivElement>(null);

    const activeUser = currentUser || currentUserInfo;

    const downloadAttachment = async (file: { name?: string; content?: string }) => {
        if (!file.content) return;
        try {
            const source = /^(data:|blob:|https?:\/\/)/i.test(file.content)
                ? file.content
                : `data:application/octet-stream;base64,${file.content}`;
            const response = await fetch(source);
            const blobUrl = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = file.name || 'piece-jointe';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch {
            const link = document.createElement('a');
            link.href = file.content;
            link.download = file.name || 'piece-jointe';
            link.target = '_blank';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };

    const handleToggleConfidentiality = (c: Case) => {
        if (!canManageCaseConfidentiality(activeUser, c)) {
            setToastMessage({
                type: 'error',
                text: "Action non autorisée : seuls les administrateurs et l'avocat titulaire de ce dossier peuvent modifier la visibilité du contenu."
            });
            setTimeout(() => setToastMessage(null), 4500);
            return;
        }

        const currentlyMasked = isCaseContentMasked(c);
        const willBeMasked = !currentlyMasked;

        const updated: Case = {
            ...c,
            isContentMasked: willBeMasked,
            isConfidential: willBeMasked
        };

        if (onUpdateCase) {
            onUpdateCase(updated);
        }

        if (selectedCase && selectedCase.id === c.id) {
            setSelectedCase(updated);
        }

        setToastMessage({
            type: 'success',
            text: willBeMasked
                ? `🔒 Le contenu du dossier "${c.name}" est désormais masqué (sensible). Les procédures et tâches associées restent accessibles.`
                : `🔓 Le contenu du dossier "${c.name}" est désormais ouvert à l'ensemble du cabinet.`
        });
        setTimeout(() => setToastMessage(null), 4500);
    };

    const handleEmailReport = (c: Case) => {
        if (!c || !c.id) return;
        const caseInvoices = safeInvoices.filter(inv => (inv.caseId || '').toLowerCase() === (c.id || '').toLowerCase());
        const caseTasks = safeTasks.filter(t => (t.caseId || '').toLowerCase() === (c.id || '').toLowerCase());
        
        const currentClient = safeClients.find(cl => cl && cl.name && c.client && cl.name.toLowerCase() === c.client.toLowerCase());
        const clientEmail = currentClient?.email || `${(c.client || 'client').toLowerCase().replace(/\s+/g, '.')}@entreprise.cd`;
        const clientContact = currentClient?.contact || 'Responsable';

        const subject = `⚖️ KBB Law Firm scp / Rapport de situation du dossier ${c.id}`;
        
        let body = `Bonjour ${clientContact},\n\n`;
        body += `Nous vous transmettons ci-dessous un point complet sur la situation de votre dossier juridique auprès de notre cabinet :\n\n`;
        body += `📁 Dossier : ${c.name} (${c.id})\n`;
        body += `📋 Statut : ${c.status}\n`;
        body += `📆 Prochaine audience de procédure : ${c.nextHearing || 'Aucune programmée'}\n\n`;
        
        if (caseTasks.length > 0) {
            body += `📅 Actions et Délais en cours :\n`;
            caseTasks.forEach(t => {
                body += `- [${t.status}] ${t.name} (Échéance : ${t.dueDate})\n`;
            });
            body += `\n`;
        }

        if (caseInvoices.length > 0) {
            body += `💼 Situation Comptable et Factures :\n`;
            caseInvoices.forEach(inv => {
                const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
                body += `- Facture N'${inv.id} (${inv.etiquette || 'Honoraires'}): Total ${formatCurrency(inv.totalAmount)} | Réglé : ${formatCurrency(inv.paidAmount)} | Solde : ${formatCurrency(remaining)} (Statut : ${inv.status})\n`;
            });
            body += `\n`;
        }
        
        body += `Nous restons engagés à vos côtés pour le succès de vos affaires.\n\n`;
        body += `Cordialement,\n\n`;
        body += `Secrétariat général - KBB Law Firm scp\n`;
        body += `contact@kbblawfirmscp.com | Kinshasa, RDC`;

        onSendEmail(clientEmail, subject, body, c.client);
    };

    return (
        <>
            <PageContainer title="Dossiers" buttonLabel="Créer un Dossier" onButtonClick={() => setIsAddModalOpen(true)} exportButtonLabel="Exporter en PDF" onExportClick={onExport}>
                 {toastMessage && (
                     <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition shadow-xs ${
                         toastMessage.type === 'error' ? 'bg-red-50 text-red-850 border-red-200' :
                         toastMessage.type === 'info' ? 'bg-blue-50 text-blue-850 border-blue-200' :
                         'bg-emerald-50 text-emerald-850 border-emerald-200'
                     }`}>
                         <span>{toastMessage.text}</span>
                         <button onClick={() => setToastMessage(null)} className="ml-4 text-gray-500 hover:text-gray-800 font-black cursor-pointer">✕</button>
                     </div>
                 )}
                 <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-sm text-gray-600">
                                <th className="p-4 font-semibold w-12 text-center">#</th>
                                <th className="p-4 font-semibold">Référence</th>
                                <th className="p-4 font-semibold">Nom du Dossier</th>
                                <th className="p-4 font-semibold">Client</th>
                                <th className="p-4 font-semibold">Statut</th>
                                <th className="p-4 font-semibold">Facturation</th>
                                <th className="p-4 font-semibold">Confidentialité</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {safeCases.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                                        Aucun dossier enregistré dans le cabinet pour le moment. Cliquez sur "Créer un Dossier" pour ajouter.
                                    </td>
                                </tr>
                            ) : (
                                safeCases.slice(0, displayLimit).map((c, index) => {
                                    if (!c) return null;
                                    const caseInvoices = safeInvoices.filter(inv => inv && (inv.caseId || '').toLowerCase() === (c.id || '').toLowerCase());
                                    const isMasked = isCaseContentMasked(c);
                                    return (
                                    <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="p-4 text-center font-mono text-xs text-gray-400 font-bold">{index + 1}</td>
                                        <td className="p-4 font-mono text-xs text-indigo-900 font-bold">{c.id}</td>
                                        <td className="p-4 font-medium text-gray-800">
                                            <div className="font-semibold text-gray-850">{c.name}</div>
                                            {(c.adversaires && c.adversaires.length > 0) ? (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {c.adversaires.map((adv, idx) => (
                                                        <span key={`adv-${adv}-${idx}`} className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100 uppercase tracking-wide">
                                                            vs {adv}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : c.adversaire ? (
                                                <div className="text-[10px] text-gray-500 mt-1 italic font-medium">
                                                    vs <span className="text-gray-700 font-semibold">{c.adversaire}</span>
                                                </div>
                                            ) : null}
                                            {c.tags && c.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {c.tags.map((tag, idx) => (
                                                        <span key={`tag-${tag}-${idx}`} className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-[#15447c] border border-slate-200">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            <button
                                                onClick={() => onNavigate?.('Clients', c.client)}
                                                className="hover:text-indigo-600 font-bold hover:underline text-left cursor-pointer flex items-center gap-1 group"
                                                title={`Voir la fiche client de ${c.client}`}
                                            >
                                                <span>👤</span>
                                                <span className="group-hover:translate-x-0.5 transition-transform duration-150">{c.client}</span>
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                c.status === 'En cours' ? 'bg-blue-50 text-blue-800 border-blue-150' : 
                                                c.status === 'Clôturé' ? 'bg-green-50 text-green-800 border-green-150' : 
                                                c.status === 'Nouveau' ? 'bg-purple-50 text-purple-800 border-purple-150' :
                                                'bg-yellow-50 text-yellow-800 border-yellow-150'}`}>{c.status}</span>
                                        </td>
                                        <td className="p-4">
                                            {caseInvoices.length === 0 ? (
                                                <span className="text-3xs font-extrabold text-slate-400 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5 uppercase tracking-wide">Aucune</span>
                                            ) : (
                                                <div className="flex flex-col gap-1.5 items-start max-w-[190px]">
                                                    {caseInvoices.map(inv => (
                                                        <button
                                                             key={inv.id}
                                                             onClick={() => setSelectedInvoice(inv)}
                                                             className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border rounded-lg hover:shadow-2xs transition w-full text-left truncate group cursor-pointer ${
                                                                inv.status === 'Réglée' ? 'bg-emerald-50 text-emerald-800 border-emerald-150 hover:bg-emerald-100/60' :
                                                                inv.status === 'En cours' ? 'bg-amber-50 text-amber-800 border-amber-150 hover:bg-amber-100/60' :
                                                                'bg-rose-50 text-rose-800 border-rose-150 hover:bg-rose-100/60'
                                                            }`}
                                                            title={`Afficher la facture ${inv.id}`}
                                                        >
                                                            <Eye className="w-3 h-3 text-current shrink-0 opacity-80 group-hover:scale-110 transition" />
                                                            <span className="truncate flex-1 font-mono font-bold">N° {inv.id.replace('FACT-', '')}</span>
                                                            <span className="text-[8px] bg-white border border-current px-1 py-0.2 rounded-sm shrink-0 font-extrabold shadow-3xs uppercase tracking-tighter">
                                                                {inv.status === 'Réglée' ? 'Payé' : inv.status === 'En cours' ? 'En cours' : 'Dû'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isMasked ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-850 border border-amber-250 shadow-3xs" title="Dossier sensible – Contenu restreint aux admins et titulaire">
                                                    <Lock className="w-2.5 h-2.5 text-amber-600" /> Sensible
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150" title="Contenu ouvert à l'équipe">
                                                    <Unlock className="w-2.5 h-2.5 text-emerald-600" /> Ouvert
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedCase(c)}
                                                    className="text-indigo-650 hover:text-indigo-950 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition duration-150 cursor-pointer"
                                                >
                                                    Gérer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }))}
                        </tbody>
                    </table>

                    {safeCases.length > 40 && (
                        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <span className="text-gray-500 dark:text-slate-400 font-medium">
                                Affichage de <strong className="text-gray-800 dark:text-slate-200">{Math.min(displayLimit, safeCases.length)}</strong> sur <strong className="text-gray-800 dark:text-slate-200">{safeCases.length}</strong> dossiers
                            </span>
                            
                            <div className="flex items-center gap-2">
                                {safeCases.length > displayLimit && (
                                    <button
                                        onClick={() => setDisplayLimit(prev => prev + 40)}
                                        className="px-4 py-2 bg-[#15447c] hover:bg-[#1d5b9f] text-white font-bold rounded-xl shadow-xs transition duration-150 cursor-pointer"
                                    >
                                        Voir plus (+40)
                                    </button>
                                )}

                                {displayLimit < safeCases.length && (
                                    <button
                                        onClick={() => setDisplayLimit(safeCases.length)}
                                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
                                    >
                                        Tout afficher
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </PageContainer>
            
            <CaseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={onAddCase} clients={clients} avocats={avocats} cases={cases} />

            {/* Case Details / Management Modal */}
            {selectedCase && (() => {
                const caseTasks = tasks.filter(t => (t.caseId || '').toLowerCase() === (selectedCase.id || '').toLowerCase());
                const caseInvoices = invoices.filter(inv => (inv.caseId || '').toLowerCase() === (selectedCase.id || '').toLowerCase());
                const isMasked = isCaseContentMasked(selectedCase);
                const canManageConf = canManageCaseConfidentiality(activeUser, selectedCase);
                const canViewContent = canViewRestrictedCaseContent(activeUser, selectedCase);
                
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex justify-center items-center p-4">
                        <div ref={selectedCaseContentRef} className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-2xs font-bold text-indigo-600 font-mono uppercase tracking-widest">{selectedCase.id}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            selectedCase.status === 'En cours' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                            selectedCase.status === 'Clôturé' ? 'bg-green-50 text-green-700 border border-green-100' : 
                                            selectedCase.status === 'Nouveau' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                                            'bg-amber-50 text-amber-700 border border-amber-100'
                                        }`}>
                                            {selectedCase.status}
                                        </span>
                                        {isMasked ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs">
                                                <Lock className="w-3 h-3 text-amber-700" /> Dossier Sensible • Contenu Masqué
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                <Unlock className="w-3 h-3 text-emerald-700" /> Contenu Ouvert
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-gray-850">{selectedCase.name}</h2>
                                    
                                    {/* Action button to toggle case confidentiality for Admins & Avocats Titulaires */}
                                    {canManageConf && (
                                        <div className="mt-2.5">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleConfidentiality(selectedCase)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition ${
                                                    isMasked
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                                                }`}
                                                title={isMasked ? "Rendre le contenu ouvert à l'ensemble du cabinet" : "Masquer le contenu pour restreindre l'accès aux dossiers sensibles"}
                                            >
                                                {isMasked ? (
                                                    <>
                                                        <Unlock className="w-3.5 h-3.5" />
                                                        <span>Rendre le contenu ouvert</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="w-3.5 h-3.5" />
                                                        <span>Masquer le contenu (Sensible)</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-3 mb-3 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">👤 Client Associé</span>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedCase(null);
                                                        onNavigate?.('Clients', selectedCase.client);
                                                    }}
                                                    className="text-sm font-bold text-indigo-650 hover:text-indigo-850 hover:underline cursor-pointer flex items-center gap-1.5"
                                                    title="Aller à la fiche client"
                                                >
                                                    <span>{selectedCase.client}</span>
                                                    {(() => {
                                                        const associatedClient = clients.find(cl => cl && cl.name && selectedCase.client && cl.name.toLowerCase() === selectedCase.client.toLowerCase());
                                                        return associatedClient?.denomination ? (
                                                            <span className="text-xs text-slate-500 font-semibold">({associatedClient.denomination})</span>
                                                        ) : null;
                                                    })()}
                                                    <span className="text-3xs bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-150 text-indigo-700 font-normal">Fiche ↗</span>
                                                </button>
                                                {(() => {
                                                    const associatedClient = clients.find(cl => cl && cl.name && selectedCase.client && cl.name.toLowerCase() === selectedCase.client.toLowerCase());
                                                    return associatedClient ? (
                                                        <p className="text-3xs text-slate-500 mt-1">
                                                            📞 {associatedClient.phone || 'Non renseigné'} • ✉️ {associatedClient.email || 'Non renseigné'}
                                                        </p>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedCase.avocatTitulaire && (
                                        <p className="text-xs text-indigo-950 mt-1 font-semibold">
                                            Avocat(s) titulaire(s) : <strong className="font-bold text-[#15447c]">{selectedCase.avocatTitulaire}</strong>
                                        </p>
                                    )}
                                    {selectedCase.avocatsSurDossier && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Avocats associés : <span className="font-medium text-slate-700">{selectedCase.avocatsSurDossier}</span>
                                        </p>
                                    )}
                                    {((selectedCase.adversaires && selectedCase.adversaires.length > 0) || selectedCase.adversaire) && (
                                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                            <span className="text-xs text-slate-500 font-medium">Adversaire(s) :</span>
                                            {selectedCase.adversaires && selectedCase.adversaires.length > 0 ? (
                                                selectedCase.adversaires.map((adv, idx) => (
                                                    <span key={`sel-adv-${adv}-${idx}`} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                                                        {adv}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                                                    {selectedCase.adversaire}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {selectedCase.tags && selectedCase.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {selectedCase.tags.map((tag, idx) => (
                                                <span key={`sel-tag-${tag}-${idx}`} className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-150">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        data-pdf-ignore
                                        onClick={() => selectedCaseContentRef.current && void exportElementToPdf(selectedCaseContentRef.current, `dossier_${selectedCase.id}`, selectedCaseContentRef.current.clientWidth)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#15447c] hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition"
                                        title="Exporter cette fiche dossier en PDF"
                                    >
                                        <Download className="w-4 h-4" /> PDF
                                    </button>
                                    <button
                                        data-pdf-ignore
                                        onClick={() => setSelectedCase(null)}
                                        className="p-1.5 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-650 transition"
                                        title="Fermer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Sensitivity notice banner */}
                            {isMasked && !canViewContent && (
                                <div className="mb-6 p-3.5 bg-amber-50/90 border border-amber-250 rounded-xl flex items-start gap-3">
                                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-950 leading-relaxed">
                                        <strong className="font-extrabold block text-amber-950 mb-0.5">🔒 Accès Restreint – Dossier Sensible</strong>
                                        Le contenu détaillé et les notes internes de ce dossier sont masqués par l'avocat titulaire ou les administrateurs.
                                        <span className="block mt-1 font-bold text-amber-850">Les procédures et les tâches associées restent pleinement ouvertes et opérationnelles ci-dessous.</span>
                                    </div>
                                </div>
                            )}

                            {isMasked && canViewContent && (
                                <div className="mb-6 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs text-indigo-950">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                                        <span><strong>Accès Privilégié :</strong> Vous accédez à ce dossier confidentiel en tant qu'administrateur ou avocat titulaire autorisé.</span>
                                    </div>
                                </div>
                            )}

                            {/* Procedure / Hearing Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl md:col-span-2">
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Prochaine Audience d'étape</span>
                                    {selectedCase.nextHearing ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm">📆</span>
                                            <span className="text-sm font-bold text-rose-750">{selectedCase.nextHearing}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs font-semibold text-gray-400 mt-1">Aucune audience programmée</p>
                                    )}
                                </div>

                                <div className="md:col-span-2 space-y-3 bg-indigo-50/15 border border-indigo-100/50 p-4 rounded-xl">
                                    <span className="text-[10px] font-black text-[#15447c] uppercase tracking-wider block mb-2">⚖️ Procédures du Dossier</span>
                                    {!selectedCase.procedures || selectedCase.procedures.length === 0 ? (
                                        <button
                                            onClick={() => {
                                                setSelectedCase(null);
                                                onNavigate?.('Procedures', selectedCase.procedure || "Procédure d'Arbitrage Standard");
                                            }}
                                            className="w-full text-left p-3 bg-white hover:bg-slate-50 border border-slate-150 rounded-lg text-xs cursor-pointer block transition group"
                                        >
                                            <p className="font-bold text-indigo-650 group-hover:underline flex items-center gap-1">
                                                <span>⚖️ {selectedCase.procedure || "Procédure d'Arbitrage Standard"}</span>
                                                <span className="text-[10px] font-normal text-slate-400">Gérer ↗</span>
                                            </p>
                                            <p className="text-3xs text-gray-500 font-bold uppercase mt-1">
                                                Instance: {selectedCase.procedureInstance || "Tribunal"} • Objet: {selectedCase.procedureObjet || "N/A"}
                                            </p>
                                        </button>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {selectedCase.procedures.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedCase(null);
                                                        onNavigate?.('Procedures', p.name);
                                                    }}
                                                    className="w-full text-left p-3 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl flex items-start justify-between gap-4 shadow-3xs cursor-pointer transition group"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-indigo-650 leading-tight group-hover:underline flex items-center gap-1">
                                                            <span>{p.name}</span>
                                                            <span className="text-[9px] font-normal text-slate-400">Gérer ↗</span>
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-semibold mt-1">
                                                            Instance : <strong className="text-gray-700">{p.instance || 'Non précisée'}</strong> • Objet : <strong className="text-gray-700">{p.objet || 'Non défini'}</strong>
                                                        </p>
                                                        <p className="text-3xs text-slate-400 font-bold uppercase mt-0.5">Introduit le : {p.dateDebut || 'Non défini'} • Fin le : {p.dateFin || 'Non défini'}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider border shrink-0 ${
                                                        p.status === 'En cours' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        p.status === 'Clôturé' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                        {p.status || 'En cours'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Associated Tasks */}
                            <div className="border-t border-gray-100 pt-5">
                                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3">
                                    Tâches et Délais associés ({caseTasks.length})
                                </h3>

                                {caseTasks.length === 0 ? (
                                    <div className="p-5 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                                        Aucune tâche ouverte ou en retard signalée pour ce dossier.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {caseTasks.map(t => (
                                            <div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-100/50 transition">
                                                <div>
                                                    <span className="text-sm font-semibold text-gray-800 block leading-tight">{t.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">Responsable : {t.lawyer} • Échéance : {t.dueDate}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                    t.status === 'Effectué' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                    t.status === 'Effectué à moitié' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-rose-50 text-rose-700 border-rose-100'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Associated Correspondances */}
                            <div className="border-t border-gray-100 pt-5 mt-5">
                                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3 flex items-center justify-between">
                                    <span>📄 Correspondances Liées au Dossier</span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                                        {correspondances.filter(corr => (corr.caseId || '').toLowerCase() === (selectedCase.id || '').toLowerCase() || (corr.subject || '').toLowerCase().includes((selectedCase.name || '').toLowerCase())).length}
                                    </span>
                                </h3>
                                {(() => {
                                    const caseCorrs = correspondances.filter(corr => (corr.caseId || '').toLowerCase() === (selectedCase.id || '').toLowerCase() || (corr.subject || '').toLowerCase().includes((selectedCase.name || '').toLowerCase()));
                                    if (caseCorrs.length === 0) {
                                        return (
                                            <div className="p-4 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                                                Aucune correspondance enregistrée pour ce dossier.
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                            {caseCorrs.map(corr => (
                                                <div key={corr.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-2xs font-mono font-bold text-indigo-700">{corr.id}</span>
                                                            <span className="text-3xs font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-150">{corr.nature || 'Émise'}</span>
                                                            <span className="text-3xs text-slate-400 font-semibold">{corr.date}</span>
                                                        </div>
                                                        <h4 className="text-xs font-extrabold text-gray-850">{corr.subject}</h4>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">Destinataire / Expéditeur : <strong className="text-gray-700">{corr.recipientName || corr.destinataire || 'N/A'}</strong></p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => {
                                                                const textContent = `CORRESPONDANCE KBB Law Firm scp\nRéf: ${corr.id}\nDate: ${corr.date}\nObjet: ${corr.subject}\nInterlocuteur: ${corr.recipientName}\n\n${corr.content}`;
                                                                const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `correspondance_${corr.id}.txt`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                                URL.revokeObjectURL(url);
                                                            }}
                                                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-gray-700 text-xs font-bold rounded-lg shadow-3xs flex items-center gap-1.5 transition cursor-pointer"
                                                            title="Télécharger la correspondance"
                                                        >
                                                            <span>📥 Télécharger</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Notes Internes & Contenu sensible */}
                            <div className="border-t border-gray-100 pt-5 mt-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                                        <span>📝 Notes Internes & Stratégie</span>
                                        {isMasked && (
                                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-250 px-2 py-0.5 rounded-md flex items-center gap-1 normal-case tracking-normal">
                                                <Lock className="w-2.5 h-2.5 text-amber-600" /> Protégé
                                            </span>
                                        )}
                                    </h3>
                                </div>

                                {!canViewContent ? (
                                    <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                                        <Lock className="w-6 h-6 text-amber-650 mx-auto mb-1.5" />
                                        <p className="text-xs font-extrabold text-slate-800">Contenu confidentiel masqué</p>
                                        <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                                            Ce dossier a été placé sous protection sensible. Les notes et pièces internes ne sont consultables que par l'avocat titulaire ({selectedCase.avocatTitulaire || 'Assigné'}) et la direction.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        {selectedCase.notes ? (
                                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{selectedCase.notes}</p>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Aucune note interne enregistrée sur ce dossier.</p>
                                        )}
                                        {selectedCase.piecesJointes && selectedCase.piecesJointes.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-slate-200/80">
                                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Pièces jointes ({selectedCase.piecesJointes.length})</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedCase.piecesJointes.map((pj, idx) => (
                                                        <div key={idx} className="inline-flex items-center gap-2 text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-3xs">
                                                            <span>📎 {pj.name} <span className="text-[10px] text-slate-400 font-normal">({pj.size})</span></span>
                                                            <button
                                                                type="button"
                                                                data-pdf-ignore
                                                                disabled={!pj.content}
                                                                onClick={() => void downloadAttachment(pj)}
                                                                className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 disabled:text-slate-300 text-[10px] font-extrabold"
                                                                title={pj.content ? `Télécharger ${pj.name}` : 'Contenu du fichier indisponible'}
                                                            >
                                                                <Download className="w-3.5 h-3.5" /> Télécharger
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Facturation liée */}
                            <div className="border-t border-gray-100 pt-5 mt-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">
                                        Facturation liée ({caseInvoices.length})
                                    </h3>
                                    {caseInvoices.length > 0 && (
                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md">
                                            Reste à percevoir : {formatCurrency(caseInvoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0))}
                                        </span>
                                    )}
                                </div>

                                {caseInvoices.length === 0 ? (
                                    <div className="p-5 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                                        Aucune facture enregistrée pour ce dossier.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {caseInvoices.map(inv => (
                                            <div 
                                                key={inv.id} 
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-100/55 hover:border-indigo-200 transition duration-150 cursor-pointer group"
                                                title="Cliquer pour afficher le détail de la facture"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono text-xs font-black text-indigo-950 group-hover:text-indigo-700 transition flex items-center gap-1">
                                                            <Eye className="w-3 h-3 text-indigo-500 opacity-80" /> N° {inv.id}
                                                        </span>
                                                        {inv.etiquette && (
                                                            <span className="text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-150 px-1.5 py-0.2 rounded font-bold">{inv.etiquette}</span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-bold">• Échéance : {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : 'Non précisée'}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-600 font-semibold mt-1">
                                                        Montant : <span className="text-gray-900 font-extrabold">{formatCurrency(inv.totalAmount)}</span>
                                                        <span className="mx-1.5 text-slate-300">|</span>
                                                        Réglé : <span className="text-emerald-700 font-bold">{formatCurrency(inv.paidAmount)}</span>
                                                        {inv.totalAmount - inv.paidAmount > 0 && (
                                                            <>
                                                                <span className="mx-1.5 text-slate-300">|</span>
                                                                Solde : <span className="text-rose-700 font-bold">{formatCurrency(inv.totalAmount - inv.paidAmount)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wide border ${getInvoiceStatusClass(inv.status)}`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Operations */}
                            <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-2xs text-gray-400">
                                    Propriété exclusive de KBB Law Firm scp
                                </div>
                                <div className="flex items-center gap-2">
                                    {onUpdateCase && (
                                        <button
                                            data-pdf-ignore
                                            onClick={() => {
                                                setEditingCase(selectedCase);
                                                setSelectedCase(null);
                                            }}
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold py-2 px-4 rounded-xl transition duration-150 text-sm"
                                        >
                                            Modifier le dossier
                                        </button>
                                    )}
                                    <button
                                        data-pdf-ignore
                                        onClick={() => setSelectedCase(null)}
                                        className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold py-2 px-6 rounded-xl transition duration-150 text-sm"
                                    >
                                        Fermer le dossier
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {editingCase && (
                <DetailedEditModal
                    type="case"
                    item={editingCase}
                    clients={safeClients}
                    avocats={safeAvocats}
                    onClose={() => setEditingCase(null)}
                    onSave={(updatedCase) => {
                        onUpdateCase?.(updatedCase as Case);
                        setEditingCase(null);
                    }}
                />
            )}

            <InvoiceDetailModal 
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoice={selectedInvoice}
                cases={cases}
                clients={clients}
                onSendEmail={onSendEmail}
            />
        </>
    );
};

export default CasesPage;
