import React, { FC, useState, useEffect, useRef } from 'react';
import { Case, Client, Avocat, Task, CaseProcedure } from '../../types';
import { FormField, FormInput, FormSelect, FormTextarea, FormSectionHeader } from '../common/FormControls';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dossier: Case, tasks?: Omit<Task, 'id'>[]) => void;
  clients: Client[];
  avocats?: Avocat[];
  cases?: Case[];
}

const CaseModal: FC<CaseModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    clients, 
    avocats = [],
    cases = []
}) => {
    const today = new Date().toISOString().split('T')[0];
    
    const initialFormState = {
        name: '',
        dossierId: '',
        dateCreation: today,
        client: '',
        adversaire: '',
        adversaires: [] as string[],
        objet: '',
        procedures: [] as CaseProcedure[],
        avocatTitulaire: '',
        avocatsSurDossier: '',
        notes: '',
        status: 'En cours' as Case['status'],
        attachments: [] as File[],
        tags: [] as string[],
    };

    const [formData, setFormData] = useState(initialFormState);
    const [tagInput, setTagInput] = useState('');
    const [adversaryInput, setAdversaryInput] = useState('');
    const [isLawyersDropdownOpen, setIsLawyersDropdownOpen] = useState(false);
    const lawyersDropdownRef = useRef<HTMLDivElement>(null);
    const [isLeadLawyersDropdownOpen, setIsLeadLawyersDropdownOpen] = useState(false);
    const leadLawyersDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (formData.client) {
            const selectedClient = clients.find(c => c.id.toString() === formData.client);
            if (selectedClient) {
                const clientName = selectedClient.name || '';
                const cleanClientName = clientName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
                const prefix = cleanClientName.slice(0, 4) || 'CLIE';
                const nextNum = (cases ? cases.length : 0) + 1;
                const generatedId = `DOS-${prefix}-${nextNum}`;
                setFormData(prev => ({ ...prev, dossierId: generatedId }));
            }
        } else {
             setFormData(prev => ({ ...prev, dossierId: '' }));
         }
    }, [formData.client, clients]);

    // Close lawyers custom dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (lawyersDropdownRef.current && !lawyersDropdownRef.current.contains(e.target as Node)) {
                setIsLawyersDropdownOpen(false);
            }
            if (leadLawyersDropdownRef.current && !leadLawyersDropdownRef.current.contains(e.target as Node)) {
                setIsLeadLawyersDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...Array.from(e.target.files!)] }));
            e.target.value = ''; 
        }
    };

    const handleRemoveAttachment = (indexToRemove: number) => {
        setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, index) => index !== indexToRemove) }));
    };

    const handleToggleLawyer = (name: string) => {
        const selectedLawyers = formData.avocatsSurDossier 
            ? formData.avocatsSurDossier.split(',').map(item => item.trim()).filter(Boolean) 
            : [];
        let newSelected;
        if (selectedLawyers.includes(name)) {
            newSelected = selectedLawyers.filter(item => item !== name);
        } else {
            newSelected = [...selectedLawyers, name];
        }
        setFormData(prev => ({ ...prev, avocatsSurDossier: newSelected.join(', ') }));
    };

    const handleToggleLeadLawyer = (name: string) => {
        const selectedLeadLawyers = formData.avocatTitulaire 
            ? formData.avocatTitulaire.split(',').map(item => item.trim()).filter(Boolean) 
            : [];
        let newSelected;
        if (selectedLeadLawyers.includes(name)) {
            newSelected = selectedLeadLawyers.filter(item => item !== name);
        } else {
            newSelected = [...selectedLeadLawyers, name];
        }
        setFormData(prev => ({ ...prev, avocatTitulaire: newSelected.join(', ') }));
    };

    const handleAddTag = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanTag = tagInput.trim().toLowerCase();
        if (cleanTag && !formData.tags.includes(cleanTag)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleAddAdversary = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanAdversary = adversaryInput.trim();
        if (cleanAdversary && !formData.adversaires.includes(cleanAdversary)) {
            setFormData(prev => ({ 
                ...prev, 
                adversaires: [...prev.adversaires, cleanAdversary] 
            }));
        }
        setAdversaryInput('');
    };

    const handleRemoveAdversary = (adversaryToRemove: string) => {
        setFormData(prev => ({ 
            ...prev, 
            adversaires: prev.adversaires.filter(a => a !== adversaryToRemove) 
        }));
    };

    const handleAdversaryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddAdversary();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedClient = clients.find(c => c.id.toString() === formData.client);

        // Backward compatibility properties using the first procedure
        const primaryProc = formData.procedures[0];

        onSave({
            id: formData.dossierId,
            name: formData.name,
            client: selectedClient ? selectedClient.name : 'N/A',
            status: formData.status,
            nextHearing: null,
            procedures: formData.procedures,
            procedure: primaryProc?.name || '',
            procedureInstance: primaryProc?.instance || '',
            procedureObjet: primaryProc?.objet || '',
            procedureDateDebut: primaryProc?.dateDebut || '',
            procedureDateFin: primaryProc?.dateFin || '',
            procedureStatus: primaryProc?.status || '',
            notes: formData.notes,
            avocatTitulaire: formData.avocatTitulaire,
            avocatsSurDossier: formData.avocatsSurDossier,
            tags: formData.tags,
            adversaires: formData.adversaires,
            adversaire: formData.adversaires.join(', '),
        }, []);

        setFormData(initialFormState);
        onClose();
    };

    const selectedLawyersList = formData.avocatsSurDossier 
        ? formData.avocatsSurDossier.split(',').map(item => item.trim()).filter(Boolean) 
        : [];

    const selectedLeadLawyersList = formData.avocatTitulaire 
        ? formData.avocatTitulaire.split(',').map(item => item.trim()).filter(Boolean) 
        : [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800">Créer un nouveau dossier</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-650 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField label="Sélectionner un client" required>
                            <FormSelect name="client" value={formData.client} onChange={handleChange} required>
                                <option value="" disabled>-- Sélectionner un client --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </FormSelect>
                        </FormField>

                        <FormField label="ID Dossier (généré automatiquement)">
                            <FormInput type="text" name="dossierId" placeholder="Sélectionnez un client d'abord" value={formData.dossierId} className="bg-slate-100 dark:bg-slate-800 font-mono text-indigo-700 dark:text-indigo-400 font-bold" readOnly />
                        </FormField>

                        <FormField label="Nom du dossier" required>
                            <FormInput type="text" name="name" placeholder="Ex: Rawbank vs Société X" value={formData.name} onChange={handleChange} required />
                        </FormField>

                        <FormField label="Date de création">
                            <FormInput type="date" name="dateCreation" value={formData.dateCreation} onChange={handleChange} />
                        </FormField>

                        <div className="md:col-span-2 bg-slate-50/60 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Adversaires (Plusieurs possibles)
                            </label>
                            <div className="flex gap-2">
                                <FormInput 
                                    type="text" 
                                    placeholder="Saisissez le nom d'un adversaire (ex: Entreprise X) puis cliquez sur Ajouter" 
                                    value={adversaryInput}
                                    onChange={(e) => setAdversaryInput(e.target.value)}
                                    onKeyDown={handleAdversaryKeyDown}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => handleAddAdversary()}
                                    className="bg-[#15447c] hover:bg-[#15447c]/90 text-white font-bold py-2 px-4 rounded-xl text-xs transition shrink-0 cursor-pointer"
                                >
                                    Ajouter
                                </button>
                            </div>
                            {formData.adversaires && formData.adversaires.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {formData.adversaires.map(adv => (
                                        <span 
                                            key={adv}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900/60"
                                        >
                                            {adv}
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveAdversary(adv)}
                                                className="text-rose-500 hover:text-rose-700 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded px-1 cursor-pointer"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pt-1">Aucun adversaire ajouté pour le moment.</p>
                            )}
                        </div>

                        <FormField label="Objet principal">
                            <FormInput type="text" name="objet" placeholder="Ex: Recouvrement de créances..." value={formData.objet} onChange={handleChange} />
                        </FormField>
                        
                        <FormField label="Statut du dossier">
                            <FormSelect name="status" value={formData.status} onChange={handleChange} required>
                                <option value="En cours">En cours</option>
                                <option value="En attente">En attente</option>
                                <option value="Clôturé">Clôturé</option>
                            </FormSelect>
                        </FormField>
                        
                        <div className="relative" ref={leadLawyersDropdownRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avocats titulaires sur le dossier</label>
                            <div 
                               onClick={() => setIsLeadLawyersDropdownOpen(!isLeadLawyersDropdownOpen)}
                               className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer min-h-[42px] flex flex-wrap gap-1.5 items-center justify-between"
                            >
                                {selectedLeadLawyersList.length === 0 ? (
                                    <span className="text-gray-400 text-sm">Cliquer pour choisir les titulaires...</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedLeadLawyersList.map(name => (
                                            <span 
                                                key={name}
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleLeadLawyer(name);
                                                }}
                                            >
                                                {name}
                                                <span className="text-red-500 font-bold text-xs hover:text-red-700 cursor-pointer">×</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {isLeadLawyersDropdownOpen && (
                                <div className="absolute z-40 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                                    <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 pb-1.5 mb-2 flex justify-between items-center">
                                        <span>Choisir les titulaires</span>
                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsLeadLawyersDropdownOpen(false);
                                            }}
                                            className="text-[#15447c] hover:text-indigo-800 text-[10px] font-black uppercase"
                                        >
                                            Fermer
                                        </button>
                                    </div>
                                    {avocats.map(a => {
                                        const isChecked = selectedLeadLawyersList.includes(a.fullName);
                                        return (
                                            <label 
                                                key={a.id}
                                                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm font-semibold text-gray-750 select-none transition"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleLeadLawyer(a.fullName)}
                                                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span>{a.fullName}</span>
                                                    <span className="text-3xs text-gray-400 font-bold uppercase">{a.cabinetStatus}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 relative" ref={lawyersDropdownRef}>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Avocats sur le dossier</label>
                             <div 
                                onClick={() => setIsLawyersDropdownOpen(!isLawyersDropdownOpen)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer min-h-[42px] flex flex-wrap gap-1.5 items-center justify-between"
                             >
                                 {selectedLawyersList.length === 0 ? (
                                     <span className="text-gray-400 text-sm">Cliquer pour choisir les avocats rattachés...</span>
                                 ) : (
                                     <div className="flex flex-wrap gap-1.5">
                                         {selectedLawyersList.map(name => (
                                             <span 
                                                 key={name}
                                                 className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100"
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     handleToggleLawyer(name);
                                                 }}
                                             >
                                                 {name}
                                                 <span className="text-red-500 font-bold text-xs hover:text-red-700 cursor-pointer">×</span>
                                             </span>
                                         ))}
                                     </div>
                                 )}
                                 <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                 </svg>
                             </div>

                             {isLawyersDropdownOpen && (
                                 <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                                     <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 pb-1.5 mb-2 flex justify-between items-center">
                                         <span>Choisir parmi les avocats KBB</span>
                                         <button 
                                             type="button" 
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 setIsLawyersDropdownOpen(false);
                                             }}
                                             className="text-[#15447c] hover:text-indigo-800 text-[10px] font-black uppercase"
                                         >
                                             Fermer
                                         </button>
                                     </div>
                                     {avocats.map(a => {
                                         const isChecked = selectedLawyersList.includes(a.fullName);
                                         return (
                                             <label 
                                                 key={a.id}
                                                 className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm font-semibold text-gray-700 select-none transition"
                                                 onClick={(e) => e.stopPropagation()}
                                             >
                                                 <input 
                                                     type="checkbox"
                                                     checked={isChecked}
                                                     onChange={() => handleToggleLawyer(a.fullName)}
                                                     className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                 />
                                                 <div className="flex flex-col">
                                                     <span>{a.fullName}</span>
                                                     <span className="text-3xs text-gray-400 font-bold uppercase">{a.cabinetStatus} • {a.cabinetRole}</span>
                                                 </div>
                                             </label>
                                         );
                                     })}
                                 </div>
                             )}
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-sm font-semibold text-gray-750 mb-1">Mots clés / Tags (type de contenu)</label>
                             <div className="flex gap-2 mb-2">
                                 <input 
                                     type="text" 
                                     placeholder="Saisissez un mot clé (ex: Civil, Pénal, Référé, Urgent...) et cliquez sur Ajouter" 
                                     value={tagInput}
                                     onChange={(e) => setTagInput(e.target.value)}
                                     onKeyDown={handleTagKeyDown}
                                     className="flex-1 p-2 border border-gray-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                 />
                                 <button 
                                     type="button" 
                                     onClick={() => handleAddTag()}
                                     className="bg-[#15447c] hover:bg-[#15447c]/90 text-white font-bold py-2 px-4 rounded-lg text-xs transition"
                                 >
                                     Ajouter
                                 </button>
                             </div>
                             {formData.tags && formData.tags.length > 0 && (
                                 <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                     {formData.tags.map(tag => (
                                         <span 
                                             key={tag}
                                             className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 font-bold text-xs border border-indigo-100 uppercase tracking-wider"
                                         >
                                             #{tag}
                                             <button 
                                                 type="button"
                                                 onClick={() => handleRemoveTag(tag)}
                                                 className="text-red-500 hover:text-red-750 font-bold text-xs hover:bg-red-50 rounded px-1"
                                             >
                                                 ×
                                             </button>
                                         </span>
                                     ))}
                                 </div>
                             )}
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-750 mb-1">Notes / Détails supplémentaires</label>
                             <textarea 
                                 name="notes" 
                                 value={formData.notes} 
                                 onChange={handleChange} 
                                 placeholder="Rédigez ici des notes, commentaires ou précisions rattachées à ce dossier..." 
                                 className="w-full p-2.5 border border-gray-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[95px]"
                             />
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-4">
                        <h3 className="text-lg font-black text-gray-800 mb-2">Pièces jointes</h3>
                        <div className="mt-2">
                            <label htmlFor="file-upload" className="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span>Ajouter des fichiers</span>
                            </label>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                        </div>
                        {formData.attachments.length > 0 && (
                            <ul className="mt-4 space-y-2">
                                {formData.attachments.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md text-sm">
                                        <div className="flex items-center truncate">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <span className="text-gray-800 truncate border-b border-dashed" title={file.name}>{file.name}</span>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveAttachment(index)} className="ml-4 text-red-500 hover:text-red-700 h-6 w-6 flex items-center justify-center rounded-full hover:bg-red-100 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>



                    <div className="mt-8 flex justify-end space-x-4 border-t border-slate-100 pt-5">
                        <button type="button" onClick={onClose} className="bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition duration-300">Annuler</button>
                        <button type="submit" className="bg-[#15447c] text-white font-bold py-2.5 px-8 rounded-xl hover:bg-[#15447c]/90 transition duration-300 shadow-sm">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CaseModal;
