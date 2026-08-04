import React, { FC, useState, useEffect } from 'react';
import { Fournisseur, Referent } from '../../types';

interface FournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fournisseur: Fournisseur) => void;
  fournisseurs?: Fournisseur[];
}

const FournisseurModal: FC<FournisseurModalProps> = ({ isOpen, onClose, onSave, fournisseurs = [] }) => {
    const initialReferent: Referent = { nom: '', phone: '', email: '' };
    const [logo, setLogo] = useState<string>('');
    
    const [formData, setFormData] = useState({
        nomComplet: '',
        fournisseurId: '',
        naturePrestation: 'Services' as 'Bien' | 'Services' | 'Baie locative',
        designationPrestation: '',
        typeFacturation: 'Périodique' as 'Périodique' | 'Ponctuelle',
        periode: 'mensuel' as 'mensuel' | 'trimestriel' | 'Annuel',
        montant: 0,
        adressePhysique: '',
        adresseMail: '',
        dirigeantPrincipal: '',
    });

    const [referents, setReferents] = useState<Referent[]>([{ ...initialReferent }]);

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                nomComplet: '',
                fournisseurId: '',
                naturePrestation: 'Services',
                designationPrestation: '',
                typeFacturation: 'Périodique',
                periode: 'mensuel',
                montant: 0,
                adressePhysique: '',
                adresseMail: '',
                dirigeantPrincipal: '',
            });
            setReferents([{ ...initialReferent }]);
            setLogo('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.nomComplet) {
            const cleanName = formData.nomComplet.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const words = cleanName.split(/[^A-Z0-9]+/).filter(Boolean);
            let initials = words.map(w => w[0]).join('');
            if (initials.length < 2 && cleanName.length >= 3) {
                initials = cleanName.slice(0, 3).replace(/[^A-Z0-9]/g, '');
            }
            const finalInitials = initials || 'FOUR';
            const count = (fournisseurs ? fournisseurs.length : 0) + 1;
            const generatedId = `FOUR-${finalInitials}-${count}`;
            setFormData(prev => ({ ...prev, fournisseurId: generatedId }));
        } else {
            setFormData(prev => ({ ...prev, fournisseurId: '' }));
        }
    }, [formData.nomComplet, fournisseurs]);

    if (!isOpen) return null;

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setLogo(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'montant') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleReferentChange = (index: number, field: keyof Referent, value: string) => {
        const updated = [...referents];
        updated[index] = { ...updated[index], [field]: value };
        setReferents(updated);
    };

    const addReferent = () => {
        setReferents(prev => [...prev, { ...initialReferent }]);
    };

    const removeReferent = (index: number) => {
        if (referents.length > 1) {
            setReferents(prev => prev.filter((_, i) => i !== index));
        } else {
            setReferents([{ ...initialReferent }]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter out completely empty referents
        const cleanedReferents = referents.filter(ref => ref.nom.trim() !== '' || ref.phone.trim() !== '' || ref.email.trim() !== '');

        const newFournisseur: Fournisseur = {
            id: formData.fournisseurId || `FOUR-${Date.now().toString().slice(-4)}`,
            nomComplet: formData.nomComplet,
            logo: logo || undefined,
            naturePrestation: formData.naturePrestation,
            designationPrestation: formData.designationPrestation,
            typeFacturation: formData.typeFacturation,
            periode: formData.typeFacturation === 'Périodique' ? formData.periode : undefined,
            montant: formData.montant,
            adressePhysique: formData.adressePhysique,
            adresseMail: formData.adresseMail,
            dirigeantPrincipal: formData.dirigeantPrincipal,
            referents: cleanedReferents.length > 0 ? cleanedReferents : []
        };

        onSave(newFournisseur);
        onClose();
    };

    return (
        <div id="fournisseur-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div id="fournisseur-modal-content" className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn custom-scrollbar">
                
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-gray-150 mb-6">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
                            💼 Enregistrer un nouveau fournisseur
                        </h2>
                        <p className="text-2xs text-gray-400 font-bold tracking-wide mt-1">Identification, prestations, facturation et référents du cabinet</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* General Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-700 border-b border-slate-100 pb-1.5">1. Informations générales</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Nom complet du fournisseur <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    name="nomComplet" 
                                    value={formData.nomComplet} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Ex: Orange RDC, Papeterie du Progrès..." 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white hover:border-gray-300 transition" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">ID Fournisseur (auto)</label>
                                <input 
                                    type="text" 
                                    name="fournisseurId" 
                                    value={formData.fournisseurId} 
                                    readOnly 
                                    placeholder="Généré automatiquement..." 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-hidden bg-slate-50 text-slate-500 font-mono" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Dirigeant principal</label>
                                <input 
                                    type="text" 
                                    name="dirigeantPrincipal" 
                                    value={formData.dirigeantPrincipal} 
                                    onChange={handleChange} 
                                    placeholder="Nom du directeur / gérant" 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white hover:border-gray-300 transition" 
                                />
                            </div>
                        </div>

                        {/* Logo section */}
                        <div className="bg-slate-50/50 border border-dashed border-gray-200 rounded-xl p-4">
                            <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-2">Logo du fournisseur (Fichier ou URL)</label>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Image Preview & Picker */}
                                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 shadow-xs">
                                    {logo ? (
                                        <img src={logo} alt="Logo preview" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                                    ) : (
                                        <span className="text-gray-300 text-lg">🏢</span>
                                    )}
                                </div>
                                
                                <div className="flex-1 w-full space-y-2">
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer inline-flex items-center justify-center px-3 py-2 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-150 rounded-lg text-2xs font-bold text-indigo-700 transition">
                                            <span>📁 Choisir un logo...</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleLogoChange} 
                                                className="hidden" 
                                            />
                                        </label>
                                        
                                        {logo && (
                                            <button 
                                                type="button" 
                                                onClick={() => setLogo('')} 
                                                className="px-2.5 py-1.5 text-2xs font-bold text-rose-650 hover:text-rose-800 hover:bg-rose-50/70 rounded-lg transition"
                                            >
                                                Supprimer
                                            </button>
                                        )}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Ou coller l'URL d'une image de logo..." 
                                        value={logo.startsWith('data:') ? '' : logo}
                                        onChange={(e) => setLogo(e.target.value)}
                                        className="w-full text-3xs p-2 border border-gray-200 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white hover:border-gray-250 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Adresse physique</label>
                                <input 
                                    type="text" 
                                    name="adressePhysique" 
                                    value={formData.adressePhysique} 
                                    onChange={handleChange} 
                                    placeholder="Ex: Av. de la Justice, Kinshasa/Gombe" 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white hover:border-gray-300 transition" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Adresse mail de contact</label>
                                <input 
                                    type="email" 
                                    name="adresseMail" 
                                    value={formData.adresseMail} 
                                    onChange={handleChange} 
                                    placeholder="Ex: billing@orange.cd" 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white hover:border-gray-300 transition" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Prestation & Payment specs */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-700 border-b border-slate-100 pb-1.5">2. Nature & détails prestation</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Nature de prestation</label>
                                <select 
                                    name="naturePrestation" 
                                    value={formData.naturePrestation} 
                                    onChange={handleChange} 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl shadow-2xs bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:border-gray-300 transition"
                                >
                                    <option value="Services">Services (Prestations, Conseil, Internet, sécurité...)</option>
                                    <option value="Bien">Bien (Matériel, Consommables, Mobilier, Fournitures...)</option>
                                    <option value="Baie locative">Baie locative (Hébergement, Rack, Serveurs...)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Désignation de la prestation <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    name="designationPrestation" 
                                    value={formData.designationPrestation} 
                                    onChange={handleChange} 
                                    required
                                    placeholder="Ex: Maintenance IT ou Fournitures rames papier A4..." 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white hover:border-gray-300 transition" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-50/20 border border-indigo-105">
                            <div>
                                <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Type de facturation</label>
                                <select 
                                    name="typeFacturation" 
                                    value={formData.typeFacturation} 
                                    onChange={handleChange} 
                                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                                >
                                    <option value="Périodique">Périodique (Abonnements récurrents)</option>
                                    <option value="Ponctuelle">Ponctuelle (Factures à la commande / uniques)</option>
                                </select>
                            </div>

                            {formData.typeFacturation === 'Périodique' ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Périodicité</label>
                                        <select 
                                            name="periode" 
                                            value={formData.periode} 
                                            onChange={handleChange} 
                                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                                        >
                                            <option value="mensuel">Mensuel</option>
                                            <option value="trimestriel">Trimestriel</option>
                                            <option value="Annuel">Annuel</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Montant ($ USD)</label>
                                        <input 
                                            type="number" 
                                            name="montant" 
                                            value={formData.montant || ''} 
                                            onChange={handleChange} 
                                            min="0"
                                            placeholder="Ex: 500" 
                                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold" 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-2xs font-bold text-gray-650 tracking-wide mb-1.5">Montant unique ($ USD)</label>
                                    <input 
                                        type="number" 
                                        name="montant" 
                                        value={formData.montant || ''} 
                                        onChange={handleChange} 
                                        min="0"
                                        placeholder="Ex: 1200" 
                                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold" 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Referents / Contacts list */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                            <h3 className="text-xs font-bold text-indigo-700">3. Représentants / référents chez le prestataire</h3>
                            <button 
                                type="button" 
                                onClick={addReferent}
                                className="text-2xs px-3 py-1.5 font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-1100 transition flex items-center gap-1"
                            >
                                ＋ Ajouter un référent
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            {referents.map((ref, idx) => (
                                <div key={idx} className="relative p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {referents.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeReferent(idx)}
                                            className="absolute -top-2 -right-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 p-1 rounded-full shadow-3xs transition"
                                            title="Retirer ce référent"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                    <div>
                                        <label className="block text-2xs font-bold text-gray-650 mb-1.5">Nom complet</label>
                                        <input 
                                            type="text" 
                                            value={ref.nom} 
                                            onChange={(e) => handleReferentChange(idx, 'nom', e.target.value)}
                                            placeholder="Ex: Jean Kabasele" 
                                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:border-gray-300 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-2xs font-bold text-gray-650 mb-1.5">Numéro de téléphone</label>
                                        <input 
                                            type="tel" 
                                            value={ref.phone} 
                                            onChange={(e) => handleReferentChange(idx, 'phone', e.target.value)}
                                            placeholder="Ex: 0812345678" 
                                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:border-gray-300 transition font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-2xs font-bold text-gray-650 mb-1.5">Adresse mail</label>
                                        <input 
                                            type="email" 
                                            value={ref.email} 
                                            onChange={(e) => handleReferentChange(idx, 'email', e.target.value)}
                                            placeholder="Ex: j.kabasele@orange.cd" 
                                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:border-gray-300 transition"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="text-xs font-black px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-slate-50 transition text-gray-600"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit" 
                            className="text-xs font-black px-6 py-2.5 bg-[#15447c] hover:bg-[#113562] text-white rounded-xl shadow-xs hover:shadow-sm transition"
                        >
                            Enregistrer le fournisseur
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default FournisseurModal;
