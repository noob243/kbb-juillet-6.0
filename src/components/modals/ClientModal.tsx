
import React, { FC, useState, useEffect } from 'react';
import { Client } from '../../types';
import { FormField, FormInput, FormSectionHeader } from '../common/FormControls';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, 'id'> & { id?: string | number }) => void;
  existingClients?: Client[];
}

const ClientModal: FC<ClientModalProps> = ({ isOpen, onClose, onSave, existingClients = [] }) => {
    const initialFormState = {
        name: '', denomination: '', clientId: '', dossier: '', logo: null as File | null, logoUrl: '', siege: '', secteur: '',
        dirigeant: '', ref1_nom: '', ref1_phone: '', ref1_email: '',
        ref2_nom: '', ref2_phone: '', ref2_email: '', email: '', phone: '',
        typeFacturation: 'Forfaitaire',
    };
    const [formData, setFormData] = useState(initialFormState);
    const [additionalSieges, setAdditionalSieges] = useState<string[]>([]);
    const [idConflictNotice, setIdConflictNotice] = useState<string | null>(null);

    useEffect(() => {
        if (formData.name) {
            const cleanName = formData.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const cleanLetters = cleanName.replace(/[^A-Z0-9]/g, '');
            const words = cleanName.split(/[^A-Z0-9]+/).filter(Boolean);

            // 1. Calculate standard 3-letter initials / prefix
            let initials3 = words.map(w => w[0]).join('').slice(0, 3);
            if (initials3.length < 3 && cleanLetters.length >= 3) {
                initials3 = cleanLetters.slice(0, 3);
            }
            if (initials3.length < 3) {
                initials3 = (initials3 + cleanLetters).padEnd(3, 'X').slice(0, 3);
            }
            const prefix3 = initials3 || 'CLI';

            // Check existing client IDs / prefixes
            const existingIds = existingClients.map(c => String(c.id).toUpperCase());
            const hasPrefixMatch = existingClients.some(c => {
                const idUpper = String(c.id).toUpperCase();
                return idUpper.includes(`CLI-${prefix3}-`) || 
                       idUpper.startsWith(`CLI-${prefix3}`) ||
                       c.name.trim().toLowerCase() === formData.name.trim().toLowerCase();
            });

            let candidateId = '';
            let isConflict = hasPrefixMatch;

            if (isConflict) {
                // Generate 4-letter prefix
                let initials4 = words.map(w => w[0]).join('').slice(0, 4);
                if (initials4.length < 4 && cleanLetters.length >= 4) {
                    initials4 = cleanLetters.slice(0, 4);
                }
                if (initials4.length < 4) {
                    initials4 = (initials4 + cleanLetters).padEnd(4, 'X').slice(0, 4);
                }
                const prefix4 = initials4 || 'CLIE';

                // Random 4-digit number or unique fallback
                let randNum = Math.floor(1000 + Math.random() * 9000);
                candidateId = `CLI-${prefix4}-${randNum}`;
                while (existingIds.includes(candidateId.toUpperCase())) {
                    randNum = Math.floor(1000 + Math.random() * 9000);
                    candidateId = `CLI-${prefix4}-${randNum}`;
                }
                setIdConflictNotice(`Le préfixe ("${prefix3}") existe déjà. ID unique proposé avec préfixe à 4 lettres : ${candidateId}`);
            } else {
                let counter = 1;
                candidateId = `CLI-${prefix3}-${String(counter).padStart(4, '0')}`;
                while (existingIds.includes(candidateId.toUpperCase())) {
                    counter++;
                    candidateId = `CLI-${prefix3}-${String(counter).padStart(4, '0')}`;
                }
                setIdConflictNotice(null);
            }

            setFormData(prev => ({ ...prev, clientId: candidateId }));
        } else {
            setFormData(prev => ({ ...prev, clientId: '' }));
            setIdConflictNotice(null);
        }
    }, [formData.name, existingClients]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ 
                    ...prev, 
                    logo: file, 
                    logoUrl: reader.result as string 
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            id: formData.clientId,
            name: formData.name, 
            denomination: formData.denomination,
            contact: formData.dirigeant || 'Non spécifié', 
            cases: 0,
            email: formData.email,
            phone: formData.phone,
            secteur: formData.secteur,
            siege: formData.siege,
            sieges: additionalSieges.filter(s => s.trim() !== ''),
            dirigeant: formData.dirigeant,
            ref1_nom: formData.ref1_nom,
            ref1_phone: formData.ref1_phone,
            ref1_email: formData.ref1_email,
            ref2_nom: formData.ref2_nom,
            ref2_phone: formData.ref2_phone,
            ref2_email: formData.ref2_email,
            typeFacturation: formData.typeFacturation,
            logoUrl: formData.logoUrl || undefined,
        });
        setFormData(initialFormState);
        setAdditionalSieges([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800">Ajouter un nouveau client</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <FormSectionHeader title="Informations Générales" />
                            
                            <FormField label="Nom client" required>
                                <FormInput type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Rawbank SA" />
                            </FormField>

                            <FormField label="Dénomination client">
                                <FormInput type="text" name="denomination" value={formData.denomination} onChange={handleChange} placeholder="ex: Nom commercial, enseigne..." />
                            </FormField>

                            <FormField label="ID client (auto)" helperText="Généré automatiquement à partir du nom">
                                <FormInput type="text" name="clientId" value={formData.clientId} readOnly className="bg-slate-100 dark:bg-slate-800 font-mono text-xs text-indigo-700 dark:text-indigo-400 font-bold" />
                                {idConflictNotice && (
                                    <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                        <span>⚠️</span> {idConflictNotice}
                                    </p>
                                )}
                            </FormField>

                            <FormField label="Dossier">
                                <FormInput type="text" name="dossier" placeholder="Cliquer pour lier un dossier..." value={formData.dossier} onChange={handleChange} />
                            </FormField>

                            <FormField label="Photo ou Logo">
                                <input type="file" name="logo" onChange={handleFileChange} accept="image/*" className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                            </FormField>

                            <FormField label="E-mail">
                                <FormInput type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contact@entreprise.cd" />
                            </FormField>

                            <FormField label="Téléphone">
                                <FormInput type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+243 ..." />
                            </FormField>

                            <FormField label="Type de facturation" helperText="Sélection multiple possible">
                                <div className="space-y-1.5 border border-slate-200 dark:border-slate-700 p-3 rounded-xl overflow-y-auto max-h-40 bg-slate-50/50 dark:bg-slate-900/50">
                                    {[
                                        { value: 'Forfaitaire', label: 'Forfaitaire' },
                                        { value: 'Taux horaire', label: 'Taux horaire' },
                                        { value: 'Abonnement mensuel', label: 'Abonnement mensuel' },
                                        { value: 'Abonnement annuel', label: 'Abonnement annuel' },
                                        { value: 'Au dossier (Ponctuelle)', label: 'Au dossier (Ponctuelle)' }
                                    ].map(opt => {
                                        const currentTypes = formData.typeFacturation ? formData.typeFacturation.split(',').map((t: string) => t.trim()) : [];
                                        const isChecked = currentTypes.includes(opt.value);
                                        return (
                                            <label key={opt.value} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2 transition">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        let newTypes;
                                                        if (isChecked) {
                                                            newTypes = currentTypes.filter((t: string) => t !== opt.value);
                                                        } else {
                                                            newTypes = [...currentTypes, opt.value];
                                                        }
                                                        setFormData(prev => ({ ...prev, typeFacturation: newTypes.join(', ') }));
                                                    }}
                                                    className="h-4 w-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </FormField>
                        </div>
                        <div className="space-y-4">
                            <FormSectionHeader title="Coordonnées & Référents" />

                            <FormField label="Siège social">
                                <FormInput type="text" name="siege" value={formData.siege} onChange={handleChange} placeholder="Adresse principale" />
                            </FormField>
                            
                            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-indigo-100/50 dark:border-indigo-900/40">
                                    <span className="text-[10px] font-black text-[#15447c] dark:text-indigo-300 uppercase tracking-wider block">adresses additionnelles</span>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                                        {additionalSieges.length} secondaire{additionalSieges.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                {additionalSieges.map((value, index) => (
                                    <div key={index} className="flex gap-2 items-center animate-fadeIn">
                                        <FormInput
                                            type="text"
                                            value={value}
                                            onChange={(e) => {
                                                const updated = [...additionalSieges];
                                                updated[index] = e.target.value;
                                                setAdditionalSieges(updated);
                                            }}
                                            placeholder={`Ex: Avenue Tombalbaye n°${index + 12}, Gombe, Kinshasa`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAdditionalSieges(additionalSieges.filter((_, idx) => idx !== index));
                                            }}
                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold rounded-xl border border-rose-200 hover:border-rose-300 transition-all text-xs flex items-center justify-center w-9 h-9 shrink-0 cursor-pointer"
                                            title="Supprimer cette adresse"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setAdditionalSieges([...additionalSieges, ''])}
                                    className="w-full py-2 px-3 bg-[#15447c]/5 hover:bg-[#15447c]/10 text-[#15447c] dark:text-indigo-300 font-black rounded-xl border border-dashed border-[#15447c]/25 dark:border-indigo-500/30 transition text-[10px] uppercase tracking-widest cursor-pointer"
                                >
                                    + Ajouter un autre siège social/adresse
                                </button>
                            </div>

                            <FormField label="Secteur d'activité">
                                <FormInput type="text" name="secteur" value={formData.secteur} onChange={handleChange} placeholder="Ex: Banque, Telecom, Foncier..." />
                            </FormField>

                            <FormField label="Dirigeant Principal">
                                <FormInput type="text" name="dirigeant" value={formData.dirigeant} onChange={handleChange} placeholder="Nom du DG / Gérant" />
                            </FormField>

                            <div className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Référent 1</p>
                                <div className="space-y-2">
                                    <FormInput type="text" name="ref1_nom" placeholder="Nom complet" value={formData.ref1_nom} onChange={handleChange} />
                                    <FormInput type="tel" name="ref1_phone" placeholder="Téléphone direct" value={formData.ref1_phone} onChange={handleChange} />
                                    <FormInput type="email" name="ref1_email" placeholder="E-mail direct" value={formData.ref1_email} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Référent 2</p>
                                <div className="space-y-2">
                                    <FormInput type="text" name="ref2_nom" placeholder="Nom complet" value={formData.ref2_nom} onChange={handleChange} />
                                    <FormInput type="tel" name="ref2_phone" placeholder="Téléphone direct" value={formData.ref2_phone} onChange={handleChange} />
                                    <FormInput type="email" name="ref2_email" placeholder="E-mail direct" value={formData.ref2_email} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-5 text-xs sm:text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">Annuler</button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2.5 px-6 text-xs sm:text-sm rounded-xl hover:bg-indigo-700 transition shadow-xs cursor-pointer">Enregistrer le client</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
