
import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import EventModal from '../components/modals/EventModal';
import { CalendarIcon, MapPinIcon, HandshakeIcon, AttachmentIcon, FolderIcon, UsersIcon, SearchIcon, EditIcon, ClipboardIcon } from '../components/Icons';
import { Event, Avocat, EventReport, Personnel } from '../types';

interface EventsPageProps {
  events: Event[];
  onAddEvent: (event: Event) => void;
  onUpdateEvent?: (event: Event) => void;
  avocats?: Avocat[];
  personnels?: Personnel[];
}

const EventsPage: FC<EventsPageProps> = ({ events, onAddEvent, onUpdateEvent, avocats = [], personnels = [] }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isAllReportsModalOpen, setIsAllReportsModalOpen] = useState<boolean>(false);

    // Report Form state
    const [reportingEvent, setReportingEvent] = useState<Event | null>(null);
    const [reportTitle, setReportTitle] = useState('');
    const [reportContent, setReportContent] = useState('');
    const [reportAuthor, setReportAuthor] = useState('');
    const [customAuthor, setCustomAuthor] = useState('');
    const [reportFiles, setReportFiles] = useState<Array<{ name: string; size: string; content?: string }>>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [viewingReportsEvent, setViewingReportsEvent] = useState<Event | null>(null);

    // Gather all reports across all events
    const allReports = events.flatMap(event => 
        (event.reports || []).map(report => ({
            ...report,
            eventRef: event
        }))
    ).sort((a, b) => b.id.localeCompare(a.id));

    const totalReportsCount = allReports.length;

    const getEventDescription = (event: Event) => {
        switch (event.type) {
            case 'Atelier':
                return "Atelier pratique et collaboratif visant à partager des connaissances, former les participants ou co-créer des solutions sur des sujets juridiques définis.";
            case 'Conférence':
                return "Réunion thématique d'échange professionnel. Utile pour consolider la position doctrinale et le réseau d'affaires du cabinet.";
            case 'Colloque':
                return "Séance académique majeure portant sur l'évolution jurisprudentielle et l'étude poussée des réformes législatives d'actualité.";
            case 'Séminaire':
                return "Formation ciblée sur les outils numériques et la gestion optimisée des dossiers. Recommandé pour tous les collaborateurs Juniors.";
            default:
                return "Événement de travail externe ou interne visant à coordonner les priorités ou les échéances clés du cabinet.";
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const sizeStr = file.size > 1024 * 1024 
                        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (file.size / 1024).toFixed(0) + ' KB';
                    setReportFiles(prev => [...prev, {
                        name: file.name,
                        size: sizeStr,
                        content: reader.result as string
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) {
            Array.from(e.dataTransfer.files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const sizeStr = file.size > 1024 * 1024 
                        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (file.size / 1024).toFixed(0) + ' KB';
                    setReportFiles(prev => [...prev, {
                        name: file.name,
                        size: sizeStr,
                        content: reader.result as string
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeFile = (indexToRemove: number) => {
        setReportFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSaveReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportingEvent || !reportTitle.trim() || !reportContent.trim()) return;

        const resolvedAuthor = reportAuthor === 'autre' ? (customAuthor.trim() || 'Collaborateur KBB') : (reportAuthor || 'Collaborateur KBB');

        const newReport: EventReport = {
            id: `REP-${Date.now()}`,
            title: reportTitle.trim(),
            content: reportContent.trim(),
            dateCreated: new Date().toLocaleDateString('fr-FR', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            author: resolvedAuthor,
            files: reportFiles
        };

        const updatedEvent: Event = {
            ...reportingEvent,
            reports: [...(reportingEvent.reports || []), newReport]
        };

        if (onUpdateEvent) {
            onUpdateEvent(updatedEvent);
        }

        // If currently viewed in detail modal, update view of it
        if (selectedEvent && selectedEvent.id === reportingEvent.id) {
            setSelectedEvent(updatedEvent);
        }

        // If currently viewed in all-reports overlay, update state
        if (viewingReportsEvent && viewingReportsEvent.id === reportingEvent.id) {
            setViewingReportsEvent(updatedEvent);
        }

        setReportingEvent(null);
        setReportTitle('');
        setReportContent('');
        setReportAuthor('');
        setCustomAuthor('');
        setReportFiles([]);
    };

    const downloadFile = (file: { name: string, content?: string }) => {
        if (!file.content) return;
        const link = document.createElement('a');
        link.href = file.content;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <PageContainer 
                title="Événements" 
                buttonLabel="Créer un Événement" 
                onButtonClick={() => setIsAddModalOpen(true)}
                extraHeaderActions={
                    <button 
                        onClick={() => setIsAllReportsModalOpen(true)} 
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl transition duration-150 shadow-sm flex items-center text-xs sm:text-sm"
                    >
                        <ClipboardIcon className="w-4 h-4 mr-2" />
                        voir tous les rapports ({totalReportsCount})
                    </button>
                }
            >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-sm text-gray-600">
                                <th className="p-4 font-semibold">Nom de l'événement</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Lieu</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(event => (
                                <tr key={event.id} className="border-b border-gray-200 hover:bg-slate-50/50">
                                    <td className="p-4 font-medium text-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 overflow-hidden shrink-0 flex items-center justify-center shadow-3xs">
                                                {event.photoProfil ? (
                                                    <img src={event.photoProfil} alt="" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-gray-800 leading-tight">{event.name}</h4>
                                                {event.coOrganisateur && (
                                                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5 flex items-center gap-1">
                                                        <HandshakeIcon className="w-3 h-3" />
                                                        <span>Co-organisé avec: {event.coOrganisateur}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-650">
                                        <span className={`px-2.5 py-1 rounded-md text-3xs font-extrabold uppercase tracking-wider border ${
                                            event.type === 'Atelier' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' :
                                            event.type === 'Conférence' ? 'bg-indigo-55/70 text-indigo-800 border-indigo-200' :
                                            event.type === 'Colloque' ? 'bg-teal-55/70 text-teal-800 border border-teal-200' :
                                            'bg-gray-100 text-gray-700 border border-gray-300'
                                        }`}>
                                            {event.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 font-bold text-xs">
                                        {event.dates && event.dates.length > 1 ? (
                                            <div className="space-y-0.5">
                                                {event.dates.map((d, i) => (
                                                    <div key={i} className="text-2xs bg-slate-100 px-1.5 py-0.5 rounded text-gray-700 w-fit flex items-center gap-1">
                                                        <CalendarIcon className="w-3 h-3 text-indigo-600" />
                                                        <span>{new Date(d).toLocaleDateString('fr-FR')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>{new Date(event.date || today).toLocaleDateString('fr-FR')}</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs font-semibold">{event.lieu}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button 
                                                onClick={() => setSelectedEvent(event)}
                                                className="text-indigo-650 hover:text-indigo-850 hover:underline font-bold text-2xs bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl transition duration-150 flex items-center gap-1"
                                            >
                                                <SearchIcon className="w-3.5 h-3.5" />
                                                <span>Détails</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setReportingEvent(event);
                                                    setReportTitle(`Rapport d'événement: ${event.name}`);
                                                    setReportContent('');
                                                    setReportAuthor('');
                                                    setCustomAuthor('');
                                                    setReportFiles([]);
                                                }}
                                                className="text-emerald-700 hover:text-emerald-900 font-bold text-2xs bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition duration-150 flex items-center gap-1"
                                            >
                                                <EditIcon className="w-3.5 h-3.5" />
                                                <span>Rapport</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </PageContainer>
            
            <EventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={onAddEvent} avocats={avocats} personnels={personnels} events={events} />

            {/* Event Details Model */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-xl w-full animate-fadeIn flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3 shrink-0">
                            <div>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider mb-1.5 ${
                                    selectedEvent.type === 'Atelier' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-150' :
                                    selectedEvent.type === 'Conférence' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                                    'bg-teal-50 text-teal-700 border border-teal-150'
                                }`}>
                                    {selectedEvent.type}
                                </span>
                                <h2 className="text-xl font-extrabold text-gray-850 leading-tight">{selectedEvent.name}</h2>
                                <p className="text-2xs font-mono text-gray-400 mt-1">ID : {selectedEvent.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedEvent(null)} 
                                className="p-1 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Scrollable details container */}
                        <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar pb-4">
                            
                            {/* Profile Photo Display */}
                            {selectedEvent.photoProfil && (
                                <div className="w-full h-32 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden relative flex items-center justify-center shadow-inner shrink-0">
                                    <img src={selectedEvent.photoProfil} alt="Profil" className="max-h-full max-w-full object-contain p-2" referrerPolicy="no-referrer" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <CalendarIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Date(s) de l'événement</span>
                                        {selectedEvent.dates && selectedEvent.dates.length > 1 ? (
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {selectedEvent.dates.map((d, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-200/80 font-bold px-1.5 py-0.5 rounded text-gray-700 font-mono">
                                                        {new Date(d).toLocaleDateString('fr-FR')}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-800">{new Date(selectedEvent.date || new Date().toISOString().split('T')[0]).toLocaleDateString('fr-FR')}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <MapPinIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Lieu / Salle</span>
                                        <span className="text-xs font-bold text-gray-850">{selectedEvent.lieu}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Co-organizer presentation */}
                            {selectedEvent.coOrganisateur && (
                                <div className="p-3 bg-indigo-50/15 border border-indigo-100 rounded-xl">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <HandshakeIcon className="w-4 h-4 shrink-0" />
                                        <span>Co-organisateur</span>
                                    </span>
                                    <p className="text-xs font-bold text-slate-800">{selectedEvent.coOrganisateur}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Description administrative</span>
                                <p className="text-xs text-gray-650 leading-relaxed font-semibold bg-indigo-50/10 p-3 rounded-xl border border-indigo-100/30">
                                    {getEventDescription(selectedEvent)}
                                </p>
                            </div>

                            {selectedEvent.membresKBB && (
                                <div className="p-3 bg-indigo-55/10 border border-indigo-100/50 rounded-xl">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Membres KBB</span>
                                    <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                        <UsersIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        <span>{selectedEvent.membresKBB}</span>
                                    </p>
                                </div>
                            )}

                            {selectedEvent.membresExternes && (
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Membres Externes</span>
                                    <p className="text-xs font-medium text-gray-750">{selectedEvent.membresExternes}</p>
                                </div>
                            )}

                            {/* Finances and budget details (Evolution de financement) */}
                            {(() => {
                                const detailsFinancement = selectedEvent.evolutionFinancement || [
                                    { designation: 'Cabinet KBB', attendu: 0, realise: Number(selectedEvent.financements?.find(f => f.label === 'Cabinet KBB' || f.label === 'Cabinet KBB (Attendu: $0, Réalisé: $0)' || f.label === 'KBB')?.amount) || 0 },
                                    { designation: 'Sponsors externe', attendu: 0, realise: Number(selectedEvent.financements?.find(f => f.label === 'Sponsors externe' || f.label === 'Sponsors')?.amount) || 0 },
                                    { designation: 'Frais de participation', attendu: 0, realise: selectedEvent.fraisParticipation || 0 },
                                    { designation: 'Autre', attendu: 0, realise: selectedEvent.autresRecettes || Number(selectedEvent.financements?.find(f => f.label === 'Autres' || f.label === 'Autre')?.amount) || 0 }
                                ];
                                const detailsTotalAttendu = detailsFinancement.reduce((sum, item) => sum + (item.attendu || 0), 0);
                                const detailsTotalRealise = detailsFinancement.reduce((sum, item) => sum + (item.realise || 0), 0);

                                return (
                                    <div className="space-y-3.5">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-3.5 space-y-2.5">
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                            <span className="text-[10px] font-black text-[#15447c] uppercase tracking-wider block">Evolution de financement</span>
                                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-150">
                                                Total Réalisé : ${detailsTotalRealise.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                        <div className="bg-white border border-gray-150 rounded-lg overflow-hidden">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-gray-150 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                                        <th className="px-3 py-2">Designation</th>
                                                        <th className="px-3 py-2 text-right">Montant Attendu ($)</th>
                                                        <th className="px-3 py-2 text-right">Montant Réalisé ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-gray-750">
                                                    {detailsFinancement.map((item) => (
                                                        <tr key={item.designation} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-2 font-semibold text-gray-700">{item.designation}</td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                                                                ${(item.attendu || 0).toLocaleString('en-US')}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                                                                ${(item.realise || 0).toLocaleString('en-US')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Total Row */}
                                                    <tr className="bg-slate-50 font-black text-gray-900 border-t border-gray-150">
                                                        <td className="px-3 py-2 text-[10px] uppercase tracking-wider">Total</td>
                                                        <td className="px-3 py-2 text-right font-mono text-indigo-850">
                                                            ${detailsTotalAttendu.toLocaleString('en-US')}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-mono text-emerald-850">
                                                            ${detailsTotalRealise.toLocaleString('en-US')}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Tableau 2: Compte rendu */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-3.5 space-y-2.5">
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                            <span className="text-[10px] font-black text-[#15447c] uppercase tracking-wider block">Compte rendu</span>
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-150">
                                                Liaison Auto
                                            </span>
                                        </div>
                                        <div className="bg-white border border-gray-150 rounded-lg overflow-hidden">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-gray-150 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                                        <th className="px-3 py-2">Designation</th>
                                                        <th className="px-3 py-2 text-right">Montant ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-gray-750">
                                                    <tr className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 font-semibold text-gray-700">Dépenses prévues</td>
                                                        <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                                                            ${detailsTotalAttendu.toLocaleString('en-US')}
                                                        </td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 font-semibold text-gray-700">Dépenses réalisées</td>
                                                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                                                            ${detailsTotalRealise.toLocaleString('en-US')}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    </div>
                                );
                            })()}

                            {/* Downloadable attachments of the event */}
                            {selectedEvent.piecesJointes && selectedEvent.piecesJointes.length > 0 && (
                                <div className="p-3 bg-indigo-50/10 border border-slate-200 rounded-xl space-y-1.5">
                                    <span className="text-[10px] font-black text-[#15447c] uppercase tracking-wider block flex items-center gap-1.5">
                                        <AttachmentIcon className="w-4 h-4 shrink-0" />
                                        <span>Pièces jointes administratives</span>
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 animate-fadeIn">
                                        {selectedEvent.piecesJointes.map((p, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => downloadFile(p)}
                                                className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-indigo-900 border border-slate-205 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-3xs transition"
                                            >
                                                <FolderIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                <span className="max-w-[150px] truncate">{p.name}</span>
                                                {p.size && <span className="text-[8px] text-gray-400 font-bold">({p.size})</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reports List Section */}
                            <div className="pt-3 border-t border-gray-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Reports d'événement ({selectedEvent.reports?.length || 0})</span>
                                    <button 
                                        onClick={() => {
                                            setReportingEvent(selectedEvent);
                                            setReportTitle(`Rapport d'événement: ${selectedEvent.name}`);
                                            setReportContent('');
                                            setReportAuthor('');
                                            setCustomAuthor('');
                                            setReportFiles([]);
                                        }}
                                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full transition"
                                    >
                                        + Rédiger un Rapport
                                    </button>
                                </div>

                                {!selectedEvent.reports || selectedEvent.reports.length === 0 ? (
                                    <div className="p-4 bg-slate-50 text-center rounded-xl border border-dashed border-gray-200">
                                        <p className="text-xs text-gray-400 italic">Aucun rapport lié à cet événement pour l'instant.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedEvent.reports.map((report) => (
                                            <div key={report.id} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2.5 shadow-xs relative hover:border-indigo-200 transition">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-800">{report.title}</h4>
                                                        <p className="text-[9px] text-gray-400 mt-0.5 font-semibold">
                                                            Rédigé par : <span className="text-indigo-600">{report.author}</span> le {report.dateCreated}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-650 leading-relaxed whitespace-pre-line bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 font-medium">
                                                    {report.content}
                                                </p>

                                                {/* Downloadable report attachments */}
                                                {report.files && report.files.length > 0 && (
                                                    <div className="space-y-1 pt-1.5">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                            <AttachmentIcon className="w-3 h-3 text-indigo-400" />
                                                            <span>Fichiers Joints ({report.files.length}) :</span>
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {report.files.map((file, fIdx) => (
                                                                <button 
                                                                    key={fIdx}
                                                                    onClick={() => downloadFile(file)}
                                                                    title="Cliquez pour télécharger le fichier"
                                                                    className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-100 text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
                                                                >
                                                                    <FolderIcon className="w-3 h-3 text-indigo-600 shrink-0" />
                                                                    <span className="max-w-[120px] truncate">{file.name}</span>
                                                                    <span className="text-[8px] text-indigo-500 font-semibold ml-0.5">({file.size})</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
                            <button 
                                onClick={() => setSelectedEvent(null)} 
                                className="bg-slate-105 hover:bg-slate-200 text-gray-700 font-bold py-2 px-5 rounded-xl transition text-xs border border-gray-200"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Report Form Modal */}
            {reportingEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-lg w-full animate-fadeIn max-h-[92vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4 border-b border-gray-150 pb-3 shrink-0">
                            <div>
                                <h3 className="text-base font-black text-[#15447c] uppercase tracking-wider flex items-center gap-1.5">
                                    <EditIcon className="w-5 h-5 text-[#15447c] inline-block -mt-1" /> Rédiger un Rapport d'Événement
                                </h3>
                                <p className="text-2xs text-gray-400 font-bold mt-1">
                                    Événement de référence : <span className="text-indigo-600">{reportingEvent.name}</span>
                                </p>
                            </div>
                            <button 
                                onClick={() => setReportingEvent(null)} 
                                className="p-1 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveReport} className="space-y-4 overflow-y-auto pr-1.5 flex-1 custom-scrollbar pb-3">
                            <div>
                                <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Titre du Rapport</label>
                                <input 
                                    type="text" 
                                    value={reportTitle} 
                                    onChange={(e) => setReportTitle(e.target.value)} 
                                    required
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-850 focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="Ex: Procès-verbal de l'audience ou Synthèse du colloque"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Auteur du Rapport (KBB)</label>
                                    <select
                                        value={reportAuthor}
                                        onChange={(e) => setReportAuthor(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-850 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        <option value="">Sélectionner un avocat...</option>
                                        {avocats.map(a => (
                                            <option key={a.id} value={a.fullName}>{a.fullName}</option>
                                        ))}
                                        <option value="autre">Autre collaborateur ou rédacteur...</option>
                                    </select>
                                </div>

                                {reportAuthor === 'autre' && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nom du rédacteur</label>
                                        <input 
                                            type="text" 
                                            value={customAuthor} 
                                            onChange={(e) => setCustomAuthor(e.target.value)} 
                                            required
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-850 focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Indiquez son nom et prénom"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Compte rendu ou contenu du rapport</label>
                                <textarea 
                                    value={reportContent} 
                                    onChange={(e) => setReportContent(e.target.value)} 
                                    required
                                    rows={5}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-850 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                    placeholder="Saisissez ici le compte rendu détaillé, les conclusions retenues et les prochaines étapes de l'événement..."
                                />
                            </div>

                            {/* Attachements with drag-and-drop & browse triggers */}
                            <div className="space-y-2">
                                <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider block">Pièces Jointes / Fichiers</label>
                                
                                <div 
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${
                                        isDragOver 
                                            ? 'border-indigo-500 bg-indigo-50/20' 
                                            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                                    }`}
                                >
                                    <input 
                                        type="file" 
                                        id="reportFileInput"
                                        multiple 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                    />
                                    <label htmlFor="reportFileInput" className="cursor-pointer block space-y-2.5">
                                        <FolderIcon className="w-8 h-8 text-indigo-500 mx-auto" />
                                        <p className="text-xs font-bold text-slate-700">Déposez vos fichiers ici ou <span className="text-indigo-600 hover:text-indigo-850 hover:underline">cliquez pour parcourir</span></p>
                                        <p className="text-[10px] text-gray-400">Format PDF, DOC, Images (PNG, JPG) jusqu'à 10 Mo par document</p>
                                    </label>
                                </div>

                                {/* Current file attachments list */}
                                {reportFiles.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <span className="text-[10px] font-black text-[#15447c] uppercase tracking-wider block">Fichiers à attacher ({reportFiles.length}) :</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {reportFiles.map((file, idx) => (
                                                <div key={idx} className="bg-white border border-gray-200 p-2.5 rounded-xl flex items-center justify-between shadow-3xs hover:border-indigo-150 transition">
                                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                                        <AttachmentIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-black text-gray-700 truncate leading-tight">{file.name}</p>
                                                            <p className="text-[9px] text-indigo-600 font-bold">{file.size}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeFile(idx)}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Retirer ce fichier"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setReportingEvent(null)}
                                    className="bg-slate-105 hover:bg-slate-200 text-gray-700 font-bold py-2 px-4 rounded-xl transition text-xs border border-gray-200"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-xl transition text-xs shadow-md"
                                >
                                    Enregistrer le Rapport
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View All Reports Modal */}
            {viewingReportsEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full animate-fadeIn flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-4 border-b border-gray-150 pb-3 shrink-0">
                            <div>
                                <h3 className="text-base font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <ClipboardIcon className="w-5 h-5 text-amber-800" /> Tous les Rapports d'Événement
                                </h3>
                                <h4 className="text-sm font-bold text-gray-700 mt-1">
                                    Événement de référence : <span className="text-indigo-600 font-extrabold">{viewingReportsEvent.name}</span>
                                </h4>
                            </div>
                            <button 
                                onClick={() => setViewingReportsEvent(null)} 
                                className="p-1 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar space-y-4 pb-4">
                            {!viewingReportsEvent.reports || viewingReportsEvent.reports.length === 0 ? (
                                <div className="py-12 bg-slate-50 text-center rounded-2xl border-2 border-dashed border-gray-200 px-6">
                                    <ClipboardIcon className="w-10 h-10 text-gray-300 mx-auto block mb-2" />
                                    <p className="text-sm font-extrabold text-gray-750">Aucun rapport lié à cet événement</p>
                                    <p className="text-xs text-gray-400 mt-1 mb-4">Soyez le premier à rédiger un compte rendu pour cet événement en cliquant ci-dessous.</p>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const targetEvent = viewingReportsEvent;
                                            setViewingReportsEvent(null);
                                            setReportingEvent(targetEvent);
                                            setReportTitle(`Rapport d'événement: ${targetEvent.name}`);
                                            setReportContent('');
                                            setReportAuthor('');
                                            setCustomAuthor('');
                                            setReportFiles([]);
                                        }}
                                        className="text-xs font-bold text-center text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-150 transition inline-flex items-center gap-1.5"
                                    >
                                        <EditIcon className="w-3.5 h-3.5" /> Rédiger un Rapport
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-amber-50/20 border border-amber-100/30 p-3 rounded-xl">
                                        <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Compte Rendu disponible{viewingReportsEvent.reports.length > 1 ? 's' : ''} ({viewingReportsEvent.reports.length})</span>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const targetEvent = viewingReportsEvent;
                                                setViewingReportsEvent(null);
                                                setReportingEvent(targetEvent);
                                                setReportTitle(`Rapport d'événement: ${targetEvent.name}`);
                                                setReportContent('');
                                                setReportAuthor('');
                                                setCustomAuthor('');
                                                setReportFiles([]);
                                            }}
                                            className="text-2xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition"
                                        >
                                            + Nouveau Rapport
                                        </button>
                                    </div>

                                    {viewingReportsEvent.reports.map((report) => (
                                        <div key={report.id} className="p-5 bg-slate-50 border border-gray-200 rounded-xl space-y-3 shadow-xs relative hover:border-indigo-200 transition-all duration-200">
                                            <div className="flex justify-between items-start pb-2 border-b border-gray-200">
                                                <div>
                                                    <h4 className="text-xs font-black text-[#15447c] uppercase tracking-wider">{report.title}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 font-bold">
                                                        Rédigé par : <span className="text-indigo-600">{report.author}</span> le {report.dateCreated}
                                                    </p>
                                                </div>
                                                <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                                    {report.id}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-gray-150 font-semibold shadow-2xs">
                                                {report.content}
                                            </p>

                                            {/* Downloadable report attachments */}
                                            {report.files && report.files.length > 0 && (
                                                <div className="space-y-1.5 pt-1 border-t border-gray-150">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">📎 Fichiers Joints ({report.files.length}) :</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {report.files.map((file, fIdx) => (
                                                            <button 
                                                                type="button"
                                                                key={fIdx}
                                                                onClick={() => downloadFile(file)}
                                                                title="Télécharger le document d'accompagnement"
                                                                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-indigo-900 border border-gray-250 text-2xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-3xs hover:border-indigo-300"
                                                            >
                                                                <span>📁</span>
                                                                <span className="max-w-[150px] truncate">{file.name}</span>
                                                                <span className="text-[9px] text-indigo-500 font-bold ml-0.5">({file.size})</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 shrink-0">
                            <button 
                                type="button"
                                onClick={() => setViewingReportsEvent(null)} 
                                className="bg-slate-105 hover:bg-slate-200 text-gray-700 font-bold py-2 px-5 rounded-xl transition text-xs border border-gray-200"
                            >
                                Revenir à la liste
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View ALL Reports Modal (Global) */}
            {isAllReportsModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-3xl w-full animate-fadeIn flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-4 border-b border-gray-150 pb-3 shrink-0">
                            <div>
                                <h3 className="text-base font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <ClipboardIcon className="w-5 h-5 text-amber-800" /> Tous les Rapports du Cabinet
                                </h3>
                                <p className="text-2xs text-gray-400 font-bold mt-1">
                                    Historique complet des rapports d'événements ({totalReportsCount} rapport{totalReportsCount > 1 ? 's' : ''})
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsAllReportsModalOpen(false)} 
                                className="p-1 hover:bg-slate-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar space-y-4 pb-4">
                            {allReports.length === 0 ? (
                                <div className="py-16 bg-slate-50 text-center rounded-2xl border-2 border-dashed border-gray-200 px-6">
                                    <ClipboardIcon className="w-10 h-10 text-gray-300 mx-auto block mb-2" />
                                    <p className="text-sm font-extrabold text-gray-750">Aucun rapport enregistré</p>
                                    <p className="text-xs text-gray-400 mt-1">Rédigez d'abord un rapport individuel depuis un événement de la liste.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {allReports.map((report) => (
                                        <div key={report.id} className="p-5 bg-slate-50 border border-gray-200 rounded-xl space-y-3 shadow-xs relative hover:border-indigo-200 transition-all duration-200">
                                            <div className="flex flex-wrap justify-between items-start gap-2 pb-2 border-b border-gray-200">
                                                <div>
                                                    <h4 className="text-xs font-black text-[#15447c] uppercase tracking-wider">{report.title}</h4>
                                                    <p className="text-[10px] text-gray-450 mt-0.5 font-bold">
                                                        Rédigé par : <span className="text-indigo-600">{report.author}</span> le {report.dateCreated}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100 max-w-[150px] truncate flex items-center gap-1" title={`Événement : ${report.eventRef.name}`}>
                                                        <CalendarIcon className="w-3 h-3 text-indigo-600 shrink-0" />
                                                        <span>{report.eventRef.name}</span>
                                                    </span>
                                                    <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded border">
                                                        {report.id}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-750 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-gray-150 font-semibold shadow-2xs">
                                                {report.content}
                                            </p>

                                            {/* Downloadable report attachments */}
                                            {report.files && report.files.length > 0 && (
                                                <div className="space-y-1.5 pt-1 border-t border-gray-150">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                        <AttachmentIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        <span>Fichiers Joints ({report.files.length}) :</span>
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5 font-semibold">
                                                        {report.files.map((file, fIdx) => (
                                                            <button 
                                                                type="button"
                                                                key={fIdx}
                                                                onClick={() => downloadFile(file)}
                                                                title="Télécharger le document d'accompagnement"
                                                                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-indigo-900 border border-gray-250 text-2xs px-3 py-1.5 rounded-xl transition shadow-3xs hover:border-indigo-300"
                                                            >
                                                                <FolderIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                <span className="max-w-[150px] truncate">{file.name}</span>
                                                                <span className="text-[9px] text-indigo-500 ml-0.5">({file.size})</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 shrink-0">
                            <button 
                                type="button"
                                onClick={() => setIsAllReportsModalOpen(false)} 
                                className="bg-slate-105 hover:bg-slate-200 text-gray-700 font-bold py-2 px-5 rounded-xl transition text-xs border border-gray-200"
                            >
                                Revenir à la liste
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventsPage;
