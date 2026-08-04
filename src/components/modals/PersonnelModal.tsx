import React, { FC, useState, useEffect } from 'react';
import { Personnel } from '../../types';
import { ModuleKey } from '../../types/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from '../../services/rbacService';
import { PermissionMatrix } from '../admin/PermissionMatrix';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personnel: Personnel, password?: string) => void;
  personnels?: Personnel[];
}

const PersonnelModal: FC<PersonnelModalProps> = ({ isOpen, onClose, onSave, personnels = [] }) => {
    const today = new Date().toISOString().split('T')[0];
    const initialFormState = {
        fullName: '',
        personnelId: '',
        role: 'Secrétaire',
        category: 'Administratif' as 'Administratif' | 'Office',
        serviceStartDate: today,
        serviceStatus: 'Actif' as const,
        phone: '',
        email: '',
        password: '',
        salary: 800,
        maritalStatus: 'Célibataire' as const,
        hasChildren: 'Non' as const,
        childrenCount: 0,
        address: '',
        photo: '',
        disciplinaryMeasure: '',
        disciplinaryStatus: 'Aucune'
    };
    const [formData, setFormData] = useState(initialFormState);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [permissions, setPermissions] = useState<ModuleKey[]>(DEFAULT_ROLE_PERMISSIONS.Personnel);
    const [bankAccounts, setBankAccounts] = useState<Array<{ bankName: string; accountNumber: string; iban?: string; swift?: string }>>([]);

    useEffect(() => {
        if (formData.fullName) {
            const cleanName = formData.fullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const words = cleanName.split(/[^A-Z0-9]+/).filter(Boolean);
            let initials = words.map(w => w[0]).join('');
            if (initials.length < 2 && cleanName.length >= 3) {
                initials = cleanName.slice(0, 3).replace(/[^A-Z0-9]/g, '');
            }
            const finalInitials = initials || 'PERS';
            const count = (personnels ? personnels.length : 0) + 1;
            const generatedId = `PERS-${finalInitials}-${count}`;
            setFormData(prev => ({ ...prev, personnelId: generatedId }));
        } else {
            setFormData(prev => ({ ...prev, personnelId: '' }));
        }
    }, [formData.fullName, personnels]);

    useEffect(() => {
        if (!isOpen) {
            setFormData(initialFormState);
            setPreviewUrl('');
            setPermissions(DEFAULT_ROLE_PERMISSIONS.Personnel);
            setBankAccounts([]);
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    const rolesWithAuth = ['Secrétaire', 'Stagiaire', 'Assistant juridique', 'Assistant de direction'];
    const requiresAuth = rolesWithAuth.includes(formData.role);

    const handleClose = () => {
        setFormData(initialFormState);
        setPreviewUrl('');
        setPermissions(DEFAULT_ROLE_PERMISSIONS.Personnel);
        setBankAccounts([]);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'salary') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else if (name === 'childrenCount') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
        } else if (name === 'role') {
            const officeRoles = ['Chauffeur', 'Cleaner', 'Courtier', 'Intendant'];
            const autoCat = officeRoles.includes(value) ? 'Office' : 'Administratif';
            setFormData(prev => ({ ...prev, role: value, category: autoCat }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPreviewUrl(base64String);
                setFormData(prev => ({ ...prev, photo: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validBankAccounts = bankAccounts.filter(acc => acc.bankName.trim() && acc.accountNumber.trim());
        const newPersonnel: Personnel = {
          id: formData.personnelId,
          fullName: formData.fullName,
          role: formData.role,
          category: formData.category,
          serviceStartDate: formData.serviceStartDate,
          serviceStatus: formData.serviceStatus,
          phone: formData.phone,
          email: formData.email,
          salary: formData.salary,
          maritalStatus: formData.maritalStatus,
          hasChildren: formData.hasChildren,
          childrenCount: formData.hasChildren === 'Oui' ? formData.childrenCount : 0,
          address: formData.address,
          photo: formData.photo,
          disciplinaryMeasure: formData.disciplinaryMeasure || 'Aucune',
          disciplinaryStatus: formData.disciplinaryStatus || 'Aucune',
          bankAccounts: validBankAccounts,
          permissions: permissions
        };
        const rolesWithAuth = ['Secrétaire', 'Stagiaire', 'Assistant juridique', 'Assistant de direction'];
        const requiresAuth = rolesWithAuth.includes(formData.role);
        onSave(newPersonnel, requiresAuth ? formData.password : undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight">Ajouter un nouveau personnel</h2>
                        <p className="text-2xs text-gray-400 font-bold mt-1 uppercase">Saisie d'un nouveau profil collaborateur</p>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-gray-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Photo upload section with gorgeous circular frame preview */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-gray-150 rounded-xl">
                        <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Aperçu photo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl">👤</span>
                            )}
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <label className="block text-2xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">Photo de profil</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handlePhotoChange} 
                                className="hidden" 
                                id="personnel-photo-upload" 
                            />
                            <label 
                                htmlFor="personnel-photo-upload" 
                                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-indigo-900 border border-gray-250 text-2xs px-3 py-1.5 rounded-xl cursor-pointer transition font-bold shadow-3xs"
                            >
                                <span>📷</span> Choisir une photo
                            </label>
                            <p className="text-[10px] text-gray-400 mt-1 font-semibold">Taille recommandée : carrée, max 2Mo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Noms complets <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                name="fullName" 
                                value={formData.fullName} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm" 
                                placeholder="ex: Jean de Dieu Kabeya"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Identifiant Personnel (Généré)</label>
                            <input 
                                type="text" 
                                name="personnelId" 
                                value={formData.personnelId} 
                                className="w-full p-2.5 border border-gray-350 rounded-lg shadow-3xs text-sm bg-gray-50 text-gray-500 font-mono" 
                                readOnly 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Rôle / Fonction <span className="text-red-500">*</span></label>
                            <select 
                                name="role" 
                                value={formData.role} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold"
                            >
                                <option value="Secrétaire">Secrétaire</option>
                                <option value="Stagiaire">Stagiaire</option>
                                <option value="Assistant juridique">Assistant juridique</option>
                                <option value="Chauffeur">Chauffeur</option>
                                <option value="Assistant de direction">Assistant de direction</option>
                                <option value="Cleaner">Cleaner</option>
                                <option value="Courtier">Courtier</option>
                                <option value="Intendant">Intendant</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Catégorie <span className="text-red-500">*</span></label>
                            <select 
                                name="category" 
                                value={formData.category} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold"
                            >
                                <option value="Administratif">Administratif</option>
                                <option value="Office">Office</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Salaire (Mensuel USD) <span className="text-red-500">*</span></label>
                            <input 
                                type="number" 
                                name="salary" 
                                value={formData.salary || ''} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm font-semibold font-mono" 
                                placeholder="ex: 1200"
                                min="0"
                                required 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">État matrimonial <span className="text-red-500">*</span></label>
                            <select 
                                name="maritalStatus" 
                                value={formData.maritalStatus} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold"
                            >
                                <option value="Célibataire">Célibataire</option>
                                <option value="Marié(e)">Marié(e)</option>
                                <option value="Divorcé(e)">Divorcé(e)</option>
                                <option value="Veuf(ve)">Veuf(ve)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Enfants ?</label>
                                <select 
                                    name="hasChildren" 
                                    value={formData.hasChildren} 
                                    onChange={handleChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold"
                                >
                                    <option value="Non">Non</option>
                                    <option value="Oui">Oui</option>
                                </select>
                            </div>
                            {formData.hasChildren === 'Oui' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Combien ? <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" 
                                        name="childrenCount" 
                                        value={formData.childrenCount} 
                                        onChange={handleChange} 
                                        className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm font-semibold font-mono" 
                                        min="1" 
                                        required 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Téléphone <span className="text-red-500">*</span></label>
                            <input 
                                type="tel" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm font-mono font-semibold" 
                                placeholder="ex: 0812345678" 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Adresse E-mail <span className="text-red-500">*</span></label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm font-semibold" 
                                placeholder="ex: exemple@cabinet.com" 
                                required 
                            />
                        </div>
                    </div>

                    {requiresAuth && (
                        <div className="animate-fadeIn p-4 bg-indigo-50/15 border border-indigo-200/50 rounded-xl space-y-1 shadow-3xs">
                            <label className="block text-xs font-extrabold text-indigo-900 mb-1 uppercase tracking-wider">🔐 Mot de passe d'accès <span className="text-red-500">*</span></label>
                            <input 
                                type="password" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm bg-white" 
                                placeholder="Saisir un mot de passe (min. 6 caractères)" 
                                required={requiresAuth}
                                minLength={6}
                            />
                            <p className="text-[10px] text-indigo-600 font-bold">⚠️ En tant que {formData.role.toLowerCase()}, cet agent disposera d'un accès avec ce mot de passe.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Date de début de service</label>
                            <input 
                                type="date" 
                                name="serviceStartDate" 
                                value={formData.serviceStartDate} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Statut de service</label>
                            <select 
                                name="serviceStatus" 
                                value={formData.serviceStatus} 
                                onChange={handleChange} 
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold"
                            >
                                <option value="Actif">Actif</option>
                                <option value="Inactif">Inactif</option>
                                <option value="Mise en disponibilité">Mise en disponibilité</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Adresse de résidence <span className="text-red-500">*</span></label>
                        <textarea 
                            name="address" 
                            value={formData.address} 
                            onChange={handleChange} 
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm focus:ring-2 focus:ring-indigo-500/10 transition min-h-[75px]" 
                            placeholder="ex: Av. Kisangani 24, C/ Gombe, Kinshasa"
                            required
                        />
                    </div>

                    <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl space-y-3 shadow-3xs">
                        <h4 className="text-2xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                            ⚠️ Mesure Disciplinaire & Statut
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Statut de la mesure</label>
                                <select 
                                    name="disciplinaryStatus" 
                                    value={formData.disciplinaryStatus} 
                                    onChange={handleChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-xs font-semibold bg-white"
                                >
                                    <option value="Aucune">Aucune mesure</option>
                                    <option value="En cours d'instruction">En cours d'instruction</option>
                                    <option value="Avertissement oral">Avertissement oral</option>
                                    <option value="Avertissement écrit">Avertissement écrit</option>
                                    <option value="Blâme">Blâme</option>
                                    <option value="Mise à pied">Mise à pied</option>
                                    <option value="Suspension temporaire">Suspension temporaire</option>
                                    <option value="Licenciement">Licenciement</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Intitulé / Détails de la mesure</label>
                                <input 
                                    type="text" 
                                    name="disciplinaryMeasure" 
                                    value={formData.disciplinaryMeasure} 
                                    onChange={handleChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg shadow-3xs text-sm" 
                                    placeholder="ex: Retards accumulés, Blâme écrit le 12/04" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic bank accounts inputs */}
                    <div className="border border-indigo-200/60 p-4 rounded-xl bg-indigo-50/15 max-w-full">
                        <div className="flex justify-between items-center pb-2 border-b border-indigo-200/30 mb-3_">
                            <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider">💳 Comptes Bancaires associés ({bankAccounts.length})</label>
                            <button 
                                type="button" 
                                onClick={() => setBankAccounts(prev => [...prev, { bankName: '', accountNumber: '' }])}
                                className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase transition shadow-2xs"
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

                    {/* Matrix of Rubrics and Module Permissions */}
                    <div className="pt-2">
                        <PermissionMatrix 
                            selectedPermissions={permissions} 
                            onChange={setPermissions} 
                        />
                    </div>

                    <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-150">
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition duration-150 text-xs border border-gray-200"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit" 
                            className="bg-[#15447c] hover:bg-[#1a5192] text-white font-bold py-2.5 px-6 rounded-xl transition duration-150 shadow-sm text-xs"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PersonnelModal;
