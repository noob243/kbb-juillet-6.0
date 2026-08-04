import React, { useState, useEffect, useMemo } from 'react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import CasesPage from './pages/CasesPage';
import ProceduresPage from './pages/ProceduresPage';
import EventsPage from './pages/EventsPage';
import AgendaPage from './pages/AgendaPage';
import ChatPage from './pages/ChatPage';
import BillingPage from './pages/BillingPage';
import AvocatsPage from './pages/AvocatsPage';
import PersonnelsPage from './pages/PersonnelsPage';
import FournisseursPage from './pages/FournisseursPage';
import GestionPage from './pages/GestionPage';
import AllInterfacesPage from './pages/AllInterfacesPage';
import AIAssistantPage from './pages/AIAssistantPage';
import AuditLogsPage from './pages/AuditLogsPage';
import CorrespondancePage from './pages/CorrespondancePage';
import { Client, Case, Event, Task, Invoice, Avocat, Personnel, Fournisseur, AuditLog, Correspondance } from './types';
import { playAlarmSound, stopAllAlarmSounds } from './utils/audio';

// Firebase core configuration
import { db, auth } from './firebase.ts';
import { signInAnonymously, createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize a secondary Firebase app instance for secure admin registration without displacing the active session
const secondaryApp = initializeApp(firebaseConfig, "SecondaryRegistrationApp");
const secondaryAuth = getAuth(secondaryApp);
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { 
    dbCreateDoc, 
    dbUpdateDoc, 
    dbDeleteDoc, 
    dbCreateAuditLog,
    syncLocalCollection
} from './lib/firestoreService.ts';
import { motion, AnimatePresence } from 'motion/react';
import EmailComposerModal from './components/modals/EmailComposerModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { ProtectedGuard } from './components/auth/ProtectedGuard';
import { syncUsersWithFirestore, updateAppUser } from './services/userService';
import { initializeAllFirestoreCollections } from './services/initCollectionsService';
import { AppUser, ModuleKey } from './types/rbac';
import { ALL_MODULE_PERMISSIONS } from './services/rbacService';
import LoadingSpinner from './components/common/LoadingSpinner';

declare const jspdf: any;

const loadLocalCache = <T,>(key: string): T[] => {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
};

const saveLocalCache = <T,>(key: string, data: T[]) => {
    try {
        if (Array.isArray(data)) {
            localStorage.setItem(key, JSON.stringify(data));
        }
    } catch (e) {}
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        try { return sessionStorage.getItem('kbb_auth') === 'true'; } catch (e) { return false; }
    });
    const [currentUserInfo, setCurrentUserInfo] = useState<{ name: string; role: string; email: string; photoUrl?: string } | null>(() => {
        try {
            const stored = sessionStorage.getItem('kbb_currentUserInfo');
            return stored ? JSON.parse(stored) : null;
        } catch (e) { return null; }
    });
    const [currentUserObj, setCurrentUserObj] = useState<AppUser | null>(null);
    const [usersList, setUsersList] = useState<AppUser[]>([]);
    const [currentPage, setCurrentPage] = useState('Dashboard');
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Persist login session to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('kbb_auth', String(isAuthenticated));
            if (currentUserInfo) {
                sessionStorage.setItem('kbb_currentUserInfo', JSON.stringify(currentUserInfo));
            } else {
                sessionStorage.removeItem('kbb_currentUserInfo');
            }
        } catch (e) {}
    }, [isAuthenticated, currentUserInfo]);

    // Real-time synchronization of users list and RBAC matrix
    useEffect(() => {
        let unsub: (() => void) | undefined;
        syncUsersWithFirestore((latestUsers) => {
            setUsersList(latestUsers);
        }).then(cleanup => {
            unsub = cleanup;
        });
        return () => {
            if (unsub) unsub();
        };
    }, []);

    useEffect(() => {
        if (currentUserInfo?.email) {
            const cleanEmail = (currentUserInfo.email || '').trim().toLowerCase();
            const found = usersList.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
            const isSuperAdminEmail = cleanEmail === 'jeremieshusu4@gmail.com' ||
                cleanEmail === 'hervemich@icloud.com' ||
                cleanEmail === 'patbonles@gmail.com' ||
                cleanEmail === 'admin@cabinet.com';

            if (found) {
                if (found.photoUrl && currentUserInfo.photoUrl !== found.photoUrl) {
                    setCurrentUserInfo(prev => prev ? { ...prev, photoUrl: found.photoUrl, name: found.fullName || prev.name } : null);
                }
                if (isSuperAdminEmail || found.role === 'Admin') {
                    setCurrentUserObj({
                        ...found,
                        role: 'Admin',
                        permissions: ALL_MODULE_PERMISSIONS.map(m => m.key)
                    });
                } else {
                    setCurrentUserObj(found);
                }
            } else if (isSuperAdminEmail || currentUserInfo.role === 'Admin') {
                setCurrentUserObj({
                    id: 'admin-default',
                    email: currentUserInfo.email,
                    fullName: currentUserInfo.name,
                    photoUrl: currentUserInfo.photoUrl,
                    role: 'Admin',
                    personnelCategory: 'Administratif',
                    hasAppAccess: true,
                    permissions: ALL_MODULE_PERMISSIONS.map(m => m.key),
                    createdAt: new Date().toISOString(),
                    isDeleted: false,
                    status: 'Actif'
                });
            }
        } else {
            setCurrentUserObj(null);
        }
    }, [currentUserInfo?.email, usersList]);

    // Real-time online presence heartbeat in Firestore with activity listener
    useEffect(() => {
        if (!isAuthenticated || !currentUserObj?.id) return;
        const targetUserId = currentUserObj.id;

        const sendPresenceUpdate = () => {
            updateAppUser(targetUserId, {
                isOnline: true,
                lastActiveAt: new Date().toISOString()
            }).catch(() => {});
        };

        // Mark online immediately
        sendPresenceUpdate();

        // Heartbeat interval every 15 seconds
        const heartbeat = setInterval(sendPresenceUpdate, 15000);

        // Throttle user interaction activity listener
        let lastActivityTime = Date.now();
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivityTime > 10000) {
                lastActivityTime = now;
                sendPresenceUpdate();
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                sendPresenceUpdate();
            }
        };

        const handleUnload = () => {
            updateAppUser(targetUserId, {
                isOnline: false,
                lastActiveAt: new Date().toISOString()
            }).catch(() => {});
        };

        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('click', handleActivity);
        window.addEventListener('keydown', handleActivity);

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [isAuthenticated, currentUserObj?.id]);

    // Check if current user session was disconnected remotely by an Admin (Instant detection)
    useEffect(() => {
        if (!isAuthenticated || !currentUserObj?.id || !usersList.length) return;
        const currentInList = usersList.find(u => 
            u.id === currentUserObj.id || 
            (u.email && currentUserObj.email && (u.email || '').trim().toLowerCase() === (currentUserObj.email || '').trim().toLowerCase())
        );

        if (currentInList) {
            const isForceDisconnected = currentInList.forceLogout === true || 
                (currentInList.sessionRevokedAt && new Date(currentInList.sessionRevokedAt).getTime() > Date.now() - 120000);
            
            if (isForceDisconnected) {
                setIsAuthenticated(false);
                setCurrentUserInfo(null);
                setCurrentUserObj(null);
                sessionStorage.clear();
                triggerToast('error', 'Votre session a été fermée à distance par un administrateur.');
            }
        }
    }, [usersList, isAuthenticated, currentUserObj?.id]);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeAlarmTask, setActiveAlarmTask] = useState<Task | null>(null);
    const stopActiveAlarmRef = React.useRef<(() => void) | null>(null);
    
    // Core collection states initialized with local cache for offline/quota resiliency
    const [clients, setClients] = useState<Client[]>(() => loadLocalCache('kbb_cache_clients'));
    const [cases, setCases] = useState<Case[]>(() => loadLocalCache('kbb_cache_cases'));
    const [events, setEvents] = useState<Event[]>(() => loadLocalCache('kbb_cache_events'));
    const [tasks, setTasks] = useState<Task[]>(() => loadLocalCache('kbb_cache_tasks'));
    const [invoices, setInvoices] = useState<Invoice[]>(() => loadLocalCache('kbb_cache_invoices'));
    const [avocats, setAvocats] = useState<Avocat[]>(() => loadLocalCache('kbb_cache_avocats'));
    const [personnels, setPersonnels] = useState<Personnel[]>(() => loadLocalCache('kbb_cache_personnels'));
    const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(() => loadLocalCache('kbb_cache_fournisseurs'));
    const [logs, setLogs] = useState<AuditLog[]>(() => loadLocalCache('kbb_cache_auditLogs'));
    const [correspondances, setCorrespondances] = useState<Correspondance[]>(() => loadLocalCache('kbb_cache_correspondances'));
    const [presences, setPresences] = useState<{ [email: string]: any }>({});

    const [isDbConnected, setIsDbConnected] = useState(false);
    const [isSyncComplete, setIsSyncComplete] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => { saveLocalCache('kbb_cache_clients', clients); }, [clients]);
    useEffect(() => { saveLocalCache('kbb_cache_cases', cases); }, [cases]);
    useEffect(() => { saveLocalCache('kbb_cache_events', events); }, [events]);
    useEffect(() => { saveLocalCache('kbb_cache_tasks', tasks); }, [tasks]);
    useEffect(() => { saveLocalCache('kbb_cache_invoices', invoices); }, [invoices]);
    useEffect(() => { saveLocalCache('kbb_cache_avocats', avocats); }, [avocats]);
    useEffect(() => { saveLocalCache('kbb_cache_personnels', personnels); }, [personnels]);
    useEffect(() => { saveLocalCache('kbb_cache_fournisseurs', fournisseurs); }, [fournisseurs]);
    useEffect(() => { saveLocalCache('kbb_cache_auditLogs', logs); }, [logs]);
    useEffect(() => { saveLocalCache('kbb_cache_correspondances', correspondances); }, [correspondances]);



    const [toasts, setToasts] = useState<{ id: string, type: 'success' | 'error', text: string }[]>([]);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const [emailConfig, setEmailConfig] = useState<{
        isOpen: boolean;
        to: string;
        subject: string;
        body: string;
        recipientName?: string;
        attachmentName?: string;
    }>({
        isOpen: false,
        to: '',
        subject: '',
        body: '',
        recipientName: '',
        attachmentName: ''
    });

    const triggerEmail = (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => {
        setEmailConfig({
            isOpen: true,
            to,
            subject,
            body,
            recipientName,
            attachmentName
        });
    };

    const triggerToast = (type: 'success' | 'error', text: string) => {
        const id = Math.random().toString();
        setToasts(prev => [...prev, { id, type, text }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const allContacts = useMemo(() => {
        const list: { name: string; email: string; role: string }[] = [];
        
        (clients || []).forEach(c => {
            if (c.email) list.push({ name: c.client || c.name || 'Client', email: c.email.trim(), role: 'Client' });
            if (c.ref1_email) list.push({ name: c.ref1_nom || `${c.client} (Réf 1)`, email: c.ref1_email.trim(), role: 'Client Réf.' });
            if (c.ref2_email) list.push({ name: c.ref2_nom || `${c.client} (Réf 2)`, email: c.ref2_email.trim(), role: 'Client Réf.' });
        });
        
        (avocats || []).forEach(a => {
            const emails = a.emails || [a.email1, a.email2, a.email3].filter(Boolean) as string[];
            emails.forEach((em, idx) => {
                if (em) list.push({ name: `${a.fullName}${idx > 0 ? ' (Alt)' : ''}`, email: em.trim(), role: 'Avocat' });
            });
        });
        
        (personnels || []).forEach(p => {
            if (p.email) list.push({ name: p.fullName, email: p.email.trim(), role: p.poste || 'Personnel' });
        });
        
        (fournisseurs || []).forEach(f => {
            if (f.adresseMail) list.push({ name: f.nomGérant || f.prestataire, email: f.adresseMail.trim(), role: 'Fournisseur' });
            f.referents?.forEach(ref => {
                if (ref.email) list.push({ name: ref.nom || `${f.prestataire} (Réf)`, email: ref.email.trim(), role: 'Fournisseur Réf.' });
            });
        });

        const seen = new Set<string>();
        return list.filter(item => {
            const lower = item.email.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });
    }, [clients, avocats, personnels, fournisseurs]);

    // 1. Establish Firebase Anonymous Authenticaton
    useEffect(() => {
        const initAuth = async () => {
            try {
                const cred = await signInAnonymously(auth);
                console.log("Firebase secure anonymous auth success:", cred.user.uid);
                setIsDbConnected(true);
                const dbName = firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId;
                triggerToast('success', `Synchronisation réussie avec la base de données (${dbName}) !`);
                initializeAllFirestoreCollections();
            } catch (err) {
                console.warn("Could not authenticate anonymously on startup:", err);
                setIsDbConnected(true); // fall back to offline storage while trying queries
                const dbName = firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId;
                triggerToast('success', `Base de données initialisée (${dbName})`);
                initializeAllFirestoreCollections();
            } finally {
                setTimeout(() => setIsInitialLoading(false), 500);
            }
        };
        initAuth();
    }, []);

    // 2. Complete connection and enable real-time Firestore listeners for authenticated sessions
    useEffect(() => {
        if (!isDbConnected || !isAuthenticated) return;

        const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Client[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: data.id || d.id,
                    name: data.name || data.nom || data.fullName || data.clientName || 'Client Sans Nom',
                    contact: data.contact || data.phone || data.email || 'Contact non spécifié',
                    cases: typeof data.cases === 'number' ? data.cases : 0,
                    ...data
                });
            });
            list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            if (list.length > 0) {
                setClients(list);
            } else {
                const cached = loadLocalCache<Client>('kbb_cache_clients');
                if (cached.length > 0) {
                    setClients(cached);
                    syncLocalCollection('clients', cached);
                } else {
                    setClients([]);
                }
            }
        }, (err) => {
            console.warn("Clients subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Client>('kbb_cache_clients');
            if (cached.length > 0) setClients(cached);
        });

        const unsubCases = onSnapshot(collection(db, 'cases'), (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Case[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: data.id || d.id,
                    name: data.name || data.title || data.nom || 'Dossier Sans Titre',
                    client: data.client || data.clientName || 'Client inconnu',
                    status: data.status || 'Nouveau',
                    nextHearing: data.nextHearing || null,
                    ...data
                });
            });
            if (list.length > 0) {
                setCases(list);
            } else {
                const cached = loadLocalCache<Case>('kbb_cache_cases');
                if (cached.length > 0) {
                    setCases(cached);
                    syncLocalCollection('cases', cached);
                } else {
                    setCases([]);
                }
            }
        }, (err) => {
            console.warn("Cases subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Case>('kbb_cache_cases');
            if (cached.length > 0) setCases(cached);
        });

        // Query targeted max 300 latest events for performance
        const eventsQuery = query(collection(db, 'events'), limit(300));
        const unsubEvents = onSnapshot(eventsQuery, (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Event[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: data.id || d.id,
                    name: data.name || data.title || 'Événement',
                    type: data.type || 'Autre',
                    date: data.date || '',
                    lieu: data.lieu || '',
                    ...data
                });
            });
            if (list.length > 0) {
                setEvents(list);
            } else {
                const cached = loadLocalCache<Event>('kbb_cache_events');
                if (cached.length > 0) {
                    setEvents(cached);
                    syncLocalCollection('events', cached);
                } else {
                    setEvents([]);
                }
            }
        }, (err) => {
            console.warn("Events subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Event>('kbb_cache_events');
            if (cached.length > 0) setEvents(cached);
        });

        // Query targeted max 400 active tasks for performance
        const tasksQuery = query(collection(db, 'tasks'), limit(400));
        const unsubTasks = onSnapshot(tasksQuery, (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Task[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: data.id || d.id,
                    name: data.name || data.title || 'Tâche',
                    caseId: data.caseId || '',
                    lawyer: data.lawyer || '',
                    dueDate: data.dueDate || '',
                    status: data.status || 'Non effectué',
                    ...data
                });
            });
            list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            if (list.length > 0) {
                setTasks(list);
            } else {
                const cached = loadLocalCache<Task>('kbb_cache_tasks');
                if (cached.length > 0) {
                    setTasks(cached);
                    syncLocalCollection('tasks', cached);
                } else {
                    setTasks([]);
                }
            }
        }, (err) => {
            console.warn("Tasks subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Task>('kbb_cache_tasks');
            if (cached.length > 0) setTasks(cached);
        });

        const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Invoice[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: data.id || d.id,
                    caseId: data.caseId || '',
                    dueDate: data.dueDate || '',
                    totalAmount: data.totalAmount !== undefined ? Number(data.totalAmount) : 0,
                    paidAmount: data.paidAmount !== undefined ? Number(data.paidAmount) : 0,
                    status: data.status || 'Non réglée',
                    ...data
                });
            });
            if (list.length > 0) {
                setInvoices(list);
            } else {
                const cached = loadLocalCache<Invoice>('kbb_cache_invoices');
                if (cached.length > 0) {
                    setInvoices(cached);
                    syncLocalCollection('invoices', cached);
                } else {
                    setInvoices([]);
                }
            }
        }, (err) => {
            console.warn("Invoices subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Invoice>('kbb_cache_invoices');
            if (cached.length > 0) setInvoices(cached);
        });

        const unsubAvocats = onSnapshot(collection(db, 'avocats'), (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Avocat[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: data.id || d.id,
                    fullName: data.fullName || data.name || data.nom || 'Avocat',
                    firstOathDate: data.firstOathDate || '',
                    onaNumber: data.onaNumber || '',
                    cabinetStatus: data.cabinetStatus || 'Junior',
                    serviceStatus: data.serviceStatus || 'Actif',
                    phone: data.phone || '',
                    ...data
                });
            });
            if (list.length > 0) {
                setAvocats(list);
            } else {
                const cached = loadLocalCache<Avocat>('kbb_cache_avocats');
                if (cached.length > 0) {
                    setAvocats(cached);
                    syncLocalCollection('avocats', cached);
                } else {
                    setAvocats([]);
                }
            }
        }, (err) => {
            console.warn("Avocats subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Avocat>('kbb_cache_avocats');
            if (cached.length > 0) setAvocats(cached);
        });

        const unsubPersonnels = onSnapshot(collection(db, 'personnels'), (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Personnel[] = [];
            snap.forEach(d => list.push(d.data() as Personnel));
            if (list.length > 0) {
                setPersonnels(list);
            } else {
                const cached = loadLocalCache<Personnel>('kbb_cache_personnels');
                if (cached.length > 0) {
                    setPersonnels(cached);
                    syncLocalCollection('personnels', cached);
                } else {
                    setPersonnels([]);
                }
            }
        }, (err) => {
            console.warn("Personnels subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Personnel>('kbb_cache_personnels');
            if (cached.length > 0) setPersonnels(cached);
        });

        const unsubFournisseurs = onSnapshot(collection(db, 'fournisseurs'), (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Fournisseur[] = [];
            snap.forEach(d => list.push(d.data() as Fournisseur));
            if (list.length > 0) {
                setFournisseurs(list);
            } else {
                const cached = loadLocalCache<Fournisseur>('kbb_cache_fournisseurs');
                if (cached.length > 0) {
                    setFournisseurs(cached);
                    syncLocalCollection('fournisseurs', cached);
                } else {
                    setFournisseurs([]);
                }
            }
        }, (err) => {
            console.warn("Fournisseurs subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Fournisseur>('kbb_cache_fournisseurs');
            if (cached.length > 0) setFournisseurs(cached);
        });

        // Targeted query for latest 40 audit logs to optimize bandwidth and Firestore read quota
        const logsQuery = query(collection(db, 'auditLogs'), limit(40));
        const unsubLogs = onSnapshot(logsQuery, (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: AuditLog[] = [];
            snap.forEach(d => list.push(d.data() as AuditLog));
            list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            if (list.length > 0) {
                setLogs(list);
            } else {
                const cached = loadLocalCache<AuditLog>('kbb_cache_auditLogs');
                if (cached.length > 0) {
                    setLogs(cached);
                    syncLocalCollection('auditLogs', cached);
                } else {
                    setLogs([]);
                }
            }
        }, (err) => {
            console.warn("AuditLogs subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<AuditLog>('kbb_cache_auditLogs');
            if (cached.length > 0) setLogs(cached);
        });

        // Targeted query for latest 250 correspondances to optimize bandwidth
        const correspondancesQuery = query(collection(db, 'correspondances'), limit(250));
        const unsubCorrespondances = onSnapshot(correspondancesQuery, (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const list: Correspondance[] = [];
            snap.forEach(d => list.push(d.data() as Correspondance));
            list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            if (list.length > 0) {
                setCorrespondances(list);
            } else {
                const cached = loadLocalCache<Correspondance>('kbb_cache_correspondances');
                if (cached.length > 0) {
                    setCorrespondances(cached);
                    syncLocalCollection('correspondances', cached);
                } else {
                    setCorrespondances([]);
                }
            }
        }, (err) => {
            console.warn("Correspondances subscription notice (Quota/Offline):", err?.message);
            const cached = loadLocalCache<Correspondance>('kbb_cache_correspondances');
            if (cached.length > 0) setCorrespondances(cached);
        });

        // Targeted query for top 100 presence states
        const presencesQuery = query(collection(db, 'presences'), limit(100));
        const unsubPresences = onSnapshot(presencesQuery, (snap) => {
            if (snap.metadata.hasPendingWrites) return;
            const map: { [email: string]: any } = {};
            snap.forEach((docSnap) => {
                map[docSnap.id] = docSnap.data();
            });
            setPresences(map);
        }, (err) => {
            console.warn("Presences subscription notice (Quota/Offline):", err?.message);
        });

        setIsSyncComplete(true);

        return () => {
            unsubClients();
            unsubCases();
            unsubEvents();
            unsubTasks();
            unsubInvoices();
            unsubAvocats();
            unsubPersonnels();
            unsubFournisseurs();
            unsubLogs();
            unsubCorrespondances();
            unsubPresences();
        };
    }, [isDbConnected, isAuthenticated]);

    // Task reminder observer and notification checker loops
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        const interval = setInterval(() => {
            if (activeAlarmTask) return; // Wait until current alarm is resolved to avoid spamming

            const now = new Date();
            const currentLocalDateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const currentLocalTimeString = now.toTimeString().slice(0, 5);  // HH:MM

            const pendingReminder = tasks.find(t => {
                if (!t.reminderEnabled || t.reminderTriggered || t.status === 'Effectué') {
                    return false;
                }
                
                const scheduledDate = t.reminderDate || '';
                const scheduledTime = t.reminderTime || '';

                if (!scheduledDate || !scheduledTime) return false;

                if (scheduledDate < currentLocalDateString) {
                    return true; // Missed from before
                } else if (scheduledDate === currentLocalDateString) {
                    return scheduledTime <= currentLocalTimeString; // Today, at or after the scheduled time
                }

                return false;
            });

            if (pendingReminder) {
                setActiveAlarmTask(pendingReminder);
                
                const soundType = pendingReminder.reminderSound || 'digital';
                const stopSoundFn = playAlarmSound(soundType, 0.7);
                stopActiveAlarmRef.current = stopSoundFn;

                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    try {
                        const notif = new Notification(`Rappel de Tâche: ${pendingReminder.name}`, {
                            body: `Échéance / Rendez-vous à ${pendingReminder.reminderTime || 'l\'instant'}\nResponsable: ${pendingReminder.lawyer}`,
                            icon: '/favicon.ico',
                            requireInteraction: true
                        });
                        
                        notif.onclick = () => {
                            window.focus();
                            notif.close();
                        };
                    } catch (err) {
                        console.warn("Failed standard notifications call:", err);
                    }
                }
            }
        }, 4000); // Check every 4 seconds

        return () => clearInterval(interval);
    }, [tasks, activeAlarmTask]);

    const handleDismissAlarm = async () => {
        if (!activeAlarmTask) return;
        if (stopActiveAlarmRef.current) {
            stopActiveAlarmRef.current();
        }
        stopAllAlarmSounds();

        const updated = {
            ...activeAlarmTask,
            reminderTriggered: true
        };

        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        try {
            const { id, ...cleanTask } = updated;
            await dbUpdateDoc('tasks', id, cleanTask);
        } catch (err) {
            console.error("Failed to dismiss alarm in DB:", err);
        }
        setActiveAlarmTask(null);
        triggerToast('success', "Rappel acquitté avec succès.");
    };

    const handleSnoozeAlarm = async () => {
        if (!activeAlarmTask) return;
        if (stopActiveAlarmRef.current) {
            stopActiveAlarmRef.current();
        }
        stopAllAlarmSounds();

        // Snooze for 5 minutes
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        const snoozedDate = now.toISOString().split('T')[0];
        const snoozedTime = now.toTimeString().slice(0, 5);

        const updated = {
            ...activeAlarmTask,
            reminderDate: snoozedDate,
            reminderTime: snoozedTime,
            reminderTriggered: false
        };

        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        try {
            const { id, ...cleanTask } = updated;
            await dbUpdateDoc('tasks', id, cleanTask);
        } catch (err) {
            console.error("Failed to snooze alarm in DB:", err);
        }
        setActiveAlarmTask(null);
        triggerToast('success', `Régler à nouveau pour dans 5 min (${snoozedTime})`);
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        try {
            const { id, ...cleanTask } = updatedTask;
            await dbUpdateDoc('tasks', id, cleanTask);
            triggerToast('success', `Tâche "${updatedTask.name}" mise à jour !`);
        } catch (err) {
            triggerToast('error', "Échec de modification de la tâche.");
        }
    };



    // Manage user presence status in Firestore
    useEffect(() => {
        if (!isAuthenticated || !currentUserInfo || !isDbConnected || !currentUserInfo.email) return;

        const email = (currentUserInfo.email || '').trim().toLowerCase();
        if (!email) return;
        const docRef = doc(db, 'presences', email);

        const setOnline = async () => {
            try {
                await setDoc(docRef, {
                    email,
                    name: currentUserInfo.name || 'Utilisateur',
                    role: currentUserInfo.role || 'Membre',
                    status: 'online',
                    lastActive: new Date().toISOString()
                });
            } catch (err) {
                console.error("Error setting presence to online:", err);
            }
        };

        setOnline();

        return () => {
            setDoc(docRef, {
                email,
                name: currentUserInfo.name || 'Utilisateur',
                role: currentUserInfo.role || 'Membre',
                status: 'offline',
                lastActive: new Date().toISOString()
            }).catch(err => console.error("Error setting presence to offline on unmount:", err));
        };
    }, [isAuthenticated, currentUserInfo, isDbConnected]);

    const lawyerNames = avocats.map((a) => a.fullName);

    const handleLoginSuccess = (email: string) => {
        setIsAuthenticated(true);
        const cleanEmail = (email || '').trim().toLowerCase();
        
        // Reset forceLogout flag and mark online in Firestore for this user
        const userInDb = usersList.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
        if (userInDb) {
            updateAppUser(userInDb.id, {
                isOnline: true,
                forceLogout: false,
                lastActiveAt: new Date().toISOString()
            }).catch(() => {});
        }

        // Search in avocats
        const foundAvocat = avocats.find(a => 
            a.emails && a.emails.some(e => (e || '').trim().toLowerCase() === cleanEmail)
        );
        if (foundAvocat) {
            const userInfo = {
                name: foundAvocat.fullName,
                role: foundAvocat.cabinetRole || foundAvocat.cabinetStatus || "Avocat",
                email: cleanEmail,
                photoUrl: foundAvocat.photoUrl || ''
            };
            setCurrentUserInfo(userInfo);
            triggerToast('success', `Ravi de vous revoir, Maître ${foundAvocat.fullName} !`);
            dbCreateAuditLog({
                userEmail: userInfo.email,
                userName: userInfo.name,
                actionType: 'Connexion',
                module: 'Authentification',
                description: `Connexion de Maître ${userInfo.name} (${userInfo.role})`
            });
            return;
        }

        // Search in personnels
        const foundPersonnel = personnels.find(p => 
            p.email && (p.email || '').trim().toLowerCase() === cleanEmail
        );
        if (foundPersonnel) {
            const userInfo = {
                name: foundPersonnel.fullName,
                role: foundPersonnel.role,
                email: cleanEmail,
                photoUrl: foundPersonnel.photoUrl || ''
            };
            setCurrentUserInfo(userInfo);
            triggerToast('success', `Ravi de vous revoir, ${foundPersonnel.fullName} !`);
            dbCreateAuditLog({
                userEmail: userInfo.email,
                userName: userInfo.name,
                actionType: 'Connexion',
                module: 'Authentification',
                description: `Connexion de ${userInfo.name} (${userInfo.role})`
            });
            return;
        }

        // Default admin account
        const adminName = cleanEmail === 'jeremieshusu4@gmail.com' 
            ? "Jérémie Shusu" 
            : cleanEmail === 'hervemich@icloud.com' 
                ? "Herve Mich" 
                : "Administrateur Cabinet";
        const foundInUsers = usersList.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
        const adminInfo = {
            name: foundInUsers?.fullName || adminName,
            role: "Directeur Associé KBB",
            email: cleanEmail,
            photoUrl: foundInUsers?.photoUrl || ''
        };
        setCurrentUserInfo(adminInfo);
        triggerToast('success', `Connexion de l'administrateur ${adminName} réussie !`);
        dbCreateAuditLog({
            userEmail: adminInfo.email,
            userName: adminInfo.name,
            actionType: 'Connexion',
            module: 'Authentification',
            description: `Connexion de l'administrateur du cabinet (${adminInfo.name})`
        });
    };

    const handleLogout = () => {
        if (currentUserInfo && currentUserInfo.email) {
            dbCreateAuditLog({
                userEmail: currentUserInfo.email,
                userName: currentUserInfo.name,
                actionType: 'Autre',
                module: 'Authentification',
                description: `Déconnexion de ${currentUserInfo.name}`
            });
            // Mark user status as offline in Firestore
            const email = (currentUserInfo.email || '').trim().toLowerCase();
            if (email) {
                setDoc(doc(db, 'presences', email), {
                    email,
                    name: currentUserInfo.name,
                    role: currentUserInfo.role,
                    status: 'offline',
                    lastActive: new Date().toISOString()
                }).catch(err => console.error("Error setting offline presence on logout:", err));
            }
        }
        setIsAuthenticated(false);
        setCurrentUserInfo(null);
        setCurrentPage('Dashboard');
    };

    const logActivity = async (
        actionType: 'Ajout' | 'Modification' | 'Suppression' | 'Connexion' | 'Autre',
        module: string,
        description: string,
        details?: any
    ) => {
        const userEmail = currentUserInfo?.email || auth.currentUser?.email || 'anonyme@kbb.cd';
        const userName = currentUserInfo?.name || 'Utilisateur Anonyme';
        try {
            await dbCreateAuditLog({
                userEmail,
                userName,
                actionType,
                module,
                description,
                details: details ? JSON.parse(JSON.stringify(details)) : null
            });
        } catch (e) {
            console.error("Failed to log activity:", e);
        }
    };
    
    // --- PDF Export Logic ---
    const handleExportPDF = (title: string, headers: string[], data: any[][]) => {
        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`${title} - KBB App`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

        (doc as any).autoTable({
            head: [headers],
            body: data,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [21, 68, 124] },
        });

        const safeTitle = title.toLowerCase().replace(/\s+/g, '-');
        doc.save(`liste-${safeTitle}-kbb-app.pdf`);
    };

    const handleExportClients = () => {
        const headers = ["Nom du Client", "Contact Principal", "Dossiers Actifs"];
        const data = clients.map((c) => [c.name, c.contact, c.cases]);
        handleExportPDF("Clients", headers, data);
    };

    const handleExportCases = () => {
        const headers = ["Référence", "Nom du Dossier", "Client", "Statut"];
        const data = cases.map((c) => [c.id, c.name, c.client, c.status]);
        handleExportPDF("Dossiers", headers, data);
    };

    const handleExportBackup = () => {
        try {
            const backupData = {
                backupDate: new Date().toISOString(),
                clients,
                cases,
                events,
                tasks,
                invoices,
                avocats,
                personnels,
                fournisseurs,
                logs
            };
            
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `kbb_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            logActivity('Autre', 'Gestion', 'Exportation complète de la base de données (Sauvegarde JSON)');
            triggerToast('success', "Sauvegarde de la base de données exportée avec succès !");
        } catch (error) {
            console.error("Backup export error:", error);
            triggerToast('error', "Échec de l'exportation de la sauvegarde.");
        }
    };

    // --- Secured Firestore + Live Toast CRUD Handlers ---
    const handleAddClient = async (newClient: Omit<Client, 'id'> & { id?: string | number }) => {
        const nextId = newClient.id || (clients.length > 0 ? Math.max(...clients.map(c => typeof c.id === 'number' ? c.id : 0)) : 0) + 1;
        const { id, ...cleanClient } = newClient;
        const record = { ...cleanClient, id: nextId };
        setClients(prev => [...prev, record]);
        try {
            await dbCreateDoc('clients', nextId, cleanClient);
            triggerToast('success', `Client "${newClient.name}" créé avec succès !`);
            logActivity('Ajout', 'Clients', `Création du client "${newClient.name}" (ID: ${nextId})`, cleanClient);
        } catch (err) {
            triggerToast('error', `Échec de l'enregistrement du client "${newClient.name}".`);
        }
    };

    const handleAddCase = async (newCase: Case, tasksToAdd?: Omit<Task, 'id'>[]) => {
        setCases(prev => [...prev, newCase]);
        try {
            const { id, ...cleanCase } = newCase;
            await dbCreateDoc('cases', id, cleanCase);
            logActivity('Ajout', 'Dossiers', `Création du dossier "${newCase.name}" pour le client "${newCase.client}" (Réf: ${id})`, cleanCase);
            
            if (tasksToAdd && tasksToAdd.length > 0) {
                let currentMaxId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0;
                for (const t of tasksToAdd) {
                    currentMaxId++;
                    const taskProps = { ...t, id: currentMaxId };
                    setTasks(prev => [...prev, taskProps]);
                    const { id: _, ...cleanTask } = taskProps;
                    await dbCreateDoc('tasks', currentMaxId, cleanTask);
                    logActivity('Ajout', 'Tâches', `Création automatique de la tâche "${t.name}" pour le dossier "${newCase.name}"`, cleanTask);
                }
            }
            triggerToast('success', `Dossier "${newCase.name}" et tâches complémentaires enregistrés !`);
        } catch (err) {
            triggerToast('error', `Échec de l'écriture du dossier "${newCase.name}".`);
        }
    };

    const handleAddEvent = async (newEvent: Event) => {
        setEvents(prev => [...prev, newEvent]);
        try {
            const { id, ...cleanEvent } = newEvent;
            await dbCreateDoc('events', id, cleanEvent);
            triggerToast('success', `Événement "${newEvent.name}" planifié avec succès !`);
            logActivity('Ajout', 'Agenda', `Planification de l'événement "${newEvent.name}" à "${newEvent.lieu}"`, cleanEvent);
        } catch (err) {
            triggerToast('error', "Échec de l'enregistrement de l'événement.");
        }
    };

    const handleUpdateEvent = async (updatedEvent: Event) => {
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        try {
            const { id, ...cleanEvent } = updatedEvent;
            await dbUpdateDoc('events', id, cleanEvent);
            triggerToast('success', `Événement "${updatedEvent.name}" mis à jour !`);
            logActivity('Modification', 'Agenda', `Mise à jour de l'événement "${updatedEvent.name}"`, cleanEvent);
        } catch (err) {
            triggerToast('error', "Échec de la mise à jour de l'événement.");
        }
    };

    const handleAddTask = async (newTask: Omit<Task, 'id'>) => {
        const nextId = (tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0) + 1;
        const record = { ...newTask, id: nextId };
        setTasks(prev => [...prev, record]);
        try {
            await dbCreateDoc('tasks', nextId, newTask);
            triggerToast('success', `Tâche "${newTask.name}" programmée avec succès.`);
            logActivity('Ajout', 'Tâches', `Programmation de la tâche "${newTask.name}" pour ${newTask.lawyer}`, newTask);
        } catch (err) {
            triggerToast('error', "Impossible d'enregistrer la tâche.");
        }
    };

    const handleUpdateTaskStatus = async (id: number, status: 'Effectué' | 'Non effectué' | 'Effectué à moitié') => {
        const task = tasks.find(t => t.id === id);
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        try {
            await dbUpdateDoc('tasks', id, { status });
            triggerToast('success', `Statut de la tâche mis à jour !`);
            logActivity('Modification', 'Tâches', `Mise à jour du statut de la tâche "${task?.name || id}" à "${status}"`);
        } catch (err) {
            triggerToast('error', "Échec de modification de la tâche.");
        }
    };

    const handleAddInvoice = async (newInvoice: Invoice) => {
        setInvoices(prev => [...prev, newInvoice]);
        try {
            const { id, ...cleanInvoice } = newInvoice;
            await dbCreateDoc('invoices', id, cleanInvoice);
            triggerToast('success', `Facture "${newInvoice.id}" émise avec succès !`);
            logActivity('Ajout', 'Facturation', `Émission de la facture "${newInvoice.id}" de ${newInvoice.totalAmount}€ pour le dossier "${newInvoice.caseId}"`, cleanInvoice);
        } catch (err) {
            triggerToast('error', "Échec de l'émission de la facture.");
        }
    };

    const handleAddAvocat = async (newAvocat: Avocat, password?: string) => {
        if (!newAvocat.emails || !newAvocat.emails[0] || !password) {
            triggerToast('error', "L'adresse e-mail principale et le mot de passe sont requis pour enregistrer un avocat.");
            return;
        }

        try {
            const email = newAvocat.emails[0];
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            console.log("Successfully created user auth account for Lawyer:", userCredential.user.uid);
            await signOut(secondaryAuth);
        } catch (authError: any) {
            if (authError?.code === 'auth/email-already-in-use' || authError?.message?.includes('email-already-in-use')) {
                console.log("Firebase Auth account already exists for lawyer:", newAvocat.emails[0]);
                triggerToast('info', `Compte d'authentification existant réutilisé pour ${newAvocat.emails[0]}.`);
            } else {
                console.error("Auth registration error:", authError);
                triggerToast('error', `Échec d'authentification: ${authError.message || authError}`);
                return;
            }
        }

        setAvocats(prev => [...prev, newAvocat]);
        try {
            const { id, ...cleanAvocat } = newAvocat;
            const payload = { ...cleanAvocat, photo: null };
            await dbCreateDoc('avocats', id, payload);
            triggerToast('success', `Profil de l'avocat ${newAvocat.fullName} créé !`);
            logActivity('Ajout', 'Collaborateurs', `Création du profil de l'avocat ${newAvocat.fullName} (${newAvocat.cabinetStatus})`, payload);
        } catch (err) {
            triggerToast('error', "Erreur d'enregistrement de l'avocat.");
        }
    };

    const handleAddPersonnel = async (newPersonnel: Personnel, password?: string) => {
        const rolesWithAuth = ['Secrétaire', 'Stagiaire', 'Assistant juridique', 'Assistant de direction'];
        const requiresAuth = rolesWithAuth.includes(newPersonnel.role);

        if (requiresAuth) {
            if (!newPersonnel.email || !password) {
                triggerToast('error', `L'adresse e-mail et le mot de passe sont requis pour le rôle de ${newPersonnel.role}.`);
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newPersonnel.email, password);
                console.log("Successfully created user auth account for Personnel:", userCredential.user.uid);
                await signOut(secondaryAuth);
            } catch (authError: any) {
                if (authError?.code === 'auth/email-already-in-use' || authError?.message?.includes('email-already-in-use')) {
                    console.log("Firebase Auth account already exists for personnel:", newPersonnel.email);
                    triggerToast('info', `Compte d'authentification existant réutilisé pour ${newPersonnel.email}.`);
                } else {
                    console.error("Auth registration error for personnel:", authError);
                    triggerToast('error', `Échec d'authentification: ${authError.message || authError}`);
                    return;
                }
            }
        }

        setPersonnels(prev => [...prev, newPersonnel]);
        try {
            const { id, ...cleanPersonnel } = newPersonnel;
            await dbCreateDoc('personnels', id, cleanPersonnel);
            triggerToast('success', `Agent administratif "${newPersonnel.fullName}" enregistré !`);
            logActivity('Ajout', 'Personnel', `Création de la fiche de l'agent administratif "${newPersonnel.fullName}" (${newPersonnel.role})`, cleanPersonnel);
        } catch (err) {
            triggerToast('error', "Erreur lors de l'inscription du membre du personnel.");
        }
    };

    const handleAddFournisseur = async (newFournisseur: Fournisseur) => {
        setFournisseurs(prev => [...prev, newFournisseur]);
        try {
            const { id, ...cleanFournisseur } = newFournisseur;
            await dbCreateDoc('fournisseurs', id, cleanFournisseur);
            triggerToast('success', `Fournisseur "${newFournisseur.nomComplet}" validé !`);
            logActivity('Ajout', 'Fournisseurs', `Création de la fiche du fournisseur "${newFournisseur.nomComplet}"`, cleanFournisseur);
        } catch (err) {
            triggerToast('error', "Échec de l'enregistrement du fournisseur.");
        }
    };

    const executeDeleteClient = async (id: number) => {
        const client = clients.find(c => c.id === id);
        setClients(clients.filter(c => c.id !== id));
        try {
            await dbDeleteDoc('clients', id);
            triggerToast('success', `Client "${client?.name || id}" révoqué !`);
            logActivity('Suppression', 'Clients', `Suppression définitive du client "${client?.name || id}" (ID: ${id})`);
        } catch (err) {
            triggerToast('error', "Échec de la suppression du client.");
        }
    };

    const handleDeleteClient = (id: number) => {
        const client = clients.find(c => c.id === id);
        const name = client?.name || `ID ${id}`;
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer ce client ?',
            message: `Êtes-vous sûr de vouloir supprimer définitivement le client "${name}" ? Cette action supprimera tous ses enregistrements et est irréversible.`,
            onConfirm: () => executeDeleteClient(id)
        });
    };

    const executeDeleteCase = async (id: string) => {
        const d = cases.find(c => c.id === id);
        setCases(cases.filter(c => c.id !== id));
        try {
            await dbDeleteDoc('cases', id);
            triggerToast('success', `Dossier "${d?.name || id}" archivé !`);
            logActivity('Suppression', 'Dossiers', `Archivage / Suppression du dossier "${d?.name || id}" (Réf: ${id})`);
        } catch (err) {
            triggerToast('error', "Impossible d'archiver le dossier.");
        }
    };

    const handleDeleteCase = (id: string) => {
        const c = cases.find(item => item.id === id);
        const name = c?.name || id;
        setConfirmModal({
            isOpen: true,
            title: 'Archiver ce dossier ?',
            message: `Voulez-vous vraiment ranger ou archiver définitivement le dossier "${name}" ?`,
            onConfirm: () => executeDeleteCase(id)
        });
    };

    const executeDeleteAvocat = async (id: string) => {
        const a = avocats.find(x => x.id === id);
        setAvocats(avocats.filter(a => a.id !== id));
        try {
            await dbDeleteDoc('avocats', id);
            triggerToast('success', `Départ de l'avocat "${a?.fullName || id}" acté !`);
            logActivity('Suppression', 'Collaborateurs', `Suppression du profil de l'avocat ${a?.fullName || id}`);
        } catch (err) {
            triggerToast('error', "Échec de la désinscription de l'avocat.");
        }
    };

    const handleDeleteAvocat = (id: string) => {
        const avocat = avocats.find(item => item.id === id);
        const name = avocat?.fullName || id;
        setConfirmModal({
            isOpen: true,
            title: "Retirer l'avocat du cabinet ?",
            message: `Êtes-vous sûr de vouloir révoquer l'accès et supprimer la fiche de l'avocat "${name}" ?`,
            onConfirm: () => executeDeleteAvocat(id)
        });
    };

    const executeDeletePersonnel = async (id: string) => {
        const p = personnels.find(x => x.id === id);
        setPersonnels(personnels.filter(p => p.id !== id));
        try {
            await dbDeleteDoc('personnels', id);
            triggerToast('success', `Agent administratif "${p?.fullName || id}" retiré !`);
            logActivity('Suppression', 'Personnel', `Suppression de la fiche de l'agent administratif "${p?.fullName || id}"`);
        } catch (err) {
            triggerToast('error', "Échec de suppression de l'agent.");
        }
    };

    const handleDeletePersonnel = (id: string) => {
        const person = personnels.find(item => item.id === id);
        const name = person?.fullName || id;
        setConfirmModal({
            isOpen: true,
            title: "Retirer l'agent administratif ?",
            message: `Voulez-vous vraiment retirer l'agent administratif "${name}" du registre ?`,
            onConfirm: () => executeDeletePersonnel(id)
        });
    };

    const executeDeleteFournisseur = async (id: string) => {
        const f = fournisseurs.find(x => x.id === id);
        setFournisseurs(fournisseurs.filter(f => f.id !== id));
        try {
            await dbDeleteDoc('fournisseurs', id);
            triggerToast('success', `Fournisseur "${f?.nomComplet || id}" retiré avec succès.`);
            logActivity('Suppression', 'Fournisseurs', `Suppression définitive du fournisseur "${f?.nomComplet || id}"`);
        } catch (err) {
            triggerToast('error', "Échec de retrait du fournisseur.");
        }
    };

    const handleDeleteFournisseur = (id: string) => {
        const f = fournisseurs.find(item => item.id === id);
        const name = f?.nomComplet || id;
        setConfirmModal({
            isOpen: true,
            title: "Supprimer le fournisseur ?",
            message: `Voulez-vous rompre la fiche et supprimer le fournisseur "${name}" ?`,
            onConfirm: () => executeDeleteFournisseur(id)
        });
    };

    const executeDeleteEvent = async (id: string) => {
        const ev = events.find(e => e.id === id);
        setEvents(events.filter(e => e.id !== id));
        try {
            await dbDeleteDoc('events', id);
            triggerToast('success', `Événement "${ev?.name || id}" déprogrammé.`);
            logActivity('Suppression', 'Agenda', `Annulation de l'événement "${ev?.name || id}"`);
        } catch (err) {
            triggerToast('error', "Échec d'annulation de l'événement.");
        }
    };

    const handleDeleteEvent = (id: string) => {
        const ev = events.find(item => item.id === id);
        const name = ev?.name || id;
        setConfirmModal({
            isOpen: true,
            title: "Déprogrammer l'événement ?",
            message: `Souhaitez-vous vraiment déprogrammer l'événement "${name}" ?`,
            onConfirm: () => executeDeleteEvent(id)
        });
    };

    const executeDeleteTask = async (id: number) => {
        const t = tasks.find(x => x.id === id);
        setTasks(tasks.filter(t => t.id !== id));
        try {
            await dbDeleteDoc('tasks', id);
            triggerToast('success', `Tâche "${t?.name || id}" supprimée.`);
        } catch (err) {
            triggerToast('error', "Échec d'annulation de la tâche.");
        }
    };

    const handleDeleteTask = (id: number) => {
        const t = tasks.find(item => item.id === id);
        const name = t?.name || `ID ${id}`;
        setConfirmModal({
            isOpen: true,
            title: "Supprimer la tâche ?",
            message: `Voulez-vous supprimer définitivement la tâche "${name}" ?`,
            onConfirm: () => executeDeleteTask(id)
        });
    };

    const executeDeleteInvoice = async (id: string) => {
        setInvoices(invoices.filter(i => i.id !== id));
        try {
            await dbDeleteDoc('invoices', id);
            triggerToast('success', `Facture "${id}" éliminée !`);
        } catch (err) {
            triggerToast('error', "Échec d'annulation de la facture.");
        }
    };

    const handleDeleteInvoice = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Supprimer la facture ?",
            message: `Voulez-vous vraiment supprimer définitivement la facture "${id}" ? Cette action est irréversible.`,
            onConfirm: () => executeDeleteInvoice(id)
        });
    };

    const handleUpdateClient = async (updated: Client) => {
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        try {
            const { id, ...properties } = updated;
            await dbUpdateDoc('clients', id, properties);
            triggerToast('success', `Données du client "${updated.name}" sauvegardées !`);
        } catch (err) {
            triggerToast('error', "Échec lors de la mise à jour.");
        }
    };

    const handleUpdateCase = async (updated: Case) => {
        setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
        try {
            const { id, ...properties } = updated;
            const clean = {
                ...properties,
                procedures: Array.isArray(updated.procedures) ? updated.procedures : []
            };
            await dbUpdateDoc('cases', id, clean);
            triggerToast('success', `Modifications du dossier "${updated.name}" validées !`);
        } catch (err) {
            triggerToast('error', "Erreur lors de la mise à jour.");
        }
    };

    const handleUpdateAvocat = async (updated: Avocat) => {
        setAvocats(prev => prev.map(a => a.id === updated.id ? updated : a));
        try {
            const { id, ...properties } = updated;
            const clean = { ...properties, photo: null };
            await dbUpdateDoc('avocats', id, clean);
            triggerToast('success', `Profil de l'avocat "${updated.fullName}" ajusté !`);
        } catch (err) {
            triggerToast('error', "Échec de restructuration de la fiche.");
        }
    };

    const handleUpdatePersonnel = async (updated: Personnel) => {
        setPersonnels(prev => prev.map(p => p.id === updated.id ? updated : p));
        try {
            const { id, ...properties } = updated;
            await dbUpdateDoc('personnels', id, properties);
            triggerToast('success', `Modification de l'agent "${updated.fullName}" enregistrée !`);
        } catch (err) {
            triggerToast('error', "Impossible d'appliquer la correction.");
        }
    };

    const handleUpdateInvoice = async (updated: Invoice) => {
        setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
        try {
            const { id, ...properties } = updated;
            await dbUpdateDoc('invoices', id, properties);
            triggerToast('success', `Données de la facture "${updated.id}" sauvegardées !`);
        } catch (err) {
            triggerToast('error', "Échec lors de la mise à jour de la facture.");
        }
    };

    const handleUpdateFournisseur = async (updated: Fournisseur) => {
        setFournisseurs(prev => prev.map(f => f.id === updated.id ? updated : f));
        try {
            const { id, ...properties } = updated;
            await dbUpdateDoc('fournisseurs', id, properties);
            triggerToast('success', `Données du fournisseur "${updated.nomComplet}" sauvegardées !`);
        } catch (err) {
            triggerToast('error', "Échec lors de la mise à jour du fournisseur.");
        }
    };

    const filteredClients = clients.filter(c => 
        (c.name || (c as any).nom || (c as any).clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.contact || (c as any).phone || (c as any).email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCases = cases.filter(c => 
        String(c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.name || (c as any).nom || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.client || (c as any).clientName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEvents = events.filter(e => 
        (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (e.type || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (e.lieu || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAssocietOrAdmin = () => {
        const roleObj = currentUserObj?.role?.toLowerCase() || '';
        const roleInfo = currentUserInfo?.role?.toLowerCase() || '';
        const combined = `${roleObj} ${roleInfo}`;
        return combined.includes('admin') || combined.includes('directeur') || combined.includes('associé') || combined.includes('partner') || combined.includes('associet') || currentUserObj?.role === 'Admin';
    };

    const renderPage = () => {
        const pageProps = {
            clients: filteredClients, 
            cases: filteredCases, 
            events: filteredEvents, 
            tasks, invoices, avocats, lawyerNames, personnels, fournisseurs,
            onAddClient: handleAddClient, onAddCase: handleAddCase, onAddEvent: handleAddEvent,
            onAddTask: handleAddTask, onAddInvoice: handleAddInvoice, onAddAvocat: handleAddAvocat, onAddPersonnel: handleAddPersonnel, onAddFournisseur: handleAddFournisseur,
            onDeleteClient: handleDeleteClient, onDeleteCase: handleDeleteCase, onDeleteAvocat: handleDeleteAvocat, onDeletePersonnel: handleDeletePersonnel, onDeleteFournisseur: handleDeleteFournisseur,
            onDeleteEvent: handleDeleteEvent, onDeleteTask: handleDeleteTask, onDeleteInvoice: handleDeleteInvoice,
            onExportClients: handleExportClients, onExportCases: handleExportCases,
            onUpdateClient: handleUpdateClient, onUpdateCase: handleUpdateCase, onUpdateAvocat: handleUpdateAvocat, onUpdatePersonnel: handleUpdatePersonnel, onUpdateEvent: handleUpdateEvent, onUpdateTask: handleUpdateTask, onUpdateInvoice: handleUpdateInvoice, onUpdateFournisseur: handleUpdateFournisseur,
            onSendEmail: triggerEmail,
            onExportBackup: handleExportBackup,
        };

        switch (currentPage) {
            case 'Dashboard': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="dashboard"><DashboardPage clients={filteredClients} cases={filteredCases} events={filteredEvents} tasks={tasks} invoices={invoices} avocats={avocats} onUpdateTaskStatus={handleUpdateTaskStatus} onAddTask={handleAddTask} onNavigate={(page, query) => { setCurrentPage(page); if (query) setSearchQuery(query); }} /></ProtectedGuard>;
            case 'AIAssistant': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="ai"><AIAssistantPage clients={filteredClients} cases={filteredCases} tasks={tasks} invoices={invoices} /></ProtectedGuard>;
            case 'Clients': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="clients"><ClientsPage clients={filteredClients} cases={cases} invoices={invoices} tasks={tasks} onAddClient={handleAddClient} onExport={handleExportClients} onSendEmail={triggerEmail} /></ProtectedGuard>;
            case 'Dossiers': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="cases"><CasesPage cases={filteredCases} clients={filteredClients} tasks={tasks} invoices={invoices} onAddCase={handleAddCase} onExport={handleExportCases} avocats={avocats} onSendEmail={triggerEmail} onNavigate={(page, query) => { setCurrentPage(page); if (query) setSearchQuery(query); }} /></ProtectedGuard>;
            case 'Procedures': 
            case 'Procédures':
            case 'Procedure':
                return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="procedures"><ProceduresPage cases={cases} onUpdateCase={handleUpdateCase} searchQuery={searchQuery} setSearchQuery={setSearchQuery} /></ProtectedGuard>;
            case 'Evenements': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="events"><EventsPage events={filteredEvents} onAddEvent={handleAddEvent} onUpdateEvent={handleUpdateEvent} avocats={avocats} personnels={personnels} onSendEmail={triggerEmail} /></ProtectedGuard>;
            case 'Agenda': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="agenda"><AgendaPage tasks={tasks} cases={filteredCases} lawyers={lawyerNames} avocats={avocats} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} events={filteredEvents} onSendEmail={triggerEmail} /></ProtectedGuard>;
            case 'Chat': return (
                <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="chat">
                    <ChatPage 
                        avocats={avocats}
                        personnels={personnels}
                        currentUserInfo={currentUserInfo}
                        presences={presences}
                    />
                </ProtectedGuard>
            );
            case 'Correspondance': return (
                <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="correspondance">
                    <CorrespondancePage 
                        clients={filteredClients} 
                        cases={filteredCases} 
                        avocats={avocats} 
                        onSendEmail={triggerEmail} 
                        currentUserInfo={currentUserInfo} 
                    />
                </ProtectedGuard>
            );
            case 'Facturation': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="billing"><BillingPage invoices={invoices} cases={filteredCases} currentUserInfo={currentUserInfo} onAddInvoice={handleAddInvoice} onSendEmail={triggerEmail} clients={clients} /></ProtectedGuard>;
            case 'Avocats': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="avocats"><AvocatsPage avocats={avocats} tasks={tasks} onAddAvocat={handleAddAvocat} onDeleteAvocat={handleDeleteAvocat} onSendEmail={triggerEmail} correspondances={correspondances} currentUserInfo={currentUserInfo} /></ProtectedGuard>;
            case 'Personnels': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="personnels"><PersonnelsPage personnels={personnels} onAddPersonnel={handleAddPersonnel} onDeletePersonnel={handleDeletePersonnel} onSendEmail={triggerEmail} /></ProtectedGuard>;
            case 'Fournisseurs': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="suppliers"><FournisseursPage fournisseurs={fournisseurs} onAddFournisseur={handleAddFournisseur} onDeleteFournisseur={handleDeleteFournisseur} onSendEmail={triggerEmail} /></ProtectedGuard>;
            case 'Gestion': return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="gestion_cabinet"><GestionPage {...pageProps} currentUser={currentUserObj} onSendEmail={triggerEmail} onAddToast={triggerToast} /></ProtectedGuard>;
            case 'AuditLogs':
            case 'Audit':
            case 'audit':
            case 'journal_audit':
            case 'JournalAudit':
            case "Journal d'audit":
            case "Journal d'Audit":
                return <ProtectedGuard user={currentUserObj} currentUserInfo={currentUserInfo} moduleKey="audit"><AuditLogsPage logs={logs || []} currentUser={currentUserObj} onAddToast={triggerToast} /></ProtectedGuard>;
            case 'All': return <AllInterfacesPage {...pageProps} />;
            default: return <DashboardPage clients={filteredClients} cases={filteredCases} events={filteredEvents} tasks={tasks} invoices={invoices} avocats={avocats} personnels={personnels} onUpdateTaskStatus={handleUpdateTaskStatus} onAddTask={handleAddTask} onNavigate={(page, query) => { setCurrentPage(page); if (query) setSearchQuery(query); }} />;
        }
    };

    if (isInitialLoading) {
        return <LoadingSpinner fullScreen message="Initialisation de KBB App..." />;
    }

    if (!isAuthenticated) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-[#070b13] font-sans overflow-hidden transition-colors duration-300">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} currentUserInfo={currentUserInfo} currentUser={currentUserObj} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header 
                    searchQuery={searchQuery} 
                    setSearchQuery={setSearchQuery} 
                    clients={clients} 
                    cases={cases} 
                    events={events} 
                    setCurrentPage={setCurrentPage} 
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    currentUserInfo={currentUserInfo}
                    onLogout={handleLogout}
                    onOpenProfileModal={() => setIsProfileModalOpen(true)}
                    onMenuToggle={() => setIsSidebarOpen(true)}
                    isDbConnected={isDbConnected}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
                    {renderPage()}
                </main>
            </div>

            {/* Micro-Interaction Toast Notifications Overlay */}
            <div className="fixed bottom-5 right-5 space-y-3 z-50 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => {
                        const isSync = toast.text.includes("Synchronisation");
                        const isDeleted = toast.text.includes("supprim") || toast.text.includes("retir") || toast.text.includes("révoqu") || toast.text.includes("élimin") || toast.text.includes("déprogramm");
                        const isUpdate = toast.text.includes("mis à jour") || toast.text.includes("sauvegard") || toast.text.includes("valid") || toast.text.includes("ajust") || toast.text.includes("modific");

                        let title = "Enregistrement réussi !";
                        if (toast.type === 'error') {
                            title = "Échec de l'opération";
                        } else if (isSync) {
                            title = "Synchronisation Firestore";
                        } else if (isDeleted) {
                            title = "Suppression réussie";
                        } else if (isUpdate) {
                            title = "Mise à jour réussie";
                        }

                        return (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.25 } }}
                                className={`p-4 rounded-2xl shadow-2xl pointer-events-auto flex items-start space-x-3 text-white max-w-sm border backdrop-blur-md ${
                                    toast.type === 'success' 
                                        ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-500 shadow-emerald-950/30'
                                        : 'bg-slate-900/95 border-rose-500/50 text-rose-500 shadow-rose-950/30'
                                }`}
                            >
                                <span className={`flex-shrink-0 text-lg flex items-center justify-center p-2 rounded-xl ${
                                    toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                    {toast.type === 'success' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                        </svg>
                                    )}
                                </span>
                                <div className="space-y-0.5">
                                    <h4 className={`text-xs font-black tracking-wide ${
                                        toast.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {title}
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-300 leading-normal">
                                        {toast.text}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Modal de Confirmation de Suppression */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer"
                        />
                        
                        {/* Modal Contenu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-white rounded-3xl border border-rose-100 shadow-2xl relative w-full max-w-md overflow-hidden z-10 p-6 flex flex-col pointer-events-auto"
                        >
                            {/* Alert Icon & Heading */}
                            <div className="flex items-start space-x-4 mb-4">
                                <span className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm animate-pulse">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-black text-slate-950 tracking-tight">
                                        {confirmModal.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                                        {confirmModal.message}
                                    </p>
                                </div>
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center justify-end space-x-2 mt-4 bg-slate-50 -mx-6 -mb-6 p-4 border-t border-slate-150">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2.5 text-xs font-black text-slate-600 rounded-xl bg-white hover:bg-slate-100 transition border border-slate-200 active:scale-95 cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        confirmModal.onConfirm();
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    }}
                                    className="px-5 py-2.5 text-xs font-black text-white rounded-xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/15 active:scale-95 transition cursor-pointer"
                                >
                                    Confirmer la suppression
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Alarm Reminder Ringing Dialog Interface */}
            <AnimatePresence>
                {activeAlarmTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-red-100 overflow-hidden text-center relative"
                        >
                            {/* Animated ring glowing stripe */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                            
                            <div className="my-6 relative flex justify-center">
                                <span className="absolute inline-flex h-20 w-20 rounded-full bg-red-100 opacity-75 animate-ping" />
                                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30">
                                    <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.967 8.967 0 015.292 3m13.416 4.5a8.967 8.967 0 00-2.168-4.5" />
                                    </svg>
                                </div>
                            </div>

                            <span className="inline-block px-3 py-1 bg-red-50 text-red-700 font-extrabold text-[10px] tracking-widest uppercase rounded-full border border-red-100">
                                Rappel de Tâche Actif
                            </span>

                            <h3 className="text-xl font-bold text-gray-900 mt-4 leading-tight">
                                {activeAlarmTask.name}
                            </h3>

                            <p className="text-xs text-slate-500 mt-2 font-semibold flex items-center justify-center gap-1">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Responsable: <span className="text-gray-800 font-bold">{activeAlarmTask.lawyer}</span>
                            </p>

                            {activeAlarmTask.notes && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-gray-150 text-left w-full">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Notes de tâche :</span>
                                    <p className="text-xs text-gray-650 italic leading-relaxed">
                                        {activeAlarmTask.notes}
                                    </p>
                                </div>
                            )}

                            {/* Alarm Actions */}
                            <div className="mt-8 grid grid-cols-2 gap-3 pb-2">
                                <button
                                    onClick={handleSnoozeAlarm}
                                    className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-extrabold text-xs py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm border border-slate-200 active:scale-95 cursor-pointer"
                                    id="btn-alarm-snooze"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Répéter (+5 min)
                                </button>
                                <button
                                    onClick={handleDismissAlarm}
                                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/15 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                    id="btn-alarm-dismiss"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    Éteindre
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            <EmailComposerModal 
                isOpen={emailConfig.isOpen}
                onClose={() => setEmailConfig(prev => ({ ...prev, isOpen: false }))}
                defaultTo={emailConfig.to}
                defaultSubject={emailConfig.subject}
                defaultBody={emailConfig.body}
                recipientName={emailConfig.recipientName}
                attachmentName={emailConfig.attachmentName}
                contacts={allContacts}
                onAddToast={triggerToast}
            />

            <UserProfileModal 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                currentUserInfo={currentUserInfo}
                currentUserObj={currentUserObj}
                usersList={usersList}
                avocats={avocats}
                personnels={personnels}
                onUpdateSuccess={(newName, newPhotoUrl) => {
                    setCurrentUserInfo(prev => prev ? { ...prev, name: newName, photoUrl: newPhotoUrl } : null);
                    setCurrentUserObj(prev => prev ? { ...prev, fullName: newName, photoUrl: newPhotoUrl } : null);
                    try {
                        const stored = sessionStorage.getItem('kbb_currentUserInfo');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            sessionStorage.setItem('kbb_currentUserInfo', JSON.stringify({ ...parsed, name: newName, photoUrl: newPhotoUrl }));
                        }
                    } catch (e) {}
                }}
                onAddToast={triggerToast}
            />
        </div>
    );
}

export default App;
