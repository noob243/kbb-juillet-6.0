import React, { FC, useState, useMemo, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { 
  Activity, 
  Trash2, 
  PlusCircle, 
  Edit, 
  LogIn, 
  Search, 
  Filter, 
  Calendar, 
  FileSpreadsheet, 
  User, 
  Clock,
  Briefcase,
  Layers,
  HelpCircle,
  Wifi,
  LogOut,
  ShieldCheck,
  Laptop,
  Radio,
  UserX,
  XCircle
} from 'lucide-react';
import { AuditLog } from '../types';
import { AppUser } from '../types/rbac';
import { syncUsersWithFirestore, updateAppUser } from '../services/userService';
import { dbCreateAuditLog } from '../lib/firestoreService';

interface AuditLogsPageProps {
  logs: AuditLog[];
  currentUser?: AppUser | null;
  onAddToast?: (type: 'success' | 'error', message: string) => void;
  onClearLogs?: () => void; // Optional if ever needed
}

const AuditLogsPage: FC<AuditLogsPageProps> = ({ logs = [], currentUser, onAddToast }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [moduleFilter, setModuleFilter] = useState<string>('all');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Limit display to 40 recent logs by default with option to load more
    const [displayLimit, setDisplayLimit] = useState<number>(40);

    // Users and active sessions state
    const [usersList, setUsersList] = useState<AppUser[]>([]);
    const [disconnectingUserId, setDisconnectingUserId] = useState<string | null>(null);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<AppUser | null>(null);

    // Subscribe to Firestore users list
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

    // Connected / Active Users list
    const connectedUsers = useMemo(() => {
        const now = Date.now();
        return usersList.filter(u => {
            if (u.isDeleted || !u.hasAppAccess || u.status !== 'Actif' || u.isOnline === false || u.forceLogout === true) {
                return false;
            }
            if (u.lastActiveAt) {
                const lastActiveTime = new Date(u.lastActiveAt).getTime();
                if (!isNaN(lastActiveTime) && (now - lastActiveTime > 150000)) {
                    return false;
                }
            }
            return true;
        });
    }, [usersList]);

    // Disconnect user handler for Admins
    const handleDisconnectUser = async (userToDisconnect: AppUser) => {
        try {
            setDisconnectingUserId(userToDisconnect.id);
            
            // Mark user offline & force logout in Firestore
            await updateAppUser(userToDisconnect.id, {
                isOnline: false,
                forceLogout: true,
                sessionRevokedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Log audit action
            await dbCreateAuditLog({
                actionType: 'Modification',
                module: 'Audit',
                description: `Session fermée à distance pour l'utilisateur ${userToDisconnect.fullName} (${userToDisconnect.email}) par l'administrateur ${currentUser?.fullName || currentUser?.email || 'Admin'}.`,
                userName: currentUser?.fullName || 'Admin',
                userEmail: currentUser?.email || 'admin@cabinet.com'
            });

            if (onAddToast) {
                onAddToast('success', `La session de ${userToDisconnect.fullName} a été déconnectée à distance avec succès.`);
            }
        } catch (err) {
            console.error("Erreur déconnexion :", err);
            if (onAddToast) {
                onAddToast('error', `Impossible de déconnecter l'utilisateur.`);
            }
        } finally {
            setDisconnectingUserId(null);
            setShowDisconnectConfirm(null);
        }
    };

    const safeLogs = Array.isArray(logs) ? logs : [];

    // Format ISO timestamp to a friendly French string
    const formatTimestamp = (isoString?: string) => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return new Intl.DateTimeFormat('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(date);
        } catch {
            return String(isoString);
        }
    };

    // Derived statistics
    const stats = useMemo(() => {
        const total = safeLogs.length;
        const additions = safeLogs.filter(l => l && l.actionType === 'Ajout').length;
        const deletions = safeLogs.filter(l => l && l.actionType === 'Suppression').length;
        const modifications = safeLogs.filter(l => l && l.actionType === 'Modification').length;
        
        // Active users set
        const uniqueUsers = new Set(safeLogs.map(l => l?.userEmail || l?.userName || 'anonyme')).size;

        return { total, additions, deletions, modifications, uniqueUsers };
    }, [safeLogs]);

    // Unique modules in existing logs for dynamic filtering
    const modules = useMemo(() => {
        const set = new Set<string>();
        safeLogs.forEach(l => {
            if (l && l.module) set.add(l.module);
        });
        return Array.from(set);
    }, [safeLogs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        const q = (searchQuery || '').toLowerCase().trim();
        return safeLogs.filter(log => {
            if (!log) return false;
            const desc = (log.description || '').toLowerCase();
            const uName = (log.userName || '').toLowerCase();
            const uEmail = (log.userEmail || '').toLowerCase();
            const mod = (log.module || '').toLowerCase();

            const matchesSearch = !q || desc.includes(q) || uName.includes(q) || uEmail.includes(q) || mod.includes(q);
            const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
            const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;

            return matchesSearch && matchesAction && matchesModule;
        }).sort((a, b) => {
            const timeA = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
            const valA = isNaN(timeA) ? 0 : timeA;
            const valB = isNaN(timeB) ? 0 : timeB;
            return valB - valA;
        });
    }, [safeLogs, searchQuery, actionFilter, moduleFilter]);

    // Handle CSV Export
    const handleExportCSV = () => {
        const headers = ["Horodatage", "Utilisateur", "Email", "Action", "Module", "Description", "Details"];
        
        const escapeCSV = (val: any) => {
            if (val === null || val === undefined) return '';
            let stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            // Escape double quotes by doubling them
            stringVal = stringVal.replace(/"/g, '""');
            return `"${stringVal}"`;
        };

        const csvRows = [headers.join(',')];

        filteredLogs.forEach(log => {
            const row = [
                escapeCSV(formatTimestamp(log.timestamp)),
                escapeCSV(log.userName),
                escapeCSV(log.userEmail),
                escapeCSV(log.actionType),
                escapeCSV(log.module),
                escapeCSV(log.description),
                escapeCSV(log.details ? JSON.stringify(log.details) : '')
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "\uFEFF" + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Icon helper for action types
    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'Ajout':
                return <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
            case 'Suppression':
                return <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
            case 'Modification':
                return <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
            case 'Connexion':
                return <LogIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
            default:
                return <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
        }
    };

    // Badge color helper
    const getActionBadgeClass = (actionType: string) => {
        switch (actionType) {
            case 'Ajout':
                return 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
            case 'Suppression':
                return 'bg-rose-50 dark:bg-rose-950/25 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
            case 'Modification':
                return 'bg-amber-50 dark:bg-amber-950/25 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
            case 'Connexion':
                return 'bg-indigo-50 dark:bg-indigo-950/25 text-indigo-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30';
            default:
                return 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300 border border-slate-100 dark:border-slate-800';
        }
    };

    return (
        <PageContainer>
            {/* Header section with page title & description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-[#15447c] dark:text-indigo-400 rounded-xl">
                            <Activity className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-50 tracking-tight">
                            Journal d'Audit
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">
                        Historique complet et traçabilité de toutes les actions effectuées dans l'application.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-[#15447c] hover:bg-[#1d5b9f] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition duration-150 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exporter au format CSV</span>
                    </button>
                </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-[#15447c] dark:text-indigo-400 rounded-xl">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Actions</p>
                        <p className="text-xl font-black text-gray-850 dark:text-slate-100 mt-0.5">{stats.total}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Ajouts</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.additions}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Edit className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Modifications</p>
                        <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.modifications}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Suppressions</p>
                        <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.deletions}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Utilisateurs Actifs</p>
                        <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.uniqueUsers}</p>
                    </div>
                </div>
            </div>

            {/* SECTION UTILISATEURS CONNECTÉS & SESSIONS ACTIVES */}
            <div className="bg-white dark:bg-[#0c111d] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                Sessions Actives & Utilisateurs Connectés
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Supervision en temps réel des accès au cabinet. Les administrateurs peuvent déconnecter les sessions à distance.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs">
                            <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                            <span>{connectedUsers.length} utilisateur(s) en ligne</span>
                        </span>
                    </div>
                </div>

                {/* RESPONSIVE CARDS GRID FOR PHONE & DESKTOP */}
                {connectedUsers.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Aucun utilisateur connecté pour le moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {connectedUsers.map((user) => {
                            const isAdmin = currentUser?.role === 'Admin' || currentUser?.email === 'jeremieshusu4@gmail.com' || currentUser?.email === 'patbonles@gmail.com';
                            const isSelf = (user.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase();
                            const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

                            return (
                                <div 
                                    key={user.id} 
                                    className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 transition space-y-3"
                                >
                                    {/* Header card info */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#15447c] to-indigo-800 text-white flex items-center justify-center font-black text-sm shadow-xs">
                                                    {initial}
                                                </div>
                                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[150px] sm:max-w-none">
                                                        {user.fullName}
                                                    </p>
                                                    {isSelf && (
                                                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase">
                                                            Vous
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`shrink-0 px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
                                            user.role === 'Admin' 
                                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900' 
                                                : user.role === 'Avocat'
                                                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </div>

                                    {/* Device & connection metadata */}
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 bg-white dark:bg-[#0c111d] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-medium flex items-center gap-1">
                                                <Laptop className="w-3 h-3" /> Mobile / Web • Kinshasa
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                                <Radio className="w-3 h-3 animate-pulse text-emerald-500" /> En ligne
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            Fonction: {user.functionRole || user.userType || 'Cabinet'}
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="pt-1">
                                        {isAdmin && !isSelf ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowDisconnectConfirm(user)}
                                                disabled={disconnectingUserId === user.id}
                                                className="w-full py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
                                            >
                                                {disconnectingUserId === user.id ? (
                                                    <span className="w-3.5 h-3.5 border-2 border-rose-600 dark:border-rose-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                                )}
                                                <span>Forcer la déconnexion</span>
                                            </button>
                                        ) : isSelf ? (
                                            <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1 italic">
                                                Votre session actuelle
                                            </div>
                                        ) : (
                                            <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">
                                                Réservé aux Administrateurs
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Filter controls bar */}
            <div className="bg-white dark:bg-[#0c111d] p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    {/* Search bar */}
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par action, utilisateur, description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-gray-700 dark:text-slate-250 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#15447c] transition-all"
                        />
                    </div>

                    {/* Filters dropdowns */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-400">
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filtrer par :</span>
                        </div>

                        {/* Action Filter */}
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl text-gray-700 dark:text-slate-350 outline-none focus:ring-2 focus:ring-indigo-500/10"
                        >
                            <option value="all">Tous les types d'action</option>
                            <option value="Ajout">Ajout</option>
                            <option value="Modification">Modification</option>
                            <option value="Suppression">Suppression</option>
                            <option value="Connexion">Connexion</option>
                            <option value="Autre">Autre</option>
                        </select>

                        {/* Module Filter */}
                        <select
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl text-gray-700 dark:text-slate-350 outline-none focus:ring-2 focus:ring-indigo-500/10"
                        >
                            <option value="all">Tous les modules</option>
                            {modules.map(mod => (
                                <option key={mod} value={mod}>{mod}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* List Table container */}
            <div className="bg-white dark:bg-[#0c111d] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-4.5 text-3xs font-black tracking-widest text-gray-400 dark:text-slate-500 uppercase">Horodatage</th>
                                <th className="px-6 py-4.5 text-3xs font-black tracking-widest text-gray-400 dark:text-slate-500 uppercase">Utilisateur</th>
                                <th className="px-6 py-4.5 text-3xs font-black tracking-widest text-gray-400 dark:text-slate-500 uppercase">Action</th>
                                <th className="px-6 py-4.5 text-3xs font-black tracking-widest text-gray-400 dark:text-slate-500 uppercase">Module</th>
                                <th className="px-6 py-4.5 text-3xs font-black tracking-widest text-gray-400 dark:text-slate-500 uppercase">Description</th>
                                <th className="px-6 py-4.5 text-3xs font-black tracking-widest text-gray-400 dark:text-slate-500 uppercase text-right">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.slice(0, displayLimit).map((log, idx) => {
                                    const uName = log.userName || 'Utilisateur';
                                    const uEmail = log.userEmail || '';
                                    const aType = log.actionType || 'Action';
                                    const mod = log.module || 'Système';
                                    const desc = log.description || 'Aucune description';
                                    const initial = uName.charAt(0).toUpperCase() || 'U';

                                    return (
                                        <tr 
                                            key={log.id || `audit-${idx}`} 
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition cursor-pointer"
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">{formatTimestamp(log.timestamp)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-100/60 dark:border-indigo-950">
                                                        {initial}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">{uName}</p>
                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{uEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-3xs font-extrabold rounded-md uppercase tracking-wider ${getActionBadgeClass(aType)}`}>
                                                    {getActionIcon(aType)}
                                                    <span>{aType}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/20 px-2 py-0.5 rounded-md">
                                                    {mod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 max-w-sm">
                                                <p className="text-xs font-medium text-gray-600 dark:text-slate-300 truncate" title={desc}>
                                                    {desc}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                                >
                                                    Visualiser
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-900 text-gray-400 dark:text-slate-500 rounded-2xl border border-slate-100 dark:border-slate-800 mb-3">
                                                <Search className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-700 dark:text-slate-350">Aucun log enregistré</p>
                                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Aucune action correspondante n'a été répertoriée dans le journal d'audit.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination / Load More Bar */}
                {filteredLogs.length > 40 && (
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500 dark:text-slate-400 font-medium">
                            Affichage de <strong className="text-gray-800 dark:text-slate-200">{Math.min(displayLimit, filteredLogs.length)}</strong> sur <strong className="text-gray-800 dark:text-slate-200">{filteredLogs.length}</strong> logs récents
                        </span>
                        
                        <div className="flex items-center gap-2">
                            {filteredLogs.length > displayLimit && (
                                <button
                                    onClick={() => setDisplayLimit(prev => prev + 40)}
                                    className="px-4 py-2 bg-[#15447c] hover:bg-[#1d5b9f] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition duration-150 cursor-pointer"
                                >
                                    Voir plus (+40 logs)
                                </button>
                            )}

                            {displayLimit < filteredLogs.length && (
                                <button
                                    onClick={() => setDisplayLimit(filteredLogs.length)}
                                    className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
                                >
                                    Tout afficher
                                </button>
                            )}

                            {displayLimit > 40 && (
                                <button
                                    onClick={() => setDisplayLimit(40)}
                                    className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
                                >
                                    Réduire à 40
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Log modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Backdrop overlay */}
                        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity" onClick={() => setSelectedLog(null)}></div>

                        {/* Centering spacer */}
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        {/* Modal content box */}
                        <div className="inline-block align-bottom bg-white dark:bg-[#0c111d] rounded-2xl border border-gray-100 dark:border-slate-800 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-800 dark:text-slate-100 uppercase tracking-wider">
                                        Détails de l'Action
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition rounded-lg"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Type d'Action</p>
                                        <div className="mt-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-3xs font-black rounded-md uppercase tracking-widest ${getActionBadgeClass(selectedLog.actionType || 'Action')}`}>
                                                {getActionIcon(selectedLog.actionType || 'Action')}
                                                <span>{selectedLog.actionType || 'Action'}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Module</p>
                                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-1">{selectedLog.module || 'Système'}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                                        <User className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Auteur de l'action</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{selectedLog.userName || 'Utilisateur'}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{selectedLog.userEmail || ''}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Date & Heure</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{formatTimestamp(selectedLog.timestamp)}</p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                                        <HelpCircle className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Description de l'événement</span>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 leading-relaxed">
                                        {selectedLog.description || 'Aucune description'}
                                    </p>
                                </div>

                                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Données techniques associées</span>
                                        <pre className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/80 max-h-40 overflow-y-auto leading-normal">
                                            {JSON.stringify(selectedLog.details, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-4 py-2 bg-white dark:bg-[#0c111d] border border-slate-200 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmation de Déconnexion à distance */}
            {showDisconnectConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                                <UserX className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                    Confirmer la déconnexion
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Fermer à distance la session active.
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            Êtes-vous sûr de vouloir déconnecter <strong className="text-slate-900 dark:text-slate-100">{showDisconnectConfirm.fullName}</strong> ({showDisconnectConfirm.email}) ?
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowDisconnectConfirm(null)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                disabled={disconnectingUserId === showDisconnectConfirm.id}
                                onClick={() => handleDisconnectUser(showDisconnectConfirm)}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Déconnecter maintenant</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
};

export default AuditLogsPage;
