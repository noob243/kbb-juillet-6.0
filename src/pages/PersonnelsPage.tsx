import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import PersonnelModal from '../components/modals/PersonnelModal';
import { SearchIcon, AlertIcon, FolderIcon, PhoneIcon, MailIcon } from '../components/Icons';
import { Personnel } from '../types';

interface PersonnelsPageProps {
  personnels: Personnel[];
  onAddPersonnel: (personnel: Personnel, password?: string) => void;
  onDeletePersonnel: (id: string) => void;
  onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
}

const PersonnelsPage: FC<PersonnelsPageProps> = ({ personnels, onAddPersonnel, onDeletePersonnel, onSendEmail }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'Tous' | 'Administratif' | 'Office'>('Tous');

    const getServiceStatusClass = (status: string) => {
        switch (status) {
            case 'Actif': return 'bg-green-100 text-green-800 border-green-250';
            case 'Inactif': return 'bg-rose-100 text-rose-800 border-rose-250';
            case 'Mise en disponibilité': return 'bg-blue-100 text-blue-800 border-blue-250';
            default: return 'bg-gray-100 text-gray-800 border-gray-250';
        }
    };

    const getEffectiveCategory = (p: Personnel): 'Administratif' | 'Office' => {
        if (p.category) return p.category;
        const officeRoles = ['Chauffeur', 'Cleaner', 'Courtier', 'Intendant'];
        return officeRoles.includes(p.role) ? 'Office' : 'Administratif';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const countTous = personnels.length;
    const countAdmin = personnels.filter(p => getEffectiveCategory(p) === 'Administratif').length;
    const countOffice = personnels.filter(p => getEffectiveCategory(p) === 'Office').length;

    const query = (searchQuery || '').toLowerCase();
    const filtered = personnels.filter(p => {
        const matchesSearch = 
            (p.fullName || '').toLowerCase().includes(query) ||
            (p.role || '').toLowerCase().includes(query) ||
            (p.email || '').toLowerCase().includes(query) ||
            (p.address && p.address.toLowerCase().includes(query));

        if (!matchesSearch) return false;
        if (selectedCategory === 'Tous') return true;
        return getEffectiveCategory(p) === selectedCategory;
    });

    return (
        <>
            <PageContainer 
                title="Personnels" 
                buttonLabel="Ajout nouveau personnel" 
                onButtonClick={() => setIsAddModalOpen(true)}
            >
                {/* Search Bar & Category Filter section */}
                <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 max-w-sm w-full bg-slate-50 border border-gray-200 px-3 py-2 rounded-xl">
                        <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Rechercher par nom, rôle, adresse..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs font-medium focus:outline-hidden bg-transparent text-gray-700"
                        />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setSelectedCategory('Tous')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                selectedCategory === 'Tous'
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <span>Tous</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                                {countTous}
                            </span>
                        </button>

                        <button
                            onClick={() => setSelectedCategory('Administratif')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                selectedCategory === 'Administratif'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                        >
                            <span>Administratif</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                selectedCategory === 'Administratif' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {countAdmin}
                            </span>
                        </button>

                        <button
                            onClick={() => setSelectedCategory('Office')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                selectedCategory === 'Office'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                        >
                            <span>Office</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                selectedCategory === 'Office' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {countOffice}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Primary Data Table */}
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto font-sans">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead className="bg-slate-50 border-b border-gray-150">
                                <tr className="text-2xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4">Agent & Photo</th>
                                    <th className="p-4">Catégorie</th>
                                    <th className="p-4">Rôle / Fonction</th>
                                    <th className="p-4">Salaire (Mensuel)</th>
                                    <th className="p-4">État Matrimonial</th>
                                    <th className="p-4">Enfants</th>
                                    <th className="p-4">Statut de Facto</th>
                                    <th className="p-4">Mesure Disciplinaire</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-xs text-gray-400 font-bold">
                                            Aucun membre du personnel enregistré correspondant à vos critères.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(person => (
                                        <tr key={person.id} className="border-b border-gray-100 hover:bg-slate-50/50 transition">
                                            {/* Photo & Name */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {person.photo ? (
                                                        <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shrink-0">
                                                            <img 
                                                                src={person.photo} 
                                                                alt={person.fullName} 
                                                                className="w-full h-full object-cover"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-slate-100 text-[#15447c] font-black text-xs flex items-center justify-center border border-slate-200 uppercase shrink-0">
                                                            {person.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-800 block hover:underline cursor-pointer" onClick={() => setSelectedPersonnel(person)}>{person.fullName}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono font-bold">{person.id}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="p-4">
                                                {getEffectiveCategory(person) === 'Administratif' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Administratif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                        Office
                                                    </span>
                                                )}
                                            </td>

                                            {/* Role */}
                                            <td className="p-4 text-xs font-extrabold text-[#15447c]">
                                                {person.role}
                                            </td>

                                            {/* Salary */}
                                            <td className="p-4 text-xs font-bold text-emerald-700 font-mono">
                                                {formatCurrency(person.salary || 0)}
                                            </td>

                                            {/* Marital status */}
                                            <td className="p-4 text-xs font-semibold text-gray-600">
                                                {person.maritalStatus || 'Célibataire'}
                                            </td>

                                            {/* Children status */}
                                            <td className="p-4 text-xs font-semibold text-gray-600">
                                                {person.hasChildren === 'Oui' ? (
                                                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-150">
                                                        👨‍👩‍👧‍👦 {person.childrenCount} enfant{person.childrenCount && person.childrenCount > 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">Aucun</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-4">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getServiceStatusClass(person.serviceStatus)}`}>
                                                    {person.serviceStatus}
                                                </span>
                                            </td>

                                            {/* Disciplinary Measure & Status */}
                                            <td className="p-4">
                                                {person.disciplinaryStatus && person.disciplinaryStatus !== 'Aucune' ? (
                                                    <div className="space-y-1">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[9px] bg-amber-100 text-amber-805 border border-amber-250 font-black uppercase">
                                                            <AlertIcon className="w-2.5 h-2.5 text-amber-800 shrink-0 inline-block -mt-0.5 mr-0.5" /> {person.disciplinaryStatus}
                                                        </span>
                                                        <p className="text-[10px] text-gray-500 font-medium max-w-[160px] truncate" title={person.disciplinaryMeasure}>
                                                            {person.disciplinaryMeasure}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Aucune</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setSelectedPersonnel(person)}
                                                        className="text-indigo-600 hover:text-indigo-850 hover:underline font-bold text-2xs bg-indigo-50 hover:bg-indigo-100/50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                                    >
                                                        Voir Profil
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            onSendEmail(
                                                                person.email,
                                                                `Rappel de service interne - Cabinet KBB SARL`,
                                                                `Bonjour ${person.fullName},\n\nDans le cadre du suivi de nos opérations administratives au cabinet...\n\nSentiments distingués,\nDirection des Ressources Humaines`,
                                                                person.fullName
                                                            );
                                                        }}
                                                        className="text-slate-500 hover:text-indigo-850 bg-slate-50 hover:bg-indigo-100/50 p-1.5 rounded-lg transition cursor-pointer"
                                                        title={`Contacter ${person.fullName} par e-mail`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (true) {
                                                                onDeletePersonnel(person.id);
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-700 font-bold text-2xs bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PageContainer>

            <PersonnelModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSave={onAddPersonnel} 
                personnels={personnels}
            />

            {/* Personnel Profile Modal Details */}
            {selectedPersonnel && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-lg w-full animate-fadeIn flex flex-col max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4 shrink-0">
                            <div className="flex items-center gap-4">
                                {selectedPersonnel.photo ? (
                                    <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                        <img src={selectedPersonnel.photo} alt={selectedPersonnel.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-indigo-50 border border-indigo-150 rounded-full flex items-center justify-center text-xl font-black text-[#15447c] uppercase">
                                        {selectedPersonnel.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-2xs font-black text-indigo-600 uppercase tracking-widest block">{selectedPersonnel.role}</span>
                                        {getEffectiveCategory(selectedPersonnel) === 'Administratif' ? (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">Administratif</span>
                                        ) : (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800">Office</span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-black text-gray-800 leading-tight">{selectedPersonnel.fullName}</h2>
                                    <p className="text-[10px] font-mono text-gray-400 mt-1">ID Collaborateur : {selectedPersonnel.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedPersonnel(null)} 
                                className="p-1 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            {/* Personal and Admin Info Block */}
                            <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-3 shadow-3xs">
                                <h4 className="text-2xs font-black text-gray-400 uppercase tracking-wide border-b border-gray-200 pb-1.5 flex items-center gap-1.5"><FolderIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" /> Informations Administratives</h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-400 font-bold block">Statut Actuel</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 border ${getServiceStatusClass(selectedPersonnel.serviceStatus)}`}>
                                            {selectedPersonnel.serviceStatus}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 font-bold block">Date d'embauche</span>
                                        <span className="font-extrabold text-gray-700 block mt-1">{selectedPersonnel.serviceStartDate}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 font-bold block">Salaire Mensuel</span>
                                        <span className="font-extrabold text-emerald-700 block mt-1 font-mono text-sm">{formatCurrency(selectedPersonnel.salary || 0)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 font-bold block">Situation Famille</span>
                                        <span className="font-bold text-gray-700 block mt-1">
                                            {selectedPersonnel.maritalStatus || 'Célibataire'} 
                                            {selectedPersonnel.hasChildren === 'Oui' ? ` (${selectedPersonnel.childrenCount} enf.)` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Address details */}
                            <div className="border border-gray-150 p-4 rounded-xl space-y-2 bg-white shadow-3xs">
                                <h4 className="text-2xs font-black text-gray-400 uppercase tracking-wide border-b border-gray-150 pb-1.5">📍 Adresse de Résidence</h4>
                                <p className="text-xs text-gray-700 font-semibold leading-relaxed">
                                    {selectedPersonnel.address || <span className="text-gray-300 italic">Non renseignée</span>}
                                </p>
                            </div>

                            {/* Disciplinary Details */}
                            <div className="border border-amber-200/60 p-4 rounded-xl space-y-2.5 bg-amber-50/15 shadow-3xs">
                                <h4 className="text-2xs font-black text-amber-800 uppercase tracking-wide border-b border-amber-200/50 pb-1.5 flex items-center gap-1.5">
                                    <AlertIcon className="w-3.5 h-3.5 text-amber-800 shrink-0" /> Mesure Disciplinaire & Sanction
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 font-bold">Statut de la mesure</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                            !selectedPersonnel.disciplinaryStatus || selectedPersonnel.disciplinaryStatus === 'Aucune'
                                                ? 'bg-gray-100 text-gray-800 border-gray-250'
                                                : 'bg-amber-100 text-amber-800 border-amber-250'
                                        }`}>
                                            {selectedPersonnel.disciplinaryStatus || 'Aucune'}
                                        </span>
                                    </div>
                                    <div className="pt-1 border-t border-dashed border-gray-100">
                                        <span className="text-gray-400 font-bold block mb-1">Motif / Décision</span>
                                        <p className="text-gray-750 font-semibold leading-relaxed">
                                            {selectedPersonnel.disciplinaryMeasure || <span className="text-gray-300 italic">Aucune mesure enregistrée</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="border border-gray-150 p-4 rounded-xl space-y-3 bg-white shadow-3xs">
                                <h4 className="text-2xs font-black text-gray-400 uppercase tracking-wide border-b border-gray-150 pb-1.5 flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" /> Canaux de contact Direct</h4>
                                <div className="space-y-3.5 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <PhoneIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold block">Téléphone direct</span>
                                            <a href={`tel:${selectedPersonnel.phone}`} className="font-bold text-[#15447c] hover:underline font-mono text-xs">{selectedPersonnel.phone}</a>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-lg w-full">
                                        <div className="flex items-center gap-2.5 truncate">
                                            <MailIcon className="w-5 h-5 text-indigo-650 shrink-0" />
                                            <div className="truncate">
                                                <span className="text-[10px] text-gray-400 font-bold block">Adresse de messagerie corporative</span>
                                                <a href={`mailto:${selectedPersonnel.email}`} className="font-bold text-[#15447c] hover:underline text-xs truncate block">{selectedPersonnel.email}</a>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onSendEmail(
                                                selectedPersonnel.email,
                                                `Rappel administratif interne - Cabinet KBB SARL`,
                                                `Bonjour ${selectedPersonnel.fullName},\n\nDans le cadre de l'activité du cabinet, nous faisons suite...\n\nSentiments dévoués,\nDirection des Ressources Humaines`,
                                                selectedPersonnel.fullName
                                            )}
                                            className="text-[10px] bg-indigo-100/60 hover:bg-indigo-100 text-indigo-850 font-bold px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                                        >
                                            📩 Écrire
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bank accounts section */}
                            <div className="border border-indigo-150 p-4 rounded-xl space-y-3 bg-indigo-50/5 shadow-3xs">
                                <h4 className="text-2xs font-black text-indigo-900 uppercase tracking-wide border-b border-indigo-200/50 pb-1.5 flex items-center gap-1.5">💳 Comptes Bancaires associés({selectedPersonnel.bankAccounts?.length || 0})</h4>
                                {!selectedPersonnel.bankAccounts || selectedPersonnel.bankAccounts.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Aucune coordonnée bancaire enregistrée pour ce personnel.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {selectedPersonnel.bankAccounts.map((acc, index) => (
                                            <div key={index} className="flex justify-between items-center text-xs bg-white border border-indigo-100 p-2 rounded-lg font-mono font-bold text-indigo-950 shadow-3xs">
                                                <span>🏦 {acc.bankName}</span>
                                                <span className="text-gray-500 font-medium select-all">{acc.accountNumber}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Return buttons */}
                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end shrink-0">
                            <button 
                                onClick={() => setSelectedPersonnel(null)} 
                                className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold py-2 px-5 rounded-xl transition duration-150 text-xs border border-gray-200"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PersonnelsPage;
