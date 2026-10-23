
import React, { FC, useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AIIcon } from '../components/Icons';
import { Client, Case, Task, Invoice } from '../types';
import { AppUser } from '../types/rbac';
import { hasPermission } from '../services/rbacService';
import { usePersistentState } from '../hooks/usePersistentState';
import { FunctionalAiTable } from '../components/ai/FunctionalAiTable';

interface AIAssistantPageProps {
    clients: Client[];
    cases: Case[];
    tasks: Task[];
    invoices: Invoice[];
    currentUser?: AppUser | null;
    currentUserInfo?: { name: string; role: string; email: string } | null;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    feedback?: 'positive' | 'negative' | null;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

const AIAssistantPage: FC<AIAssistantPageProps> = ({ clients, cases, tasks, invoices, currentUser, currentUserInfo }) => {
    const userRole = currentUser?.role || currentUserInfo?.role || 'Utilisateur';
    const userName = currentUser?.fullName || currentUserInfo?.name || currentUser?.email || 'Utilisateur';

    // Compute RBAC permissions for data domains
    const canAccessClients = hasPermission(currentUser, 'clients');
    const canAccessCases = hasPermission(currentUser, 'cases');
    const canAccessTasks = hasPermission(currentUser, 'agenda');
    const canAccessInvoices = hasPermission(currentUser, 'billing');

    const initialAssistantMessage: Message = { 
        role: 'assistant', 
        content: `Bonjour ${userName} ! Je suis Otshudi AI, l'assistant IA du cabinet KBB. Je suis connecté à la base de données en respectant strictement votre rôle (${userRole}) et vos permissions d'accès. Comment puis-je vous aider aujourd'hui ?`,
        feedback: null
    };

    const [conversations, setConversations] = usePersistentState<Conversation[]>('kbb_ai_history', []);
    const [isDarkMode, setIsDarkMode] = usePersistentState<boolean>('kbb_ai_dark_mode', false);
    const [currentConvId, setCurrentConvId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    
    const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editBuffer, setEditBuffer] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Prepare a RBAC-filtered data summary for the AI context
    const dataContextSummary = useMemo(() => {
        return {
            userContext: {
                name: userName,
                role: userRole,
                permissions: {
                    clients: canAccessClients,
                    dossiers: canAccessCases,
                    taches: canAccessTasks,
                    factures: canAccessInvoices
                }
            },
            clients: canAccessClients ? clients.map(c => ({
                id: c.id,
                nom: c.name,
                contact: c.contact,
                dossiersCount: c.cases
            })) : [],
            dossiers: canAccessCases ? cases.map(c => ({
                ref: c.id,
                nom: c.name,
                client: c.client,
                statut: c.status,
                prochaineAudience: c.nextHearing || "Aucune"
            })) : [],
            taches: canAccessTasks ? tasks.map(t => ({
                nom: t.name,
                dossierRef: t.caseId,
                avocat: t.lawyer,
                echeance: t.dueDate,
                statut: t.status
            })) : [],
            factures: canAccessInvoices ? invoices.map(i => ({
                id: i.id,
                dossierRef: i.caseId,
                echeance: i.dueDate,
                total: i.totalAmount,
                paye: i.paidAmount,
                du: i.totalAmount - i.paidAmount,
                statut: i.status
            })) : [],
            stats: {
                totalDu: canAccessInvoices ? invoices.reduce((acc, inv) => acc + (inv.totalAmount - inv.paidAmount), 0) : "Accès non autorisé pour ce rôle",
                tachesEnRetard: canAccessTasks ? tasks.filter(t => t.status !== 'Effectué' && new Date(t.dueDate) < new Date()).length : 0
            }
        };
    }, [clients, cases, tasks, invoices, currentUser, userRole, userName, canAccessClients, canAccessCases, canAccessTasks, canAccessInvoices]);

    // Dynamic suggestions based on user permissions
    const suggestions = useMemo(() => {
        const list: string[] = [];
        if (canAccessCases) {
            list.push("Quels sont les dossiers en cours et leurs prochaines audiences ?");
        }
        if (canAccessTasks) {
            list.push("Liste les tâches urgentes sous forme de tableau");
        }
        if (canAccessClients) {
            list.push("Quels sont les principaux clients actifs du cabinet ?");
        }
        if (canAccessInvoices) {
            list.push("Fais-moi un rapport sur les factures impayées sous forme de tableau");
            list.push("Analyse la rentabilité par client");
        } else {
            list.push("Quels sont les dossiers prioritaires de l'équipe ?");
        }
        return list.slice(0, 5);
    }, [canAccessCases, canAccessTasks, canAccessClients, canAccessInvoices]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    useEffect(() => {
        if (currentConvId && messages.length > 1) {
            setConversations(prev => prev.map(conv => 
                conv.id === currentConvId ? { ...conv, messages: messages } : conv
            ));
        }
    }, [messages]);

    const handleNewChat = () => {
        setCurrentConvId(null);
        setMessages([initialAssistantMessage]);
        setInput('');
        setEditingIndex(null);
    };

    const handleSelectConversation = (conv: Conversation) => {
        setCurrentConvId(conv.id);
        setMessages(conv.messages);
        setEditingIndex(null);
    };

    const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Supprimer cette conversation ?")) {
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConvId === id) {
                handleNewChat();
            }
        }
    };

    const handleClearChat = () => {
        if (window.confirm("Voulez-vous vraiment effacer l'historique de cette conversation ?")) {
            setMessages([initialAssistantMessage]);
            if (currentConvId) {
                setConversations(prev => prev.filter(c => c.id !== currentConvId));
                setCurrentConvId(null);
            }
            setEditingIndex(null);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopyFeedback(index);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const handleFeedback = (index: number, type: 'positive' | 'negative') => {
        setMessages(prev => prev.map((msg, i) => 
            i === index ? { ...msg, feedback: msg.feedback === type ? null : type } : msg
        ));
    };

    const startEditing = (index: number, content: string) => {
        setEditingIndex(index);
        setEditBuffer(content);
    };

    const saveEdit = () => {
        if (editingIndex === null) return;
        setMessages(prev => prev.map((msg, i) => 
            i === editingIndex ? { ...msg, content: editBuffer } : msg
        ));
        setEditingIndex(null);
        setEditBuffer('');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditBuffer('');
    };

    const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
        if (e) e.preventDefault();
        const messageToSend = (overrideInput || input).trim();
        if (!messageToSend || isLoading) return;

        let activeId = currentConvId;
        const newMsg: Message = { role: 'user', content: messageToSend };
        const updatedMessages = [...messages, newMsg];

        if (!activeId) {
            const newId = Date.now().toString();
            const newConv: Conversation = {
                id: newId,
                title: messageToSend.length > 30 ? messageToSend.substring(0, 30) + '...' : messageToSend,
                messages: updatedMessages,
                timestamp: Date.now()
            };
            setConversations(prev => [newConv, ...prev]);
            setCurrentConvId(newId);
            activeId = newId;
        }

        setInput('');
        setMessages(updatedMessages);
        setIsLoading(true);
        setErrorMessage(null);
        setEditingIndex(null);

        // Client-side RBAC Guardrails: Immediate enforcement of data access boundaries
        const lowerInput = messageToSend.toLowerCase();
        const isAskingBilling = /factur|paiement|finance|impay|honoraire|montant|solde|chiffre d'affaire|recette|dette/i.test(lowerInput);
        const isAskingClients = /client|coordonn|contact client|registre client/i.test(lowerInput);
        const isAskingCases = /dossier|affaire|procédure|audience/i.test(lowerInput);
        const isAskingTasks = /tâche|tache|agenda|planning|échéance|echeance/i.test(lowerInput);

        if (isAskingBilling && !canAccessInvoices) {
            const rbacRefusal: Message = {
                role: 'assistant',
                content: `🛡️ **Contrôle d'Accès Sécurisé (RBAC - Habilitation Requise)**\n\nVotre rôle actuel (**${userRole}**) ne dispose pas des privilèges requis pour consulter les **données financières et de facturation** du cabinet KBB.\n\n*Conformément à la politique de confidentialité du cabinet, ces informations sont strictement réservées aux associés et administrateurs.*`,
                feedback: null
            };
            setTimeout(() => {
                setMessages(prev => [...prev, rbacRefusal]);
                setIsLoading(false);
            }, 300);
            return;
        }

        if (isAskingClients && !canAccessClients) {
            const rbacRefusal: Message = {
                role: 'assistant',
                content: `🛡️ **Contrôle d'Accès Sécurisé (RBAC - Habilitation Requise)**\n\nVotre rôle actuel (**${userRole}**) ne dispose pas des habilitations nécessaires pour accéder au **répertoire des clients** du cabinet KBB.\n\n*Veuillez vous rapprocher de la direction ou de votre administrateur pour toute demande d'habilitation spécifique.*`,
                feedback: null
            };
            setTimeout(() => {
                setMessages(prev => [...prev, rbacRefusal]);
                setIsLoading(false);
            }, 300);
            return;
        }

        if (isAskingCases && !canAccessCases) {
            const rbacRefusal: Message = {
                role: 'assistant',
                content: `🛡️ **Contrôle d'Accès Sécurisé (RBAC - Habilitation Requise)**\n\nL'accès au **registre des dossiers contentieux et conseils** n'est pas autorisé pour le profil **${userRole}**.\n\n*Consultez votre supérieur hiérarchique pour obtenir une autorisation sur les dossiers en question.*`,
                feedback: null
            };
            setTimeout(() => {
                setMessages(prev => [...prev, rbacRefusal]);
                setIsLoading(false);
            }, 300);
            return;
        }

        if (isAskingTasks && !canAccessTasks) {
            const rbacRefusal: Message = {
                role: 'assistant',
                content: `🛡️ **Contrôle d'Accès Sécurisé (RBAC - Habilitation Requise)**\n\nL'accès aux **tâches et à l'agenda** du cabinet est restreint pour le profil **${userRole}**.\n\n*Contactez l'administrateur pour activer les permissions nécessaires.*`,
                feedback: null
            };
            setTimeout(() => {
                setMessages(prev => [...prev, rbacRefusal]);
                setIsLoading(false);
            }, 300);
            return;
        }

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
            
            if (apiKey) {
                const ai = new GoogleGenAI({ apiKey });
                
                const systemInstruction = `
                    Tu es Otshudi AI (ou Otsudi IA), l'assistant intelligent et confidentiel du cabinet d'avocats KBB.
                    
                    L'utilisateur actuel en cours de session est : ${userName} (Rôle : ${userRole}).
                    
                    RÈGLES IMPÉRATIVES DE SÉCURITÉ ET CONTRÔLE D'ACCÈS AUX DONNÉES (RBAC) :
                    1. CONTRÔLE STRICT DES HABILITATIONS : Tu dois STRICTEMENT respecter le rôle ("${userRole}") et les niveaux d'accès aux données.
                    2. RESTRICTIONS DE DOMAINE :
                       - Module Clients : ${canAccessClients ? 'AUTORISÉ' : 'NON AUTORISÉ (Accès strictement bloqué)'}
                       - Module Dossiers : ${canAccessCases ? 'AUTORISÉ' : 'NON AUTORISÉ (Accès strictement bloqué)'}
                       - Module Tâches/Agenda : ${canAccessTasks ? 'AUTORISÉ' : 'NON AUTORISÉ (Accès strictement bloqué)'}
                       - Module Facturation/Finances : ${canAccessInvoices ? 'AUTORISÉ' : 'NON AUTORISÉ (Accès strictement bloqué)'}
                    3. REFUS FORMEL ET DÉONTOLOGIQUE : Si l'utilisateur tente d'accéder à un domaine "NON AUTORISÉ", refuse formellement en indiquant que son rôle "${userRole}" n'a pas les droits nécessaires.
                    4. DONNÉES ACCESSIBLES POUR CETTE SESSION :
                    ${JSON.stringify(dataContextSummary)}
    
                    5. GÉNÉRATION DE TABLEAUX FONCTIONNELS ET STRUCTURÉS :
                       - Quand l'utilisateur demande une liste, une synthèse, une comparaison ou un rapport, structure IMPÉRATIVEMENT ta réponse sous forme de TABLEAU Markdown clair et complet (| Colonne 1 | Colonne 2 | ...).
                       - Inclus toujours une ligne d'en-tête et une ligne de séparation (|---|---|...).
                       - Mets en valeur les identifiants clés (ex: **CI-2024-001**, **FACT-001**).
                    6. Langue : Français soigné et professionnel.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [
                        ...messages.filter(m => m.role !== 'assistant' || m !== initialAssistantMessage).map(m => ({
                            role: m.role === 'user' ? 'user' : 'model',
                            parts: [{ text: m.content }]
                        })),
                        { role: 'user', parts: [{ text: messageToSend }] }
                    ],
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.3,
                    }
                });

                const assistantResponse = response.text || "Désolé, je n'ai pas pu formuler de réponse.";
                setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse, feedback: null }]);
            } else {
                // Intelligent Local RBAC Engine fallback if Gemini API is in local preview
                let fallbackResponse = '';

                if (isAskingTasks && canAccessTasks) {
                    fallbackResponse = `Voici le récapitulatif des tâches autorisées pour votre session (${tasks.length} tâche(s) au total) :\n\n| Réf Dossier | Intitulé de la Tâche | Avocat / Responsable | Échéance | Statut |\n|---|---|---|---|---|\n` +
                        tasks.map(t => `| **${t.caseId || 'Général'}** | ${t.name} | ${t.lawyer || 'Non assigné'} | ${t.dueDate || 'N/A'} | ${t.status} |`).join('\n') +
                        `\n\n💡 *Tableau interactif : vous pouvez trier les colonnes, filtrer ou exporter les données.*`;
                } else if (isAskingCases && canAccessCases) {
                    fallbackResponse = `Voici l'état des dossiers auxquels vous avez accès (${cases.length} dossier(s)) :\n\n| Réf Dossier | Intitulé de l'Affaire | Client | Statut | Prochaine Audience |\n|---|---|---|---|---|\n` +
                        cases.map(c => `| **${c.id}** | ${c.name} | ${c.client} | ${c.status} | ${c.nextHearing || 'Aucune'} |`).join('\n') +
                        `\n\n💡 *Cliquez sur les en-têtes pour trier ou utilisez la recherche instantanée.*`;
                } else if (isAskingClients && canAccessClients) {
                    fallbackResponse = `Voici le répertoire des clients autorisés (${clients.length} client(s)) :\n\n| Référence | Nom du Client | Contact | Nombre de Dossiers |\n|---|---|---|---|\n` +
                        clients.map(cl => `| **${cl.id}** | ${cl.name} | ${cl.contact} | ${cl.cases} dossier(s) |`).join('\n');
                } else if (isAskingBilling && canAccessInvoices) {
                    fallbackResponse = `Voici le suivi des factures et règlements (${invoices.length} facture(s)) :\n\n| Réf Facture | Dossier | Échéance | Montant Total | Montant Réglé | Reste Dû | Statut |\n|---|---|---|---|---|---|---|\n` +
                        invoices.map(inv => {
                            const due = inv.totalAmount - inv.paidAmount;
                            return `| **${inv.id}** | ${inv.caseId} | ${inv.dueDate} | $${inv.totalAmount.toLocaleString()} | $${inv.paidAmount.toLocaleString()} | $${due.toLocaleString()} | ${inv.status} |`;
                        }).join('\n');
                } else {
                    fallbackResponse = `Bonjour **${userName}** (Rôle : **${userRole}**).\n\nEn tant qu'assistant **Otshudi AI**, voici vos droits d'accès aux données du cabinet :\n- **Dossiers :** ${canAccessCases ? '✅ Accessible' : '🔒 Bloqué'}\n- **Tâches & Agenda :** ${canAccessTasks ? '✅ Accessible' : '🔒 Bloqué'}\n- **Clients :** ${canAccessClients ? '✅ Accessible' : '🔒 Bloqué'}\n- **Facturation & Finances :** ${canAccessInvoices ? '✅ Accessible' : '🔒 Bloqué'}\n\nVous pouvez me demander de générer un tableau des dossiers, des tâches urgentes ou des clients.`;
                }

                setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse, feedback: null }]);
            }
        } catch (error) {
            console.error("AI Error:", error);
            setErrorMessage("Erreur de communication avec le service d'intelligence artificielle.");
        } finally {
            setIsLoading(false);
        }
    };

    // Advanced Markdown & Functional Table Renderer
    const renderContent = (content: string) => {
        const lines = content.split('\n');
        const renderedBlocks: React.ReactNode[] = [];
        let currentTableLines: string[] = [];

        const flushCurrentTable = (key: number) => {
            if (currentTableLines.length > 0) {
                renderedBlocks.push(
                    <FunctionalAiTable
                        key={`table-${key}`}
                        rawLines={[...currentTableLines]}
                        isDarkMode={isDarkMode}
                    />
                );
                currentTableLines = [];
            }
        };

        lines.forEach((line, idx) => {
            const trimmed = line.trim();

            if (trimmed.startsWith('|') || (trimmed.includes('|') && (trimmed.includes('---') || trimmed.includes('|-')))) {
                currentTableLines.push(line);
            } else {
                flushCurrentTable(idx);

                if (!trimmed) {
                    return;
                }

                // Render Headings
                if (trimmed.startsWith('### ')) {
                    renderedBlocks.push(
                        <h4 key={`h3-${idx}`} className={`text-sm font-extrabold mt-3 mb-1 ${isDarkMode ? 'text-indigo-300' : 'text-[#15447c]'}`}>
                            {trimmed.slice(4)}
                        </h4>
                    );
                } else if (trimmed.startsWith('## ')) {
                    renderedBlocks.push(
                        <h3 key={`h2-${idx}`} className={`text-base font-extrabold mt-3 mb-1.5 ${isDarkMode ? 'text-indigo-200' : 'text-[#15447c]'}`}>
                            {trimmed.slice(3)}
                        </h3>
                    );
                } else if (trimmed.startsWith('# ')) {
                    renderedBlocks.push(
                        <h2 key={`h1-${idx}`} className={`text-lg font-black mt-4 mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {trimmed.slice(2)}
                        </h2>
                    );
                } else if (trimmed.startsWith('> ')) {
                    renderedBlocks.push(
                        <div key={`quote-${idx}`} className={`pl-3 py-1 my-2 border-l-3 rounded-r-lg text-xs font-medium italic ${
                            isDarkMode ? 'border-indigo-500 bg-indigo-950/20 text-slate-300' : 'border-indigo-600 bg-indigo-50/50 text-slate-700'
                        }`}>
                            {trimmed.slice(2)}
                        </div>
                    );
                } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    renderedBlocks.push(
                        <div key={`bullet-${idx}`} className={`flex items-start gap-2 my-1 text-xs leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            <span className="text-indigo-500 font-bold mt-0.5">•</span>
                            <span>{renderFormattedText(trimmed.slice(2))}</span>
                        </div>
                    );
                } else if (/^\d+\.\s/.test(trimmed)) {
                    const match = trimmed.match(/^(\d+)\.\s(.*)$/);
                    if (match) {
                        renderedBlocks.push(
                            <div key={`num-${idx}`} className={`flex items-start gap-2 my-1 text-xs leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                <span className="text-indigo-500 font-extrabold text-[11px] min-w-[16px]">{match[1]}.</span>
                                <span>{renderFormattedText(match[2])}</span>
                            </div>
                        );
                    }
                } else {
                    renderedBlocks.push(
                        <p key={`p-${idx}`} className={`text-xs my-1.5 leading-relaxed font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-850'}`}>
                            {renderFormattedText(line)}
                        </p>
                    );
                }
            }
        });

        flushCurrentTable(lines.length);

        return <div className="space-y-1">{renderedBlocks}</div>;
    };

    // Formats inline markdown (bold, code, identifiers)
    const renderFormattedText = (text: string) => {
        // Parse bold **text** and code `text`
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-extrabold text-indigo-700 dark:text-indigo-300">{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={i} className="px-1 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">{part.slice(1, -1)}</code>;
                    }
                    return part;
                })}
            </span>
        );
    };

    return (
        <div className={`flex h-full max-h-screen -m-4 sm:-m-6 lg:-m-8 transition-colors duration-500 relative ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
            {/* Sidebar Backdrop on Mobile */}
            {isHistoryOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-20 md:hidden transition-opacity"
                    onClick={() => setIsHistoryOpen(false)}
                />
            )}

            {/* Sidebar History */}
            <div className={`absolute md:relative z-30 md:z-auto w-72 border-r flex flex-col h-full overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-slate-100 border-slate-200 shadow-inner'} ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className={`p-4 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                    <button 
                        onClick={() => { handleNewChat(); setIsHistoryOpen(false); }}
                        className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-500/30 font-semibold text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Nouvelle Discussion</span>
                    </button>
                    {/* Close sidebar button on Mobile */}
                    <button
                        onClick={() => setIsHistoryOpen(false)}
                        className={`md:hidden ml-2 p-2 rounded-xl border ${isDarkMode ? 'border-gray-800 text-gray-400 hover:bg-gray-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Historique</h2>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-gray-800 text-gray-600' : 'border-slate-200 text-slate-400'}`}>
                            {conversations.length} sessions
                        </span>
                    </div>
                    {conversations.length === 0 ? (
                        <div className={`text-xs text-center py-10 px-4 space-y-2 ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="italic">Aucune discussion sauvegardée</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div 
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                                    currentConvId === conv.id 
                                    ? (isDarkMode ? 'bg-gray-800 border-indigo-500/50 text-indigo-400 shadow-lg' : 'bg-white border-indigo-200 shadow-md text-indigo-700') 
                                    : (isDarkMode ? 'border-transparent hover:bg-gray-800 text-gray-400' : 'border-transparent hover:bg-slate-200 text-slate-600')
                                }`}
                            >
                                <div className="flex items-center space-x-3 truncate">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 flex-shrink-0 ${currentConvId === conv.id ? 'text-indigo-500' : (isDarkMode ? 'text-gray-600' : 'text-slate-400')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    <div className="flex flex-col truncate">
                                        <span className="text-xs font-semibold truncate">{conv.title}</span>
                                        <span className="text-[9px] opacity-50 font-medium">
                                            {new Date(conv.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-slate-400 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Data context status bar */}
                <div className={`p-4 border-t text-[10px] space-y-2 font-bold tracking-tighter transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                            Données synchronisées
                        </span>
                        <span className="uppercase opacity-50">v2.1</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className={`p-2 rounded border ${isDarkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                            {clients.length} Clients | {cases.length} Dossiers
                        </div>
                        <div className={`p-2 rounded border ${isDarkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                            {tasks.length} Tâches | {invoices.length} Factures
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Content */}
            <div className={`flex-1 flex flex-col min-w-0 transition-colors relative ${isDarkMode ? 'bg-gray-950 shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]' : 'bg-white'}`}>
                {/* Discrete Error Toast */}
                {errorMessage && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down w-full max-w-md px-4">
                        <div className={`flex items-center justify-between p-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
                            isDarkMode ? 'bg-red-900/40 border-red-500/50 text-red-100' : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                            <div className="flex items-center space-x-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold">{errorMessage}</span>
                            </div>
                            <button onClick={() => setErrorMessage(null)} className="ml-2 p-1 hover:bg-black/10 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                <div className={`flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-4 sm:p-6 gap-4 border-b transition-all duration-300 ${isDarkMode ? 'border-gray-800 bg-gray-900/20' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        {/* Toggle History Button for Mobile */}
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className={`md:hidden p-2 rounded-xl border transition shrink-0 ${
                                isDarkMode 
                                ? 'bg-gray-800 border-gray-700 text-indigo-400 hover:bg-gray-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Historique"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        <div className="flex flex-col">
                            <h1 className={`text-xl sm:text-2xl font-black flex items-center tracking-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                <span className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-1.5 sm:p-2 rounded-xl mr-2 sm:mr-3 shadow-xl shadow-indigo-500/20">
                                    <AIIcon />
                                </span>
                                Otshudi AI
                            </h1>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    🛡️ Session : {userName} ({userRole})
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${canAccessInvoices ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    {canAccessInvoices ? 'Finances: ✓' : 'Finances: 🔒 Bloqué'}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${canAccessCases ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500'}`}>
                                    {canAccessCases ? 'Dossiers: ✓' : 'Dossiers: 🔒 Bloqué'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2.5">
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 sm:p-2.5 rounded-xl transition-all border hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'}`}
                            title="Changer le thème"
                        >
                            {isDarkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>
                        <button 
                            onClick={handleClearChat}
                            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden xs:inline">Réinitialiser</span>
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className={`flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar transition-colors duration-500 ${isDarkMode ? 'bg-gray-900/30' : 'bg-slate-50/20'}`}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`group relative flex max-w-[95%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} ${msg.role === 'assistant' ? 'mb-6 md:mb-0' : ''}`}>
                                <div className={`flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center font-black shadow-lg transition-all duration-300 group-hover:scale-110 ${
                                    msg.role === 'user' ? 'bg-indigo-600 text-white ml-4 shadow-indigo-500/20' : (isDarkMode ? 'bg-gray-800 text-indigo-400 mr-4 border border-gray-700' : 'bg-white text-indigo-600 mr-4 border border-indigo-100 shadow-indigo-200/50')
                                }`}>
                                    {msg.role === 'user' ? 'U' : 'OA'}
                                </div>
                                <div className={`relative px-6 py-4 rounded-3xl shadow-xl transition-all border duration-300 flex-1 min-w-[200px] ${
                                    msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-500 rounded-tr-none' 
                                    : (isDarkMode ? 'bg-slate-900/95 text-slate-100 border-slate-700/80 rounded-tl-none backdrop-blur-md font-semibold' : 'bg-slate-50/95 text-slate-950 border-slate-300 rounded-tl-none font-semibold shadow-md')
                                }`}>
                                    {editingIndex === idx ? (
                                        <div className="flex flex-col space-y-3">
                                            <textarea
                                                className={`w-full p-3 rounded-xl border text-sm min-h-[150px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                                                    isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                                                }`}
                                                value={editBuffer}
                                                onChange={(e) => setEditBuffer(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                    onClick={cancelEdit}
                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white transition-all"
                                                >
                                                    Annuler
                                                </button>
                                                <button 
                                                    onClick={saveEdit}
                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
                                                >
                                                    Valider
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        renderContent(msg.content)
                                    )}
                                    
                                    {msg.role === 'assistant' && editingIndex === null && (
                                        <div className="absolute -bottom-10 md:bottom-auto right-2 md:-right-14 md:top-0 flex flex-row md:flex-col items-center gap-1.5 md:gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 md:translate-y-0 md:translate-x-2 group-hover:translate-x-0 group-hover:translate-y-0 z-10">
                                            <button 
                                                onClick={() => handleCopy(msg.content, idx)}
                                                className={`p-1.5 md:p-2 border rounded-xl shadow-lg transition-all hover:scale-110 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-indigo-400' : 'bg-white text-gray-400 border-gray-100 hover:text-indigo-600'}`}
                                                title="Copier"
                                            >
                                                {copyFeedback === idx ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2.000a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button 
                                                onClick={() => startEditing(idx, msg.content)}
                                                className={`p-1.5 md:p-2 border rounded-xl shadow-lg transition-all hover:scale-110 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-yellow-400' : 'bg-white text-gray-400 border-gray-100 hover:text-indigo-600'}`}
                                                title="Modifier la réponse"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleFeedback(idx, 'positive')}
                                                className={`p-1.5 md:p-2 border rounded-xl shadow-lg transition-all hover:scale-110 ${msg.feedback === 'positive' ? 'bg-green-500/10 text-green-500 border-green-500/20' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-green-500' : 'bg-white text-gray-400 border-gray-100 hover:text-green-600')}`}
                                                title="Utile"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.708c.944 0 1.708.764 1.708 1.708 0 .178-.027.354-.08.524l-2.09 6.556A1.708 1.708 0 0116.635 20H7V10l3.745-7.489c.355-.71 1.258-.87 1.826-.32l2.429 2.429V10zM7 10H3v10h4V10z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleFeedback(idx, 'negative')}
                                                className={`p-1.5 md:p-2 border rounded-xl shadow-lg transition-all hover:scale-110 ${msg.feedback === 'negative' ? 'bg-red-500/10 text-red-500 border-red-500/20' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-red-500' : 'bg-white text-gray-400 border-gray-100 hover:text-red-600')}`}
                                                title="Inutile"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.292c-.944 0-1.708-.764-1.708-1.708 0-.178.027-.354.08-.524l2.09-6.556A1.708 1.708 0 017.365 4H17v10l-3.745 7.489c-.355.71-1.258.87-1.826.32l-2.429-2.429V14zM17 14h4V4h-4v10z" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className={`flex items-center space-x-4 px-6 py-4 rounded-3xl rounded-tl-none border shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="flex space-x-2">
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                                </div>
                                <span className={`text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Analyse Contextuelle...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={`p-6 border-t transition-all duration-300 ${isDarkMode ? 'bg-gray-900 border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]' : 'bg-white border-slate-100'}`}>
                    <div className="max-w-4xl mx-auto mb-5 overflow-x-auto hide-scrollbar flex space-x-2.5 pb-2">
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(undefined, suggestion)}
                                className={`whitespace-nowrap px-4 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest ${
                                    isDarkMode 
                                    ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-indigo-900/30 hover:text-indigo-400 hover:border-indigo-500/50 hover:shadow-lg' 
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md'
                                }`}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            placeholder="Interrogez l'IA sur un dossier, une facture ou un client spécifique..."
                            className={`w-full p-5 pr-20 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium ${
                                isDarkMode 
                                ? 'bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-500 hover:bg-gray-700/50 shadow-inner' 
                                : 'bg-slate-50 border-slate-200 text-gray-900 placeholder-slate-400 hover:bg-white shadow-sm'
                            }`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="absolute right-3 top-3 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 active:scale-95 disabled:opacity-30 disabled:shadow-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                    <div className="flex justify-center items-center space-x-4 mt-4">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                            Analyse juridique assistée par ordinateur
                        </p>
                    </div>
                </div>
            </div>
            
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translate(-50%, -20px); }
                    100% { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDarkMode ? '#374151' : '#E2E8F0'};
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default AIAssistantPage;
