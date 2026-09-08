import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import InvoiceModal from '../components/modals/InvoiceModal';
import InvoiceDetailModal from '../components/modals/InvoiceDetailModal';
import { SearchIcon } from '../components/Icons';
import { Invoice, Case, Client } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Eye, Mail } from 'lucide-react';

interface BillingPageProps {
  invoices: Invoice[];
  cases: Case[];
  clients: Client[];
  currentUserInfo?: { name: string; role: string; email: string } | null;
  onAddInvoice: (invoice: Invoice) => void;
  onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
}

const BillingPage: FC<BillingPageProps> = ({ invoices, cases, clients = [], currentUserInfo, onAddInvoice, onSendEmail }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDetailInvoice, setSelectedDetailInvoice] = useState<Invoice | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState<number>(40);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Réglée': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Non réglée': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'En cours': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

    // Determine admin status
    const userEmail = currentUserInfo?.email?.trim().toLowerCase();
    const isAdmin = currentUserInfo?.role === 'Admin' || 
                    userEmail === 'jeremieshusu4@gmail.com' || 
                    userEmail === 'hervemich@icloud.com' || 
                    userEmail === 'patbonles@gmail.com' || 
                    userEmail === 'admin@cabinet.com';

    // Invoices visible to the current user (Creators see their created invoices; Admins see all)
    const userVisibleInvoices = invoices.filter(inv => {
        if (isAdmin) return true;
        if (!inv.createdBy) return true; // Default/initial invoices remain visible
        return (inv.createdBy || '').trim().toLowerCase() === userEmail;
    });

    // Calculate billing summary statistics on userVisibleInvoices
    const totalInvoiced = userVisibleInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = userVisibleInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalUnpaid = userVisibleInvoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0);
    const unpaidCount = userVisibleInvoices.filter(inv => inv.status !== 'Réglée').length;
    const recoveryRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // Filter invoices by search query
    const filteredInvoices = userVisibleInvoices.filter(invoice => {
        const relatedCase = cases.find(c => c.id === invoice.caseId);
        const searchTarget = `${invoice.id} ${invoice.status} ${invoice.dueDate} ${invoice.etiquette || ''} ${relatedCase ? relatedCase.name : ''}`.toLowerCase();
        return searchTarget.includes(searchQuery.toLowerCase());
    });

    // Prepare chronological data for Recharts AreaChart
    const getChartData = () => {
        // Sort and map
        const sorted = [...userVisibleInvoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        const groups: { [key: string]: { total: number; unpaid: number; displayMonth: string } } = {};

        sorted.forEach(inv => {
            const date = new Date(inv.dueDate);
            if (isNaN(date.getTime())) return;
            
            const year = date.getFullYear();
            const monthVal = date.getMonth();
            const key = `${year}-${String(monthVal + 1).padStart(2, '0')}`;
            
            const monthLabel = [
                'Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 
                'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
            ][monthVal];

            const displayMonth = `${monthLabel} ${year}`;
            const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);

            if (!groups[key]) {
                groups[key] = { total: 0, unpaid: 0, displayMonth };
            }
            groups[key].total += inv.totalAmount;
            groups[key].unpaid += remaining;
        });

        const list = Object.entries(groups)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([_, val]) => ({
                name: val.displayMonth,
                'Total facturé': val.total,
                'Montant impayé': val.unpaid,
            }));

        // Fallback placeholder data if history is empty to keep visuals pristine
        if (list.length === 0) {
            return [
                { name: 'Aucune donnée', 'Total facturé': 0, 'Montant impayé': 0 }
            ];
        }

        return list;
    };

    const chartData = getChartData();

    return (
        <>
            <PageContainer title="Cabinet Facturation" buttonLabel="Enregistrer une facture" onButtonClick={() => setIsModalOpen(true)}>
                
                {/* 1. Row of KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                    {/* card 1 */}
                    <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs">
                        <span className="block text-3xs font-black uppercase text-slate-400 tracking-wider">Total facturé</span>
                        <h3 className="text-xl font-black text-slate-800 mt-1">{formatCurrency(totalInvoiced)}</h3>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded font-bold">Cabinet global</span>
                        </div>
                    </div>
                    {/* card 2 */}
                    <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs">
                        <span className="block text-3xs font-black uppercase text-slate-400 tracking-wider">Montant recouvré</span>
                        <h3 className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(totalPaid)}</h3>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-emerald-700 font-bold">Sols encaissés</span>
                        </div>
                    </div>
                    {/* card 3 */}
                    <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs">
                        <span className="block text-3xs font-black uppercase text-slate-400 tracking-wider opacity-90">Factures impayées</span>
                        <h3 className="text-xl font-black text-rose-600 mt-1">{formatCurrency(totalUnpaid)}</h3>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded font-bold">{unpaidCount} dossier(s) en attente</span>
                        </div>
                    </div>
                    {/* card 4 */}
                    <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs">
                        <span className="block text-3xs font-black uppercase text-slate-400 tracking-wider">Taux de recouvrement</span>
                        <h3 className="text-xl font-black text-[#15447c] mt-1">{recoveryRate.toFixed(1)}%</h3>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, recoveryRate)}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* 2. Visualizations Area & Summary Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Recharts Area Chart card (Take up 2/3 space) */}
                    <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-xs lg:col-span-2">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                                📈 Évolution des impayés sur salaire ou prestation
                            </h3>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                Suivi temporel récurrent des montants restants à recouvrer
                            </p>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorUnpaid" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                                        </linearGradient>
                                        <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#15447c" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#15447c" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(v) => `${v} €`}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1e293b', 
                                            borderRadius: '12px', 
                                            border: 'none', 
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                                        }}
                                        itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}
                                        formatter={(value: any) => [`${value} €`]}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="Total facturé" 
                                        stroke="#15447c" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorInvoiced)" 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="Montant impayé" 
                                        stroke="#ef4444" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorUnpaid)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Breakdown distribution card */}
                    <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 tracking-tight">
                                📊 Portefeuille factures
                            </h3>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 mb-5">
                                Répartition analytique globale
                            </p>

                            <div className="space-y-3.5">
                                {/* slice 1: réglée */}
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                        <span className="text-xs font-bold text-gray-700">Factures Réglées</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-gray-900">
                                        {invoices.filter(i => i.status === 'Réglée').length}
                                    </span>
                                </div>

                                {/* slice 2: en cours */}
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                        <span className="text-xs font-bold text-gray-700">Factures En Cours</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-gray-900">
                                        {invoices.filter(i => i.status === 'En cours').length}
                                    </span>
                                </div>

                                {/* slice 3: non réglée */}
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                        <span className="text-xs font-bold text-gray-700">Factures Non Réglées</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-gray-900">
                                        {invoices.filter(i => i.status === 'Non réglée').length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                            <h4 className="text-3xs font-black uppercase text-indigo-700 tracking-widest mb-1">
                                Indice de santé financière
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                Le taux de recouvrement de <strong className="text-[#15447c]">{recoveryRate.toFixed(1)}%</strong> démontre une gestion fluide, à consolider en réduisant les impayés de {formatCurrency(totalUnpaid)}.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search / Filter Control bar */}
                <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-2xs mb-6 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl w-full max-w-sm">
                        <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Filtrer par ID, dossier, statut, échéance..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs font-medium focus:outline-hidden bg-transparent"
                        />
                    </div>
                </div>

                {/* 3. Primary Invoices Table */}
                <div className="bg-white rounded-2xl border border-gray-150 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[650px]">
                            <thead className="bg-slate-50 border-b border-gray-150">
                                <tr className="text-2xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4">ID Facture</th>
                                    <th className="p-4">Étiquette facture</th>
                                    <th className="p-4">Dossier Associé</th>
                                    <th className="p-4">Échéance</th>
                                    <th className="p-4 text-right header-align-right">Montant Total</th>
                                    <th className="p-4 text-right header-align-right">Montant Payé</th>
                                    <th className="p-4 text-right header-align-right font-black">Reste à payer</th>
                                    <th className="p-4">Statut</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-xs text-gray-400 font-bold">
                                            Aucune facture ne correspond à ce filtre de recherche.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.slice(0, displayLimit).map(invoice => {
                                        const relatedCase = cases.find(c => c.id === invoice.caseId);
                                        const remainingAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);
                                        return (
                                            <tr key={invoice.id} className="hover:bg-slate-50/50 transition duration-150">
                                                <td className="p-4 font-mono text-xs text-indigo-900 font-bold">{invoice.id}</td>
                                                <td className="p-4 font-medium text-xs text-slate-700">
                                                    {invoice.etiquette || <span className="text-gray-400 italic">Non spécifiée</span>}
                                                </td>
                                                <td className="p-4 font-bold text-xs text-slate-800">
                                                    {relatedCase ? relatedCase.name : 'N/A'} <span className="block text-3xs text-slate-400 font-mono mt-0.5">Dossier: {invoice.caseId}</span>
                                                </td>
                                                <td className="p-4 text-xs font-semibold text-slate-600">{invoice.dueDate}</td>
                                                <td className="p-4 text-xs font-mono font-medium text-slate-700 text-right">{formatCurrency(invoice.totalAmount)}</td>
                                                <td className="p-4 text-xs font-mono text-emerald-700 font-bold text-right">{formatCurrency(invoice.paidAmount)}</td>
                                                <td className="p-4 text-xs font-mono font-black text-rose-600 text-right bg-rose-50/20">{formatCurrency(remainingAmount)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 border text-3xs font-black uppercase rounded-lg ${getStatusClass(invoice.status)}`}>
                                                        {invoice.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => setSelectedDetailInvoice(invoice)}
                                                            className="text-indigo-650 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg transition cursor-pointer"
                                                            title="Afficher la facture"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const currentCase = cases.find(c => (c.id || '').toLowerCase() === (invoice.caseId || '').toLowerCase());
                                                                const clientName = currentCase ? currentCase.client : '';
                                                                const currentClient = clients.find(cl => (cl.name || '').toLowerCase() === (clientName || '').toLowerCase());
                                                                const clientEmail = currentClient?.email || `${(clientName || 'client').toLowerCase().replace(/\s+/g, '.')}@entreprise.cd`;
                                                                
                                                                const subject = `📥 Cabinet KBB SARL / Transmission Facture N° ${invoice.id}`;
                                                                let body = `Bonjour,\n\nVous trouverez ci-joint les détails de la facture N° ${invoice.id} liee au dossier "${currentCase?.name || 'Prestations de conseil'}".\n\n- Montant : ${formatCurrency(invoice.totalAmount)}\n- Échéance : ${invoice.dueDate}\n\nSentiments dévoués,\nCabinet KBB SARL`;
                                                                onSendEmail(clientEmail, subject, body, clientName, `FACTURE_${invoice.id}.pdf`);
                                                            }}
                                                            className="text-slate-500 hover:text-indigo-800 bg-slate-50 hover:bg-indigo-55 p-1.5 rounded-lg transition cursor-pointer"
                                                            title="Envoyer la facture par e-mail"
                                                        >
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredInvoices.length > 40 && (
                        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <span className="text-gray-500 dark:text-slate-400 font-medium">
                                Affichage de <strong className="text-gray-800 dark:text-slate-200">{Math.min(displayLimit, filteredInvoices.length)}</strong> sur <strong className="text-gray-800 dark:text-slate-200">{filteredInvoices.length}</strong> factures
                            </span>
                            
                            <div className="flex items-center gap-2">
                                {filteredInvoices.length > displayLimit && (
                                    <button
                                        onClick={() => setDisplayLimit(prev => prev + 40)}
                                        className="px-4 py-2 bg-[#15447c] hover:bg-[#1d5b9f] text-white font-bold rounded-xl shadow-xs transition duration-150 cursor-pointer"
                                    >
                                        Voir plus (+40)
                                    </button>
                                )}

                                {displayLimit < filteredInvoices.length && (
                                    <button
                                        onClick={() => setDisplayLimit(filteredInvoices.length)}
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
            
            <InvoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={onAddInvoice} cases={cases} invoices={invoices} currentUserInfo={currentUserInfo} />

            <InvoiceDetailModal 
                isOpen={!!selectedDetailInvoice}
                onClose={() => setSelectedDetailInvoice(null)}
                invoice={selectedDetailInvoice}
                cases={cases}
                clients={clients}
                onSendEmail={onSendEmail}
            />
        </>
    );
};

export default BillingPage;
