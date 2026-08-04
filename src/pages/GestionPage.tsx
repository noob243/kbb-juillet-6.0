import React, { FC, useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { UserIcon } from '../components/Icons';
import { Client, Case, Event, Task, Invoice, Avocat, Personnel, Fournisseur, Correspondance, CaseProcedure } from '../types';
import { DetailedEditModal } from '../components/DetailedEditModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { dbUpdateDoc, dbDeleteDoc, dbCreateAuditLog } from '../lib/firestoreService';
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { CabinetManagementTab } from '../components/admin/CabinetManagementTab';
import { AppUser } from '../types/rbac';
import { syncUsersWithFirestore } from '../services/userService';

interface GestionPageProps {
    clients: Client[];
    cases: Case[];
    events: Event[];
    tasks: Task[];
    invoices: Invoice[];
    avocats: Avocat[];
    personnels: Personnel[];
    fournisseurs: Fournisseur[];
    currentUser?: AppUser | null;
    onAddToast?: (type: 'success' | 'error', message: string) => void;
    onAddAvocat?: (avocat: Avocat, password?: string) => void;
    onAddPersonnel?: (personnel: Personnel, password?: string) => void;
    onDeleteClient: (id: number) => void;
    onDeleteCase: (id: string) => void;
    onDeleteAvocat: (id: string) => void;
    onDeletePersonnel: (id: string) => void;
    onDeleteEvent: (id: string) => void;
    onDeleteTask: (id: number) => void;
    onDeleteInvoice: (id: string) => void;
    onDeleteFournisseur: (id: string) => void;
    onUpdateClient: (updated: Client) => void;
    onUpdateCase: (updated: Case) => void;
    onUpdateAvocat: (updated: Avocat) => void;
    onUpdatePersonnel: (updated: Personnel) => void;
    onUpdateEvent: (updated: Event) => void;
    onUpdateTask: (updated: Task) => void;
    onUpdateInvoice: (updated: Invoice) => void;
    onUpdateFournisseur: (updated: Fournisseur) => void;
    onExportBackup?: () => void;
}

const GestionPage: FC<GestionPageProps> = (props) => {
    const tableHeaderClass = "p-3 font-extrabold text-2xs text-[#15447c] uppercase tracking-wider bg-slate-50 border-b border-gray-250";
    const tableCellClass = "p-3 text-xs text-gray-700 align-middle border-b border-gray-100";
    const actionButtonClass = "font-extrabold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg mr-2 transition";
    const deleteButtonClass = "font-extrabold text-rose-600 hover:text-rose-850 bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg transition";
    const saveButtonClass = "font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg mr-2 transition shadow-3xs";
    const cancelButtonClass = "font-extrabold text-gray-500 hover:text-gray-750 bg-gray-55/70 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition border border-gray-200";

    // Synchronized Users (RBAC) with Firestore
    const [usersList, setUsersList] = useState<AppUser[]>([]);

    const refreshUsers = () => {
        // Real-time listener automatically handles user list updates
    };

    useEffect(() => {
        let unsub: (() => void) | undefined;
        syncUsersWithFirestore((latest) => {
            setUsersList(latest);
        }).then(cleanup => {
            unsub = cleanup;
        });
        return () => {
            if (unsub) unsub();
        };
    }, []);

    // Synchronized Correspondances with Firestore
    const [correspondances, setCorrespondances] = useState<Correspondance[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'correspondances'), (snapshot) => {
            const list: Correspondance[] = [];
            snapshot.forEach((doc) => {
                list.push(doc.data() as Correspondance);
            });
            // Sort by date desc
            list.sort((a, b) => b.date.localeCompare(a.date));
            setCorrespondances(list);
        }, (err) => {
            console.warn("Notice loading correspondances in admin (Quota/Offline):", err);
            try {
                const cached = localStorage.getItem('kbb_cache_correspondances');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCorrespondances(parsed);
                    }
                }
            } catch (e) {}
        });
        return () => unsub();
    }, []);

    const handleUpdateCorrespondance = async (updated: Correspondance) => {
        try {
            const { id, ...properties } = updated;
            await dbUpdateDoc('correspondances', id, properties);
            await dbCreateAuditLog({
                actionType: 'Modification',
                module: 'Correspondance',
                description: `Modification de la correspondance Réf: ${id} via la Console d'Administration`
            });
        } catch (err) {
            console.error("Failed to update correspondance in admin:", err);
        }
    };

    const handleDeleteCorrespondance = async (id: string) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette correspondance ? Cette action est irréversible.")) {
            return;
        }
        try {
            await dbDeleteDoc('correspondances', id);
            await dbCreateAuditLog({
                actionType: 'Suppression',
                module: 'Correspondance',
                description: `Suppression de la correspondance Réf: ${id} via la Console d'Administration`
            });
        } catch (err) {
            console.error("Failed to delete correspondance in admin:", err);
        }
    };

    // Flatten all Case Procedures for live display and editing
    const allProcedures: Array<CaseProcedure & { caseId: string; caseName: string }> = props.cases.flatMap(c => {
        const procs = c.procedures || [];
        return procs.map(p => ({
            ...p,
            caseId: c.id,
            caseName: c.name
        }));
    });

    const handleUpdateProcedure = (updatedProc: CaseProcedure & { caseId: string }) => {
        const assocCase = props.cases.find(c => c.id === updatedProc.caseId);
        if (!assocCase) return;
        const updatedProcs = (assocCase.procedures || []).map(p => p.id === updatedProc.id ? {
            id: updatedProc.id,
            name: updatedProc.name,
            instance: updatedProc.instance,
            objet: updatedProc.objet,
            dateDebut: updatedProc.dateDebut,
            dateFin: updatedProc.dateFin,
            status: updatedProc.status,
            linkedCases: updatedProc.linkedCases
        } : p);
        props.onUpdateCase({
            ...assocCase,
            procedures: updatedProcs
        });
    };

    const handleDeleteProcedure = (procId: string, caseId: string) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette procédure ? Cette action est irréversible.")) {
            return;
        }
        const assocCase = props.cases.find(c => c.id === caseId);
        if (!assocCase) return;
        const updatedProcs = (assocCase.procedures || []).filter(p => p.id !== procId);
        props.onUpdateCase({
            ...assocCase,
            procedures: updatedProcs
        });
    };

    // Edit states
    const [editingType, setEditingType] = useState<'client' | 'case' | 'avocat' | 'personnel' | 'event' | 'task' | 'invoice' | 'fournisseur' | 'correspondance' | 'procedure' | null>(null);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    // Detailed edit states
    const [detailedEditingType, setDetailedEditingType] = useState<'client' | 'case' | 'avocat' | 'personnel' | 'event' | 'task' | 'invoice' | 'fournisseur' | 'correspondance' | 'procedure' | null>(null);
    const [detailedEditForm, setDetailedEditForm] = useState<any>(null);

    const startDetailedEdit = (type: 'client' | 'case' | 'avocat' | 'personnel' | 'event' | 'task' | 'invoice' | 'fournisseur' | 'correspondance' | 'procedure', item: any) => {
        setDetailedEditingType(type);
        setDetailedEditForm(JSON.parse(JSON.stringify(item)));
    };

    const closeDetailedEdit = () => {
        setDetailedEditingType(null);
        setDetailedEditForm(null);
    };

    const handleDetailedFieldChange = (field: string, value: any) => {
        setDetailedEditForm((prev: any) => {
            if (!prev) return prev;
            const up = { ...prev, [field]: value };
            if (field === 'hasChildren' && value === 'Non') {
                up.childrenCount = 0;
            }
            return up;
        });
    };

    const saveDetailedEdit = () => {
        if (!detailedEditForm) return;
        if (detailedEditingType === 'client') {
            props.onUpdateClient(detailedEditForm as Client);
        } else if (detailedEditingType === 'case') {
            // Sync backward compatibility properties from the first procedure of the case
            const updatedForm = { ...detailedEditForm };
            if (updatedForm.procedures && updatedForm.procedures.length > 0) {
                const primaryProc = updatedForm.procedures[0];
                updatedForm.procedure = primaryProc?.name || '';
                updatedForm.procedureInstance = primaryProc?.instance || '';
                updatedForm.procedureObjet = primaryProc?.objet || '';
                updatedForm.procedureDateDebut = primaryProc?.dateDebut || '';
                updatedForm.procedureDateFin = primaryProc?.dateFin || '';
                updatedForm.procedureStatus = primaryProc?.status || '';
            } else {
                updatedForm.procedure = '';
                updatedForm.procedureInstance = '';
                updatedForm.procedureObjet = '';
                updatedForm.procedureDateDebut = '';
                updatedForm.procedureDateFin = '';
                updatedForm.procedureStatus = '';
            }
            props.onUpdateCase(updatedForm as Case);
        } else if (detailedEditingType === 'avocat') {
            props.onUpdateAvocat(detailedEditForm as Avocat);
        } else if (detailedEditingType === 'personnel') {
            props.onUpdatePersonnel(detailedEditForm as Personnel);
        } else if (detailedEditingType === 'event') {
            props.onUpdateEvent(detailedEditForm as Event);
        } else if (detailedEditingType === 'task') {
            props.onUpdateTask(detailedEditForm as Task);
        } else if (detailedEditingType === 'invoice') {
            props.onUpdateInvoice(detailedEditForm as Invoice);
        } else if (detailedEditingType === 'fournisseur') {
            props.onUpdateFournisseur(detailedEditForm as Fournisseur);
        }
        closeDetailedEdit();
    };

    const startEdit = (type: 'client' | 'case' | 'avocat' | 'personnel' | 'event' | 'task' | 'invoice' | 'fournisseur', item: any) => {
        setEditingType(type);
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const cancelEdit = () => {
        setEditingType(null);
        setEditingId(null);
        setEditForm({});
    };

    const handleFieldChange = (field: string, value: any) => {
        setEditForm((prev: any) => {
            const up = { ...prev, [field]: value };
            // Auto handle logic for children in personnel
            if (field === 'hasChildren' && value === 'Non') {
                up.childrenCount = 0;
            }
            return up;
        });
    };

    const saveEdit = () => {
        if (editingType === 'client') {
            props.onUpdateClient(editForm as Client);
        } else if (editingType === 'case') {
            props.onUpdateCase(editForm as Case);
        } else if (editingType === 'avocat') {
            props.onUpdateAvocat(editForm as Avocat);
        } else if (editingType === 'personnel') {
            props.onUpdatePersonnel(editForm as Personnel);
        } else if (editingType === 'event') {
            props.onUpdateEvent(editForm as Event);
        } else if (editingType === 'task') {
            props.onUpdateTask(editForm as Task);
        } else if (editingType === 'invoice') {
            props.onUpdateInvoice(editForm as Invoice);
        } else if (editingType === 'fournisseur') {
            props.onUpdateFournisseur(editForm as Fournisseur);
        } else if (editingType === 'correspondance') {
            handleUpdateCorrespondance(editForm as Correspondance);
        } else if (editingType === 'procedure') {
            handleUpdateProcedure(editForm as CaseProcedure & { caseId: string });
        }
        cancelEdit();
    };

    const handleDelete = (action: Function, id: number | string, type: string) => {
        action(id);
    };

    // Filter and Category Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCategory, setSearchCategory] = useState<'all' | 'client' | 'case' | 'avocat' | 'personnel' | 'event' | 'task' | 'invoice' | 'fournisseur' | 'correspondance' | 'procedure'>('all');

    const matchesSearch = (text: string | number | undefined | null) => {
        if (!text) return false;
        return String(text).toLowerCase().includes(searchTerm.toLowerCase());
    };

    // Filter Avocats
    const filteredAvocats = props.avocats.filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'avocat') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.fullName) || matchesSearch(item.id) || matchesSearch(item.phone) || matchesSearch(item.cabinetRole) || matchesSearch(item.cabinetStatus);
    });

    // Filter Clients
    const filteredClients = props.clients.filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'client') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.name) || matchesSearch(item.contact) || matchesSearch(item.email) || matchesSearch(item.phone) || matchesSearch(item.siege);
    });

    // Filter Cases
    const filteredCases = props.cases.filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'case') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.name) || matchesSearch(item.id) || matchesSearch(item.client) || matchesSearch(item.status) || matchesSearch(item.notes);
    });

    // Filter Personnels
    const filteredPersonnels = props.personnels.filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'personnel') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.fullName) || matchesSearch(item.id) || matchesSearch(item.role) || matchesSearch(item.email) || matchesSearch(item.phone);
    });

    // Filter Events
    const filteredEvents = (props.events || []).filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'event') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.name) || matchesSearch(item.id) || matchesSearch(item.lieu) || matchesSearch(item.type) || matchesSearch(item.partenaires);
    });

    // Filter Tasks
    const filteredTasks = (props.tasks || []).filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'task') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.name) || matchesSearch(item.id) || matchesSearch(item.lawyer) || matchesSearch(item.status) || matchesSearch(item.notes);
    });

    // Filter Invoices
    const filteredInvoices = (props.invoices || []).filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'invoice') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.id) || matchesSearch(item.caseId) || matchesSearch(item.status) || matchesSearch(item.etiquette);
    });

    // Filter Fournisseurs
    const filteredFournisseurs = (props.fournisseurs || []).filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'fournisseur') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.nomComplet) || matchesSearch(item.id) || matchesSearch(item.designationPrestation) || matchesSearch(item.naturePrestation) || matchesSearch(item.adresseMail);
    });

    // Filter Correspondances
    const filteredCorrespondances = correspondances.filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'correspondance') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.id) || matchesSearch(item.subject) || matchesSearch(item.recipientName) || matchesSearch(item.author) || matchesSearch(item.content);
    });

    // Filter Procédures
    const filteredProcedures = allProcedures.filter(item => {
        if (searchCategory !== 'all' && searchCategory !== 'procedure') return false;
        if (!searchTerm) return true;
        return matchesSearch(item.id) || matchesSearch(item.name) || matchesSearch(item.instance) || matchesSearch(item.objet) || matchesSearch(item.status) || matchesSearch(item.caseId) || matchesSearch(item.caseName);
    });
    
    // Calculate completed tasks per lawyer for workload visualization
    const lawyerCompletedTaskCounts = props.avocats.map(avocat => {
        const completedTasksCount = (props.tasks || []).filter(task => 
            task.lawyer && avocat && avocat.fullName &&
            task.lawyer.trim().toLowerCase() === avocat.fullName.trim().toLowerCase() && 
            task.status === 'Effectué'
        ).length;
        
        return {
            name: avocat.fullName,
            completed: completedTasksCount
        };
    });

    const [mainAdminTab, setMainAdminTab] = useState<'users' | 'cabinet' | 'database'>('users');

    return (
        <PageContainer title="Panneau de Gestion et Administration RBAC">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl max-w-5xl">
                <div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                        🛡️ <span className="text-[#15447c] dark:text-indigo-400 font-black">Console Administrateur KBB RBAC</span>. Gérez les rôles, catégories (Administratif vs Office), autorisations granulaires et archivage logique.
                    </p>
                </div>
                {props.onExportBackup && (
                    <div className="flex shrink-0">
                        <button
                            id="btn-export-backup"
                            onClick={props.onExportBackup}
                            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition shadow-xs active:scale-95 cursor-pointer"
                            title="Exporter l'intégralité de la base de données locale en format JSON"
                        >
                            <svg className="w-4 h-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Exporter la Base (JSON)</span>
                        </button>
                    </div>
                )}
            </div>

            {/* MAIN ADMIN TABS */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 dark:border-slate-800 pb-3 max-w-5xl">
                <button
                    onClick={() => setMainAdminTab('users')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                        mainAdminTab === 'users'
                            ? 'bg-[#15447c] text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Gestion des Utilisateurs & RBAC
                </button>

                <button
                    onClick={() => setMainAdminTab('cabinet')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                        mainAdminTab === 'cabinet'
                            ? 'bg-[#15447c] text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-4-8a3 3 0 100-6 3 3 0 000 6zm-5 6a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                    Organisation & Cabinet
                </button>

                <button
                    onClick={() => setMainAdminTab('database')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                        mainAdminTab === 'database'
                            ? 'bg-[#15447c] text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    Consoles & Données Unifiées
                </button>
            </div>

            {mainAdminTab === 'users' && (
                <div className="max-w-5xl mb-10">
                    <UserManagementTab
                        users={usersList}
                        currentUser={props.currentUser}
                        onRefreshUsers={refreshUsers}
                        onAddToast={(type, msg) => props.onAddToast ? props.onAddToast(type, msg) : alert(msg)}
                        onAddAvocat={props.onAddAvocat}
                        onAddPersonnel={props.onAddPersonnel}
                    />
                </div>
            )}

            {mainAdminTab === 'cabinet' && (
                <div className="max-w-5xl mb-10">
                    <CabinetManagementTab onAddToast={(type, msg) => props.onAddToast ? props.onAddToast(type, msg) : alert(msg)} />
                </div>
            )}

            {mainAdminTab === 'database' && (
                <>

            {/* WORKLOAD BAR CHART */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 mb-10 shadow-xs max-w-4xl">
                <div className="mb-4">
                    <h3 className="text-sm font-black text-gray-800 tracking-tight flex items-center gap-1.5">
                        📈 Charge de travail par Avocat
                    </h3>
                    <p className="text-[10px] text-gray-450 font-bold mt-0.5">Nombre de tâches officiellement terminées (Statut: Effectué) pour chaque avocat</p>
                </div>
                <div className="h-[250px] w-full mt-4">
                    {lawyerCompletedTaskCounts.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                            Aucun avocat enregistré pour générer le graphique.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lawyerCompletedTaskCounts} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} 
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }} 
                                    labelStyle={{ color: '#0f172a', fontWeight: '800' }}
                                />
                                <Bar dataKey="completed" name="Tâches complétées" radius={[6, 6, 0, 0]} barSize={28}>
                                    {lawyerCompletedTaskCounts.map((entry, index) => {
                                        const colors = ['#15447c', '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6'];
                                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            
            {/* BARRE DE RECHERCHE ET SÉLECTEUR DE CATÉGORIES */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 mb-8 shadow-3xs max-w-4xl">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Rechercher partout ou par mot-clé (Nom, ID, e-mail, téléphone etc.)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500/80 bg-slate-50/30 outline-hidden transition"
                        />
                    </div>
                    <div className="md:w-72 shrink-0">
                        <select
                            value={searchCategory}
                            onChange={(e) => setSearchCategory(e.target.value as any)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-black text-[#15447c] focus:ring-2 focus:ring-indigo-500/15 bg-white cursor-pointer outline-hidden transition"
                        >
                            <option value="all">📁 Toutes les listes ({filteredAvocats.length + filteredClients.length + filteredCases.length + filteredPersonnels.length + filteredEvents.length + filteredTasks.length + filteredInvoices.length + filteredFournisseurs.length + filteredCorrespondances.length + filteredProcedures.length})</option>
                            <option value="avocat">💼 Avocats inscrits ({filteredAvocats.length})</option>
                            <option value="client">👥 Clients enregistrés ({filteredClients.length})</option>
                            <option value="case">📂 Dossiers actifs ({filteredCases.length})</option>
                            <option value="personnel">👔 Membres du Personnel ({filteredPersonnels.length})</option>
                            <option value="event">📅 Événements & Activités ({filteredEvents.length})</option>
                            <option value="task">✅ Tâches assignées ({filteredTasks.length})</option>
                            <option value="invoice">💵 Factures & Paiements ({filteredInvoices.length})</option>
                            <option value="fournisseur">📦 Fournisseurs & Prestations ({filteredFournisseurs.length})</option>
                            <option value="correspondance">✉️ Correspondances ({filteredCorrespondances.length})</option>
                            <option value="procedure">⚖️ Procédures en cours ({filteredProcedures.length})</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Helper pour afficher les pièces jointes directement dans la liste */}
            {(() => {
                (window as any)._renderPJ = (item: any) => {
                    const files = item.piecesJointes || item.attachments || [];
                    if (files.length === 0) return <span className="text-gray-300 italic text-[10px]">-</span>;
                    return (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {files.map((file: any, idx: number) => (
                                <a 
                                    key={idx} 
                                    href={file.content || '#'} 
                                    download={file.name}
                                    className="inline-flex items-center text-[9px] font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 px-1.5 py-0.5 rounded transition" 
                                    title={`Télécharger : ${file.name} (${file.size || 'N/A'})`}
                                    onClick={(e) => {
                                        if (!file.content) e.preventDefault();
                                    }}
                                >
                                    📎 <span className="truncate max-w-[65px]">{file.name}</span>
                                </a>
                            ))}
                        </div>
                    );
                };
                return null;
            })()}

            {/* Section Avocats */}
            {(searchCategory === 'all' || searchCategory === 'avocat') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Avocats inscrits ({filteredAvocats.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Membres du barreau rattachés au cabinet</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom Complet</th>
                                    <th className={tableHeaderClass}>Commission / Niveau</th>
                                    <th className={tableHeaderClass}>Statut de Service</th>
                                    <th className={tableHeaderClass}>Rôle Cabinet</th>
                                    <th className={tableHeaderClass}>Téléphone</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAvocats.map((item) => {
                                    const isEditing = editingType === 'avocat' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.fullName || ''} 
                                                            onChange={(e) => handleFieldChange('fullName', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.cabinetStatus || 'Junior'} 
                                                            onChange={(e) => handleFieldChange('cabinetStatus', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Senior of counsel">Senior of counsel</option>
                                                            <option value="Senior">Senior</option>
                                                            <option value="Associé">Associé</option>
                                                            <option value="Junior">Junior</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.serviceStatus || 'Actif'} 
                                                            onChange={(e) => handleFieldChange('serviceStatus', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Actif">Actif</option>
                                                            <option value="Omis">Omis</option>
                                                            <option value="Mise en disponibilité">Mise en disponibilité</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.cabinetRole || ''} 
                                                            onChange={(e) => handleFieldChange('cabinetRole', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-medium w-full bg-white shadow-inner focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.phone || ''} 
                                                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {(window as any)._renderPJ(editForm)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>{item.fullName}</td>
                                                    <td className={tableCellClass}>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                            item.cabinetStatus === 'Senior' ? 'bg-[#15447c]/10 text-[#15447c]' :
                                                            item.cabinetStatus === 'Senior of counsel' ? 'bg-purple-100 text-purple-800' :
                                                            item.cabinetStatus === 'Associé' ? 'bg-emerald-100 text-emerald-800' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {item.cabinetStatus}
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            item.serviceStatus === 'Actif' ? 'bg-green-100 text-green-800' :
                                                            item.serviceStatus === 'Omis' ? 'bg-amber-100 text-amber-805 bg-amber-50 text-amber-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {item.serviceStatus}
                                                        </span>
                                                    </td>
                                                    <td className={`${tableCellClass} font-semibold text-slate-650`}>{item.cabinetRole || 'Non spécifié'}</td>
                                                    <td className={`${tableCellClass} font-mono font-bold text-gray-500`}>{item.phone || '-'}</td>
                                                    <td className={tableCellClass}>
                                                        {(window as any)._renderPJ(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('avocat', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                                title="Modification rapide inline"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('avocat', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                                title="Modifier tous les champs"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteAvocat, item.id, 'avocat')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Clients */}
            {(searchCategory === 'all' || searchCategory === 'client') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Clients enregistrés ({filteredClients.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Personnes physiques ou de droit moral</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom / Raison Sociale</th>
                                    <th className={tableHeaderClass}>Contact Principal</th>
                                    <th className={tableHeaderClass}>Adresse E-mail</th>
                                    <th className={tableHeaderClass}>Téléphone</th>
                                    <th className={tableHeaderClass}>Type Facturation</th>
                                    <th className={tableHeaderClass}>Siège Social</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((item) => {
                                    const isEditing = editingType === 'client' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.name || ''} 
                                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.contact || ''} 
                                                            onChange={(e) => handleFieldChange('contact', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="email" 
                                                            value={editForm.email || ''} 
                                                            onChange={(e) => handleFieldChange('email', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-medium w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.phone || ''} 
                                                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto p-1 border border-indigo-300 bg-white rounded-lg select-none min-w-[120px]">
                                                            {[
                                                                'Forfaitaire',
                                                                'Taux horaire',
                                                                'Abonnement mensuel',
                                                                'Abonnement annuel',
                                                                'Au dossier (Ponctuelle)'
                                                            ].map(opt => {
                                                                const currentTypes = (editForm.typeFacturation || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                                                                const isChecked = currentTypes.includes(opt);
                                                                return (
                                                                    <label key={opt} className="flex items-center gap-1 cursor-pointer text-[10px] whitespace-nowrap text-gray-700 hover:bg-slate-50 font-bold p-0.5">
                                                                        <input 
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => {
                                                                                let newTypes;
                                                                                if (isChecked) {
                                                                                    newTypes = currentTypes.filter((t: string) => t !== opt);
                                                                                } else {
                                                                                    newTypes = [...currentTypes, opt];
                                                                                }
                                                                                handleFieldChange('typeFacturation', newTypes.join(', '));
                                                                            }}
                                                                            className="h-3 w-3 text-indigo-600 rounded border-gray-300"
                                                                            id={`opt-${opt}`}
                                                                        />
                                                                        <span>{opt}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.siege || ''} 
                                                            onChange={(e) => handleFieldChange('siege', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {(window as any)._renderPJ(editForm)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>{item.name}</td>
                                                    <td className={`${tableCellClass} font-semibold text-gray-650`}>{item.contact}</td>
                                                    <td className={`${tableCellClass} font-mono text-gray-500`}>{item.email || '-'}</td>
                                                    <td className={`${tableCellClass} font-mono font-bold text-gray-500`}>{item.phone || '-'}</td>
                                                    <td className={tableCellClass}>
                                                        <span className="inline-flex items-center text-3xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-wider">
                                                            {item.typeFacturation || 'Forfaitaire'}
                                                        </span>
                                                    </td>
                                                    <td className={`${tableCellClass} text-gray-700 font-medium truncate max-w-[130px]`} title={item.siege}>{item.siege || '-'}</td>
                                                    <td className={tableCellClass}>
                                                        {(window as any)._renderPJ(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('client', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                                title="Modification rapide inline"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('client', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                                title="Modifier tous les champs"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteClient, item.id, 'client')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Dossiers */}
            {(searchCategory === 'all' || searchCategory === 'case') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Dossiers actifs ({filteredCases.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Affaires judiciaires en cours de traitement</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom Dossier</th>
                                    <th className={tableHeaderClass}>Client associé</th>
                                    <th className={tableHeaderClass}>Statut Litige</th>
                                    <th className={tableHeaderClass}>Notes / Commentaires</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCases.map((item) => {
                                    const isEditing = editingType === 'case' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.name || ''} 
                                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.client || ''} 
                                                            onChange={(e) => handleFieldChange('client', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            {props.clients.map(c => (
                                                                <option key={c.id} value={c.name}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.status || 'En cours'} 
                                                            onChange={(e) => handleFieldChange('status', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="En cours">En cours</option>
                                                            <option value="En attente">En attente</option>
                                                            <option value="Clôturé">Clôturé</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <textarea 
                                                            value={editForm.notes || ''} 
                                                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs w-full bg-white shadow-inner min-h-[50px] focus:outline-hidden"
                                                            placeholder="Notes supplémentaires..."
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {(window as any)._renderPJ(editForm)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>
                                                        {item.name}
                                                        <span className="text-[9px] font-mono text-gray-400 block tracking-tight">{item.id}</span>
                                                    </td>
                                                    <td className={`${tableCellClass} font-semibold text-gray-650`}>{item.client}</td>
                                                    <td className={tableCellClass}>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                            item.status === 'En cours' ? 'bg-indigo-150 text-indigo-900' :
                                                            item.status === 'Clôturé' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className={`${tableCellClass} max-w-sm text-gray-400 font-medium truncate`} title={item.notes}>
                                                        {item.notes || <span className="text-gray-300 italic">Aucune note</span>}
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {(window as any)._renderPJ(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('case', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                                title="Modification rapide inline"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('case', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                                title="Modifier tous les champs"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteCase, item.id, 'dossier')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Personnel */}
            {(searchCategory === 'all' || searchCategory === 'personnel') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Membres du personnel ({filteredPersonnels.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Parcours d'embauche, salaires et états de service</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom Complet</th>
                                    <th className={tableHeaderClass}>Rôle / Fonction</th>
                                    <th className={tableHeaderClass}>Salaire Mensuel</th>
                                    <th className={tableHeaderClass}>État matrimonial / Enfants</th>
                                    <th className={tableHeaderClass}>Statut de service</th>
                                    <th className={tableHeaderClass}>Sanctions & Mesures disciplinaires</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPersonnels.map((item) => {
                                    const isEditing = editingType === 'personnel' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.fullName || ''} 
                                                            onChange={(e) => handleFieldChange('fullName', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.role || 'Secrétaire'} 
                                                            onChange={(e) => handleFieldChange('role', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
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
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="number" 
                                                            value={editForm.salary || 0} 
                                                            onChange={(e) => handleFieldChange('salary', parseFloat(e.target.value) || 0)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold font-mono w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <div className="space-y-1.5">
                                                            <select 
                                                                value={editForm.maritalStatus || 'Célibataire'} 
                                                                onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                                                                className="p-1 border border-indigo-300 rounded text-3xs font-semibold w-full bg-white"
                                                            >
                                                                <option value="Célibataire">Célibataire</option>
                                                                <option value="Marié(e)">Marié(e)</option>
                                                                <option value="Divorcé(e)">Divorcé(e)</option>
                                                                <option value="Veuf(ve)">Veuf(ve)</option>
                                                            </select>
                                                            <div className="flex gap-1">
                                                                <select 
                                                                    value={editForm.hasChildren || 'Non'} 
                                                                    onChange={(e) => handleFieldChange('hasChildren', e.target.value)}
                                                                    className="p-1 border border-indigo-300 rounded text-3xs font-semibold w-full bg-white"
                                                                >
                                                                    <option value="Non">Non</option>
                                                                    <option value="Oui">Oui</option>
                                                                </select>
                                                                {editForm.hasChildren === 'Oui' && (
                                                                    <input 
                                                                        type="number" 
                                                                        value={editForm.childrenCount || 0} 
                                                                        onChange={(e) => handleFieldChange('childrenCount', parseInt(e.target.value) || 0)}
                                                                        className="p-1 border border-indigo-300 rounded text-3xs font-bold font-mono w-10 text-center bg-white"
                                                                        min="0"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.serviceStatus || 'Actif'} 
                                                            onChange={(e) => handleFieldChange('serviceStatus', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Actif">Actif</option>
                                                            <option value="Inactif">Inactif</option>
                                                            <option value="Mise en disponibilité">Mise en disponibilité</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <div className="space-y-1">
                                                            <select 
                                                                value={editForm.disciplinaryStatus || 'Aucune'} 
                                                                onChange={(e) => handleFieldChange('disciplinaryStatus', e.target.value)}
                                                                className="p-1 border border-indigo-300 rounded text-3xs font-semibold w-full bg-white"
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
                                                            <input 
                                                                type="text" 
                                                                placeholder="Motif/Détail..."
                                                                value={editForm.disciplinaryMeasure || ''} 
                                                                onChange={(e) => handleFieldChange('disciplinaryMeasure', e.target.value)}
                                                                className="p-1.5 border border-indigo-400/50 rounded-lg text-3xs w-full bg-white shadow-inner focus:outline-hidden"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>
                                                        <div className="flex items-center gap-2">
                                                            {item.photo ? (
                                                                <img src={item.photo} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-150" />
                                                            ) : (
                                                                <UserIcon className="w-4 h-4 text-gray-400 shrink-0 inline-block" />
                                                            )}
                                                            <span>{item.fullName}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`${tableCellClass} font-extrabold text-[#15447c]`}>{item.role}</td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-emerald-700`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.salary || 0)}</td>
                                                    <td className={`${tableCellClass} font-semibold text-slate-650`}>
                                                        {item.maritalStatus} {item.hasChildren === 'Oui' ? `(${item.childrenCount} enfants)` : '(Sans enfants)'}
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            item.serviceStatus === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {item.serviceStatus}
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {item.disciplinaryStatus && item.disciplinaryStatus !== 'Aucune' ? (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] bg-amber-100 text-amber-800 font-extrabold border border-amber-200">
                                                                    {item.disciplinaryStatus}
                                                                </span>
                                                                <p className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]" title={item.disciplinaryMeasure}>
                                                                    {item.disciplinaryMeasure}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 italic text-2xs">Aucune sanction</span>
                                                        )}
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('personnel', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                                title="Modification rapide inline"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('personnel', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                                title="Modifier tous les champs"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeletePersonnel, item.id, 'personnel')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Événements */}
            {(searchCategory === 'all' || searchCategory === 'event') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Événements & Activités ({filteredEvents.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Colloques, séminaires, budgets et états</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom de l'activité</th>
                                    <th className={tableHeaderClass}>Type</th>
                                    <th className={tableHeaderClass}>Date</th>
                                    <th className={tableHeaderClass}>Lieu</th>
                                    <th className={tableHeaderClass}>Partenaires / Sponsors</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.map((item) => {
                                    const isEditing = editingType === 'event' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.name || ''} 
                                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.type || 'Atelier'} 
                                                            onChange={(e) => handleFieldChange('type', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Atelier">Atelier</option>
                                                            <option value="Conférence">Conférence</option>
                                                            <option value="Colloque">Colloque</option>
                                                            <option value="Séminaire">Séminaire</option>
                                                            <option value="Autre">Autre</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="date" 
                                                            value={editForm.date || ''} 
                                                            onChange={(e) => handleFieldChange('date', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.lieu || ''} 
                                                            onChange={(e) => handleFieldChange('lieu', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.partenaires || ''} 
                                                            onChange={(e) => handleFieldChange('partenaires', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>{item.name}</td>
                                                    <td className={`${tableCellClass} font-extrabold text-[#15447c]`}>{item.type}</td>
                                                    <td className={`${tableCellClass} font-semibold font-mono text-slate-650`}>{item.date}</td>
                                                    <td className={`${tableCellClass} font-semibold text-slate-600`}>{item.lieu}</td>
                                                    <td className={`${tableCellClass} text-slate-550`}>{item.partenaires || <span className="text-gray-300">-</span>}</td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('event', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('event', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteEvent, item.id, 'event')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Tâches */}
            {(searchCategory === 'all' || searchCategory === 'task') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Tâches assignées ({filteredTasks.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Suivi des tâches, avocats responsables et statuts</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom de la Tâche</th>
                                    <th className={tableHeaderClass}>Dossier N°</th>
                                    <th className={tableHeaderClass}>Avocat en Charge</th>
                                    <th className={tableHeaderClass}>Échéance</th>
                                    <th className={tableHeaderClass}>Statut</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((item) => {
                                    const isEditing = editingType === 'task' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.name || ''} 
                                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.caseId || ''} 
                                                            disabled
                                                            className="p-1.5 border border-gray-200 rounded-lg text-xs font-bold w-full bg-slate-50 text-gray-500 cursor-not-allowed"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select
                                                            value={editForm.lawyer || ''}
                                                            onChange={(e) => handleFieldChange('lawyer', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="">-- Choisir un avocat --</option>
                                                            {props.avocats.map(av => (
                                                                <option key={av.id} value={av.fullName}>{av.fullName}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="date" 
                                                            value={editForm.dueDate || ''} 
                                                            onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.status || 'Non effectué'} 
                                                            onChange={(e) => handleFieldChange('status', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Non effectué">Non effectué</option>
                                                            <option value="Effectué à moitié">Effectué à moitié</option>
                                                            <option value="Effectué">Effectué</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>{item.name}</td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-gray-500`}>{item.caseId}</td>
                                                    <td className={`${tableCellClass} font-extrabold text-[#15447c]`}>{item.lawyer}</td>
                                                    <td className={`${tableCellClass} font-semibold font-mono text-slate-650`}>{item.dueDate}</td>
                                                    <td className={tableCellClass}>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            item.status === 'Effectué' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'Effectué à moitié' ? 'bg-amber-100 text-amber-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('task', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('task', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteTask, item.id, 'task')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Factures */}
            {(searchCategory === 'all' || searchCategory === 'invoice') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Factures & Honoraires ({filteredInvoices.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Suivi de facturation client, paiements et restes à payer</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Numéro Facture</th>
                                    <th className={tableHeaderClass}>Dossier N°</th>
                                    <th className={tableHeaderClass}>Montant Total</th>
                                    <th className={tableHeaderClass}>Montant Payé</th>
                                    <th className={tableHeaderClass}>Reste à Payer</th>
                                    <th className={tableHeaderClass}>Échéance</th>
                                    <th className={tableHeaderClass}>Statut</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((item) => {
                                    const isEditing = editingType === 'invoice' && editingId === item.id;
                                    const reste = (item.totalAmount || 0) - (item.paidAmount || 0);
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={`${tableCellClass} font-bold font-mono`}>{item.id}</td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.caseId || ''} 
                                                            disabled
                                                            className="p-1.5 border border-gray-200 rounded-lg text-xs font-bold w-full bg-slate-50 text-gray-500 cursor-not-allowed"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="number" 
                                                            value={editForm.totalAmount || 0} 
                                                            onChange={(e) => handleFieldChange('totalAmount', parseFloat(e.target.value) || 0)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="number" 
                                                            value={editForm.paidAmount || 0} 
                                                            onChange={(e) => handleFieldChange('paidAmount', parseFloat(e.target.value) || 0)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-amber-700`}>
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(reste)}
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="date" 
                                                            value={editForm.dueDate || ''} 
                                                            onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.status || 'Non réglée'} 
                                                            onChange={(e) => handleFieldChange('status', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Non réglée">Non réglée</option>
                                                            <option value="En cours">En cours</option>
                                                            <option value="Réglée">Réglée</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold font-mono text-gray-800`}>{item.id}</td>
                                                    <td className={`${tableCellClass} font-semibold font-mono text-slate-500`}>{item.caseId}</td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-emerald-700`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.totalAmount || 0)}</td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-indigo-700`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.paidAmount || 0)}</td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-rose-700`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(reste)}</td>
                                                    <td className={`${tableCellClass} font-semibold font-mono text-slate-650`}>{item.dueDate}</td>
                                                    <td className={tableCellClass}>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            item.status === 'Réglée' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'En cours' ? 'bg-amber-100 text-amber-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('invoice', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('invoice', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteInvoice, item.id, 'invoice')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Fournisseurs */}
            {(searchCategory === 'all' || searchCategory === 'fournisseur') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Fournisseurs & Partenaires tiers ({filteredFournisseurs.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Prestations externes, loyers et contrats de maintenance</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>Nom Fournisseur</th>
                                    <th className={tableHeaderClass}>Nature</th>
                                    <th className={tableHeaderClass}>Désignation</th>
                                    <th className={tableHeaderClass}>Facturation</th>
                                    <th className={tableHeaderClass}>Montant ($)</th>
                                    <th className={tableHeaderClass}>Dirigeant</th>
                                    <th className={tableHeaderClass}>E-mail</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFournisseurs.map((item) => {
                                    const isEditing = editingType === 'fournisseur' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.nomComplet || ''} 
                                                            onChange={(e) => handleFieldChange('nomComplet', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.naturePrestation || 'Services'} 
                                                            onChange={(e) => handleFieldChange('naturePrestation', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Bien">Bien</option>
                                                            <option value="Services">Services</option>
                                                            <option value="Baie locative">Baie locative</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.designationPrestation || ''} 
                                                            onChange={(e) => handleFieldChange('designationPrestation', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select 
                                                            value={editForm.typeFacturation || 'Ponctuelle'} 
                                                            onChange={(e) => handleFieldChange('typeFacturation', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Ponctuelle">Ponctuelle</option>
                                                            <option value="Périodique">Périodique</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="number" 
                                                            value={editForm.montant || 0} 
                                                            onChange={(e) => handleFieldChange('montant', parseFloat(e.target.value) || 0)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.dirigeantPrincipal || ''} 
                                                            onChange={(e) => handleFieldChange('dirigeantPrincipal', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="email" 
                                                            value={editForm.adresseMail || ''} 
                                                            onChange={(e) => handleFieldChange('adresseMail', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner font-mono focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>{item.nomComplet}</td>
                                                    <td className={`${tableCellClass} font-extrabold text-[#15447c]`}>{item.naturePrestation}</td>
                                                    <td className={`${tableCellClass} text-slate-600`}>{item.designationPrestation}</td>
                                                    <td className={`${tableCellClass} font-semibold text-slate-600`}>{item.typeFacturation}</td>
                                                    <td className={`${tableCellClass} font-bold font-mono text-emerald-700`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.montant || 0)}</td>
                                                    <td className={`${tableCellClass} text-slate-550`}>{item.dirigeantPrincipal}</td>
                                                    <td className={`${tableCellClass} text-slate-500 font-mono`}>{item.adresseMail}</td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('fournisseur', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => startDetailedEdit('fournisseur', item)} 
                                                                className="font-extrabold text-[10px] text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/60 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚙️ Détaillé
                                                            </button>
                                                            <button onClick={() => handleDelete(props.onDeleteFournisseur, item.id, 'fournisseur')} className={deleteButtonClass}>Supprimer</button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Correspondances */}
            {(searchCategory === 'all' || searchCategory === 'correspondance') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Correspondances & Courriers ({filteredCorrespondances.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Lettres officielles et documents rédigés ou archivés</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>ID Unique</th>
                                    <th className={tableHeaderClass}>Date</th>
                                    <th className={tableHeaderClass}>Type</th>
                                    <th className={tableHeaderClass}>Destinataire</th>
                                    <th className={tableHeaderClass}>Objet</th>
                                    <th className={tableHeaderClass}>Auteur</th>
                                    <th className={tableHeaderClass}>Pièces Jointes</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCorrespondances.map((item) => {
                                    const isEditing = editingType === 'correspondance' && editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={`${tableCellClass} font-mono font-bold text-slate-500`}>
                                                        {item.id}
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.date || ''} 
                                                            onChange={(e) => handleFieldChange('date', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <select
                                                            value={editForm.type || 'Lettre'}
                                                            onChange={(e) => handleFieldChange('type', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-2xs font-bold w-full bg-white focus:outline-hidden"
                                                        >
                                                            <option value="Lettre">Lettre</option>
                                                            <option value="E-mail">E-mail</option>
                                                            <option value="Mise en demeure">Mise en demeure</option>
                                                            <option value="Autre">Autre</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.recipientName || ''} 
                                                            onChange={(e) => handleFieldChange('recipientName', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.subject || ''} 
                                                            onChange={(e) => handleFieldChange('subject', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.author || ''} 
                                                            onChange={(e) => handleFieldChange('author', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-mono font-bold text-indigo-700`}>{item.id}</td>
                                                    <td className={`${tableCellClass} text-slate-500 font-medium font-mono text-xs`}>{item.date}</td>
                                                    <td className={`${tableCellClass} font-extrabold text-[#15447c]`}>{item.type}</td>
                                                    <td className={`${tableCellClass} font-bold text-slate-800`}>{item.recipientName}</td>
                                                    <td className={`${tableCellClass} text-slate-650 font-medium max-w-xs truncate`} title={item.subject}>{item.subject}</td>
                                                    <td className={`${tableCellClass} font-bold text-slate-600`}>{item.author}</td>
                                                    <td className={tableCellClass}>
                                                        {((window as any)._renderPJ)(item)}
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('correspondance', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteCorrespondance(item.id)} 
                                                                className={deleteButtonClass}
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section Procédures */}
            {(searchCategory === 'all' || searchCategory === 'procedure') && (
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs mb-10">
                    <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 tracking-tight">Procédures en cours ({filteredProcedures.length})</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Suivi des actions en justice et instances d'arbitrage ou de conciliation</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className={tableHeaderClass}>ID Unique</th>
                                    <th className={tableHeaderClass}>Nom Procédure</th>
                                    <th className={tableHeaderClass}>Dossier Associé</th>
                                    <th className={tableHeaderClass}>Instance / Juridiction</th>
                                    <th className={tableHeaderClass}>Objet du Litige</th>
                                    <th className={tableHeaderClass}>Date Début</th>
                                    <th className={tableHeaderClass}>Date Fin</th>
                                    <th className={tableHeaderClass}>Statut</th>
                                    <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProcedures.map((item) => {
                                    const isEditing = editingType === 'procedure' && editingId === item.id;
                                    return (
                                        <tr key={`${item.caseId}-${item.id}`} className="border-b border-gray-100 hover:bg-slate-50/20 transition">
                                            {isEditing ? (
                                                <>
                                                    <td className={`${tableCellClass} font-mono font-bold text-slate-500`}>
                                                        {item.id}
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.name || ''} 
                                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-bold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={`${tableCellClass} font-mono text-2xs text-gray-400`}>
                                                        {item.caseName} ({item.caseId})
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.instance || ''} 
                                                            onChange={(e) => handleFieldChange('instance', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.objet || ''} 
                                                            onChange={(e) => handleFieldChange('objet', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.dateDebut || ''} 
                                                            onChange={(e) => handleFieldChange('dateDebut', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-mono font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.dateFin || ''} 
                                                            onChange={(e) => handleFieldChange('dateFin', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-mono font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={tableCellClass}>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.status || ''} 
                                                            onChange={(e) => handleFieldChange('status', e.target.value)}
                                                            className="p-1.5 border border-indigo-400/50 rounded-lg text-xs font-semibold w-full bg-white shadow-inner focus:outline-hidden"
                                                        />
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <button onClick={saveEdit} className={saveButtonClass}>Enregistrer</button>
                                                        <button onClick={cancelEdit} className={cancelButtonClass}>Annuler</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${tableCellClass} font-mono font-bold text-slate-500`}>{item.id}</td>
                                                    <td className={`${tableCellClass} font-bold text-gray-800`}>{item.name}</td>
                                                    <td className={`${tableCellClass} font-bold text-indigo-700 text-2xs`}>{item.caseName} <span className="font-mono text-gray-400">({item.caseId})</span></td>
                                                    <td className={`${tableCellClass} text-slate-650 font-bold text-xs`}>{item.instance || '-'}</td>
                                                    <td className={`${tableCellClass} text-slate-600 text-xs max-w-2xs truncate`} title={item.objet}>{item.objet || '-'}</td>
                                                    <td className={`${tableCellClass} font-mono text-slate-500 text-xs`}>{item.dateDebut || '-'}</td>
                                                    <td className={`${tableCellClass} font-mono text-slate-500 text-xs`}>{item.dateFin || '-'}</td>
                                                    <td className={tableCellClass}>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                                                            {item.status || 'En attente'}
                                                        </span>
                                                    </td>
                                                    <td className={`${tableCellClass} text-right whitespace-nowrap`}>
                                                        <div className="inline-flex gap-1">
                                                            <button 
                                                                onClick={() => startEdit('procedure', item)} 
                                                                className="font-extrabold text-[10px] text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1.5 rounded-lg transition"
                                                            >
                                                                ⚡ Rapide
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteProcedure(item.id, item.caseId)} 
                                                                className={deleteButtonClass}
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            </>
            )}

            {/* MODAL DE MODIFICATION DÉTAILLÉE (MODULAIRE ET PROPRE) */}
            {detailedEditingType && detailedEditForm && (
                <DetailedEditModal
                    type={detailedEditingType}
                    item={detailedEditForm}
                    clients={props.clients}
                    onClose={closeDetailedEdit}
                    onSave={(updatedItem) => {
                        if (detailedEditingType === 'client') {
                            props.onUpdateClient(updatedItem as Client);
                        } else if (detailedEditingType === 'case') {
                            props.onUpdateCase(updatedItem as Case);
                        } else if (detailedEditingType === 'avocat') {
                            props.onUpdateAvocat(updatedItem as Avocat);
                        } else if (detailedEditingType === 'personnel') {
                            props.onUpdatePersonnel(updatedItem as Personnel);
                        } else if (detailedEditingType === 'event') {
                            props.onUpdateEvent(updatedItem as Event);
                        } else if (detailedEditingType === 'task') {
                            props.onUpdateTask(updatedItem as Task);
                        } else if (detailedEditingType === 'invoice') {
                            props.onUpdateInvoice(updatedItem as Invoice);
                        } else if (detailedEditingType === 'fournisseur') {
                            props.onUpdateFournisseur(updatedItem as Fournisseur);
                        }
                        closeDetailedEdit();
                    }}
                />
            )}
        </PageContainer>
    );
};

export default GestionPage;
