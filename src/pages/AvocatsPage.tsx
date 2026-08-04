import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import AvocatModal from '../components/modals/AvocatModal';
import { PhoneIcon, MailIcon, CalendarIcon, CourthouseIcon, SearchIcon, CheckIcon, AlertIcon } from '../components/Icons';
import { Avocat, Task, Correspondance } from '../types';

interface AvocatsPageProps {
  avocats: Avocat[];
  tasks?: Task[];
  onAddAvocat: (avocat: Avocat, password?: string) => void;
  onDeleteAvocat?: (id: string) => void;
  onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
  correspondances?: Correspondance[];
  currentUserInfo?: { email?: string; name?: string; role?: string };
}

export const isTaskAssignedToLawyer = (task: Task, lawyerName: string): boolean => {
    if (!task || !lawyerName) return false;
    const target = lawyerName.toLowerCase().replace(/^me\.?\s*/i, '').trim();
    if (!target) return false;

    if (task.lawyer) {
        const primary = task.lawyer.toLowerCase().replace(/^me\.?\s*/i, '').trim();
        if (primary === target || primary.includes(target) || target.includes(primary)) return true;
    }

    if (Array.isArray(task.associatedLawyers)) {
        return task.associatedLawyers.some(assoc => {
            if (!assoc) return false;
            const cleanAssoc = assoc.toLowerCase().replace(/^me\.?\s*/i, '').trim();
            return cleanAssoc === target || cleanAssoc.includes(target) || target.includes(cleanAssoc);
        });
    }

    return false;
};

