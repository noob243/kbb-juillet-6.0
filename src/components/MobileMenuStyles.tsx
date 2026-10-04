import React, { FC, useState } from 'react';
import { DashboardIcon, ClientsIcon, CasesIcon, AgendaIcon, ChatIcon, BillingIcon, AvocatsIcon, StaffIcon, PersonnelsIcon, SuppliersIcon, AIIcon } from './Icons';

interface MobileMenuProps {
    currentPage: string;
    setCurrentPage: (page: string) => void;
    isOpen: boolean;
    onClose: () => void;
    menuStyle: 'grid' | 'tabbar';
    setMenuStyle: (style: 'grid' | 'tabbar') => void;
}

export const MobileMenuModal: FC<MobileMenuProps> = ({
    currentPage,
    setCurrentPage,
    isOpen,
    onClose,
    menuStyle,
    setMenuStyle
}) => {
    if (!isOpen) return null;

    const allModules = [
        { name: 'Dashboard', label: 'Tableau de bord', icon: <DashboardIcon />, color: 'from-blue-500 to-indigo-600' },
        { name: 'AIAssistant', label: 'Otshudi AI', icon: <AIIcon />, color: 'from-purple-500 to-indigo-600' },
        { name: 'Clients', label: 'Clients', icon: <ClientsIcon />, color: 'from-emerald-500 to-teal-600' },
        { name: 'Dossiers', label: 'Dossiers', icon: <CasesIcon />, color: 'from-blue-600 to-cyan-600' },
        { name: 'Procedures', label: 'Procédures', icon: <span className="text-xl">⚖️</span>, color: 'from-amber-500 to-orange-600' },
        { name: 'Agenda', label: 'Tâches Agenda', icon: <AgendaIcon />, color: 'from-indigo-500 to-purple-600' },
        { name: 'Evenements', label: 'Événements', icon: <span className="text-xl">📅</span>, color: 'from-rose-500 to-pink-600' },
        { name: 'Chat', label: 'Chat Interne', icon: <ChatIcon />, color: 'from-sky-500 to-blue-600' },
        { name: 'Correspondance', label: 'Correspondance', icon: <span className="text-xl">✉️</span>, color: 'from-violet-500 to-purple-600' },
        { name: 'Facturation', label: 'Facturation', icon: <BillingIcon />, color: 'from-emerald-600 to-green-600' },
        { name: 'Personnels', label: 'Personnels', icon: <PersonnelsIcon />, color: 'from-blue-500 to-indigo-700' },
        { name: 'Avocats', label: 'Avocats', icon: <AvocatsIcon />, color: 'from-amber-600 to-yellow-600' },
        { name: 'Fournisseurs', label: 'Fournisseurs', icon: <SuppliersIcon />, color: 'from-slate-600 to-zinc-700' },
        { name: 'Gestion', label: 'Gestion & Admin', icon: <StaffIcon />, color: 'from-rose-600 to-red-700' },
        { name: 'AuditLogs', label: 'Journal d\'audit', icon: <span className="text-xl">📊</span>, color: 'from-indigo-700 to-slate-800' },
        { name: 'Presentation', label: 'Présentation PPT', icon: <span className="text-xl">📽️</span>, color: 'from-amber-500 to-yellow-500' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-[#0c111d] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                            {menuStyle === 'grid' ? 'Menu Grille des Modules' : 'Barre d\'Onglets (Tab Bar)'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Switcher between Grid and TabBar */}
                        <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setMenuStyle('grid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${menuStyle === 'grid' ? 'bg-[#15447c] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Grille
                            </button>
                            <button
                                onClick={() => setMenuStyle('tabbar')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${menuStyle === 'tabbar' ? 'bg-[#15447c] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Tab Bar
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                    {menuStyle === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {allModules.map((mod) => {
                                const isCurrent = currentPage === mod.name;
                                return (
                                    <button
                                        key={mod.name}
                                        onClick={() => {
                                            setCurrentPage(mod.name);
                                            onClose();
                                        }}
                                        className={`p-4 rounded-2xl flex flex-col items-center text-center transition-all duration-200 border cursor-pointer group ${
                                            isCurrent
                                                ? 'bg-indigo-50/80 dark:bg-indigo-950/45 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                                                : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-md mb-2.5 group-hover:scale-105 transition duration-200`}>
                                            {mod.icon}
                                        </div>
                                        <span className="text-xs font-bold leading-tight">{mod.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                La barre d'onglets inférieure (Tab Bar) est épinglée en bas de l'écran sur téléphone et tablette pour un accès fulgurant à vos rubriques favorites.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { name: 'Dashboard', label: 'Tableau de bord', desc: 'Vue d\'ensemble et statistiques clés' },
                                    { name: 'Clients', label: 'Clients', desc: 'Gestion des clients et coordonnées' },
                                    { name: 'Dossiers', label: 'Dossiers', desc: 'Suivi des affaires juridiques' },
                                    { name: 'Agenda', label: 'Tâches & Agenda', desc: 'Échéances et planning' },
                                    { name: 'AIAssistant', label: 'Otshudi AI', desc: 'Assistant juridique intelligent' }
                                ].map((tab) => (
                                    <button
                                        key={tab.name}
                                        onClick={() => {
                                            setCurrentPage(tab.name);
                                            onClose();
                                        }}
                                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                                            currentPage === tab.name
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-xs font-bold">{tab.label}</p>
                                            <p className="text-3xs text-slate-400 mt-0.5">{tab.desc}</p>
                                        </div>
                                        <span className="text-xs font-bold text-indigo-600">Ouvrir →</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">KBB App - Cabinet d'Avocats</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#15447c] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#10345f] transition"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MobileTabBar: FC<{
    currentPage: string;
    setCurrentPage: (page: string) => void;
    onOpenMenuGrid: () => void;
    onBack: () => void;
    canGoBack: boolean;
}> = ({ currentPage, setCurrentPage, onOpenMenuGrid, onBack, canGoBack }) => {
    const primaryTabs = [
        { name: 'Dashboard', label: 'Accueil', icon: <DashboardIcon /> },
        { name: 'Clients', label: 'Clients', icon: <ClientsIcon /> },
        { name: 'Dossiers', label: 'Dossiers', icon: <CasesIcon /> },
        { name: 'Agenda', label: 'Agenda', icon: <AgendaIcon /> },
        { name: 'AIAssistant', label: 'Otshudi AI', icon: <AIIcon /> }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0c111d]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 z-50 flex items-center justify-around shadow-2xl">
            {/* Back Button */}
            <button
                onClick={onBack}
                disabled={!canGoBack}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${canGoBack ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}
                title="Retour à la page précédente"
            >
                <span className="w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg shadow-sm">
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </span>
                <span className="text-[10px] tracking-tight mt-0.5">Retour</span>
            </button>

            {primaryTabs.map((tab) => {
                const isActive = currentPage === tab.name;
                return (
                    <button
                        key={tab.name}
                        onClick={() => setCurrentPage(tab.name)}
                        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                            isActive
                                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/50'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                        }`}
                    >
                        <span className="w-5 h-5 flex items-center justify-center">
                            {tab.icon}
                        </span>
                        <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
                    </button>
                );
            })}
            
            {/* Menu Grid Trigger */}
            <button
                onClick={onOpenMenuGrid}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition font-bold"
                title="Tous les modules (Menu Grille)"
            >
                <span className="w-5 h-5 flex items-center justify-center bg-[#15447c] text-white rounded-lg shadow-sm">
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </span>
                <span className="text-[10px] tracking-tight mt-0.5">Grille</span>
            </button>
        </div>
    );
};
