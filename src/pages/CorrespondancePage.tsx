import React, { FC, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
    dbCreateDoc, 
    dbUpdateDoc, 
    dbDeleteDoc, 
    dbCreateAuditLog,
    sanitizeForFirestore
} from '../lib/firestoreService';
import { Client, Case, Avocat, Correspondance } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CorrespondancePageProps {
    clients: Client[];
    cases: Case[];
    avocats: Avocat[];
    onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
    currentUserInfo?: { name: string; role: string; email: string } | null;
}

const initialCorrespondances: Correspondance[] = [];

export const CorrespondancePage: FC<CorrespondancePageProps> = ({ 
    clients, 
    cases, 
    avocats, 
    onSendEmail, 
    currentUserInfo 
}) => {
    const [correspondances, setCorrespondances] = useState<Correspondance[]>([]);
    const [selectedCorr, setSelectedCorr] = useState<Correspondance | null>(null);
    const [isWriting, setIsWriting] = useState(false);
    
    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAvocatId, setFilterAvocatId] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Composer Form State
    const [formType, setFormType] = useState<'Lettre' | 'E-mail' | 'Mise en demeure' | 'Autre'>('Lettre');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [destinataire, setDestinataire] = useState('');
    const [avocatSignataireId, setAvocatSignataireId] = useState('');
    const [dateEmission, setDateEmission] = useState('');
    const [dateReception, setDateReception] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<'Brouillon' | 'Envoyé' | 'Reçu'>('Brouillon');
    const [selectedCaseId, setSelectedCaseId] = useState('');
    const [selectedProcedureId, setSelectedProcedureId] = useState('');
    const [customId, setCustomId] = useState('');
    const [piecesJointes, setPiecesJointes] = useState<Array<{ name: string; size: string; content?: string }>>([]);

    // Auto-generate a unique correspondence ID in real-time
    useEffect(() => {
        if (isWriting && !selectedCorr) {
            const year = new Date().getFullYear();
            let nextSeq = 1;
            if (correspondances && correspondances.length > 0) {
                const nums = correspondances.map(c => {
                    const match = c.id.match(/(\d+)$/);
                    return match ? parseInt(match[1], 10) : 0;
                }).filter(n => !isNaN(n));
                if (nums.length > 0) {
                    nextSeq = Math.max(...nums) + 1;
                } else {
                    nextSeq = correspondances.length + 1;
                }
            }
            const seqStr = String(nextSeq).padStart(4, '0');
            setCustomId(`KBB-DOS-${year}-${seqStr}`);
        }
    }, [isWriting, selectedCorr, correspondances]);

    // Sync state and live subscription to Firestore
    useEffect(() => {
        const colRef = collection(db, 'correspondances');
        const unsub = onSnapshot(colRef, (snapshot) => {
            const list: Correspondance[] = [];
            snapshot.forEach((doc) => {
                list.push(doc.data() as Correspondance);
            });
            if (list.length > 0) {
                // Sort by date desc
                list.sort((a, b) => b.date.localeCompare(a.date));
                setCorrespondances(list);
            } else {
                // Seed if empty
                console.log("Seeding initial correspondances collection in Firestore");
                initialCorrespondances.forEach(async (item) => {
                    await setDoc(doc(db, 'correspondances', item.id), sanitizeForFirestore(item));
                });
                setCorrespondances(initialCorrespondances);
            }
        }, (err) => {
            console.warn("Correspondances subscription notice (Quota/Offline): falling back to local cache", err);
            try {
                const cached = localStorage.getItem('kbb_cache_correspondances');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCorrespondances(parsed);
                        return;
                    }
                }
            } catch (e) {}
            setCorrespondances(initialCorrespondances);
        });

        return () => unsub();
    }, []);

    // Limit initial display to 40 items with option to load more
    const [displayLimit, setDisplayLimit] = useState<number>(40);

    // Active filters
    const filteredCorrespondances = useMemo(() => {
        return correspondances.filter(c => {
            const query = (searchTerm || '').toLowerCase();
            const matchesSearch = 
                (c.recipientName || '').toLowerCase().includes(query) ||
                (c.destinataire && c.destinataire.toLowerCase().includes(query)) ||
                (c.subject || '').toLowerCase().includes(query) ||
                (c.content || '').toLowerCase().includes(query);
            
            const matchesAvocat = filterAvocatId === 'All' || c.avocatSignataireId === filterAvocatId;
            const matchesStatus = filterStatus === 'All' || c.status === filterStatus;

            return matchesSearch && matchesAvocat && matchesStatus;
        });
    }, [correspondances, searchTerm, filterAvocatId, filterStatus]);

    // Prepopulate composer form when starting a new correspondence
    const startNewCorrespondence = () => {
        setIsWriting(true);
        setSelectedCorr(null);
        setFormType('Lettre');
        setRecipientName('');
        setRecipientEmail('');
        setDestinataire('');
        setAvocatSignataireId('');
        setDateEmission(new Date().toISOString().split('T')[0]);
        setDateReception('');
        setSubject('');
        setContent('');
        setStatus('Brouillon');
        setSelectedCaseId('');
        setSelectedProcedureId('');
        setPiecesJointes([]);
        setCustomId('');
    };

    const handleSelectCorr = (corr: Correspondance) => {
        setSelectedCorr(corr);
        setIsWriting(false);
        setPiecesJointes(corr.piecesJointes || []);
    };

    // Save correspondence draft to Firestore
    const handleSaveCorrespondence = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!recipientName.trim()) {
            triggerLocalToast('error', "Le nom du destinataire est obligatoire.");
            return;
        }
        if (!subject.trim()) {
            triggerLocalToast('error', "L'objet de la correspondance est obligatoire.");
            return;
        }

        const finalContent = content.trim() || subject.trim() || "Correspondance enregistrée";

        const isEditing = !!selectedCorr;
        const id = selectedCorr ? selectedCorr.id : customId;
        const date = selectedCorr ? selectedCorr.date : new Date().toISOString().split('T')[0];
        const author = selectedCorr ? selectedCorr.author : (currentUserInfo?.name || "Cabinet KBB");

        const data: Correspondance = {
            id,
            date,
            type: formType,
            recipientName,
            recipientEmail,
            destinataire: destinataire || undefined,
            avocatSignataireId: avocatSignataireId || undefined,
            dateEmission: dateEmission || undefined,
            dateReception: dateReception || undefined,
            subject,
            content: finalContent,
            status,
            author,
            caseId: selectedCaseId || undefined,
            procedureId: selectedProcedureId || undefined,
            piecesJointes
        };

        try {
            if (isEditing) {
                await dbUpdateDoc('correspondances', id, data);
                triggerLocalToast('success', "Correspondance mise à jour !");
                dbCreateAuditLog({
                    userEmail: currentUserInfo?.email || "system",
                    userName: currentUserInfo?.name || "System",
                    actionType: 'Modification',
                    module: 'Correspondance',
                    description: `Mise à jour de la correspondance à destination de ${recipientName} (Objet: ${subject})`
                });
            } else {
                await dbCreateDoc('correspondances', id, data);
                triggerLocalToast('success', "Nouvelle correspondance enregistrée !");
                dbCreateAuditLog({
                    userEmail: currentUserInfo?.email || "system",
                    userName: currentUserInfo?.name || "System",
                    actionType: 'Ajout',
                    module: 'Correspondance',
                    description: `Création d'une correspondance pour ${recipientName} (Objet: ${subject})`
                });
            }

            // Reset view to detail
            setSelectedCorr(data);
            setIsWriting(false);
        } catch (err) {
            console.error("Save correspondence error:", err);
            triggerLocalToast('error', "Erreur lors de la sauvegarde.");
        }
    };

    // Connect to email composer modal
    const handleSendViaEmail = async (corr: Correspondance) => {
        if (!corr.recipientEmail) {
            triggerLocalToast('error', "Le destinataire n'a pas d'adresse e-mail configurée.");
            return;
        }

        // Trigger the global email composer modal passed via props
        onSendEmail(
            corr.recipientEmail,
            corr.subject,
            corr.content,
            corr.recipientName,
            corr.type === 'Mise en demeure' ? 'Mise_en_demeure.pdf' : 'Lettre.pdf'
        );

        // Update status to Sent in database
        try {
            const updated = { ...corr, status: 'Envoyé' as const };
            await dbUpdateDoc('correspondances', corr.id, updated);
            setSelectedCorr(updated);
            
            dbCreateAuditLog({
                userEmail: currentUserInfo?.email || "system",
                userName: currentUserInfo?.name || "System",
                actionType: 'Modification',
                module: 'Correspondance',
                description: `Correspondance envoyée par e-mail à ${corr.recipientName} (${corr.recipientEmail})`
            });
        } catch (err) {
            console.error("Error updating correspondence status to sent:", err);
        }
    };

    // Delete correspondence
    const handleDeleteCorr = async (corr: Correspondance) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette correspondance : "${corr.subject}" ?`)) {
            return;
        }

        try {
            await dbDeleteDoc('correspondances', corr.id);
            triggerLocalToast('success', "Correspondance supprimée avec succès !");
            setSelectedCorr(null);
            
            dbCreateAuditLog({
                userEmail: currentUserInfo?.email || "system",
                userName: currentUserInfo?.name || "System",
                actionType: 'Suppression',
                module: 'Correspondance',
                description: `Suppression de la correspondance pour ${corr.recipientName} (Objet: ${corr.subject})`
            });
        } catch (err) {
            console.error("Error deleting correspondence:", err);
            triggerLocalToast('error', "Erreur lors de la suppression.");
        }
    };

    // Basic toast notifications inside page context
    const [localToasts, setLocalToasts] = useState<Array<{ id: string; type: 'success' | 'error'; text: string }>>([]);
    const triggerLocalToast = (type: 'success' | 'error', text: string) => {
        const id = Math.random().toString();
        setLocalToasts(prev => [...prev, { id, type, text }]);
        setTimeout(() => {
            setLocalToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    // Download written letter content as .doc file
    const handleDownloadWord = () => {
        if (!selectedCorr) return;
        const header = `CABINET KBB & ASSOCIÉS\nAvocats Associés au Barreau de Kinshasa / Gombe - RDC\n\n`;
        const details = `Réf ID: ${selectedCorr.id}\nDate: ${selectedCorr.date}\nObjet: ${selectedCorr.subject}\nDestinataire: ${selectedCorr.recipientName}\n--------------------------------------------------\n\n`;
        const text = header + details + selectedCorr.content;
        const blob = new Blob([text], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Correspondance_${selectedCorr.id}.doc`;
        link.click();
        URL.revokeObjectURL(url);
        triggerLocalToast('success', "Correspondance téléchargée en format Word !");
    };

    // Print utility for letter layout
    const handlePrintCorrespondence = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>${selectedCorr?.subject || 'Correspondance'}</title>
                    <style>
                        body {
                            font-family: 'Times New Roman', Times, serif;
                            padding: 50px;
                            line-height: 1.6;
                            color: #333;
                        }
                        .header-cabinet {
                            text-align: center;
                            border-bottom: 2px solid #15447c;
                            padding-bottom: 15px;
                            margin-bottom: 40px;
                        }
                        .header-cabinet h1 {
                            margin: 0;
                            font-size: 24px;
                            letter-spacing: 2px;
                            color: #15447c;
                        }
                        .header-cabinet p {
                            margin: 5px 0 0 0;
                            font-size: 12px;
                            text-transform: uppercase;
                            color: #666;
                        }
                        .meta-date {
                            text-align: right;
                            margin-bottom: 30px;
                        }
                        .letter-content {
                            white-space: pre-wrap;
                            font-size: 14px;
                        }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header-cabinet">
                        <h1>CABINET KBB & ASSOCIÉS</h1>
                        <p>Avocats Associés au Barreau de Kinshasa / Gombe - RDC</p>
                    </div>
                    <div class="letter-content">${selectedCorr?.content || ''}</div>
                    <script>
                        window.onload = function() {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070b13] overflow-hidden p-6 relative">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-gray-200 dark:border-[#1e293b] gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Correspondance Juridique
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Générez, rédigiez et archivez vos mises en demeure, correspondances formelles et e-mails avec l'IA.
                    </p>
                </div>
                <button
                    onClick={startNewCorrespondence}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition duration-250 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Nouvelle Correspondance
                </button>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 mt-6 overflow-hidden min-h-0">
                
                {/* Left Panel: Search & Filterable List */}
                <div className="w-full lg:w-[35%] flex flex-col bg-white dark:bg-[#0c1322] rounded-2xl border border-gray-200 dark:border-[#1e293b] p-4 overflow-hidden shadow-xs">
                    
                    {/* Search & Filters */}
                    <div className="space-y-3 pb-4 border-b border-gray-150 dark:border-[#1e293b]/70">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Rechercher une correspondance..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Avocat Signataire</label>
                                <select
                                    value={filterAvocatId}
                                    onChange={(e) => setFilterAvocatId(e.target.value)}
                                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                                >
                                    <option value="All">Tous les avocats</option>
                                    {avocats.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Statut</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                                >
                                    <option value="All">Tous les statuts</option>
                                    <option value="Brouillon">Brouillon</option>
                                    <option value="Envoyé">Envoyé</option>
                                    <option value="Reçu">Reçu</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1 custom-scrollbar">
                        {filteredCorrespondances.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-sm text-slate-400">Aucune correspondance trouvée.</p>
                            </div>
                        ) : (
                            <>
                                {filteredCorrespondances.slice(0, displayLimit).map(corr => {
                                const isSelected = selectedCorr?.id === corr.id;
                                return (
                                    <button
                                        key={corr.id}
                                        onClick={() => handleSelectCorr(corr)}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2 cursor-pointer ${
                                            isSelected 
                                                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-600 shadow-xs' 
                                                : 'bg-slate-50/30 dark:bg-transparent hover:bg-slate-100/50 dark:hover:bg-[#121b2d]/50 border-gray-150 dark:border-[#1e293b]/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30">
                                                ✍️ {corr.avocatSignataireId ? (avocats.find(a => a.id === corr.avocatSignataireId)?.name || 'Lettre') : 'Non signée'}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                                {corr.dateEmission || corr.date}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1">
                                                {corr.subject}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                                Pour : <span className="font-semibold text-slate-600 dark:text-slate-300">{corr.recipientName}</span>
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-center mt-1 border-t border-dashed border-gray-200 dark:border-[#1e293b] pt-2">
                                            <span className="text-[10px] font-medium text-slate-400 italic">
                                                Par : {corr.author}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                                corr.status === 'Envoyé' 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                                                    : corr.status === 'Reçu' 
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                            }`}>
                                                {corr.status}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}

                            {filteredCorrespondances.length > 40 && (
                                <div className="pt-2 pb-1 flex flex-col gap-2 items-center text-xs">
                                    <span className="text-slate-500 text-[11px]">
                                        Affichage de {Math.min(displayLimit, filteredCorrespondances.length)} sur {filteredCorrespondances.length}
                                    </span>
                                    {filteredCorrespondances.length > displayLimit && (
                                        <button
                                            onClick={() => setDisplayLimit(prev => prev + 40)}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                                        >
                                            Voir plus (+40)
                                        </button>
                                    )}
                                </div>
                            )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel: Content Composer OR Detail Viewer */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#0c1322] rounded-2xl border border-gray-200 dark:border-[#1e293b] overflow-hidden shadow-xs min-h-0">
                    
                    {isWriting ? (
                        /* COMPOSER FORM (Creating / Editing) */
                        <form onSubmit={handleSaveCorrespondence} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            
                            {/* Form Header */}
                            <div className="px-5 py-4 border-b border-gray-150 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#111a2c]/40 flex justify-between items-center shrink-0">
                                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    {selectedCorr ? "Édition de correspondance" : "Nouvelle rédaction"}
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsWriting(false);
                                            if (selectedCorr) handleSelectCorr(selectedCorr);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition duration-150"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition duration-150"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </div>

                            {/* Composer split screen: left fields, right AI box (if enabled) */}
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                                
                                {/* Fields & Content Editor */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                                    
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Avocat Signataire ✍️</label>
                                            <select
                                                required
                                                value={avocatSignataireId}
                                                onChange={(e) => setAvocatSignataireId(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-[#1e293b] bg-white dark:bg-[#121b2d] text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden shadow-2xs"
                                            >
                                                <option value="" className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">Sélectionnez l'avocat signataire...</option>
                                                {avocats.map(a => (
                                                    <option key={a.id} value={a.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 font-semibold">
                                                        {a.fullName || a.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Statut initial</label>
                                            <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as any)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                                            >
                                                <option value="Brouillon">Brouillon (non envoyé)</option>
                                                <option value="Envoyé">Envoyé</option>
                                                <option value="Reçu">Reçu</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Nom du destinataire</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="ex: SCI Moderne ou M. le Juge"
                                                value={recipientName}
                                                onChange={(e) => setRecipientName(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-800 dark:text-slate-150 focus:outline-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">E-mail du destinataire (facultatif)</label>
                                            <input
                                                type="email"
                                                placeholder="ex: destinataire@mail.com"
                                                value={recipientEmail}
                                                onChange={(e) => setRecipientEmail(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-800 dark:text-slate-150 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3.5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Adresse / Détails du destinataire</label>
                                            <textarea
                                                placeholder="ex: Cabinet de Conseil Juridique, 12 Avenue des Aviateurs, Kinshasa/Gombe"
                                                value={destinataire}
                                                onChange={(e) => setDestinataire(e.target.value)}
                                                rows={2}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-800 dark:text-slate-150 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Date d'émission 📅</label>
                                            <input
                                                type="date"
                                                value={dateEmission}
                                                onChange={(e) => setDateEmission(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-800 dark:text-slate-150 focus:outline-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Date de réception 📥 (si applicable)</label>
                                            <input
                                                type="date"
                                                value={dateReception}
                                                onChange={(e) => setDateReception(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-800 dark:text-slate-150 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Dossier / Affaire associé (facultatif)</label>
                                            <select
                                                value={selectedCaseId}
                                                onChange={(e) => {
                                                    setSelectedCaseId(e.target.value);
                                                    setSelectedProcedureId('');
                                                }}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                                            >
                                                <option value="">Sélectionnez un dossier...</option>
                                                {cases.map(c => (
                                                    <option key={c.id} value={c.id}>{c.id} - {c.name} ({c.client})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Objet du courrier</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="ex: Mise en demeure de paiement..."
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#121b2d] text-xs text-slate-800 dark:text-slate-150 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    {selectedCaseId && (
                                        <div className="mt-1 bg-slate-50 dark:bg-[#0d1524] p-3 rounded-xl border border-slate-200 dark:border-[#1e293b]">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Procédure associée (facultative)</label>
                                            <select
                                                value={selectedProcedureId}
                                                onChange={(e) => setSelectedProcedureId(e.target.value)}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-white dark:bg-[#121b2d] text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                                            >
                                                <option value="">Sélectionnez une procédure...</option>
                                                {cases.find(c => c.id === selectedCaseId)?.procedures?.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                                {cases.find(c => c.id === selectedCaseId)?.procedure && !cases.find(c => c.id === selectedCaseId)?.procedures?.some(p => p.name === cases.find(c => c.id === selectedCaseId)?.procedure) && (
                                                    <option value="PRIMARY">{cases.find(c => c.id === selectedCaseId)?.procedure}</option>
                                                )}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Réf. ID Unique de la lettre (Généré)</label>
                                            <input
                                                type="text"
                                                disabled
                                                value={customId}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#121b2d]/40 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 focus:outline-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Possibilité de joindre (Format Word ou PDF)</label>
                                            <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-[#121b2d] p-2.5 rounded-xl border border-dashed border-gray-200 dark:border-[#1e293b]">
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx,.txt"
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = e.target.files;
                                                        if (!files) return;
                                                        Array.from(files).forEach(file => {
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                const base64 = reader.result as string;
                                                                setPiecesJointes(prev => [...prev, {
                                                                    name: file.name,
                                                                    size: (file.size / 1024).toFixed(1) + ' KB',
                                                                    content: base64
                                                                }]);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        });
                                                    }}
                                                    className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 cursor-pointer"
                                                />
                                                {piecesJointes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {piecesJointes.map((f, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md shadow-3xs text-[10px] font-semibold">
                                                                <span className="truncate max-w-[100px]">{f.name}</span>
                                                                <span className="text-gray-400 text-[8px]">({f.size})</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPiecesJointes(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </form>
                    ) : selectedCorr ? (
                        /* DETAILS VIEWER (Selected Document Detail View) */
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            
                            {/* Toolbar */}
                            <div className="px-5 py-3.5 border-b border-gray-150 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#111a2c]/40 flex flex-wrap justify-between items-center gap-3 shrink-0">
                                
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                                        selectedCorr.type === 'Mise en demeure' 
                                            ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                                    }`}>
                                        {selectedCorr.type}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                        selectedCorr.status === 'Envoyé' 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                                            : selectedCorr.status === 'Reçu' 
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                    }`}>
                                        {selectedCorr.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* Edit button */}
                                    <button
                                        onClick={() => {
                                            setIsWriting(true);
                                            setFormType(selectedCorr.type || 'Lettre');
                                            setRecipientName(selectedCorr.recipientName);
                                            setRecipientEmail(selectedCorr.recipientEmail || '');
                                            setDestinataire(selectedCorr.destinataire || '');
                                            setAvocatSignataireId(selectedCorr.avocatSignataireId || '');
                                            setDateEmission(selectedCorr.dateEmission || selectedCorr.date || '');
                                            setDateReception(selectedCorr.dateReception || '');
                                            setSubject(selectedCorr.subject);
                                            setContent(selectedCorr.content);
                                            setStatus(selectedCorr.status);
                                            setSelectedCaseId(selectedCorr.caseId || '');
                                            setSelectedProcedureId(selectedCorr.procedureId || '');
                                            setPiecesJointes(selectedCorr.piecesJointes || []);
                                            setCustomId(selectedCorr.id);
                                            setAiBrief('');
                                        }}
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition duration-150 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                        title="Éditer la correspondance"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Modifier
                                    </button>

                                    {/* Send email button */}
                                    <button
                                        onClick={() => handleSendViaEmail(selectedCorr)}
                                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition duration-150 flex items-center gap-1 text-xs font-semibold cursor-pointer shadow-sm"
                                        title="Envoyer par E-mail"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Envoyer par e-mail
                                    </button>

                                    {/* Download Word button */}
                                    <button
                                        onClick={handleDownloadWord}
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition duration-150 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                        title="Télécharger la lettre en format Word (.doc)"
                                    >
                                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Format Word (.doc)
                                    </button>

                                    {/* Print/Download button */}
                                    <button
                                        onClick={handlePrintCorrespondence}
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition duration-150 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                        title="Imprimer / Télécharger en PDF"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Imprimer / PDF
                                    </button>

                                    {/* Delete button */}
                                    <button
                                        onClick={() => handleDeleteCorr(selectedCorr)}
                                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition duration-150 cursor-pointer"
                                        title="Supprimer la correspondance"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Details sheet & letter preview */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
                                
                                {/* Meta Information header */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-gray-150 dark:border-[#1e293b] bg-white dark:bg-[#0d1524]">
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Destinataire</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 block">
                                            {selectedCorr.recipientName}
                                        </span>
                                        {selectedCorr.recipientEmail && (
                                            <span className="text-[10px] text-slate-400 block mt-0.5">{selectedCorr.recipientEmail}</span>
                                        )}
                                        {selectedCorr.destinataire && (
                                            <span className="text-[10px] text-slate-500 block mt-1 italic bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">{selectedCorr.destinataire}</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Dossier Associé</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 block">
                                            {selectedCorr.caseId ? `${selectedCorr.caseId} - ${cases.find(c => c.id === selectedCorr.caseId)?.name || 'Dossier'}` : 'Aucun dossier rattaché'}
                                        </span>
                                        {selectedCorr.caseId && selectedCorr.procedureId && (() => {
                                            const parentCase = cases.find(c => c.id === selectedCorr.caseId);
                                            const procedureName = parentCase?.procedures?.find(p => p.id === selectedCorr.procedureId)?.name || 
                                                                  (selectedCorr.procedureId === 'PRIMARY' ? parentCase?.procedure : selectedCorr.procedureId);
                                            return procedureName ? (
                                                <span className="text-[10px] text-indigo-500 font-semibold block mt-0.5">Procédure : {procedureName}</span>
                                            ) : null;
                                        })()}
                                    </div>
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Signé par l'Avocat ✍️</span>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                                            {selectedCorr.avocatSignataireId ? (avocats.find(a => a.id === selectedCorr.avocatSignataireId)?.name || 'Avocat non trouvé') : 'Aucun avocat associé'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Dates & Suivi 📅</span>
                                        <div className="text-[11px] text-slate-600 dark:text-slate-350 space-y-0.5 mt-1 font-medium">
                                            {selectedCorr.dateEmission && (
                                                <div>Emission : <span className="font-bold text-slate-700 dark:text-slate-200">{selectedCorr.dateEmission}</span></div>
                                            )}
                                            {selectedCorr.dateReception && (
                                                <div>Réception : <span className="font-bold text-slate-700 dark:text-slate-200">{selectedCorr.dateReception}</span></div>
                                            )}
                                            <div className="text-[9px] text-slate-400 italic">Archivé le {selectedCorr.date} par {selectedCorr.author}</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedCorr.piecesJointes && selectedCorr.piecesJointes.length > 0 && (
                                    <div className="p-4 rounded-xl border border-gray-150 dark:border-[#1e293b] bg-white dark:bg-[#0d1524] shadow-xs">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Pièces jointes associées</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCorr.piecesJointes.map((f, idx) => (
                                                <a
                                                    key={idx}
                                                    href={f.content || '#'}
                                                    download={f.name}
                                                    onClick={(e) => { if (!f.content) e.preventDefault(); }}
                                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-150 text-xs font-bold text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400 transition cursor-pointer"
                                                >
                                                    <span>📎</span>
                                                    <span>{f.name}</span>
                                                    <span className="text-[10px] font-normal opacity-80">({f.size})</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Interactive letter canvas */}
                                <div className="p-8 sm:p-12 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm max-w-3xl mx-auto font-serif text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed text-sm select-text relative">
                                    
                                    {/* Print Ribbon watermark indicator */}
                                    <div className="absolute top-2.5 right-2.5 select-none opacity-40 dark:opacity-20 pointer-events-none font-sans text-[8px] uppercase tracking-widest font-extrabold text-indigo-600 dark:text-indigo-400">
                                        Cabinet KBB - Archive Officielle
                                    </div>

                                    {selectedCorr.content}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EMPTY STATE (No correspondence selected) */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20 dark:bg-transparent">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Aucun élément sélectionné</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm leading-normal">
                                Sélectionnez un pli archivé dans le volet de gauche ou cliquez sur <strong>"Nouvelle Correspondance"</strong> pour rédiger un nouveau courrier.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Local Toast Messages */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5">
                <AnimatePresence>
                    {localToasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                            className={`px-4 py-3 rounded-xl shadow-lg text-xs font-semibold border flex items-center gap-2 ${
                                toast.type === 'success' 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-800' 
                                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-300 dark:border-rose-800'
                            }`}
                        >
                            {toast.type === 'success' ? (
                                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                            {toast.text}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CorrespondancePage;
