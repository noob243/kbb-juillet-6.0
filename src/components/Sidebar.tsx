
import React, { FC, useState, useEffect } from 'react';
import { Icon, DashboardIcon, ClientsIcon, CasesIcon, EventsIcon, AgendaIcon, ChatIcon, BillingIcon, AvocatsIcon, StaffIcon, PersonnelsIcon, SuppliersIcon, LogoutIcon, EyeIcon, AIIcon } from './Icons';
import { AppUser, ModuleKey, UserRole } from '../types/rbac';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS, ALL_MODULE_PERMISSIONS } from '../services/rbacService';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
  currentUserInfo?: { name: string; role: string; email: string; photoUrl?: string } | null;
  currentUser?: AppUser | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ currentPage, setCurrentPage, onLogout, currentUserInfo, currentUser, isOpen = false, onClose }) => {
    const [isAgendaExpanded, setIsAgendaExpanded] = useState(
        currentPage === 'Agenda' || currentPage === 'Evenements'
    );

    useEffect(() => {
        if (currentPage === 'Agenda' || currentPage === 'Evenements') {
            setIsAgendaExpanded(true);
        }
    }, [currentPage]);

    const handlePageChange = (page: string) => {
        setCurrentPage(page);
        if (onClose) {
            onClose();
        }
    };

    const activeUser: AppUser | null = currentUser;

    const routeToModuleMap: Record<string, ModuleKey> = {
        'Dashboard': 'dashboard',
        'AIAssistant': 'ai',
        'Clients': 'clients',
        'Dossiers': 'cases',
        'Procedures': 'procedures',
        'Agenda': 'agenda',
        'Evenements': 'events',
        'Chat': 'chat',
        'Correspondance': 'correspondance',
        'Facturation': 'billing',
        'Avocats': 'avocats',
        'Personnels': 'personnels',
        'Fournisseurs': 'suppliers',
        'Gestion': 'gestion_cabinet',
        'AuditLogs': 'audit'
    };

    const isAllowedItem = (pageName: string): boolean => {
        if (pageName === 'All') {
            return activeUser ? activeUser.role === 'Admin' : (currentUserInfo?.role ? currentUserInfo.role.toLowerCase().includes('admin') : false);
        }

        const moduleKey = routeToModuleMap[pageName];
        if (!moduleKey) return true;

        const effectiveUser = activeUser || (currentUserInfo ? {
            id: 'temp',
            email: currentUserInfo.email,
            fullName: currentUserInfo.name,
            role: currentUserInfo.role as any,
            permissions: DEFAULT_ROLE_PERMISSIONS[currentUserInfo.role as UserRole] || ALL_MODULE_PERMISSIONS.map(m => m.key),
            hasAppAccess: true,
            createdAt: '',
            isDeleted: false
        } : null);

        return hasPermission(effectiveUser, moduleKey);
    };

    const navSections: { title?: string; items: any[] }[] = [
        {
            title: "GÉNÉRAL",
            items: [
                { name: 'Dashboard', icon: <DashboardIcon />, label: "Tableau de bord" },
                { name: 'AIAssistant', icon: <AIIcon />, label: "Otshudi AI" },
            ]
        },
        {
            title: "DOSSIERS & CLIENTS",
            items: [
                { name: 'Clients', icon: <ClientsIcon />, label: "Clients" },
                { name: 'Dossiers', icon: <CasesIcon />, label: "Dossiers" },
                { name: 'Procedures', icon: <svg className="w-5 h-5 text-indigo-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>, label: "Procédures" },
            ]
        },
        {
            title: "COMMUNICATION & AGENDA",
            items: [
                { 
                    name: 'AgendaGroup', 
                    icon: <AgendaIcon />, 
                    label: "Agenda", 
                    isGroup: true,
                    subItems: [
                        { 
                            name: 'Agenda', 
                            icon: (
                                <svg className="w-4 h-4 text-indigo-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            ), 
                            label: "Tâches" 
                        },
                        { 
                            name: 'Evenements', 
                            icon: (
                                <svg className="w-4 h-4 text-indigo-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            ), 
                            label: "Événements" 
                        }
                    ]
                },
                { name: 'Chat', icon: <ChatIcon />, label: "Chat interne" },
                { name: 'Correspondance', icon: <svg className="w-5 h-5 text-indigo-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, label: "Correspondance" },
            ]
        },
        {
            title: "FINANCES & RH",
            items: [
                { name: 'Facturation', icon: <BillingIcon />, label: "Facturation" },
                { name: 'Personnels', icon: <PersonnelsIcon />, label: "Personnels" },
                { name: 'Avocats', icon: <AvocatsIcon />, label: "Avocats" },
                { name: 'Fournisseurs', icon: <SuppliersIcon />, label: "Fournisseurs" },
            ]
        },
        {
            title: "ADMINISTRATION",
            items: [
                { name: 'Gestion', icon: <StaffIcon />, label: "Gestion & Admin" },
                { 
                  name: 'AuditLogs', 
                  icon: (
                    <svg className="w-5 h-5 text-indigo-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  ), 
                  label: "Journal d'audit" 
                }
            ]
        }
    ];

    const filteredSections = navSections.map(section => {
        const filteredItems = section.items.filter(item => {
            if (item.isGroup && item.subItems) {
                const allowedSubs = item.subItems.filter((sub: any) => isAllowedItem(sub.name));
                return allowedSubs.length > 0;
            }
            return isAllowedItem(item.name);
        });
        return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);

    return (
        <>
            {/* Backdrop for mobile view */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}
            
            <aside className={`
                bg-[#15447c] text-slate-100 w-64 space-y-2 p-4 flex flex-col h-screen fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0 md:z-auto shrink-0
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="text-2xl font-bold mb-6 flex items-center justify-between p-2">
                    <div className="flex items-center gap-2.5">
                        <img 
                            src="https://lh3.googleusercontent.com/d/1GW4qFRE3YAgUUEuOn3IVPV3_QQ46wsGg" 
                            alt="KBB App Logo" 
                            referrerPolicy="no-referrer"
                            className="h-9 w-auto object-contain bg-white/10 p-1 rounded-xl border border-white/20 shadow-xs"
                        />
                        <span className="font-black tracking-tight text-white">KBB App</span>
                    </div>
                    {onClose && (
                        <button 
                            type="button"
                            onClick={onClose}
                            className="md:hidden p-1.5 hover:bg-black/20 rounded-lg text-slate-300 hover:text-white transition duration-150 cursor-pointer"
                            title="Fermer le menu"
                        >
                            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {filteredSections.map((section, idx) => (
                        <div key={section.title || idx} className="space-y-1">
                            {section.title && (
                                <p className="px-4 text-[10px] font-black uppercase tracking-wider text-slate-300/60 mb-1.5">
                                    {section.title}
                                </p>
                            )}
                            {section.items.map(item => {
                                if (item.isGroup) {
                                    const isSelectedGroup = currentPage === 'Agenda' || currentPage === 'Evenements';
                                    return (
                                        <div key={item.name} className="space-y-1">
                                            <button
                                                onClick={() => setIsAgendaExpanded(!isAgendaExpanded)}
                                                className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 ${isSelectedGroup ? 'bg-black/25 text-white font-bold' : 'text-slate-200 hover:bg-black/20 hover:text-white'}`}
                                            >
                                                <div className="flex items-center">
                                                    <Icon>{item.icon}</Icon>
                                                    <span className="ml-3">{item.label}</span>
                                                </div>
                                                <svg
                                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isAgendaExpanded ? 'rotate-90' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                            
                                            {isAgendaExpanded && item.subItems && (
                                                <div className="pl-4 space-y-1 mt-1 border-l border-white/10 ml-6">
                                                    {item.subItems.filter((subItem: any) => isAllowedItem(subItem.name)).map((subItem: any) => (
                                                        <a
                                                            key={subItem.name}
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); handlePageChange(subItem.name); }}
                                                            className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${currentPage === subItem.name ? 'bg-white/15 text-white font-bold shadow-xs' : 'text-slate-300 hover:bg-black/15 hover:text-white'}`}
                                                        >
                                                            <span className="mr-2 text-xs">{subItem.icon}</span>
                                                            <span>{subItem.label}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <a
                                        key={item.name}
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handlePageChange(item.name); }}
                                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 ${currentPage === item.name ? 'bg-black/25 text-white font-bold shadow-xs' : 'text-slate-200 hover:bg-black/20 hover:text-white'}`}
                                    >
                                        <Icon>{item.icon}</Icon>
                                        <span className="ml-3">{item.label}</span>
                                    </a>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                    {currentUserInfo && (
                        <div className="px-4 py-3 bg-black/15 rounded-xl flex items-center gap-3 border border-white/5 shadow-inner">
                            <div className="w-9 h-9 rounded-full bg-[#15447c]/30 border border-white/20 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs overflow-hidden">
                                {(currentUserInfo.photoUrl || currentUser?.photoUrl) ? (
                                    <img src={currentUserInfo.photoUrl || currentUser?.photoUrl} alt={currentUserInfo.name} className="w-full h-full object-cover" />
                                ) : (
                                    currentUserInfo.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate leading-tight" title={currentUserInfo.name}>{currentUserInfo.name}</p>
                                <p className="text-[10px] text-slate-350 truncate leading-tight mt-0.5" title={currentUserInfo.role}>{currentUserInfo.role}</p>
                            </div>
                        </div>
                    )}
                     <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-black/20 hover:text-white transition-colors duration-200">
                        <Icon><LogoutIcon /></Icon>
                        <span>Déconnexion</span>
                    </a>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