const AvocatsPage: FC<AvocatsPageProps> = ({ 
    avocats = [], 
    tasks = [], 
    onAddAvocat, 
    onDeleteAvocat, 
    onSendEmail, 
    correspondances = [],
    currentUserInfo 
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAvocat, setSelectedAvocat] = useState<Avocat | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'liste' | 'rapport'>('liste');
    const [selectedLawyerReportId, setSelectedLawyerReportId] = useState<string>(avocats[0]?.id || '');

    const getServiceStatusClass = (status: string) => {
        switch (status) {
            case 'Actif': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Omis': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Mise en disponibilité': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredAvocats = avocats.filter(av => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            av.fullName.toLowerCase().includes(query) ||
            av.cabinetStatus.toLowerCase().includes(query) ||
            (av.mainBar && av.mainBar.toLowerCase().includes(query)) ||
            (av.emails && av.emails.some(e => e.toLowerCase().includes(query))) ||
            (av.phone && av.phone.includes(query))
        );
    });

    const reportAvocat = avocats.find(a => a.id === selectedLawyerReportId) || avocats[0];
    const reportTasks = reportAvocat ? tasks.filter(t => isTaskAssignedToLawyer(t, reportAvocat.fullName)) : [];
    const reportCompletedTasks = reportTasks.filter(t => t.status === 'Effectué');
    const reportPendingTasks = reportTasks.filter(t => t.status !== 'Effectué');
    const reportHalfCompletedTasks = reportTasks.filter(t => t.status === 'Effectué à moitié');

    return (
        <>
            <PageContainer title="Avocats" buttonLabel="Ajouter un Avocat" onButtonClick={() => setIsAddModalOpen(true)}>
                {/* Mode Selector Tabs */}
                <div className="bg-white rounded-2xl border border-gray-150 shadow-3xs p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto border border-slate-200">
                        <button
                            onClick={() => setActiveTab('liste')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                activeTab === 'liste' ? 'bg-white text-[#15447c] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            📋 Registre des Avocats ({avocats.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('rapport')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                activeTab === 'rapport' ? 'bg-white text-[#15447c] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            📊 Rapport Personnel & Charge de Travail
                        </button>
                    </div>

                    {activeTab === 'liste' && (
                        <div className="flex items-center gap-2 max-w-sm w-full bg-slate-50 border border-gray-200 px-3 py-2 rounded-xl">
                            <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
                            <input 
                                type="text" 
                                placeholder="Rechercher par avocat, barreau, e-mail..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-xs font-medium focus:outline-hidden bg-transparent text-gray-700"
                            />
                        </div>
                    )}

                    {activeTab === 'rapport' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-slate-600 shrink-0">Avocat sélectionné :</label>
                            <select
                                value={selectedLawyerReportId}
                                onChange={(e) => setSelectedLawyerReportId(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                            >
                                {avocats.map(av => (
                                    <option key={av.id} value={av.id}>
                                        Me. {av.fullName} ({av.cabinetStatus})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {activeTab === 'liste' ? (
                    <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-3xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[650px]">
                                <thead className="bg-slate-50 border-b border-gray-200">
                                    <tr className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider">
                                        <th className="p-4 font-bold">Avocat & Photo</th>
                                        <th className="p-4 font-bold">Statut Cabinet</th>
                                        <th className="p-4 font-bold">Barreau Principal</th>
                                        <th className="p-4 font-bold">Statut Service</th>
                                        <th className="p-4 font-bold">E-mail</th>
                                        <th className="p-4 font-bold">Téléphone</th>
                                        <th className="p-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAvocats.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-xs text-gray-400 font-bold">
                                                Aucun avocat trouvé pour les critères renseignés.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAvocats.map(avocat => (
                                            <tr key={avocat.id} className="border-b border-gray-150 hover:bg-slate-50/70 transition">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {avocat.photoUrl ? (
                                                            <img 
                                                                src={avocat.photoUrl} 
                                                                alt={avocat.fullName} 
                                                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-3xs shrink-0" 
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 text-[#15447c] font-extrabold flex items-center justify-center text-xs shrink-0 shadow-3xs">
                                                                {avocat.fullName.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="font-bold text-gray-850 text-sm block leading-tight">{avocat.fullName}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {avocat.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-700 font-semibold text-xs">
                                                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-2xs font-extrabold text-slate-800">
                                                        {avocat.cabinetStatus}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-700 font-medium text-xs">
                                                    {avocat.mainBar || 'Kinshasa-Gombe'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-2xs font-extrabold border ${getServiceStatusClass(avocat.serviceStatus)}`}>
                                                        {avocat.serviceStatus}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-600 text-xs font-medium">{avocat.emails?.[0] || 'N/A'}</td>
                                                <td className="p-4 text-gray-600 text-xs font-medium">{avocat.phone || 'N/A'}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button 
                                                            onClick={() => setSelectedAvocat(avocat)}
                                                            className="text-indigo-600 hover:text-indigo-850 hover:underline font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                                                        >
                                                            Voir profil
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onSendEmail(
                                                                    avocat.emails?.[0] || 'avocat@kbblawfirmscp.com',
                                                                    `Instruction Interne Cabinet — Cabinet KBB SARL`,
                                                                    `Cher Maître ${avocat.fullName},\n\nDans le cadre de la gestion de nos affaires courantes...\n\nSentiments distingués,\nDirection Générale`,
                                                                    avocat.fullName
                                                                );
                                                            }}
                                                            className="text-slate-500 hover:text-indigo-800 bg-slate-50 hover:bg-indigo-50 p-1.5 rounded-xl transition cursor-pointer border border-slate-200"
                                                            title={`Contacter Me ${avocat.fullName}`}
                                                        >
                                                            <MailIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        {onDeleteAvocat && (
                                                            <button
                                                                onClick={() => onDeleteAvocat(avocat.id)}
                                                                className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-xl transition cursor-pointer border border-rose-200"
                                                                title={`Supprimer l'avocat ${avocat.fullName}`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Personal Report / Workload View */
                    <div className="space-y-6">
                        {reportAvocat && (
                            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-3xs">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                                    <div className="flex items-center gap-4">
                                        {reportAvocat.photoUrl ? (
                                            <img src={reportAvocat.photoUrl} alt={reportAvocat.fullName} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-md shrink-0" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-200 text-[#15447c] font-black flex items-center justify-center text-xl shrink-0 shadow-inner">
                                                {reportAvocat.fullName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-2xs font-extrabold text-indigo-600 uppercase tracking-widest block mb-0.5">
                                                Rapport Personnel de Charge • Me. {reportAvocat.fullName}
                                            </span>
                                            <h2 className="text-2xl font-black text-slate-850">{reportAvocat.fullName}</h2>
                                            <p className="text-xs text-slate-500 font-medium mt-1">
                                                {reportAvocat.cabinetStatus} • Barreau: <strong className="text-slate-800">{reportAvocat.mainBar || 'Kinshasa-Gombe'}</strong> • ONA: <strong className="text-slate-800">{reportAvocat.onaNumber || 'N/A'}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Envoi de rapport par email désactivé */}
                                </div>

                                {/* Workload Metrics Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <span className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Tâches Totales</span>
                                        <span className="text-2xl font-black text-slate-850">{reportTasks.length}</span>
                                        <span className="text-[10px] text-slate-400 block mt-1">(Inclus rôles titulaire & collaborateur)</span>
                                    </div>

                                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                                        <span className="text-2xs font-extrabold uppercase text-emerald-700 tracking-wider block mb-1">Tâches Accomplies</span>
                                        <span className="text-2xl font-black text-emerald-800">{reportCompletedTasks.length}</span>
                                        <span className="text-[10px] text-emerald-600 block mt-1">
                                            {reportTasks.length > 0 ? `${Math.round((reportCompletedTasks.length / reportTasks.length) * 100)}% de complétion` : 'Aucune tâche'}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                                        <span className="text-2xs font-extrabold uppercase text-amber-700 tracking-wider block mb-1">En Cours / Partiel</span>
                                        <span className="text-2xl font-black text-amber-800">{reportHalfCompletedTasks.length}</span>
                                        <span className="text-[10px] text-amber-600 block mt-1">Avancement intermédiaire</span>
                                    </div>

                                    <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                                        <span className="text-2xs font-extrabold uppercase text-rose-700 tracking-wider block mb-1">En Attente / À Traiter</span>
                                        <span className="text-2xl font-black text-rose-800">{reportPendingTasks.length - reportHalfCompletedTasks.length}</span>
                                        <span className="text-[10px] text-rose-600 block mt-1">Prochaines échéances</span>
                                    </div>
                                </div>

                                {/* Detailed Task Log for this Lawyer */}
                                <div className="mt-8 border-t border-slate-150 pt-6">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center justify-between">
                                        <span>Liste Exclusive des Tâches Affectées ({reportTasks.length})</span>
                                        <span className="text-[10px] text-slate-400 font-medium lowercase">Rapport confidentiel d'activité</span>
                                    </h3>

                                    {reportTasks.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                                            Aucune tâche enregistrée pour Maître {reportAvocat.fullName}.
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                            {reportTasks.map(t => (
                                                <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100/80 transition">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-900">{t.name}</span>
                                                            {t.associatedLawyers && t.associatedLawyers.length > 0 && (
                                                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                                                                    Collaborateur: {t.associatedLawyers.join(', ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-slate-500 font-medium block">
                                                            📜 Dossier Réf: <strong className="text-slate-700">{t.caseId || 'Général'}</strong> • Échéance: <strong className="text-slate-700">{t.dueDate}</strong>
                                                        </span>
                                                        {t.notes && <p className="text-2xs text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200 mt-1">{t.notes}</p>}
                                                    </div>

                                                    <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                                                        t.status === 'Effectué' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                        t.status === 'Effectué à moitié' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                        'bg-rose-100 text-rose-800 border-rose-200'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </PageContainer>
            
            <AvocatModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={onAddAvocat} avocats={avocats} />

            {/* Avocat details modal */}
            {selectedAvocat && (() => {
                const lawyerTasks = tasks.filter(t => isTaskAssignedToLawyer(t, selectedAvocat.fullName));
                const signedLetters = correspondances.filter(c => 
                    c.avocatSignataireId === selectedAvocat.id || 
                    (c.author && c.author.toLowerCase() === selectedAvocat.fullName.toLowerCase())
                );
                
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-4">
                                    {selectedAvocat.photoUrl ? (
                                        <img 
                                            src={selectedAvocat.photoUrl} 
                                            alt={selectedAvocat.fullName} 
                                            className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-inner shrink-0" 
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-xl font-extrabold text-[#15447c] shadow-inner shrink-0">
                                            {selectedAvocat.fullName.split(' ').map(n => n[0]).join('')}
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-2xs font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">{selectedAvocat.cabinetRole || 'Avocat'} ({selectedAvocat.cabinetStatus})</span>
                                        <h2 className="text-2xl font-extrabold text-gray-850 leading-tight">{selectedAvocat.fullName}</h2>
                                        <p className="text-2xs font-mono text-gray-400 mt-1">Numéro ONA : <strong className="font-semibold text-gray-600">{selectedAvocat.onaNumber || 'N/A'}</strong></p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedAvocat(null)} 
                                    className="p-1.5 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Direct</span>
                                        <div className="text-xs text-gray-750 font-medium p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                            <p className="flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5 text-indigo-600" /> {selectedAvocat.phone}</p>
                                            <p className="flex items-center justify-between gap-1 border-t border-slate-150/50 pt-2 shrink-0">
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <MailIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    <span className="truncate">{selectedAvocat.emails?.join(', ')}</span>
                                                </span>
                                                <button
                                                    onClick={() => onSendEmail(
                                                        selectedAvocat.emails?.[0] || 'avocat@kbblawfirmscp.com',
                                                        `Instruction Interne Cabinet — Cabinet KBB SARL`,
                                                        `Cher Maître ${selectedAvocat.fullName},\n\nDans le cadre de la gestion de nos affaires de cabinet...\n\nSentiments distingués,\nDirection Générale`,
                                                        selectedAvocat.fullName
                                                    )}
                                                    className="text-[10px] bg-indigo-100/60 hover:bg-indigo-100 text-indigo-850 font-bold px-2 py-0.5 rounded transition shrink-0 cursor-pointer"
                                                >
                                                    📩 Écrire
                                                </button>
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prestation de Serments</span>
                                        <p className="text-xs text-gray-750 font-semibold leading-relaxed flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-indigo-600" /> 1er Serment : {selectedAvocat.firstOathDate || 'N/A'}</p>
                                        {selectedAvocat.secondOathDate && (
                                            <p className="text-xs text-gray-750 font-semibold leading-relaxed mt-1 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-indigo-600" /> 2nd Serment : {selectedAvocat.secondOathDate}</p>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Barreaux</span>
                                        <p className="text-xs text-slate-800 font-semibold leading-relaxed flex items-center gap-1.5">
                                            <CourthouseIcon className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>Principal :</span>
                                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-2xs">{selectedAvocat.mainBar || 'Non spécifié'}</span>
                                        </p>
                                        {selectedAvocat.secondaryBar ? (
                                            <p className="text-xs text-slate-800 font-semibold leading-relaxed mt-1.5 flex items-center gap-1.5">
                                                <CourthouseIcon className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>Secondaire :</span>
                                                <span className="bg-slate-100 border border-slate-200 text-slate-705 font-bold px-1.5 py-0.5 rounded text-2xs">{selectedAvocat.secondaryBar}</span>
                                            </p>
                                        ) : (
                                            <p className="text-2xs text-gray-400 italic mt-1 font-medium">Aucun barreau secondaire spécifié</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Statut de Service</span>
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider mt-1 ${getServiceStatusClass(selectedAvocat.serviceStatus)}`}>
                                            {selectedAvocat.serviceStatus} (depuis le {selectedAvocat.serviceStartDate})
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Mesures Disciplinaires</span>
                                        <p className="text-xs text-gray-650 italic leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                                            {selectedAvocat.disciplinaryMeasures || "Aucune mesure ou sanction disciplinaire n'est recensée au dossier."}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Comptes Bancaires ({selectedAvocat.bankAccounts?.length || 0})</span>
                                        {!selectedAvocat.bankAccounts || selectedAvocat.bankAccounts.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic leading-relaxed bg-slate-50 border border-dashed border-gray-250 p-2.5 rounded-lg">Aucun compte bancaire configuré.</p>
                                        ) : (
                                            <div className="space-y-1.5 pt-1">
                                                {selectedAvocat.bankAccounts.map((acc, idx) => (
                                                    <div key={idx} className="bg-indigo-50/45 border border-indigo-100 rounded-lg p-2 flex justify-between items-center text-xs font-semibold text-indigo-900 font-mono shadow-3xs">
                                                        <span className="font-bold">🏦 {acc.bankName}</span>
                                                        <span className="text-gray-600 select-all">{acc.accountNumber}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Target Task Log */}
                            <div className="border-t border-gray-100 pt-5">
                                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3">
                                    Tâches assignées ({lawyerTasks.length})
                                </h3>

                                {lawyerTasks.length === 0 ? (
                                    <div className="p-5 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                                        Aucune tâche opérationnelle n'est affectée à cet avocat pour le moment.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {lawyerTasks.map(t => (
                                            <div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-100/50 transition duration-150">
                                                <div>
                                                    <span className="text-sm font-semibold text-gray-850 block leading-tight">{t.name}</span>
                                                    <span className="text-[10px] text-gray-450 font-medium">📜 Dossier : {t.caseId} • Échéance : {t.dueDate}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                    t.status === 'Effectué' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                    t.status === 'Effectué à moitié' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-rose-50 text-rose-700 border-rose-100'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Signed Letters Section */}
                            <div className="border-t border-gray-100 pt-5 mt-5">
                                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3">
                                    Lettres & Correspondances Signées ({signedLetters.length})
                                </h3>

                                {signedLetters.length === 0 ? (
                                    <div className="p-5 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                                        Aucune lettre officielle signée par cet avocat n'est enregistrée.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {signedLetters.map(letter => (
                                            <div key={letter.id} className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-xl flex items-center justify-between hover:bg-indigo-50/50 transition duration-150">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-bold text-slate-800 block leading-tight truncate">{letter.subject}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        Destinataire : <strong className="font-semibold text-slate-650">{letter.recipientName || letter.destinataire}</strong>
                                                        {letter.dateEmission && ` • Émise le : ${letter.dateEmission}`}
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ml-2 shrink-0 ${
                                                    letter.status === 'Envoyé' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                    letter.status === 'Reçu' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                    {letter.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions / Footer */}
                            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                                <button 
                                    onClick={() => setSelectedAvocat(null)} 
                                    className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold py-2 px-6 rounded-xl transition duration-150 text-sm"
                                >
                                    Fermer le profil
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default AvocatsPage;
