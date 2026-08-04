import React, { FC, useState, useEffect } from 'react';
import { Event, Avocat, Personnel } from '../../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  avocats?: Avocat[];
  personnels?: Personnel[];
  events?: Event[];
}

const EventModal: FC<EventModalProps> = ({ isOpen, onClose, onSave, avocats = [], personnels = [], events = [] }) => {
    const today = new Date().toISOString().split('T')[0];
    const initialFormState = {
        name: '', eventId: '', type: 'Atelier' as Event['type'], partenaires: '', date: today, lieu: '',
        coOrganisateur: '', publicCible: '', membresKBB: '', membresExternes: '', budgetPrevisionnel: '',
        budgetRealise: '', financement: 'Interne', sponsors: '',
        fraisParticipation: '', autresRecettes: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const initialEvolutionFinancement = [
        { designation: 'Cabinet KBB', attendu: 0, realise: 0 },
        { designation: 'Sponsors externe', attendu: 0, realise: 0 },
        { designation: 'Frais de participation', attendu: 0, realise: 0 },
        { designation: 'Autre', attendu: 0, realise: 0 },
    ];
    const [evolutionFinancement, setEvolutionFinancement] = useState(initialEvolutionFinancement);

    const [selectedKbbMembers, setSelectedKbbMembers] = useState<string[]>([]);
    const [selectedPersonnelMembers, setSelectedPersonnelMembers] = useState<string[]>([]);
    const [customKbbMembers, setCustomKbbMembers] = useState<string>('');
    const [isKbbDropdownOpen, setIsKbbDropdownOpen] = useState<boolean>(false);
    const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState<boolean>(false);

    // New specific features
    const [datesList, setDatesList] = useState<string[]>([]);
    const [tempDate, setTempDate] = useState<string>('');
    const [photoProfil, setPhotoProfil] = useState<string>('');
    const [piecesJointes, setPiecesJointes] = useState<Array<{ name: string; size: string; content?: string }>>([]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...initialFormState,
                date: today
            });
            setEvolutionFinancement(initialEvolutionFinancement);
            setSelectedKbbMembers([]);
            setSelectedPersonnelMembers([]);
            setCustomKbbMembers('');
            setIsKbbDropdownOpen(false);
            setIsPersonnelDropdownOpen(false);
            setDatesList([today]);
            setTempDate('');
            setPhotoProfil('');
            setPiecesJointes([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.name) {
            const count = (events ? events.length : 0) + 1;
            const generatedId = `EVT-${count}`;
            setFormData(prev => ({ ...prev, eventId: generatedId }));
        } else {
            setFormData(prev => ({ ...prev, eventId: '' }));
        }
    }, [formData.name, events]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleKbbMember = (name: string) => {
        setSelectedKbbMembers(prev => 
            prev.includes(name) 
                ? prev.filter(m => m !== name) 
                : [...prev, name]
        );
    };

    const handleTogglePersonnelMember = (name: string) => {
        setSelectedPersonnelMembers(prev => 
            prev.includes(name) 
                ? prev.filter(m => m !== name) 
                : [...prev, name]
        );
    };

    // Add Date to multiple dates list
    const handleAddDate = () => {
        if (tempDate && !datesList.includes(tempDate)) {
            setDatesList(prev => [...prev, tempDate].sort());
            setTempDate('');
        }
    };

    const handleRemoveDate = (dateToRemove: string) => {
        setDatesList(prev => prev.filter(d => d !== dateToRemove));
    };

    // Photo profil base64 parser
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPhotoProfil(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Attachment base64 parser
    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const sizeStr = file.size > 1024 * 1024 
                        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (file.size / 1024).toFixed(0) + ' KB';
                    setPiecesJointes(prev => [...prev, {
                        name: file.name,
                        size: sizeStr,
                        content: reader.result as string
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveAttachment = (idxToRemove: number) => {
        setPiecesJointes(prev => prev.filter((_, idx) => idx !== idxToRemove));
    };

    const totalAttendu = evolutionFinancement.reduce((sum, item) => sum + (item.attendu || 0), 0);
    const totalRealise = evolutionFinancement.reduce((sum, item) => sum + (item.realise || 0), 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedFundings = evolutionFinancement.map(item => ({
            label: item.designation,
            amount: String(item.realise)
        }));

        const fundingString = evolutionFinancement
            .map(item => `${item.designation} (Attendu: $${item.attendu}, Réalisé: $${item.realise})`)
            .join(', ');

        const combinedKBB = [
            ...selectedKbbMembers,
            ...selectedPersonnelMembers,
            ...(customKbbMembers.trim() ? [customKbbMembers.trim()] : [])
        ].join(', ');

        onSave({ 
          ...formData, 
          id: formData.eventId,
          type: formData.type as Event['type'],
          date: datesList[0] || formData.date,
          dates: datesList,
          coOrganisateur: formData.coOrganisateur || undefined,
          budgetPrevisionnel: String(totalAttendu),
          budgetRealise: String(totalRealise),
          recettesTotal: totalRealise,
          membresKBB: combinedKBB,
          financement: fundingString,
          financements: selectedFundings,
          evolutionFinancement: evolutionFinancement,
          photoProfil: photoProfil || undefined,
          piecesJointes: piecesJointes.length > 0 ? piecesJointes : undefined,
        });

        // Reset
        setFormData(initialFormState);
        setEvolutionFinancement(initialEvolutionFinancement);
        setSelectedKbbMembers([]);
        setSelectedPersonnelMembers([]);
        setCustomKbbMembers('');
        setDatesList([]);
        setPhotoProfil('');
        setPiecesJointes([]);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-4xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar animate-fadeIn">
                 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-black text-[#15447c] tracking-tight">Créer un nouvel événement</h2>
                        <p className="text-2xs text-gray-400 font-bold mt-0.5">Veuillez renseigner les détails administratifs, financiers et visuels.</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Column 1 - General Information */}
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                                Informations Générales
                            </span>

                            <div>
                                <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Nom de l'évènement <span className="text-red-500">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: Atelier pratique sur les baux commerciaux" required />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">ID Event (auto)</label>
                                    <input type="text" name="eventId" value={formData.eventId} className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" readOnly />
                                </div>
                                <div>
                                    <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Type de l'évènement</label>
                                    <select name="type" value={formData.type} onChange={handleChange} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white outline-none">
                                        <option value="Atelier">Atelier</option>
                                        <option value="Colloque">Colloque</option>
                                        <option value="Conférence">Conférence</option>
                                        <option value="Séminaire">Séminaire</option>
                                        <option value="Autre">Autre</option>
                                    </select>
                                </div>
                            </div>

                            {/* Multiple Date Picker Section */}
                            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
                                <label className="block text-2xs font-black text-gray-700 uppercase tracking-wider">Date(s) Prévue(s)</label>
                                
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="date" 
                                        value={tempDate} 
                                        onChange={(e) => setTempDate(e.target.value)} 
                                        className="text-xs p-2 bg-white border border-gray-300 rounded-lg outline-none flex-1 focus:border-indigo-400 focus:ring-1"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAddDate}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition shrink-0"
                                    >
                                        + Ajouter
                                    </button>
                                </div>

                                {datesList.length === 0 ? (
                                    <p className="text-3xs text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg text-center">Aucune date sélectionnée ! (Sélectionnez au moins une date)</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                                        {datesList.map(d => (
                                            <span key={d} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-indigo-950 text-2xs font-bold px-2 py-1 rounded-md shadow-3xs">
                                                <span>📅 {new Date(d).toLocaleDateString('fr-FR')}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveDate(d)} 
                                                    className="text-rose-600 hover:text-rose-800 ml-1 font-extrabold focus:outline-hidden"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Co-organisateur</label>
                                    <input type="text" name="coOrganisateur" value={formData.coOrganisateur} onChange={handleChange} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-1" placeholder="Ex: Université de Kinshasa" />
                                </div>
                                <div>
                                    <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Lieu</label>
                                    <input type="text" name="lieu" value={formData.lieu} onChange={handleChange} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: Salle de conférence B" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Public cible</label>
                                <input type="text" name="publicCible" value={formData.publicCible} onChange={handleChange} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl shadow-2xs focus:border-indigo-500 focus:ring-1" placeholder="Ex: Dirigeants d'entreprise, juristes" />
                            </div>
                        </div>

                        {/* Column 2 - Image and Finances */}
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-amber-700 bg-amber-55/70 border border-amber-150 px-2.5 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                                Visuels & Plan financier
                            </span>

                            {/* Photo de profil de l'événement */}
                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex items-center gap-4">
                                <div className="w-14 h-14 bg-white border border-gray-250 rounded-xl shadow-3xs overflow-hidden flex items-center justify-center shrink-0">
                                    {photoProfil ? (
                                        <img src={photoProfil} alt="Profile" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                                    ) : (
                                        <span className="text-gray-300 text-3xl">📅</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Photo de profil / Bannière de l'événement</label>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer bg-white border border-gray-250 hover:bg-gray-100 text-3xs font-extrabold text-gray-800 px-3 py-1.5 rounded-lg shadow-3xs transition">
                                            Choisir l'image...
                                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                        </label>
                                        {photoProfil && (
                                            <button type="button" onClick={() => setPhotoProfil('')} className="text-3xs text-rose-600 bg-rose-50/50 hover:bg-rose-50 px-2 py-1.5 rounded-lg font-bold transition">Supprimer</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                             {/* Evolution de financement Table */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-2xs font-extrabold text-gray-650 uppercase tracking-wider">Plan Financier</label>
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                                        <div className="bg-[#15447c] px-4 py-2.5 flex justify-between items-center">
                                            <h4 className="text-2xs font-black text-white uppercase tracking-wider">Evolution de financement</h4>
                                            <span className="text-[10px] font-black text-emerald-100 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded-md">
                                                Auto-Calculé
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                                        <th className="px-4 py-2.5">Designation</th>
                                                        <th className="px-4 py-2.5">Montant Attendu ($)</th>
                                                        <th className="px-4 py-2.5">Montant Réalisé ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-150 text-xs">
                                                    {evolutionFinancement.map((item, index) => (
                                                        <tr key={item.designation} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2.5 font-bold text-gray-700">{item.designation}</td>
                                                            <td className="px-4 py-2">
                                                                <div className="relative rounded-lg shadow-3xs max-w-[160px]">
                                                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                                        <span className="text-gray-400 font-bold text-xs">$</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.attendu || ''}
                                                                        onChange={(e) => {
                                                                            const updated = [...evolutionFinancement];
                                                                            updated[index].attendu = Number(e.target.value) || 0;
                                                                            setEvolutionFinancement(updated);
                                                                        }}
                                                                        className="w-full pl-6 pr-2 py-1 text-xs font-bold border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-gray-850 bg-white"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <div className="relative rounded-lg shadow-3xs max-w-[160px]">
                                                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                                        <span className="text-gray-400 font-bold text-xs">$</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.realise || ''}
                                                                        onChange={(e) => {
                                                                            const updated = [...evolutionFinancement];
                                                                            updated[index].realise = Number(e.target.value) || 0;
                                                                            setEvolutionFinancement(updated);
                                                                        }}
                                                                        className="w-full pl-6 pr-2 py-1 text-xs font-bold border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-gray-850 bg-white"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Total Row */}
                                                    <tr className="bg-slate-50 font-bold text-gray-900 border-t border-gray-200">
                                                        <td className="px-4 py-3 text-2xs uppercase tracking-wider">Total</td>
                                                        <td className="px-4 py-3 text-xs font-black text-indigo-700">
                                                            ${totalAttendu.toLocaleString('en-US')}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-black text-emerald-700">
                                                            ${totalRealise.toLocaleString('en-US')}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Tableau 2: Compte rendu */}
                                <div className="space-y-2">
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                                        <div className="bg-[#15447c] px-4 py-2.5 flex justify-between items-center">
                                            <h4 className="text-2xs font-black text-white uppercase tracking-wider">Compte rendu</h4>
                                            <span className="text-[10px] font-black text-amber-100 bg-amber-950/40 border border-amber-800 px-2 py-0.5 rounded-md">
                                                Liaison Auto
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                                        <th className="px-4 py-2.5">Designation</th>
                                                        <th className="px-4 py-2.5 text-right">Montant ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-150 text-xs text-gray-750">
                                                    <tr className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-2.5 font-bold text-gray-700">Dépenses prévues</td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">
                                                            ${totalAttendu.toLocaleString('en-US')}
                                                        </td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-2.5 font-bold text-gray-700">Dépenses réalisées</td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                                                            ${totalRealise.toLocaleString('en-US')}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Full-width Cabinet Selection */}
                        <div className="md:col-span-2 space-y-3 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/40 relative">
                             <div className="flex justify-between items-center pb-1">
                                 <span className="text-xs font-black text-[#15447c] uppercase tracking-wider block">👥 Membres du Cabinet KBB impliqués</span>
                                 <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                                     {selectedKbbMembers.length} sélectionné{selectedKbbMembers.length > 1 ? 's' : ''}
                                 </span>
                             </div>

                             <div className="relative">
                                 <div 
                                     onClick={() => setIsKbbDropdownOpen(!isKbbDropdownOpen)}
                                     className="w-full min-h-[42px] px-3 py-2 bg-white border border-gray-300 rounded-xl shadow-xs cursor-pointer flex flex-wrap gap-1.5 items-center justify-between text-xs font-semibold hover:border-indigo-400 transition"
                                 >
                                     {selectedKbbMembers.length === 0 ? (
                                         <span className="text-gray-400 font-medium select-none text-2xs">Cliquez pour sélectionner des membres du cabinet...</span>
                                     ) : (
                                         <div className="flex flex-wrap gap-1.5">
                                             {selectedKbbMembers.map((member) => (
                                                 <span 
                                                     key={member}
                                                     className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-100/60"
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         handleToggleKbbMember(member);
                                                     }}
                                                 >
                                                     {member}
                                                     <span className="text-red-500 hover:text-red-700 font-black ml-0.5">✕</span>
                                                 </span>
                                             ))}
                                         </div>
                                     )}
                                     <span className="text-gray-400 text-[10px] ml-auto select-none pl-2 animate-pulse">
                                         {isKbbDropdownOpen ? '▲' : '▼ v_ouvrir'}
                                     </span>
                                 </div>

                                 {/* Floating dropdown */}
                                 {isKbbDropdownOpen && (
                                     <div className="absolute z-30 left-0 right-0 mt-1.5 p-3.5 bg-white border border-gray-250 rounded-2xl shadow-xl space-y-2.5 max-h-[190px] overflow-y-auto custom-scrollbar">
                                         <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Choisir des Avocats ({avocats.length})</span>
                                             <button 
                                                 type="button" 
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     setIsKbbDropdownOpen(false);
                                                 }}
                                                 className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                                             >
                                                 Fermer ✕
                                             </button>
                                         </div>

                                         {avocats.length === 0 ? (
                                             <p className="text-3xs font-semibold text-gray-450 italic py-1">Aucun avocat enregistré. Créez des avocats dans l'onglet dédié.</p>
                                         ) : (
                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                 {avocats.map((avocat) => {
                                                     const isSelected = selectedKbbMembers.includes(avocat.fullName);
                                                     return (
                                                         <div 
                                                             key={avocat.id} 
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleToggleKbbMember(avocat.fullName);
                                                             }}
                                                             className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer select-none transition ${
                                                                 isSelected 
                                                                     ? 'bg-indigo-50/40 border-indigo-300' 
                                                                     : 'bg-white border-gray-200 hover:bg-slate-50'
                                                             }`}
                                                         >
                                                             <input
                                                                 type="checkbox"
                                                                 checked={isSelected}
                                                                 readOnly
                                                                 className="rounded border-gray-300 text-indigo-600 h-3.5 w-3.5"
                                                             />
                                                             <div className="min-w-0 pr-1">
                                                                 <p className="text-3xs font-black text-gray-800 truncate">{avocat.fullName}</p>
                                                                 <p className="text-[8px] font-extrabold text-indigo-600 uppercase tracking-tight">{avocat.cabinetStatus}</p>
                                                             </div>
                                                         </div>
                                                     );
                                                 })}
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>

                             <div className="space-y-3">
                                 <div className="flex justify-between items-center pb-1 mt-2">
                                     <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Autres membres ou collaborateurs (KBB) prédéfinis</label>
                                     <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                         {selectedPersonnelMembers.length} sélectionné{selectedPersonnelMembers.length > 1 ? 's' : ''}
                                     </span>
                                 </div>

                                 <div className="relative">
                                     <div 
                                         onClick={() => setIsPersonnelDropdownOpen(!isPersonnelDropdownOpen)}
                                         className="w-full min-h-[42px] px-3 py-2 bg-white border border-gray-300 rounded-xl shadow-xs cursor-pointer flex flex-wrap gap-1.5 items-center justify-between text-xs font-semibold hover:border-indigo-400 transition"
                                     >
                                         {selectedPersonnelMembers.length === 0 ? (
                                             <span className="text-gray-400 font-medium select-none text-2xs">Sélectionner des collaborateurs prédéfinis (paralégaux, assistants)...</span>
                                         ) : (
                                             <div className="flex flex-wrap gap-1.5">
                                                 {selectedPersonnelMembers.map((member) => (
                                                     <span 
                                                         key={member}
                                                         className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-teal-100/60"
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             handleTogglePersonnelMember(member);
                                                         }}
                                                     >
                                                         {member}
                                                         <span className="text-red-500 hover:text-red-700 font-black ml-0.5">✕</span>
                                                     </span>
                                                 ))}
                                             </div>
                                         )}
                                         <span className="text-gray-400 text-[10px] ml-auto select-none pl-2 animate-pulse">
                                             {isPersonnelDropdownOpen ? '▲' : '▼ v_ouvrir'}
                                         </span>
                                     </div>

                                     {/* Floating Dropdown for Personnels */}
                                     {isPersonnelDropdownOpen && (
                                         <div className="absolute z-20 left-0 right-0 mt-1.5 p-3.5 bg-white border border-gray-250 rounded-2xl shadow-xl space-y-2.5 max-h-[190px] overflow-y-auto custom-scrollbar">
                                             <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Choisir des Collaborateurs ({personnels.length})</span>
                                                 <button 
                                                     type="button" 
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         setIsPersonnelDropdownOpen(false);
                                                     }}
                                                     className="text-[10px] font-black text-teal-600 hover:text-teal-850 uppercase tracking-wider"
                                                 >
                                                     Fermer ✕
                                                 </button>
                                             </div>

                                             {personnels.length === 0 ? (
                                                 <p className="text-3xs font-semibold text-gray-450 italic py-1">Aucun personnel enregistré. Créez des profils dans l'onglet Personnel.</p>
                                             ) : (
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                     {personnels.map((person) => {
                                                         const isSelected = selectedPersonnelMembers.includes(person.fullName);
                                                         return (
                                                             <div 
                                                                 key={person.id} 
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     handleTogglePersonnelMember(person.fullName);
                                                                 }}
                                                                 className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer select-none transition ${
                                                                     isSelected 
                                                                         ? 'bg-teal-50/40 border-teal-300' 
                                                                         : 'bg-white border-gray-200 hover:bg-slate-50'
                                                                 }`}
                                                             >
                                                                 <input
                                                                     type="checkbox"
                                                                     checked={isSelected}
                                                                     readOnly
                                                                     className="rounded border-gray-300 text-teal-600 h-3.5 w-3.5"
                                                                 />
                                                                 <div className="min-w-0 pr-1">
                                                                     <p className="text-3xs font-black text-gray-800 truncate">{person.fullName}</p>
                                                                     <p className="text-[8px] font-extrabold text-teal-600 uppercase tracking-tight">{person.role}</p>
                                                                 </div>
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>

                                 <div>
                                     <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2">Saisie libre d'autres membres (KBB)</label>
                                     <input 
                                         type="text" 
                                         placeholder="Stagiaires, assistants, paralégaux non listés (séparés par des virgules)..." 
                                         value={customKbbMembers} 
                                         onChange={(e) => setCustomKbbMembers(e.target.value)} 
                                         className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none" 
                                     />
                                 </div>
                             </div>
                        </div>

                        {/* Textareas */}
                        <div>
                            <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Partenaires</label>
                            <textarea name="partenaires" value={formData.partenaires} onChange={handleChange} rows={2} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl outline-none focus:border-indigo-500" placeholder="Partenaires académiques, financiers, sponsors..."></textarea>
                        </div>
                        <div>
                            <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Sponsors</label>
                            <textarea name="sponsors" value={formData.sponsors} onChange={handleChange} rows={2} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl outline-none focus:border-indigo-500" placeholder="Entreprises sponsors participantes..."></textarea>
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-2xs font-bold text-gray-650 uppercase tracking-wide mb-1">Membres de l'organisation (Externe)</label>
                             <textarea name="membresExternes" value={formData.membresExternes} onChange={handleChange} rows={2} className="w-full text-xs p-2.5 border border-gray-300 rounded-xl outline-none focus:border-indigo-500" placeholder="Intervenants invités, animateurs d'ateliers, modérateurs..."></textarea>
                        </div>

                        {/* File upload for Pieces Jointes de l'évènement */}
                        <div className="md:col-span-2 bg-slate-50 border border-slate-200/55 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="block text-2xs font-black text-gray-750 uppercase tracking-wide">Pièces jointes de l'Événement</label>
                                <span className="text-[10px] text-gray-400 font-bold">{piecesJointes.length} document{piecesJointes.length > 1 ? 's' : ''} lié{piecesJointes.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer bg-white hover:bg-slate-50 border border-gray-300 rounded-xl shadow-3xs text-xs font-bold text-gray-700 px-4 py-2.5 transition flex items-center gap-1.5 shrink-0">
                                    <span>📎</span>
                                    <span>Ajouter des fichiers administratifs...</span>
                                    <input type="file" multiple onChange={handleAttachmentChange} className="hidden" />
                                </label>
                                <div className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                                    Téléverser des programmes, présentations, listes de présence ou documentations utiles.
                                </div>
                            </div>

                            {piecesJointes.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {piecesJointes.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-3xs">
                                            <span className="text-indigo-600">📁</span>
                                            <span className="max-w-[150px] truncate">{file.name}</span>
                                            <span className="text-[9px] text-gray-400 font-bold">({file.size})</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveAttachment(idx)} 
                                                className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                    <div className="mt-8 flex justify-end space-x-3 pt-3 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="bg-gray-100 text-gray-700 font-bold py-2.5 px-6 rounded-xl hover:bg-gray-200 transition border border-gray-200 text-xs shadow-3xs">Annuler</button>
                        <button type="submit" className="bg-[#15447c] text-white font-bold py-2.5 px-6 rounded-xl hover:bg-[#15447c]/90 transition shadow-2xs text-xs">Créer l'Événement</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventModal;
