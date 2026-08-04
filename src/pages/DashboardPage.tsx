
import React, { FC, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import StatCard from '../components/StatCard';
import { CasesIcon, ClientsIcon, EventsIcon, CalendarIcon, MapPinIcon, UserIcon, AlertIcon, CheckIcon, BriefcaseIcon, CheckSquareIcon } from '../components/Icons';
import { Client, Case, Event, Task, Invoice, Avocat, Personnel } from '../types';

interface DashboardPageProps {
  clients: Client[];
  cases: Case[];
  events: Event[];
  tasks: Task[];
  invoices?: Invoice[];
  avocats?: Avocat[];
  personnels?: Personnel[];
  onUpdateTaskStatus?: (id: number, status: 'Effectué' | 'Non effectué' | 'Effectué à moitié') => void;
  onAddTask?: (newTask: Omit<Task, 'id'>) => void;
  onNavigate?: (pageName: string, query?: string) => void;
}

const DashboardPage: FC<DashboardPageProps> = ({ clients = [], cases = [], events = [], tasks = [], invoices = [], avocats = [], personnels = [], onUpdateTaskStatus, onAddTask, onNavigate }) => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeCases = Array.isArray(cases) ? cases : [];
    const safeEvents = Array.isArray(events) ? events : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const safeAvocats = Array.isArray(avocats) ? avocats : [];

    const activeCases = safeCases.filter(c => c && (c.status === 'En cours' || c.status === 'Nouveau'));
    const upcomingEvents = safeEvents.filter(e => e && e.date && new Date(e.date) >= new Date());
    const pendingTasks = safeTasks.filter(t => t && t.status !== 'Effectué');

    // Calculate flat list of procedures
    const availProcedures = safeCases.flatMap(c => {
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

    // Tab switcher state for financial widget
    const [financeTab, setFinanceTab] = useState<'cases' | 'clients'>('cases');
    const [dashboardMode, setDashboardMode] = useState<'overview' | 'analytics'>('overview');

    // Quick Task Form States
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [qTaskName, setQTaskName] = useState('');
    const [selectedQProcKey, setSelectedQProcKey] = useState(availProcedures[0]?.key || '');
    const [qLawyer, setQLawyer] = useState('');
    const [qDueDate, setQDueDate] = useState(new Date().toISOString().substring(0, 10));

    const lawyersList = Array.from(new Set(tasks.map(t => t.lawyer).filter(Boolean)));
    if (lawyersList.length === 0) {
        lawyersList.push('Me. Katako', 'Me. Badjoko', 'Me. Bakenda', 'Me. Shusu');
    }

    // Performance & Financial data processing
    const todayStr = new Date().toISOString().substring(0, 10);

    const activeAvocats = (avocats && avocats.length > 0) 
        ? avocats 
        : lawyersList.map((name, i) => ({
            id: `AV-${i + 1}`,
            fullName: name,
            cabinetRole: 'Avocat Collaborateur',
            serviceStatus: 'Actif' as const,
            cabinetStatus: 'Junior' as const
        }));

    const lawyersStats = activeAvocats.map(av => {
        const lawyerTasks = tasks.filter(t => {
            if (!t || !t.lawyer || !av) return false;
            const lName = (t.lawyer || '').toLowerCase().replace('me.', '').trim();
            const avName = (av.fullName || '').toLowerCase().replace('me.', '').trim();
            return avName && lName && (avName.includes(lName) || lName.includes(avName));
        });
        const total = lawyerTasks.length;
        const completed = lawyerTasks.filter(t => t.status === 'Effectué').length;
        const inProgress = lawyerTasks.filter(t => t.status === 'Effectué à moitié').length;
        const overdue = lawyerTasks.filter(t => t.status !== 'Effectué' && t.dueDate < todayStr).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            ...av,
            total,
            completed,
            overdue,
            inProgress,
            completionRate
        };
    });

    const casesStats = cases.map(c => {
        const caseInvoices = (invoices || []).filter(inv => inv.caseId === c.id);
        const totalBilled = caseInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalPaid = caseInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const outstanding = totalBilled - totalPaid;
        const recoveryRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0; // Standard percentage
        const normalizedRecoveryRate = recoveryRate > 100 ? 100 : recoveryRate;

        const caseTasks = tasks.filter(t => t.caseId === c.id);
        const totalTasks = caseTasks.length;
        const completedTasks = caseTasks.filter(t => t.status === 'Effectué').length;
        const overdueTasks = caseTasks.filter(t => t.status !== 'Effectué' && t.dueDate < todayStr).length;

        return {
            ...c,
            totalBilled,
            totalPaid,
            outstanding,
            recoveryRate: normalizedRecoveryRate,
            totalTasks,
            completedTasks,
            overdueTasks
        };
    });

    const clientsStats = clients.map(cl => {
        const clientCases = cases.filter(c => {
            if (!c) return false;
            if (c.clientId && cl.id && c.clientId === cl.id) return true;
            if (c.client && cl.name) {
                const caseClientLower = c.client.toLowerCase().trim();
                const clNameLower = cl.name.toLowerCase().trim();
                if (caseClientLower === clNameLower) return true;
                if (caseClientLower.includes(clNameLower) || clNameLower.includes(caseClientLower)) return true;
            }
            return false;
        });
        const clientInvoices = (invoices || []).filter(inv => clientCases.some(c => c.id === inv.caseId));
        const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalPaid = clientInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const outstanding = totalBilled - totalPaid;
        const rawRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
        const recoveryRate = rawRate > 100 ? 100 : rawRate;

        const activeCount = clientCases.filter(c => c.status === 'En cours' || c.status === 'Nouveau').length;

        return {
            ...cl,
            totalCases: clientCases.length,
            activeCount,
            totalBilled,
            totalPaid,
            outstanding,
            recoveryRate
        };
    });

    // Monthly Invoicing Analytics
    const months = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const monthlyInvoicing = months.map((month) => ({
        month,
        facture: 0,
        recouvre: 0,
        restant: 0
    }));

    (invoices || []).forEach(inv => {
        if (!inv.dueDate) return;
        const parts = inv.dueDate.split('-');
        if (parts.length >= 2) {
            const monthIdx = parseInt(parts[1], 10) - 1;
            if (monthIdx >= 0 && monthIdx < 12) {
                monthlyInvoicing[monthIdx].facture += inv.totalAmount || 0;
                monthlyInvoicing[monthIdx].recouvre += inv.paidAmount || 0;
            }
        } else {
            const dateObj = new Date(inv.dueDate);
            if (!isNaN(dateObj.getTime())) {
                const monthIdx = dateObj.getMonth();
                monthlyInvoicing[monthIdx].facture += inv.totalAmount || 0;
                monthlyInvoicing[monthIdx].recouvre += inv.paidAmount || 0;
            }
        }
    });

    monthlyInvoicing.forEach(item => {
        item.restant = Math.max(0, item.facture - item.recouvre);
    });

    // Cases by Status Analytics
    const caseStatusCounts = {
        'Nouveau': 0,
        'En cours': 0,
        'En attente': 0,
        'Clôturé': 0
    };
    cases.forEach(c => {
        if (caseStatusCounts[c.status] !== undefined) {
            caseStatusCounts[c.status]++;
        } else {
            caseStatusCounts['En cours']++;
        }
    });

    const caseStatusData = Object.entries(caseStatusCounts).map(([name, value]) => ({
        name,
        value
    })).filter(item => item.value > 0);

    const statusColors = {
        'Nouveau': '#8b5cf6',
        'En cours': '#3b82f6',
        'En attente': '#f59e0b',
        'Clôturé': '#10b981'
    };

    // Events by Type and Budget Analytics
    const eventTypes = ['Atelier', 'Conférence', 'Colloque', 'Séminaire', 'Autre'];
    const eventTypeData = eventTypes.map(type => {
        const filtered = events.filter(e => e.type === type);
        const totalEvents = filtered.length;
        const totalRecettes = filtered.reduce((sum, e) => sum + (e.recettesTotal || 0), 0);
        const prevBudget = filtered.reduce((sum, e) => {
            const val = parseFloat(e.budgetPrevisionnel || '0');
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
        const realBudget = filtered.reduce((sum, e) => {
            const val = parseFloat(e.budgetRealise || '0');
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
        return {
            type,
            count: totalEvents,
            recettes: totalRecettes,
            previsionnel: prevBudget,
            realise: realBudget
        };
    }).filter(item => item.count > 0);

    const handleQuickAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!qTaskName.trim() || !onAddTask) return;

        const selectedProc = availProcedures.find(p => p.key === selectedQProcKey);

        onAddTask({
            name: qTaskName.trim(),
            caseId: selectedProc ? selectedProc.caseId : '',
            lawyer: qLawyer || lawyersList[0],
            dueDate: qDueDate,
            status: 'Non effectué',
            procedureLinked: selectedProc ? selectedProc.name : '',
            procedureLinkedIds: selectedProc ? [selectedProc.id] : []
        });

        // Reset form
        setQTaskName('');
        setSelectedQProcKey(availProcedures[0]?.key || '');
        setQuickAddOpen(false);
    };

    // Sort tasks to show active (non-completed) tasks first, then by date priority
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status !== 'Effectué' && b.status === 'Effectué') return -1;
        if (a.status === 'Effectué' && b.status !== 'Effectué') return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">Tableau de Bord</h1>
                    <p className="text-sm text-gray-500">Vue d'ensemble en temps réel de l'activité du cabinet KBB.</p>
                </div>
                
                {/* Mode Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center border border-slate-150">
                    <button
                        onClick={() => setDashboardMode('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${dashboardMode === 'overview' ? 'bg-white text-[#15447c] shadow-xs' : 'text-gray-450 hover:text-gray-750'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                        </svg>
                        Vue Générale
                    </button>
                    <button
                        onClick={() => setDashboardMode('analytics')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${dashboardMode === 'analytics' ? 'bg-white text-[#15447c] shadow-xs' : 'text-gray-450 hover:text-gray-750'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        Analyses & Statistiques
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Dossiers Actifs" value={activeCases.length.toString()} icon={<CasesIcon />} onClick={() => onNavigate?.('Dossiers')} />
                <StatCard title="Clients" value={clients.length.toString()} icon={<ClientsIcon />} onClick={() => onNavigate?.('Clients')} />
                <StatCard title="Événements à Venir" value={upcomingEvents.length.toString()} icon={<EventsIcon />} onClick={() => onNavigate?.('Evenements')} />
                <StatCard 
                    title="Tâches en Attente" 
                    value={pendingTasks.length.toString()} 
                    onClick={() => onNavigate?.('Agenda')}
                    icon={
                        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    } 
                />
            </div>

            {dashboardMode === 'analytics' ? (
                <div className="space-y-8 animate-fadeIn">
                    
                    {/* Charts Grid Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 1. Facturation & Recouvrements Mensuels (Monthly Billing) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col justify-between h-[420px]">
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2 mb-1">
                                    <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                    Chiffre d'Affaires & Flux de Trésorerie
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">Montants facturés vs montants recouvrés par mois (USD)</p>
                            </div>
                            
                            <div className="flex-1 min-h-[280px] w-full">
                                {invoices.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                                        <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p className="text-xs font-semibold text-gray-500">Aucune donnée de facturation</p>
                                        <p className="text-[10px] text-gray-400">Ajoutez des factures dans l'onglet Facturation pour voir ce graphique.</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyInvoicing} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorFacture" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorRecouvre" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                                                labelStyle={{ fontWeight: 800, color: '#1e293b', fontSize: '11px' }}
                                                itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                            <Area type="monotone" name="Total Facturé" dataKey="facture" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFacture)" />
                                            <Area type="monotone" name="Total Encaissé" dataKey="recouvre" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecouvre)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 2. Répartition des Dossiers par Statut (Donut Chart) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-[420px]">
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2 mb-1">
                                    <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                        </svg>
                                    </span>
                                    État du Portefeuille Dossiers
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">Proportion de dossiers par phase d'avancement</p>
                            </div>

                            <div className="flex-1 min-h-[220px] relative flex items-center justify-center">
                                {caseStatusData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500">Aucun dossier enregistré</p>
                                    </div>
                                ) : (
                                    <>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={caseStatusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={65}
                                                    outerRadius={85}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {caseStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={statusColors[entry.name as keyof typeof statusColors] || '#94a3b8'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                                                    itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        
                                        {/* Center label */}
                                        <div className="absolute flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-gray-800 font-mono">{cases.length}</span>
                                            <span className="text-4xs font-bold uppercase text-gray-400 tracking-widest mt-0.5">Dossiers</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Legend Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50">
                                {Object.entries(statusColors).map(([status, color]) => {
                                    const count = cases.filter(c => c.status === status).length;
                                    return (
                                        <div key={status} className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg hover:bg-slate-50 transition">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span className="text-3xs font-extrabold text-gray-600 truncate">{status}</span>
                                            <span className="text-3xs font-black font-mono text-gray-400 ml-auto">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 3. Tâches & Performance par Avocat */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-[420px]">
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2 mb-1">
                                    <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </span>
                                    Charge de Travail & Performance par Avocat
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">Volume de tâches assignées et taux de réalisation</p>
                            </div>

                            <div className="flex-1 min-h-[250px] w-full">
                                {lawyersStats.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500">Aucun avocat enregistré</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={lawyersStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="fullName" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                                                itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                            <Bar name="Tâches Assignées" dataKey="total" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={24} />
                                            <Bar name="Tâches Réalisées" dataKey="completed" fill="#15447c" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 4. Recettes d'Événements par Type */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-[420px]">
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2 mb-1">
                                    <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                    Budgets & Recettes d'Événements
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">Budgets prévisionnels vs recettes réalisées par type d'événement (USD)</p>
                            </div>

                            <div className="flex-1 min-h-[250px] w-full">
                                {events.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500">Aucun événement enregistré</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={eventTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="type" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                                                itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                            <Bar name="Budget Prévisionnel" dataKey="previsionnel" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar name="Recettes Réelles" dataKey="recettes" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="space-y-8">
                    {/* Performance & Financial Summary Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Lawyer Performance Card */}
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2">
                                    <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </span>
                                    Performance & Suivi des Avocats
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">Tâches en retard et taux de complétion</p>
                            </div>
                            <button 
                                onClick={() => onNavigate?.('Avocats')}
                                className="text-2xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                                title="Voir la liste des avocats"
                            >
                                {lawyersStats.length} Avocats →
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {lawyersStats.map(lawyer => {
                                const hasOverdue = lawyer.overdue > 0;
                                return (
                                    <div key={lawyer.id} className={`p-4 rounded-xl border transition ${hasOverdue ? 'bg-rose-50/10 border-rose-100' : 'bg-slate-50/40 border-slate-100 hover:border-gray-200'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                {lawyer.photoUrl ? (
                                                    <img 
                                                        src={lawyer.photoUrl} 
                                                        alt={lawyer.fullName} 
                                                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-3xs shrink-0" 
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-2xs shrink-0 ${hasOverdue ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                        {lawyer.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-800">{lawyer.fullName}</h4>
                                                    <p className="text-[10px] text-gray-455 font-bold">{lawyer.cabinetRole || 'Collaborateur'}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-1 text-right">
                                                {hasOverdue ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-rose-100 border border-rose-250 text-rose-800 font-black uppercase">
                                                        <AlertIcon className="w-3 h-3 text-rose-600 mr-1" /> {lawyer.overdue} en retard
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-green-100 border border-green-250 text-green-800 font-bold uppercase">
                                                        <CheckIcon className="w-3 h-3 text-green-600 mr-1" /> En ordre
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-400 font-mono">
                                                    {lawyer.completed} / {lawyer.total} résolues
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress row */}
                                        <div className="mt-3.5">
                                            <div className="flex justify-between items-center text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                                                <span>Ratio complétion</span>
                                                <span className="font-mono text-gray-600 font-black">{lawyer.completionRate}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${hasOverdue ? 'bg-amber-500' : 'bg-[#15447c]'}`} 
                                                    style={{ width: `${lawyer.completionRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Financial Summary Card (Tabbed) */}
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <div>
                                <h3 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2">
                                    <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                    Synthèse Financière Cabinet
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">Recouvrement d'honoraires par dossier / client</p>
                            </div>

                            {/* Switcher tabs */}
                            <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                                <button
                                    onClick={() => setFinanceTab('cases')}
                                    className={`px-3 py-1 rounded-lg text-3xs font-black uppercase tracking-wider transition ${financeTab === 'cases' ? 'bg-white text-gray-800 shadow-3xs' : 'text-gray-450 hover:text-gray-750'}`}
                                >
                                    Par Dossier
                                </button>
                                <button
                                    onClick={() => setFinanceTab('clients')}
                                    className={`px-3 py-1 rounded-lg text-3xs font-black uppercase tracking-wider transition ${financeTab === 'clients' ? 'bg-white text-gray-800 shadow-3xs' : 'text-gray-450 hover:text-gray-750'}`}
                                >
                                    Par Client
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {financeTab === 'cases' ? (
                                casesStats.map(c => {
                                    const hasOutstanding = c.outstanding > 0;
                                    return (
                                        <div key={c.id} className="p-3.5 bg-slate-50/40 border border-slate-100 hover:border-gray-200 rounded-xl transition">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-800 leading-tight">{c.name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-403">{c.client}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-[9px] font-mono text-gray-400 font-bold uppercase">{c.id}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className="block text-xs font-bold font-mono text-emerald-800">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(c.totalBilled)} Facturé
                                                    </span>
                                                    {hasOutstanding ? (
                                                        <span className="inline-block text-[9px] font-black font-mono text-rose-600 mt-1 bg-rose-50 rounded border border-rose-100 px-1.5 py-0.5 uppercase tracking-wide">
                                                            Reste : {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(c.outstanding)}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block text-[9px] font-extrabold font-mono text-emerald-700 mt-1 bg-emerald-50 rounded border border-emerald-100 px-1.5 py-0.5 uppercase tracking-wide">
                                                            Soldé
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Recovery Rate Progress Bar */}
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className="flex-1 bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full bg-emerald-600 transition-all duration-500" 
                                                        style={{ width: `${c.recoveryRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-3xs font-black font-mono text-emerald-800 flex-shrink-0 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    {c.recoveryRate}% Payé
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                clientsStats.map(cl => {
                                    const hasOutstanding = cl.outstanding > 0;
                                    return (
                                        <div key={cl.id} className="p-3.5 bg-slate-50/40 border border-slate-100 hover:border-gray-200 rounded-xl transition">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-800 leading-tight">{cl.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                            {cl.totalCases} {cl.totalCases === 1 ? 'affaire' : 'affaires'}
                                                        </span>
                                                        {cl.activeCount > 0 && (
                                                            <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                {cl.activeCount} active(s)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className="block text-xs font-bold font-mono text-emerald-800">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cl.totalBilled)} Invoqué
                                                    </span>
                                                    {hasOutstanding ? (
                                                        <span className="inline-block text-[9px] font-black font-mono text-rose-600 mt-1 bg-rose-50 rounded border border-rose-100 px-1.5 py-0.5 uppercase tracking-wide">
                                                            Dû : {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cl.outstanding)}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block text-[9px] font-extrabold font-mono text-emerald-700 mt-1 bg-emerald-50 rounded border border-emerald-100 px-1.5 py-0.5 uppercase tracking-wide">
                                                            Payé à 100%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Outstanding Ratio bar */}
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className="flex-1 bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full bg-emerald-600 transition-all duration-500" 
                                                        style={{ width: `${cl.recoveryRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-3xs font-black font-mono text-emerald-800 flex-shrink-0 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    {cl.recoveryRate}% payé
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Main Dashboard Modules - 3 Columns Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Module 1: Upcoming Events */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                                <EventsIcon />
                            </span>
                            Prochains Événements
                        </h2>
                        <button 
                            onClick={() => onNavigate?.('Evenements')}
                            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full transition cursor-pointer"
                            title="Voir tous les événements"
                        >
                            {upcomingEvents.length} total →
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        {upcomingEvents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-250">
                                <CalendarIcon className="w-10 h-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-500">Aucun événement à venir</p>
                                <p className="text-xs text-gray-400 mt-1">Tous les délais sont respectés.</p>
                            </div>
                        ) : (
                            <ul className="space-y-3.5">
                                {upcomingEvents.slice(0, 5).map(h => (
                                    <li 
                                        key={h.id} 
                                        onClick={() => onNavigate?.('Evenements', h.name)}
                                        className="p-3 bg-slate-50 hover:bg-indigo-50/20 rounded-xl border border-slate-100 transition duration-150 cursor-pointer group"
                                        title="Voir cet événement"
                                    >
                                         <p className="font-semibold text-sm text-gray-800 line-clamp-1">{h.name}</p>
                                         <div className="flex items-center justify-between mt-2">
                                             <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                 <MapPinIcon className="w-3.5 h-3.5 text-gray-400" /> {h.lieu}
                                             </span>
                                             <span className="text-[10px] bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{h.type}</span>
                                         </div>
                                         <p className="text-2xs font-extrabold text-[#15447c] mt-1.5 uppercase tracking-wide flex items-center gap-1">
                                             <CalendarIcon className="w-3 h-3" /> {h.date}
                                         </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Module 2: Recent Tasks */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </span>
                            Tâches Récentes
                        </h2>
                        <div className="flex items-center gap-2">
                            {!quickAddOpen && (
                                <button 
                                    onClick={() => {
                                        setQuickAddOpen(true);
                                        if (availProcedures.length > 0 && !selectedQProcKey) {
                                            setSelectedQProcKey(availProcedures[0].key);
                                        }
                                    }}
                                    className="text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                                    title="Créer rapidement une tâche"
                                >
                                    <span>+ Ajouter</span>
                                </button>
                            )}
                            <button 
                                onClick={() => onNavigate?.('Agenda')}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition cursor-pointer"
                                title="Voir toutes les tâches"
                            >
                                {tasks.length} total →
                            </button>
                        </div>
                    </div>

                    {quickAddOpen ? (
                        <form onSubmit={handleQuickAddSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar pr-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100 animate-fadeIn">
                            <div className="space-y-2.5">
                                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider border-b border-indigo-100 pb-1 mb-2">
                                    Nouvelle Tâche Rapide
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nom de la tâche</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Saisir l'intitulé..."
                                        value={qTaskName}
                                        onChange={(e) => setQTaskName(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-gray-850"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Procédure</label>
                                        <select 
                                            value={selectedQProcKey}
                                            onChange={(e) => setSelectedQProcKey(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-gray-700"
                                        >
                                            {availProcedures.map(p => (
                                                <option key={p.key} value={p.key}>{p.name} ({p.caseName})</option>
                                            ))}
                                            {availProcedures.length === 0 && (
                                                <option value="">Aucune Procédure</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Responsable</label>
                                        <select 
                                            value={qLawyer}
                                            onChange={(e) => setQLawyer(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-gray-700"
                                        >
                                            {lawyersList.map(lawyer => (
                                                <option key={lawyer} value={lawyer}>{lawyer}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date d'échéance</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={qDueDate}
                                        onChange={(e) => setQDueDate(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-gray-700"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-2 border-t border-slate-200/50">
                                <button 
                                    type="button"
                                    onClick={() => setQuickAddOpen(false)}
                                    className="flex-1 bg-white hover:bg-slate-100 text-gray-600 font-bold py-1.5 rounded-lg text-xs border border-gray-250 transition"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs shadow-md shadow-indigo-500/10 transition"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            {tasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-250">
                                    <CheckSquareIcon className="w-10 h-10 text-gray-300 mb-2" />
                                    <p className="text-sm font-semibold text-gray-500">Aucune tâche enregistrée</p>
                                </div>
                            ) : (
                                <ul className="space-y-3.5">
                                    {sortedTasks.slice(0, 5).map(t => (
                                        <li key={t.id} className="p-3 bg-slate-50 hover:bg-indigo-50/20 rounded-xl border border-slate-100 transition duration-150">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                    <button
                                                        onClick={() => {
                                                            if (onUpdateTaskStatus) {
                                                                const nextStatus = t.status === 'Effectué' ? 'Non effectué' : 'Effectué';
                                                                onUpdateTaskStatus(t.id, nextStatus);
                                                            }
                                                        }}
                                                        className="mt-0.5 flex-shrink-0 focus:outline-none transition group"
                                                        title={t.status === 'Effectué' ? "Marquer comme non-effectué" : "Marquer comme effectué"}
                                                    >
                                                        {t.status === 'Effectué' ? (
                                                            <div className="w-4 h-4 rounded-md bg-green-600 text-white flex items-center justify-center scale-100 transition-all shadow-xs">
                                                                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-md border-2 border-gray-300 hover:border-indigo-500 hover:bg-slate-100 transition-all" />
                                                        )}
                                                    </button>
                                                    
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`font-semibold text-sm leading-snug line-clamp-1 ${t.status === 'Effectué' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.name}</p>
                                                        <p className="text-3xs text-gray-400 mt-0.5 font-medium flex items-center gap-1">
                                                            {t.procedureLinked ? (
                                                                <>
                                                                    <CheckSquareIcon className="w-3 h-3 text-gray-400" />
                                                                    <span>Procédure : {t.procedureLinked}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <BriefcaseIcon className="w-3 h-3 text-gray-400" />
                                                                    <span>Dossier : {t.caseId}</span>
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 ml-2 flex-shrink-0 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    t.status === 'Effectué' ? 'bg-green-50 text-green-700 border border-green-100' : 
                                                    t.status === 'Effectué à moitié' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    'bg-rose-50 text-rose-700 border border-rose-100'
                                                }`}>
                                                    {t.status === 'Effectué' ? 'Fait' : 'À faire'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                                                <span className="text-3xs font-black uppercase tracking-wider text-[#15447c] flex items-center gap-1">
                                                    <UserIcon className="w-3 h-3" /> {t.lawyer}
                                                </span>
                                                <span className={`text-[10px] font-semibold flex items-center gap-1 ${t.status !== 'Effectué' && new Date(t.dueDate) < new Date() ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                                                    <CalendarIcon className="w-3 h-3 text-gray-400" /> Échéance : {t.dueDate}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Module 3: Recent Cases */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
                                <CasesIcon />
                            </span>
                            Dossiers Récents
                        </h2>
                        <button 
                            onClick={() => onNavigate?.('Dossiers')}
                            className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-full transition cursor-pointer"
                            title="Voir tous les dossiers"
                        >
                            {cases.length} total →
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        {cases.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-250">
                                <BriefcaseIcon className="w-10 h-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-500">Aucun dossier disponible</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-2xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                            <th className="pb-3">Dossier</th>
                                            <th className="pb-3 text-right">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {cases.slice(0, 5).map(c => (
                                            <tr 
                                                key={c.id} 
                                                onClick={() => onNavigate?.('Dossiers', c.name)}
                                                className="hover:bg-indigo-50/10 transition cursor-pointer"
                                                title={`Ouvrir le dossier ${c.name}`}
                                            >
                                                <td className="py-2.5 pr-2">
                                                    <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                        <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {c.client}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="font-mono text-[10px]">{c.id}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-right">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        c.status === 'En cours' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                                        c.status === 'Clôturé' ? 'bg-green-50 text-green-700 border border-green-100' : 
                                                        c.status === 'Nouveau' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                                                        'bg-amber-50 text-amber-700 border border-amber-100'
                                                    }`}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )}
        </div>
    );
};

export default DashboardPage;
