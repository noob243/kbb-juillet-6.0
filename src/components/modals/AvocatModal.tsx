import React, { FC, useState, useEffect } from 'react';
import { Avocat } from '../../types';
import { ModuleKey } from '../../types/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from '../../services/rbacService';
import { PermissionMatrix } from '../admin/PermissionMatrix';

interface AvocatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avocat: Avocat, password?: string) => void;
  avocats?: Avocat[];
}

const BAR_OPTIONS = [
    'Kinshasa-Gombe',
    'Kinshasa-Matete',
    'Lualaba',
    'Haut Katanga',
    'Kwilu',
    'Kongo Central',
    'Tshopo',
    'Sud-Kivu'
];

const AvocatModal: FC<AvocatModalProps> = ({ isOpen, onClose, onSave, avocats = [] }) => {
    const today = new Date().toISOString().split('T')[0];
    const initialFormState = {
        fullName: '', 
        avocatId: '', 
        photo: null as File | null, 
        photoUrl: '',
        firstOathDate: '', 
        secondOathDate: '',
        onaNumber: '', 
        cabinetStatus: 'Junior', 
        serviceStartDate: today,
        serviceStatus: 'Actif', 
        cabinetRole: '', 
        phone: '', 
        email1: '', 
        email2: '', 
        email3: '',
        password: '',
        disciplinaryMeasures: '',
        selectedBars: [] as string[],
        maritalStatus: 'Célibataire' as 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)',
        physicalAddress: '',
        hasChildren: 'Non' as 'Oui' | 'Non',
        childrenCount: 0,
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const [bankAccounts, setBankAccounts] = useState<Array<{ bankName: string; accountNumber: string; iban?: string; swift?: string }>>([]);
    const [permissions, setPermissions] = useState<ModuleKey[]>(DEFAULT_ROLE_PERMISSIONS.Avocat);

    useEffect(() => {
        if (formData.fullName) {
            const cleanName = formData.fullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const words = cleanName.split(/[^A-Z0-9]+/).filter(Boolean);
            let initials = words.map(w => w[0]).join('');
            if (initials.length < 2 && cleanName.length >= 3) {
                initials = cleanName.slice(0, 3).replace(/[^A-Z0-9]/g, '');
            }
            const finalInitials = initials || 'AVO';
            const count = (avocats ? avocats.length : 0) + 1;
            const generatedId = `AVO-${finalInitials}-${count}`;
            setFormData(prev => ({ ...prev, avocatId: generatedId }));
        } else {
            setFormData(prev => ({ ...prev, avocatId: '' }));
        }
    }, [formData.fullName, avocats]);
    
    if (!isOpen) return null;

    const handleClose = () => {
        setFormData(initialFormState);
        setBankAccounts([]);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({ 
                ...prev, 
                photo: file,
                photoUrl: URL.createObjectURL(file)
            }));
        }
    };

    const handleBarCheckboxChange = (bar: string) => {
        setFormData(prev => {
            const isSelected = prev.selectedBars.includes(bar);
            let updatedBars;
            if (isSelected) {
                updatedBars = prev.selectedBars.filter(b => b !== bar);
            } else {
                updatedBars = [...prev.selectedBars, bar];
            }
            return { ...prev, selectedBars: updatedBars };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const emails = [formData.email1, formData.email2, formData.email3].filter(Boolean);
        const validBankAccounts = bankAccounts.filter(acc => acc.bankName.trim() && acc.accountNumber.trim());
        const newAvocat: Avocat = {
          id: formData.avocatId,
          fullName: formData.fullName,
          photo: formData.photo,
          photoUrl: formData.photoUrl,
          firstOathDate: formData.firstOathDate,
          secondOathDate: formData.secondOathDate,
          onaNumber: formData.onaNumber,
          cabinetStatus: formData.cabinetStatus as any,
          serviceStartDate: formData.serviceStartDate,
          serviceStatus: formData.serviceStatus as any,
          cabinetRole: formData.cabinetRole,
          phone: formData.phone,
          emails: emails,
          disciplinaryMeasures: formData.disciplinaryMeasures,
          barreaux: formData.selectedBars,
          maritalStatus: formData.maritalStatus,
          physicalAddress: formData.physicalAddress,
          hasChildren: formData.hasChildren,
          childrenCount: formData.hasChildren === 'Oui' ? Number(formData.childrenCount) : 0,
          mainBar: formData.selectedBars[0] as any || 'Kinshasa-Gombe',
          secondaryBar: formData.selectedBars.slice(1).join(', '),
          bankAccounts: validBankAccounts,
          permissions: permissions
        };
        onSave(newAvocat, formData.password);
        setFormData(initialFormState);
        setBankAccounts([]);
        setPermissions(DEFAULT_ROLE_PERMISSIONS.Avocat);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800">Ajouter un nouvel avocat</h2>
                    <button onClick={handleClose} className="text-gray-405 hover:text-gray-650 transition p-1 hover:bg-slate-100 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Column 1 */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Noms complets <span className="text-rose-500">*</span></label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl shadow-xs text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" placeholder="Ex: Jean-Luc Tshisekedi" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">ID Avocat (auto)</label>
                                    <input type="text" name="avocatId" value={formData.avocatId} className="w-full p-2.5 border border-gray-300 rounded-xl bg-slate-50 text-slate-500 font-mono text-sm" readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Numéro ONA</label>
                                    <input type="text" name="onaNumber" value={formData.onaNumber} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl shadow-xs text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" placeholder="Ex: ONA-12345" />
                                </div>
                            </div>

                            {/* Profile Image upload & preview block */}
                            <div className="border border-slate-1EC/80 p-4 rounded-2xl bg-slate-50/50 flex items-center gap-4">
                                <div className="h-16 w-16 bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                                    {formData.photoUrl ? (
                                        <img src={formData.photoUrl} alt="Aperçu" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">👨‍⚖️</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Photo de profil</label>
                                    <input type="file" name="photo" onChange={handleFileChange} accept="image/*" className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-gray-700 hover:file:bg-slate-50 cursor-pointer" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">1ère Prestation Serment</label>
                                    <input type="date" name="firstOathDate" value={formData.firstOathDate} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">2ème Prestation Serment</label>
                                    <input type="date" name="secondOathDate" value={formData.secondOathDate} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" />
                                </div>
                            </div>

                            {/* Section: Civil Status / Personal Metadata */}
                            <div className="bg-amber-50/20 p-4 border border-amber-100 rounded-2xl space-y-4">
                                <h3 className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                                    👤 Situation Personnelle
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-3xs font-black uppercase text-amber-850 tracking-wider mb-1">État matrimonial</label>
                                        <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/15 outline-hidden transition">
                                            <option value="Célibataire">Célibataire</option>
                                            <option value="Marié(e)">Marié(e)</option>
                                            <option value="Divorcé(e)">Divorcé(e)</option>
                                            <option value="Veuf(ve)">Veuf(ve)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-3xs font-black uppercase text-amber-850 tracking-wider mb-1">Enfant(s) ?</label>
                                        <select name="hasChildren" value={formData.hasChildren} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/15 outline-hidden transition">
                                            <option value="Non">Non</option>
                                            <option value="Oui">Oui</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.hasChildren === 'Oui' && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-3xs font-black uppercase text-amber-850 tracking-wider mb-1">Combien d'enfants ?</label>
                                        <input type="number" min={1} max={25} name="childrenCount" value={formData.childrenCount} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-xl text-xs col-span-2" placeholder="Ex: 3" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Adresse physique de résidence</label>
                                <input type="text" name="physicalAddress" value={formData.physicalAddress} onChange={handleChange} placeholder="Ex: Avenue de la Justice, Gombe, Kinshasa" className="w-full p-2.5 border border-gray-300 rounded-xl shadow-xs text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" />
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-5">
                            {/* Multiselection Barreaux Panel */}
                            <div className="border border-slate-1TEC/80 p-4 rounded-2xl bg-indigo-50/20">
                                <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-3">
                                    ⚖️ Inscription au(x) Barreau(x)
                                </label>
                                <p className="text-[10px] text-indigo-600 font-bold mb-3">Cochez un ou plusieurs barreaux d'exercice :</p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {BAR_OPTIONS.map(bar => {
                                        const isChecked = formData.selectedBars.includes(bar);
                                        return (
                                            <label 
                                                key={bar} 
                                                className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition text-xs font-semibold ${
                                                    isChecked 
                                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-3xs' 
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    onChange={() => handleBarCheckboxChange(bar)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                />
                                                {bar}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Statut au cabinet</label>
                                    <select name="cabinetStatus" value={formData.cabinetStatus} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition">
                                        <option value="Senior of counsel">Senior of counsel</option>
                                        <option value="Senior">Senior</option>
                                        <option value="Associé">Associé</option>
                                        <option value="Junior">Junior</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Statut d'activité</label>
                                    <select name="serviceStatus" value={formData.serviceStatus} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition">
                                        <option value="Actif">Actif</option>
                                        <option value="Omis">Omis</option>
                                        <option value="Mise en disponibilité">Mise en disponibilité</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Début du service au cabinet</label>
                                    <input type="date" name="serviceStartDate" value={formData.serviceStartDate} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fonction au cabinet</label>
                                    <input type="text" name="cabinetRole" value={formData.cabinetRole} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" placeholder="Ex: Avocat Conseil Principal" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Téléphone de contact</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" placeholder="Ex: +243 812 345 678" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Adresses E-mails <span className="text-rose-500">*</span></label>
                                <div className="space-y-2">
                                    <input type="email" name="email1" placeholder="E-mail principal (Obligatoire pour l'accès)" value={formData.email1} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 transition placeholder:text-gray-400" required />
                                    <input type="email" name="email2" placeholder="E-mail secondaire (Optionnel)" value={formData.email2} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 transition placeholder:text-gray-400" />
                                    <input type="email" name="email3" placeholder="Autre e-mail (Optionnel)" value={formData.email3} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 transition placeholder:text-gray-400" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Mot de passe de connexion <span className="text-rose-500">*</span></label>
                                <input type="password" name="password" placeholder="Saisir un mot de passe (min. 6 caractères)" value={formData.password} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-hidden transition" required minLength={6} />
                            </div>
                        </div>

                        {/* Dynamic bank accounts inputs */}
                        <div className="md:col-span-2 border border-slate-200 p-4 rounded-2xl bg-indigo-50/15">
                            <div className="flex justify-between items-center pb-2 border-b border-indigo-100/50 mb-3_">
                                <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider">💳 Comptes Bancaires associés ({bankAccounts.length})</label>
                                <button 
                                    type="button" 
                                    onClick={() => setBankAccounts(prev => [...prev, { bankName: '', accountNumber: '' }])}
                                    className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase transition shadow-3xs"
                                >
                                    + Ajouter un compte bancaire
                                </button>
                            </div>
                            {bankAccounts.length === 0 ? (
                                <p className="text-2xs text-[#15447c]/60 italic font-medium px-1">Aucun compte bancaire enregistré. Cliquez sur "+ Ajouter un compte bancaire" pour configurer les informations de virement.</p>
                            ) : (
                                <div className="space-y-3 max-h-48 overflow-y-auto pt-1 pr-1">
                                    {bankAccounts.map((acc, index) => (
                                        <div key={index} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-gray-200 shadow-3xs animate-fadeIn">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                                                <div>
                                                    <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Nom de la Banque</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ex: Rawbank, Equity, etc." 
                                                        value={acc.bankName}
                                                        onChange={(e) => {
                                                            const updated = [...bankAccounts];
                                                            updated[index].bankName = e.target.value;
                                                            setBankAccounts(updated);
                                                        }}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Numéro de Compte</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ex: 0101-1234567-89" 
                                                        value={acc.accountNumber}
                                                        onChange={(e) => {
                                                            const updated = [...bankAccounts];
                                                            updated[index].accountNumber = e.target.value;
                                                            setBankAccounts(updated);
                                                        }}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold font-mono"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setBankAccounts(prev => prev.filter((_, idx) => idx !== index))}
                                                className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 hover:text-red-800 rounded-xl text-xs font-bold w-8 h-8 flex items-center justify-center transition shrink-0 self-end mb-0.5"
                                                title="Supprimer ce compte"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Full-width Disciplinary Section */}
                        <div className="md:col-span-2 bg-rose-50/10 border border-slate-200 p-4 rounded-2xl">
                             <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 text-rose-800">Mesures disciplinaires à l'actif de l'avocat</label>
                             <textarea name="disciplinaryMeasures" value={formData.disciplinaryMeasures} onChange={handleChange} rows={2} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition" placeholder="Décrire les mesures disciplinaires s'il y en a, sinon laisser vide."></textarea>
                        </div>

                        {/* Matrix of Rubrics and Module Permissions */}
                        <div className="md:col-span-2 pt-2">
                            <PermissionMatrix 
                                selectedPermissions={permissions} 
                                onChange={setPermissions} 
                            />
                        </div>
                    </div>
                    
                    <div className="mt-8 flex justify-end space-x-4 border-t border-slate-100 pt-5">
                        <button type="button" onClick={handleClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition duration-300">Annuler</button>
                        <button type="submit" className="bg-[#15447c] text-white font-bold py-2.5 px-8 rounded-xl hover:bg-[#15447c]/90 transition duration-300 shadow-sm">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AvocatModal;
