import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import ClientModal from '../components/modals/ClientModal';
import { 
  Users, 
  Phone, 
  Mail, 
  Briefcase, 
  Scale, 
  Calendar, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  X,
  Plus,
  Bookmark,
  Building2,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Client, Case, Invoice, Task } from '../types';

interface ClientsPageProps {
  clients: Client[];
  cases?: Case[];
  invoices?: Invoice[];
  tasks?: Task[];
  onAddClient: (client: Omit<Client, 'id'> & { id?: string | number }) => void;
  onExport: () => void;
  onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const ClientsPage: FC<ClientsPageProps> = ({ 
  clients = [], 
  cases = [], 
  invoices = [], 
  tasks = [], 
  onAddClient, 
  onExport, 
  onSendEmail 
}) => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeCases = Array.isArray(cases) ? cases : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    // Dynamic industry & contact info helper
    const getClientDetails = (client: Client) => {
        if (!client) return { sector: '', localAddress: '', email: '', phone: '', clientName: 'Client', clientContact: '' };
        let sector = client.secteur || "Services Professionnels";
        let localAddress = client.siege || "Kinshasa, RDC";
        
        const clientName = client.name || (client as any).nom || (client as any).clientName || (client as any).fullName || "Client Sans Nom";
        const clientContact = client.contact || (client as any).phone || (client as any).email || "Contact non spécifié";

        if (!client.secteur && clientName) {
            if (clientName.includes("Invest")) {
                sector = "Investissements & Services Financiers";
            } else if (clientName.includes("Digital")) {
                sector = "Infrastructures Numériques & Logiciels";
            } else if (clientName.includes("Bâtir") || clientName.includes("Construction")) {
                sector = "Bâtiment & Travaux Publics (BTP)";
            } else if (clientName.includes("Saveurs")) {
                sector = "Restauration & Agro-alimentaire";
            }
        }

        const safeContactForEmail = (clientContact || 'contact').toLowerCase().replace(/\s+/g, '.');
        const safeNameForEmail = (clientName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = client.email || `${safeContactForEmail}@${safeNameForEmail || 'client'}.com`;
        const idNum = typeof client.id === 'number' ? client.id : (client.id ? String(client.id).charCodeAt(String(client.id).length - 1) : 42);
        const phone = client.phone || `+243 81 234 ${100 + idNum * 17}`;

        return { sector, localAddress, email, phone, clientName, clientContact };
    };

    // Client Logo / Avatar Renderer with unique gradient signature based on name
    const renderClientLogo = (client: Client, sizeClass = "w-10 h-10 text-xs") => {
        if (client.logoUrl) {
            return (
                <img 
                    src={client.logoUrl} 
                    alt={client.name || "Logo"} 
                    referrerPolicy="no-referrer"
                    className={`${sizeClass} rounded-xl object-cover border border-slate-200 shadow-xs shrink-0`} 
                />
            );
        }
        
        const name = client.name || (client as any).nom || (client as any).clientName || "Client";
        const initials = name
            .split(/\s+/)
            .map(w => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
        
        const colors = [
            "from-indigo-600 to-violet-700",
            "from-blue-600 to-cyan-600",
            "from-emerald-600 to-teal-700",
            "from-amber-500 to-orange-600",
            "from-rose-500 to-pink-600",
            "from-slate-700 to-slate-900",
            "from-purple-600 to-fuchsia-700",
        ];
        
        const charCodeSum = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const gradient = colors[charCodeSum % colors.length];

        return (
            <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white tracking-wider shadow-xs border border-white/10 shrink-0`}>
                {initials}
            </div>
        );
    };

    return (
        <>
            <PageContainer 
                title="Clients" 
                buttonLabel="Ajouter un Client" 
                onButtonClick={() => setIsAddModalOpen(true)} 
                exportButtonLabel="Exporter en PDF" 
                onExportClick={onExport}
            >
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-150 shadow-xs">
                    <table className="w-full text-left min-w-[650px]">
                        <thead className="bg-slate-50/75 border-b border-slate-150">
                            <tr className="text-2xs font-extrabold uppercase tracking-widest text-slate-450">
                                <th className="p-4 pl-6">Nom du Client</th>
                                <th className="p-4">Dénomination</th>
                                <th className="p-4">Contact Principal</th>
                                <th className="p-4">Dossiers Actifs</th>
                                <th className="p-4 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {safeClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                                        Aucun client enregistré dans la base de données. Cliquez sur "Ajouter un Client" pour commencer.
                                    </td>
                                </tr>
                            ) : (
                                safeClients.map(client => {
                                    if (!client) return null;
                                    const details = getClientDetails(client);
                                    return (
                                    <tr key={client.id} className="hover:bg-slate-50/50 transition duration-150">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                {renderClientLogo(client)}
                                                <div>
                                                    <span className="block font-black text-slate-800 text-sm leading-snug">{client.name}</span>
                                                    <span className="text-[10px] text-indigo-600 font-mono tracking-wider font-bold">{client.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="block font-semibold text-slate-700 text-xs">{client.denomination || <span className="text-slate-450 italic font-normal">N/A</span>}</span>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <span className="block font-semibold text-slate-700 text-xs">{client.contact}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{details.sector}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 font-extrabold text-2xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
                                                <Briefcase className="w-3 h-3 text-indigo-500" />
                                                {client.cases} dossier{client.cases > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setSelectedClient(client)}
                                                    className="text-indigo-600 hover:text-indigo-850 hover:underline font-extrabold text-xs bg-indigo-50 hover:bg-indigo-100/60 px-3 py-1.5 rounded-xl transition duration-150 cursor-pointer"
                                                >
                                                    Voir fiche
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onSendEmail(
                                                            details.email,
                                                            `Relation Clients — Cabinet KBB SARL`,
                                                            `Bonjour ${client.contact},\n\nDans le cadre de l'accompagnement d'affaires de ${client.name}...\n\nSentiments dévoués,\nCabinet KBB SARL`,
                                                            client.name
                                                        );
                                                    }}
                                                    className="text-slate-500 hover:text-indigo-800 bg-slate-50 hover:bg-indigo-50/55 p-1.5 rounded-xl transition cursor-pointer border border-slate-100"
                                                    title={`Envoyer un e-mail à ${client.name}`}
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }))}
                        </tbody>
                    </table>
                </div>
            </PageContainer>
            
            <ClientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={onAddClient} existingClients={clients} />

            {/* Client Details Modal */}
            {selectedClient && (() => {
                const details = getClientDetails(selectedClient);
                const clientCases = cases.filter(c => (c.client || '').toLowerCase() === (selectedClient.name || '').toLowerCase());
                
                // Indicators & stats calculation
                const clientCaseIds = clientCases.map(c => c.id);
                const clientInvoices = invoices.filter(inv => clientCaseIds.includes(inv.caseId));
                const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                const totalPaid = clientInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                const totalRemaining = clientInvoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0);
                const closingRate = clientCases.length > 0 ? Math.round((clientCases.filter(c => c.status === 'Clôturé').length / clientCases.length) * 100) : 0;

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-fadeIn">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-4">
                                    {renderClientLogo(selectedClient, "w-14 h-14 text-sm")}
                                    <div>
                                        <span className="text-3xs font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Fiche Client Certifiée</span>
                                        <h2 className="text-xl font-black text-slate-850 leading-tight">{selectedClient.name}</h2>
                                        {selectedClient.denomination && (
                                            <span className="text-xs font-bold text-slate-600 block italic mt-0.5">Dénomination : {selectedClient.denomination}</span>
                                        )}
                                        <span className="text-[10px] text-slate-400 font-mono">ID: {selectedClient.id}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedClient(null)} 
                                    className="p-1.5 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Indicators Bento Grid */}
                            <div className="mb-6">
                                <h3 className="text-2xs font-extrabold text-slate-450 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Indicateurs Clés & Statistiques
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3.5 bg-slate-50 border border-slate-150/60 rounded-xl">
                                        <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest block">Dossiers</span>
                                        <span className="text-base font-black text-slate-800 block mt-1">{clientCases.length}</span>
                                        <span className="text-[10px] text-indigo-600 font-extrabold block mt-0.5">
                                            {clientCases.filter(c => c.status === 'En cours').length} actifs
                                        </span>
                                    </div>
                                    <div className="p-3.5 bg-slate-50 border border-slate-150/60 rounded-xl">
                                        <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest block">Taux Résolution</span>
                                        <span className="text-base font-black text-slate-800 block mt-1">{closingRate}%</span>
                                        <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">
                                            {clientCases.filter(c => c.status === 'Clôturé').length} clôturé(s)
                                        </span>
                                    </div>
                                    <div className="p-3.5 bg-slate-50 border border-slate-150/60 rounded-xl">
                                        <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest block">Total Facturé</span>
                                        <span className="text-sm font-black text-slate-800 block mt-1.5 truncate" title={formatCurrency(totalBilled)}>{formatCurrency(totalBilled)}</span>
                                        <span className="text-[10px] text-slate-400 font-medium block">Total Honoraires</span>
                                    </div>
                                    <div className="p-3.5 bg-rose-50/50 border border-rose-100/75 rounded-xl">
                                        <span className="text-3xs font-bold text-rose-500 uppercase tracking-widest block">Reste à Recouvrer</span>
                                        <span className="text-sm font-black text-rose-700 block mt-1.5 truncate" title={formatCurrency(totalRemaining)}>{formatCurrency(totalRemaining)}</span>
                                        <span className="text-[10px] text-rose-500/80 font-bold block">Solde dû</span>
                                    </div>
                                </div>
                            </div>

                            {/* Information and Corporate Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Secteur d'activité</span>
                                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 bg-slate-50/75 px-3 py-2 rounded-xl border border-slate-100">
                                            <Building2 className="w-3.5 h-3.5 text-indigo-550" />
                                            {details.sector}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Siège Social Principal</span>
                                        <p className="text-xs font-bold text-slate-800 bg-slate-50/75 border border-slate-100 p-3 rounded-xl leading-relaxed">{details.localAddress}</p>
                                    </div>
                                    {selectedClient.sieges && selectedClient.sieges.length > 0 && (
                                        <div>
                                            <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Autres Adresses Sociales ({selectedClient.sieges.length})</span>
                                            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                                {selectedClient.sieges.map((s, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start bg-indigo-50/40 p-2 rounded-xl border border-indigo-100/30 text-[10px] font-bold text-indigo-900 leading-normal">
                                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0"></span>
                                                        <span>{s}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Représentant Mandataire</span>
                                        <div className="text-xs font-bold text-slate-850 flex items-center gap-2 bg-slate-50/75 px-3 py-2 rounded-xl border border-slate-100">
                                            <UserCheck className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                                            <span>{selectedClient.contact}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Coordonnées Corporate</span>
                                        <div className="text-xs text-slate-750 font-semibold p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                            <p className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                <span>{details.phone}</span>
                                            </p>
                                            <p className="flex items-center justify-between gap-2 border-t border-slate-150/50 pt-2">
                                                <span className="flex items-center gap-2 truncate">
                                                    <Mail className="w-3.5 h-3.5 text-indigo-550 shrink-0" />
                                                    <span className="truncate">{details.email}</span>
                                                </span>
                                                <button
                                                    onClick={() => onSendEmail(
                                                        details.email,
                                                        `Relation Clients — Cabinet KBB SARL`,
                                                        `Bonjour ${selectedClient.contact},\n\nNous faisons suite à l'analyse active de votre dossier au cabinet...\n\nSentiments dévoués,\nCabinet KBB SARL`,
                                                        selectedClient.name
                                                    )}
                                                    className="text-3xs bg-indigo-100/60 hover:bg-indigo-100 text-indigo-850 font-bold px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
                                                >
                                                    📩 Écrire
                                                </button>
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Type de Facturation</span>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>{selectedClient.typeFacturation || 'Forfaitaire'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Clickable Dossiers List with detailed sub-modal trigger */}
                            <div className="border-t border-slate-100 pt-5">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-2xs font-extrabold text-slate-450 uppercase tracking-widest flex items-center gap-1">
                                        <Scale className="w-3.5 h-3.5 text-indigo-600" /> dossiers opérationnels ({clientCases.length})
                                    </h3>
                                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                        Cliquer pour inspecter
                                    </span>
                                </div>

                                {clientCases.length === 0 ? (
                                    <div className="p-5 text-center bg-slate-55 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                        Aucun dossier n'est enregistré pour ce client.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                                        {clientCases.map(c => {
                                            const caseInv = invoices.filter(i => i.caseId === c.id);
                                            const totalDue = caseInv.reduce((acc, i) => acc + Math.max(0, i.totalAmount - i.paidAmount), 0);
                                            return (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setSelectedCase(c)}
                                                    className="p-3.5 bg-slate-50 border border-slate-150/60 hover:border-indigo-300 hover:bg-indigo-50/20 text-left rounded-xl flex items-center justify-between transition group cursor-pointer"
                                                >
                                                    <div className="truncate pr-2">
                                                        <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider block uppercase">{c.id}</span>
                                                        <span className="text-xs font-black text-slate-800 group-hover:text-indigo-900 leading-snug truncate block">{c.name}</span>
                                                        <span className="text-[10px] text-slate-450 mt-0.5 block truncate">
                                                            {totalDue > 0 ? `Solde: ${formatCurrency(totalDue)}` : "Honoraires à jour"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                                                            c.status === 'En cours' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                                            c.status === 'Clôturé' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                                            c.status === 'Nouveau' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                            'bg-amber-50 text-amber-700 border border-amber-100'
                                                        }`}>
                                                            {c.status}
                                                        </span>
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-350 group-hover:text-indigo-600 transition duration-150 transform group-hover:translate-x-0.5" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setSelectedClient(null)} 
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-6 rounded-xl transition duration-150 cursor-pointer text-xs"
                                >
                                    Fermer la fiche
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Nested Clicked Case Detailed Stats Sub-Modal */}
            {selectedCase && (() => {
                const caseInvoices = invoices.filter(inv => inv.caseId === selectedCase.id);
                const caseTasks = tasks.filter(t => String(t.caseId) === String(selectedCase.id));
                const totalInvoiced = caseInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
                const totalPaid = caseInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
                const totalDue = caseInvoices.reduce((sum, i) => sum + Math.max(0, i.totalAmount - i.paidAmount), 0);
                const activeProcedures = selectedCase.procedures || [];

                return (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[60] flex justify-center items-center p-4">
                        <div className="bg-white rounded-2xl shadow-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-indigo-100 animate-fadeIn">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-700">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Dossier Spécifique</span>
                                        <h3 className="text-base font-black text-slate-800 leading-snug">{selectedCase.name}</h3>
                                        <p className="text-3xs text-slate-400 font-mono">Dossier ID: {selectedCase.id} • Client: {selectedCase.client}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedCase(null)} 
                                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Dossier Stats Highlights */}
                            <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
                                <div className="p-3 bg-slate-50 border border-slate-150/60 rounded-xl">
                                    <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block">Statut</span>
                                    <span className={`inline-flex items-center gap-1 font-black text-2xs mt-1.5 px-2.5 py-0.5 rounded-full ${
                                        selectedCase.status === 'En cours' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                        selectedCase.status === 'Clôturé' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                        selectedCase.status === 'Nouveau' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                        'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                        {selectedCase.status}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-150/60 rounded-xl">
                                    <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block">Prochaine Audience</span>
                                    <span className="text-[11px] font-bold text-slate-700 block mt-1.5">
                                        {selectedCase.nextHearing ? (
                                            <span className="flex items-center justify-center gap-1 text-indigo-650">
                                                <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                                                {selectedCase.nextHearing}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic font-medium">Aucune audience</span>
                                        )}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-150/60 rounded-xl">
                                    <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block">Budget Encaissé</span>
                                    <span className="text-xs font-black text-emerald-700 block mt-1.5">
                                        {totalInvoiced > 0 ? (
                                            `${Math.round((totalPaid / totalInvoiced) * 100)}%`
                                        ) : (
                                            <span className="text-slate-400">N/A</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                {/* Left Side: Procedures & Notes */}
                                <div className="space-y-4">
                                    {/* Procedures list */}
                                    <div>
                                        <h4 className="text-3xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <Scale className="w-3.5 h-3.5 text-indigo-550" /> Procédures administratives ({activeProcedures.length})
                                        </h4>
                                        {activeProcedures.length === 0 ? (
                                            <div className="p-3 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-3xs text-slate-400 italic">
                                                Aucune procédure formelle rattachée à ce dossier.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {activeProcedures.map((proc, idx) => (
                                                    <div key={proc.id || idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-2xs">
                                                        <div className="flex justify-between items-start gap-1">
                                                            <span className="font-bold text-slate-800 leading-tight">{proc.name}</span>
                                                            <span className="text-3xs font-extrabold uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded shrink-0">{proc.status || 'En cours'}</span>
                                                        </div>
                                                        <p className="text-3xs text-slate-450 mt-1">Instance : {proc.instance || 'Tribunal de Grande Instance'}</p>
                                                        {proc.objet && <p className="text-3xs text-slate-400 mt-0.5">Objet : {proc.objet}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dossier Notes */}
                                    <div>
                                        <h4 className="text-3xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Observations & Notes d'affaires</h4>
                                        <div className="p-3 bg-indigo-50/20 border border-indigo-100/30 rounded-xl max-h-36 overflow-y-auto">
                                            {selectedCase.notes ? (
                                                <p className="text-2xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{selectedCase.notes}</p>
                                            ) : (
                                                <p className="text-3xs text-slate-400 italic font-medium">Aucune note ou observation n'a encore été rapportée pour cette affaire.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Financials & Tasks */}
                                <div className="space-y-4">
                                    {/* Case Financial stats */}
                                    <div>
                                        <h4 className="text-3xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Éléments de Facturation
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-150/60 rounded-xl p-3.5 text-2xs space-y-2">
                                            <div className="flex justify-between border-b border-slate-150/50 pb-1.5 font-medium">
                                                <span className="text-slate-450">Total Honoraires :</span>
                                                <span className="font-bold text-slate-800">{formatCurrency(totalInvoiced)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-150/50 pb-1.5 font-medium">
                                                <span className="text-slate-450 text-emerald-650">Acomptes Encaissés :</span>
                                                <span className="font-bold text-emerald-700">{formatCurrency(totalPaid)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-xs pt-0.5">
                                                <span className="text-slate-500">Reste à payer :</span>
                                                <span className={totalDue > 0 ? "text-rose-600" : "text-emerald-700"}>{formatCurrency(totalDue)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Linked tasks */}
                                    <div>
                                        <h4 className="text-3xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Tâches & Diligences liées ({caseTasks.length})
                                        </h4>
                                        {caseTasks.length === 0 ? (
                                            <div className="p-3 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-3xs text-slate-400 italic">
                                                Aucune diligence enregistrée pour ce dossier.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {caseTasks.map(t => (
                                                    <div key={t.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-3xs flex items-center justify-between">
                                                        <div>
                                                            <span className="font-bold text-slate-800 block leading-tight">{t.name}</span>
                                                            <span className="text-slate-400 mt-0.5 block">Par: {t.lawyer} • Échéance: {t.dueDate}</span>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                            t.status === 'Effectué' ? 'bg-emerald-50 text-emerald-750 border border-emerald-100' :
                                                            t.status === 'Effectué à moitié' ? 'bg-amber-50 text-amber-750 border border-amber-100' :
                                                            'bg-red-50 text-red-750 border border-red-100'
                                                        }`}>
                                                            {t.status === 'Effectué' ? 'Fait' : t.status === 'Effectué à moitié' ? 'En cours' : 'Non fait'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-3.5 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setSelectedCase(null)} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-1.5 px-4 rounded-lg transition duration-150 cursor-pointer text-xs shadow-xs"
                                >
                                    Retour à la fiche client
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default ClientsPage;
