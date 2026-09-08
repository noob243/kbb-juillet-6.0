
import React, { FC, useState, useEffect } from 'react';
import { Invoice, Case } from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  cases: Case[];
  invoices?: Invoice[];
  currentUserInfo?: { name: string; role: string; email: string } | null;
}

const InvoiceModal: FC<InvoiceModalProps> = ({ isOpen, onClose, onSave, cases, invoices = [], currentUserInfo }) => {
    const today = new Date().toISOString().split('T')[0];
    const initialFormState = {
        caseId: '',
        invoiceId: '',
        dueDate: today,
        totalAmount: 0,
        paidAmount: 0,
        status: 'Non réglée' as Invoice['status'],
        etiquette: '',
    };
    const [formData, setFormData] = useState(initialFormState);
    const remainingAmount = formData.totalAmount - formData.paidAmount;

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
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.caseId) {
            alert("Veuillez sélectionner un dossier.");
            return;
        }
        onSave({ 
          ...formData, 
          id: formData.invoiceId, 
          status: formData.status as Invoice['status'],
          createdBy: currentUserInfo?.email || 'admin@cabinet.com'
        });
        setFormData(initialFormState);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800">Enregistrer une facture</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du dossier <span className="text-red-500">*</span></label>
                            <select name="caseId" value={formData.caseId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required>
                                <option value="" disabled>-- Sélectionner un dossier --</option>
                                {cases.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Facture (auto)</label>
                            <input type="text" name="invoiceId" value={formData.invoiceId} className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" readOnly />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Étiquette facture</label>
                            <input type="text" name="etiquette" value={formData.etiquette} onChange={handleChange} placeholder="ex: Honoraires de Conseil - Janvier" className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Échéance de paiement</label>
                            <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                <option>Non réglée</option>
                                <option>En cours</option>
                                <option>Réglée</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant ($)</label>
                            <input type="number" name="totalAmount" value={formData.totalAmount} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant payé ($)</label>
                            <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">Montant restant ($)</label>
                             <input type="number" name="remainingAmount" value={remainingAmount} className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" readOnly />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition duration-300">Annuler</button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-sm">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceModal;
