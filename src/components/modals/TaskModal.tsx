import React, { FC, useState, useRef, useEffect } from 'react';
import { Task, Case, Avocat } from '../../types';
import { playAlarmSound, stopAllAlarmSounds } from '../../utils/audio';
import { FormField, FormInput, FormSelect, FormTextarea, FormSectionHeader } from '../common/FormControls';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  cases: Case[];
  lawyers: string[];
  avocats?: Avocat[];
}

const TaskModal: FC<TaskModalProps> = ({ isOpen, onClose, onSave, cases, lawyers, avocats = [] }) => {
    const today = new Date().toISOString().split('T')[0];
    const initialFormState = {
        name: '',
        caseId: '',
        lawyer: lawyers[0] || '',
        dueDate: today,
        startDate: today,
        endDate: today,
        status: 'Non effectué' as Task['status'],
        notes: '',
        procedureLinkedIds: [] as string[],
        procedureLinked: '',
        associatedLawyers: [] as string[],
        rapport: '',
        reminderEnabled: false,
        reminderDate: today,
        reminderTime: '09:00',
        reminderSound: 'digital' as 'digital' | 'bell' | 'marimba' | 'classic',
        attachments: [] as Array<{ name: string; size: string; content?: string }>,
    };
    const [formData, setFormData] = useState(initialFormState);
    const [selectedProcedureKey, setSelectedProcedureKey] = useState('');
    const [isLawyersDropdownOpen, setIsLawyersDropdownOpen] = useState(false);
    const lawyersDropdownRef = useRef<HTMLDivElement>(null);

    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const stopPreviewRef = useRef<(() => void) | null>(null);

    // Calculate flat list of procedures
    const availProcedures = cases.flatMap(c => {
        const list = [];
        if (c.procedures && c.procedures.length > 0) {
            c.procedures.forEach(p => {
                list.push({
                    key: `${c.id}:::${p.id}`,
                    id: p.id,
                    name: p.name || 'Sans nom',
                    caseId: c.id,
                    caseName: c.name,
                    client: c.client
                });
            });
        }
        
        if (c.procedure && (!c.procedures || !c.procedures.some(p => p.name === c.procedure))) {
            list.push({
                key: `${c.id}:::PRIMARY`,
                id: 'PRIMARY',
                name: c.procedure,
                caseId: c.id,
                caseName: c.name,
                client: c.client
            });
        }

        if ((!c.procedures || c.procedures.length === 0) && !c.procedure) {
            list.push({
                key: `${c.id}:::GENERAL`,
                id: 'GENERAL',
                name: 'Procédure Générale',
                caseId: c.id,
                caseName: c.name,
                client: c.client
            });
        }
        return list;
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData(initialFormState);
            setSelectedProcedureKey('');
            setIsPlayingPreview(false);
            stopAllAlarmSounds();
        }
        return () => {
            stopAllAlarmSounds();
        };
    }, [isOpen]);

    // Close lawyers custom dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (lawyersDropdownRef.current && !lawyersDropdownRef.current.contains(e.target as Node)) {
                setIsLawyersDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSoundPreview = () => {
        if (isPlayingPreview) {
            if (stopPreviewRef.current) stopPreviewRef.current();
            stopAllAlarmSounds();
            setIsPlayingPreview(false);
        } else {
            setIsPlayingPreview(true);
            const stop = playAlarmSound(formData.reminderSound);
            stopPreviewRef.current = stop;
            // Auto stop preview after 4 seconds
            setTimeout(() => {
                if (stopPreviewRef.current === stop) {
                    stop();
                    setIsPlayingPreview(false);
                }
            }, 4000);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }

        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'endDate') {
                next.dueDate = value;
                // Also default the reminder date to same end date to be helpful
                next.reminderDate = value;
            } else if (name === 'dueDate') {
                next.endDate = value;
                next.reminderDate = value;
            }
            return next;
        });

        // If sound chanced during active preview, restart it
        if (name === 'reminderSound' && isPlayingPreview) {
            stopAllAlarmSounds();
            const stop = playAlarmSound(value as any);
            stopPreviewRef.current = stop;
        }
    };

    const handleProcedureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const key = e.target.value;
        setSelectedProcedureKey(key);
        if (key) {
            const [caseId, procId] = key.split(':::');
            const foundProc = availProcedures.find(p => p.key === key);
            setFormData(prev => ({
                ...prev,
                caseId: caseId,
                procedureLinkedIds: [procId],
                procedureLinked: foundProc ? foundProc.name : ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                caseId: '',
                procedureLinkedIds: [],
                procedureLinked: ''
            }));
        }
    };

    const handleToggleLawyer = (name: string) => {
        setFormData(prev => {
            const list = prev.associatedLawyers || [];
            if (list.includes(name)) {
                return { ...prev, associatedLawyers: list.filter(item => item !== name) };
            } else {
                return { ...prev, associatedLawyers: [...list, name] };
            }
        });
    };

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const sizeStr = file.size > 1024 * 1024 
                        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (file.size / 1024).toFixed(0) + ' KB';
                    setFormData(prev => ({
                        ...prev,
                        attachments: [...prev.attachments, {
                            name: file.name,
                            size: sizeStr,
                            content: reader.result as string
                        }]
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveAttachment = (idxToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, idx) => idx !== idxToRemove)
        }));
    };

    const handleCloseAndStop = () => {
        stopAllAlarmSounds();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.caseId) {
            alert("Veuillez sélectionner une procédure.");
            return;
        }

        onSave({
            name: formData.name,
            caseId: formData.caseId,
            lawyer: formData.lawyer,
            dueDate: formData.endDate || formData.dueDate,
            status: formData.status as Task['status'],
            notes: formData.notes,
            procedureLinked: formData.procedureLinked || '',
            procedureLinkedIds: formData.procedureLinkedIds,
            startDate: formData.startDate,
            endDate: formData.endDate,
            associatedLawyers: formData.associatedLawyers,
            rapport: formData.rapport,
            reminderEnabled: formData.reminderEnabled,
            reminderDate: formData.reminderEnabled ? formData.reminderDate : undefined,
            reminderTime: formData.reminderEnabled ? formData.reminderTime : undefined,
            reminderSound: formData.reminderEnabled ? formData.reminderSound : undefined,
            reminderTriggered: false,
            attachments: formData.attachments,
        });

        stopAllAlarmSounds();
        setFormData(initialFormState);
        setSelectedProcedureKey('');
        onClose();
    };

    const allLawyersList = avocats.length > 0 ? avocats.map(a => a.fullName) : lawyers;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Créer une nouvelle tâche
                    </h2>
                    <button onClick={handleCloseAndStop} className="text-gray-400 hover:text-gray-655 transition p-1 hover:bg-slate-100 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <FormField label="Nom de la Tâche" required>
                                    <FormInput type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Assister à l'audience de référé" required />
                                </FormField>
                            </div>
                            
                            <div className="md:col-span-2">
                                <FormField label="Procédure Associée" required>
                                    <FormSelect 
                                        name="selectedProcedureKey" 
                                        value={selectedProcedureKey} 
                                        onChange={handleProcedureChange} 
                                        required
                                    >
                                        <option value="" disabled>-- Sélectionner une procédure --</option>
                                        {availProcedures.map(p => (
                                            <option key={p.key} value={p.key}>
                                                {p.name} — Dossier: {p.caseName} ({p.client})
                                            </option>
                                        ))}
                                    </FormSelect>
                                </FormField>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <FormField label="Date de début">
                                <FormInput type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
                            </FormField>
                            <FormField label="Date de fin">
                                <FormInput type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Responsable principal">
                                <FormSelect name="lawyer" value={formData.lawyer} onChange={handleChange}>
                                    <option value="">-- Aucun avocat responsable --</option>
                                    {allLawyersList.map(l => <option key={l} value={l}>{l}</option>)}
                                </FormSelect>
                            </FormField>
                            <FormField label="Statut de la Tâche">
                                <FormSelect name="status" value={formData.status} onChange={handleChange}>
                                    <option value="Non effectué">Non effectué</option>
                                    <option value="Effectué à moitié">Effectué à moitié</option>
                                    <option value="Effectué">Effectué</option>
                                </FormSelect>
                            </FormField>
                        </div>

                        {/* Associated Lawyers / Avocats associés */}
                        <div className="relative" ref={lawyersDropdownRef}>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Avocats associés à la tâche (Optionnel)</label>
                            <div 
                                onClick={() => setIsLawyersDropdownOpen(!isLawyersDropdownOpen)}
                                className="w-full p-2.5 border border-gray-300 rounded-xl shadow-xs bg-white cursor-pointer min-h-[42px] flex flex-wrap gap-1.5 items-center justify-between"
                            >
                                {formData.associatedLawyers.length === 0 ? (
                                    <span className="text-gray-400 text-sm">Cliquer pour choisir des avocats associés...</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {formData.associatedLawyers.map(name => (
                                            <span 
                                                key={name}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleLawyer(name);
                                                }}
                                            >
                                                {name}
                                                <span className="text-red-500 font-bold ml-1 hover:text-red-700 cursor-pointer">×</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <svg className="w-4 h-4 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {isLawyersDropdownOpen && (
                                <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                                    <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 pb-1.5 mb-2 flex justify-between items-center">
                                        <span>Sélectionner les avocats rattachés</span>
                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsLawyersDropdownOpen(false);
                                            }}
                                            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase"
                                        >
                                            Fermer
                                        </button>
                                    </div>
                                    {allLawyersList.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">Aucun avocat disponible</p>
                                    ) : (
                                        allLawyersList.map(name => {
                                            const isChecked = formData.associatedLawyers.includes(name);
                                            return (
                                                <label 
                                                    key={name}
                                                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm font-semibold text-gray-700 select-none transition"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleToggleLawyer(name)}
                                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <span>{name}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Rappel et Notifications section */}
                        <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        name="reminderEnabled"
                                        checked={formData.reminderEnabled}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-gray-800">Activer un rappel / alarme</span>
                                        <span className="block text-3xs text-slate-500 font-medium leading-none">Déclencher une sonnerie et une alerte à l'heure prévue</span>
                                    </div>
                                </label>
                                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${formData.reminderEnabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-150 text-gray-400'}`}>
                                    {formData.reminderEnabled ? 'Activé' : 'Désactivé'}
                                </span>
                            </div>

                            {formData.reminderEnabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100/30">
                                    <div>
                                        <label className="block text-3xs font-extrabold uppercase tracking-wide text-slate-500 mb-1">Date du rappel</label>
                                        <input 
                                            type="date" 
                                            name="reminderDate" 
                                            value={formData.reminderDate} 
                                            onChange={handleChange} 
                                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-3xs font-extrabold uppercase tracking-wide text-slate-500 mb-1">Heure de l'alarme</label>
                                        <input 
                                            type="time" 
                                            name="reminderTime" 
                                            value={formData.reminderTime} 
                                            onChange={handleChange} 
                                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-3xs font-extrabold uppercase tracking-wide text-slate-500 mb-1">Type de sonnerie</label>
                                        <div className="flex gap-1.5">
                                            <select 
                                                name="reminderSound" 
                                                value={formData.reminderSound} 
                                                onChange={handleChange} 
                                                className="flex-1 p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                                            >
                                                <option value="digital">📟 Digital (Bip-bip)</option>
                                                <option value="bell">🔔 Cloche de bar</option>
                                                <option value="marimba">🎼 Marimba</option>
                                                <option value="classic">☎️ Retro téléphone</option>
                                            </select>
                                            <button 
                                                type="button"
                                                onClick={handleSoundPreview}
                                                className={`p-2 rounded-lg text-xs transition flex justify-center items-center ${isPlayingPreview ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}
                                                title={isPlayingPreview ? "Arrêter l'écoute" : "Tester la sonnerie"}
                                            >
                                                {isPlayingPreview ? (
                                                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <FormField label="Rapport & Compte-rendu de la Tâche">
                            <FormTextarea 
                                name="rapport" 
                                value={formData.rapport} 
                                onChange={handleChange} 
                                rows={2} 
                                placeholder="Rédigez le rapport officiel d'audience, conclusions ou compte-rendu d'étape..."
                            />
                        </FormField>

                        <FormField label="Notes / Détails supplémentaires">
                            <FormTextarea 
                                name="notes" 
                                value={formData.notes} 
                                onChange={handleChange} 
                                rows={2} 
                                placeholder="Ajoutez des détails privés ou précisions..."
                            />
                        </FormField>

                        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Pièces jointes</span>
                            <div className="flex items-center gap-3">
                                <label htmlFor="task-file-upload" className="cursor-pointer bg-white border border-gray-350 hover:bg-slate-50 rounded-xl px-4 py-2 inline-flex items-center text-xs font-bold text-gray-750 transition shadow-2xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    <span>Ajouter des fichiers</span>
                                </label>
                                <input id="task-file-upload" name="task-file-upload" type="file" className="sr-only" multiple onChange={handleAttachmentChange} />
                                <span className="text-3xs text-gray-400 font-bold">{formData.attachments.length} fichier(s) joint(s)</span>
                            </div>

                            {formData.attachments.length > 0 && (
                                <ul className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                                    {formData.attachments.map((file, idx) => (
                                        <li key={idx} className="flex items-center justify-between bg-white p-2 border border-gray-200 rounded-lg text-xs font-semibold">
                                            <div className="flex items-center truncate max-w-[80%]">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                <span className="text-gray-750 truncate" title={file.name}>{file.name}</span>
                                                {file.size && <span className="text-[9px] text-gray-400 ml-1.5 font-bold">({file.size})</span>}
                                            </div>
                                            <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-red-550 hover:text-red-700 h-6 w-6 flex items-center justify-center rounded-full hover:bg-red-50 shrink-0 transition" title="Supprimer">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-4 border-t pt-4">
                        <button type="button" onClick={handleCloseAndStop} className="bg-slate-100 text-gray-700 hover:bg-slate-200 font-bold py-2 px-6 rounded-xl transition duration-300">Annuler</button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-700 transition duration-300 shadow-sm">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
