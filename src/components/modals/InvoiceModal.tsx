import React, { FC, useState, useEffect } from 'react';
import { Invoice, Case, Avocat } from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  cases: Case[];
  invoices?: Invoice[];
  currentUserInfo?: { name: string; role: string; email: string } | null;
  avocats?: Avocat[];
  users?: Array<{ id?: string; name: string; role?: string }>;
}

const InvoiceModal: FC<InvoiceModalProps> = ({ isOpen, onClose, onSave, cases, invoices = [], currentUserInfo, avocats = [], users = [] }) => {
    const today = new Date().toISOString().split('T')[0];

    // Build selectable list of users / signataires (Admins, Associés, Avocats, Secrétariat)
    const signatairesList = React.useMemo(() => {
        const list: Array<{ id: string; name: string; role: string }> = [];
        
        if (currentUserInfo?.name) {
            list.push({
                id: currentUserInfo.email || 'CURRENT_USER',
                name: currentUserInfo.name,
                role: currentUserInfo.role || 'Utilisateur connecté'
            });
        }

        avocats.forEach(av => {
            if (!list.some(item => item.name.toLowerCase() === av.fullName.toLowerCase())) {
                list.push({
                    id: av.id,
                    name: av.fullName,
                    role: av.cabinetStatus || av.cabinetRole || 'Avocat'
                });
            }
        });

        users.forEach(u => {
            if (u.name && !list.some(item => item.name.toLowerCase() === u.name.toLowerCase())) {
                list.push({
                    id: u.id || u.name,
                    name: u.name,
                    role: u.role || 'Personnel / Secrétariat'
                });
            }
        });

        if (list.length === 0) {
            list.push(
                { id: 'SIGN-1', name: 'Me. Jeremie Shusu', role: 'Avocat Associé' },
                { id: 'SIGN-2', name: 'Me. Hervé Michel', role: 'Avocat Associé' },
                { id: 'SIGN-3', name: 'Me. Patrick Bonles', role: 'Avocat Associé' },
                { id: 'SIGN-4', name: 'Me. Katako', role: 'Avocat' },
                { id: 'SIGN-5', name: 'Secrétariat Général', role: 'Secrétariat' }
            );
        }

        return list;
    }, [currentUserInfo, avocats, users]);

    const initialFormState = {
        caseId: '',
        invoiceId: '',
        dueDate: today,
        totalAmount: 0,
        paidAmount: 0,
        status: 'Non réglée' as Invoice['status'],
        etiquette: '',
        numeroFactureNormalisee: '',
        montantFC: '' as string | number,
        montantRestantFC: '' as string | number,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [selectedSignataireIds, setSelectedSignataireIds] = useState<string[]>([]);
    const [isSignataireDropdownOpen, setIsSignataireDropdownOpen] = useState(false);
    const [signataireSearchQuery, setSignataireSearchQuery] = useState('');

    const remainingAmount = Math.max(0, (Number(formData.totalAmount) || 0) - (Number(formData.paidAmount) || 0));

    useEffect(() => {
        if (formData.caseId) {
            const count = (invoices ? invoices.length : 0) + 1;
            const generatedId = `FACT-${formData.caseId}-${count}`;
            setFormData(prev => ({ ...prev, invoiceId: generatedId }));
        } else {
            setFormData(prev => ({ ...prev, invoiceId: '' }));
        }
    }, [formData.caseId, invoices]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : parseFloat(value) || 0) : value,
        }));
    };

    const handleSignataireToggle = (id: string) => {
        setSelectedSignataireIds(prev => {
            const exists = prev.includes(id);
            if (exists) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.caseId) {
            alert("Veuillez sélectionner un dossier.");
            return;
        }

        const selectedSignatairesObjs = signatairesList.filter(s => selectedSignataireIds.includes(s.id));
        const signataireNameJoined = selectedSignatairesObjs.map(s => s.name).join(', ');
        const signataireIdJoined = selectedSignatairesObjs.map(s => s.id).join(', ');

        const numFC = formData.montantFC !== '' ? Number(formData.montantFC) : undefined;
        const numRestantFC = formData.montantRestantFC !== '' ? Number(formData.montantRestantFC) : undefined;

        onSave({ 
          ...formData, 
          id: formData.invoiceId, 
          totalAmount: Number(formData.totalAmount) || 0,
          paidAmount: Number(formData.paidAmount) || 0,
          status: formData.status as Invoice['status'],
          createdBy: currentUserInfo?.email || 'admin@cabinet.com',
          signataireId: signataireIdJoined || undefined,
          signataireName: signataireNameJoined || undefined,
          signataires: selectedSignatairesObjs,
          numeroFactureNormalisee: formData.numeroFactureNormalisee.trim() || undefined,
          montantFC: numFC,
          montantRestantFC: numRestantFC
        });
        setFormData(initialFormState);
        setSelectedSignataireIds([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-800">Établir une facture</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Enregistrement d'honoraires, signature multiple et montants en devises USD / FC</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Nom du dossier <span className="text-red-500">*</span></label>
                            <select name="caseId" value={formData.caseId} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" required>
                                <option value="" disabled>-- Sélectionner un dossier --</option>
                                {cases.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">ID Facture (auto)</label>
                            <input type="text" name="invoiceId" value={formData.invoiceId} className="w-full p-2.5 border border-gray-250 rounded-xl text-sm bg-gray-100 font-mono text-gray-600" readOnly />
                        </div>

                        {/* Signature Facture (Menu déroulant à choix multiples / Multi-select dropdown) */}
                        <div className="md:col-span-2 relative bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <label className="block text-xs font-black uppercase tracking-wider text-[#15447c] mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-[#15447c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Signataire(s) de la facture <span className="text-red-500">*</span>
                                </span>
                                <span className="text-3xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                                    {selectedSignataireIds.length} sélectionné(s)
                                </span>
                            </label>

                            {/* Dropdown trigger box */}
                            <div 
                                onClick={() => setIsSignataireDropdownOpen(!isSignataireDropdownOpen)}
                                className="w-full min-h-[46px] p-2 bg-white hover:bg-slate-50 border border-indigo-200 rounded-xl cursor-pointer flex flex-wrap items-center gap-1.5 shadow-3xs transition focus:ring-2 focus:ring-indigo-500"
                            >
                                {selectedSignataireIds.length === 0 ? (
                                    <span className="text-sm text-gray-400 px-1 font-medium">-- Cliquer pour sélectionner les avocats et signataires --</span>
                                ) : (
                                    signatairesList
                                        .filter(s => selectedSignataireIds.includes(s.id))
                                        .map(s => (
                                            <span key={s.id} className="inline-flex items-center gap-1.5 bg-[#15447c] text-white text-xs font-bold px-3 py-1 rounded-lg shadow-3xs">
                                                <span>{s.name} <span className="text-indigo-200 font-normal">({s.role})</span></span>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSignataireToggle(s.id);
                                                    }}
                                                    className="hover:text-red-200 ml-1 font-black cursor-pointer text-sm"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))
                                )}
                                <div className="ml-auto text-indigo-900 px-2 flex items-center">
                                    <svg className={`w-4 h-4 transform transition-transform ${isSignataireDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Dropdown menu */}
                            {isSignataireDropdownOpen && (
                                <div className="absolute left-4 right-4 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <input 
                                            type="text"
                                            placeholder="Rechercher un avocat, associé, secrétaire..."
                                            value={signataireSearchQuery}
                                            onChange={(e) => setSignataireSearchQuery(e.target.value)}
                                            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsSignataireDropdownOpen(false)}
                                            className="ml-2 text-xs font-bold text-indigo-700 hover:underline px-2.5 py-1 whitespace-nowrap bg-indigo-50 rounded-lg"
                                        >
                                            Fermer
                                        </button>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                                        {signatairesList
                                            .filter(s => s.name.toLowerCase().includes(signataireSearchQuery.toLowerCase()) || s.role.toLowerCase().includes(signataireSearchQuery.toLowerCase()))
                                            .map(s => {
                                                const isSelected = selectedSignataireIds.includes(s.id);
                                                return (
                                                    <div 
                                                        key={s.id}
                                                        onClick={() => handleSignataireToggle(s.id)}
                                                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition text-xs ${
                                                            isSelected ? 'bg-indigo-50 border border-indigo-300 font-bold text-indigo-950' : 'hover:bg-slate-50 text-gray-700 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}} 
                                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                            <div>
                                                                <span className="block font-bold">{s.name}</span>
                                                                <span className="text-[10px] text-gray-500">{s.role}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded font-bold">Sélectionné</span>}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                            <p className="text-3xs text-gray-500 mt-1.5">Menu déroulant multi-select : sélectionnez un ou plusieurs avocats ou membres du secrétariat comme co-signataires.</p>
                        </div>

                        {/* Numéro de Facture Normalisée (Facultatif) */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
                                <span>Numéro facture normalisée <span className="text-gray-400 font-normal lowercase">(facultatif)</span></span>
                                <span className="text-3xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">DGI / Norme Fiscale</span>
                            </label>
                            <input 
                                type="text" 
                                name="numeroFactureNormalisee" 
                                value={formData.numeroFactureNormalisee} 
                                onChange={handleChange} 
                                placeholder="ex: FN-2026-000492 / DGI-RDC" 
                                className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-medium" 
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Étiquette / Libellé des honoraires</label>
                            <input type="text" name="etiquette" value={formData.etiquette} onChange={handleChange} placeholder="ex: Honoraires de Conseil & Plaidoirie - Janvier" className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-medium" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Échéance de paiement</label>
                            <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Statut</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none">
                                <option value="Non réglée">Non réglée</option>
                                <option value="En cours">En cours</option>
                                <option value="Réglée">Réglée</option>
                            </select>
                        </div>

                        {/* Montants en USD */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Montant Total ($ USD)</label>
                            <input type="number" step="any" min="0" name="totalAmount" value={formData.totalAmount} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Montant payé ($ USD)</label>
                            <input type="number" step="any" min="0" name="paidAmount" value={formData.paidAmount} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" />
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Montant restant calculé ($ USD)</label>
                             <input type="text" value={`$ ${remainingAmount.toLocaleString()}`} className="w-full p-2.5 border border-gray-250 rounded-xl text-sm bg-gray-100 font-bold text-gray-700" readOnly />
                        </div>

                        {/* Montants en Franc Congolais (FC) (Facultatifs) - Identique aux autres champs */}
                        <div className="md:col-span-2 pt-2 border-t border-slate-100 space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center justify-between">
                                <span>Montants équivalents en Francs Congolais (FC / CDF) <span className="text-gray-400 font-normal lowercase">(facultatif)</span></span>
                                <span className="text-3xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Devise CDF / FC</span>
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Montant Total en FC</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        min="0"
                                        name="montantFC" 
                                        value={formData.montantFC} 
                                        onChange={handleChange} 
                                        placeholder="ex: 5600000" 
                                        className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Montant restant en FC</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        min="0"
                                        name="montantRestantFC" 
                                        value={formData.montantRestantFC} 
                                        onChange={handleChange} 
                                        placeholder="ex: 1200000" 
                                        className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" 
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-gray-700 font-bold py-2.5 px-6 rounded-xl hover:bg-slate-200 transition text-sm">Annuler</button>
                        <button type="submit" className="bg-[#15447c] text-white font-bold py-2.5 px-7 rounded-xl hover:bg-[#113763] transition text-sm shadow-md shadow-indigo-900/10 flex items-center gap-2">
                            <span>Valider & Enregistrer</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceModal;
