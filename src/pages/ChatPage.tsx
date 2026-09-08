import React, { FC, useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatIcon } from '../components/Icons';
import { AppUser } from '../types/rbac';

export interface ForumReply {
    id: number;
    author: string;
    role: string;
    text: string;
    time: string;
    isMe?: boolean;
}

export interface ForumTopic {
    id: number;
    title: string;
    category: 'Jurisprudence' | 'Administration' | 'Entraide' | 'Général';
    author: string;
    role: string;
    date: string;
    content: string;
    replies: ForumReply[];
}

export interface ChatContact {
    name: string;
    role: string;
    email: string;
    status: 'online' | 'offline';
    isGeneral?: boolean;
    photo?: string;
}

interface ChatPageProps {
    users?: AppUser[];
    avocats: any[];
    personnels: any[];
    currentUserInfo: { name: string; role: string; email: string } | null;
    presences: { [email: string]: any };
}

const defaultAdminsList = [
    { email: 'admin@cabinet.com', name: 'Administrateur Cabinet', role: 'Directeur Associé KBB' },
    { email: 'jeremieshusu4@gmail.com', name: 'Jérémie Shusu', role: 'Admin Principal' },
    { email: 'hervemich@icloud.com', name: 'Hervé Mich', role: 'Admin Principal' }
];

const initialDefaultTopics: ForumTopic[] = [
    {
        id: 1,
        title: "Nouvelle jurisprudence sur les licenciements collectifs",
        category: "Jurisprudence",
        author: "Jean-Luc Tshisekedi",
        role: "Avocat Associé",
        date: "28 Mai 2026, 10:15",
        content: "Chers confrères, avez-vous pris connaissance du dernier arrêt de la Cour de Cassation concernant les nouveaux barèmes d'indemnisation ? Cela pourrait impacter durablement notre dossier de défense pour Congo Invest SARL.",
        replies: [
            {
                id: 101,
                author: "Marie-Claire Mobutu",
                role: "Avocate Collaboratrice",
                text: "Oui, Jean-Luc. J'allais justement t'en parler. Cet arrêt clarifie que le barème ne s'applique pas en cas de violation caractérisée d'un droit fondamental.",
                time: "Aujourd'hui à 11:30"
            }
        ]
    },
    {
        id: 2,
        title: "Projets de numérisation complète du Tribunal de Grande Instance (TGI)",
        category: "Administration",
        author: "Félicité Kanku",
        role: "Secrétaire Juridique",
        date: "27 Mai 2026, 09:12",
        content: "Bonjour à tous, le secrétariat du greffe a annoncé que le TGI va mettre en route sa nouvelle plateforme d'envoi d'actes dématérialisés dès le mois prochain.",
        replies: []
    }
];

const GENERAL_CHANNEL: ChatContact = {
    name: 'Salon Général du Cabinet',
    role: 'Canal d\'échange d\'équipe (Tous les membres)',
    email: 'general@cabinet.com',
    status: 'online',
    isGeneral: true
};

const QUICK_REPLIES = [
    "👋 Bonjour à tous !",
    "⚖️ Point sur les dossiers en cours",
    "✅ Bien reçu et noté",
    "📅 Audience confirmée",
    "📞 Disponible par téléphone / bureau"
];

const ChatPage: FC<ChatPageProps> = ({ users = [], avocats = [], personnels = [], currentUserInfo, presences = {} }) => {
    // Nav Tabs
    const [activeTab, setActiveTab] = useState<'direct' | 'forum'>('direct');

    // Currently selected conversation: Defaults to Salon Général for immediate interaction
    const [selectedContact, setSelectedContact] = useState<ChatContact>(GENERAL_CHANNEL);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [allRawMessages, setAllRawMessages] = useState<any[]>([]);
    const [isSending, setIsSending] = useState(false);

    // Auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Forum State
    const [forumSearchTerm, setForumSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Tous');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(1);
    const [forumTopics, setForumTopics] = useState<ForumTopic[]>(initialDefaultTopics);

    // Create Topic Form State
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicCategory, setNewTopicCategory] = useState<'Jurisprudence' | 'Administration' | 'Entraide' | 'Général'>('Général');
    const [newTopicContent, setNewTopicContent] = useState('');

    // New Reply State
    const [newReplyText, setNewReplyText] = useState('');

    // Dynamic merged user list
    const registeredUsers = useMemo(() => {
        const usersMap = new Map<string, ChatContact>();

        // 1. Add all AppUser accounts from Firestore (created through User Management)
        if (users && Array.isArray(users)) {
            users.forEach(u => {
                if (!u.isDeleted && u.email) {
                    const cleanEmail = u.email.toLowerCase().trim();
                    usersMap.set(cleanEmail, {
                        name: u.fullName || u.email,
                        role: u.functionRole || u.role || 'Collaborateur',
                        email: cleanEmail,
                        status: 'offline',
                        photo: u.photoUrl
                    });
                }
            });
        }

        // 2. Add default admins
        defaultAdminsList.forEach(admin => {
            const cleanEmail = admin.email.toLowerCase().trim();
            if (!usersMap.has(cleanEmail)) {
                usersMap.set(cleanEmail, {
                    name: admin.name,
                    role: admin.role,
                    email: cleanEmail,
                    status: 'offline'
                });
            }
        });

        // 3. Add avocats
        if (avocats && Array.isArray(avocats)) {
            avocats.forEach(av => {
                const email = av.emails && av.emails[0] ? av.emails[0].toLowerCase().trim() : (av.email || '').toLowerCase().trim();
                if (email && !usersMap.has(email)) {
                    usersMap.set(email, {
                        name: av.fullName,
                        role: av.cabinetRole || av.cabinetStatus || "Avocat",
                        email,
                        status: 'offline',
                        photo: av.photoUrl
                    });
                }
            });
        }

        // 4. Add personnels
        if (personnels && Array.isArray(personnels)) {
            personnels.forEach(p => {
                const email = (p.email || '').toLowerCase().trim();
                if (email && !usersMap.has(email)) {
                    usersMap.set(email, {
                        name: p.fullName,
                        role: p.role || "Secrétaire",
                        email,
                        status: 'offline',
                        photo: p.photo
                    });
                }
            });
        }

        // Apply online status from presences prop
        return Array.from(usersMap.values()).map(user => {
            const presence = presences?.[user.email];
            const isOnline = presence?.status === 'online';
            return {
                ...user,
                status: (isOnline ? 'online' : 'offline') as 'online' | 'offline'
            };
        });
    }, [users, avocats, personnels, presences]);

    // Current user helpers
    const myEmail = (currentUserInfo?.email || '').toLowerCase().trim();
    const myName = (currentUserInfo?.name || 'Moi').trim();
    const myRole = (currentUserInfo?.role || 'Collaborateur').trim();

    // 1. Real-time Firestore listener for chat messages
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'chat_messages'), (snapshot) => {
            const msgs: any[] = [];
            snapshot.forEach((docSnap) => {
                msgs.push({ id: docSnap.id, ...docSnap.data() });
            });
            msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setAllRawMessages(msgs);

            // Seed initial welcoming messages in general channel if completely empty
            const generalMsgs = msgs.filter(m => m.channel === 'general' || m.recipientEmail === 'general@cabinet.com');
            if (generalMsgs.length === 0) {
                const welcomeMsg = {
                    id: `msg_welcome_${Date.now()}`,
                    senderEmail: 'admin@cabinet.com',
                    senderName: 'Directeur Associé KBB',
                    senderRole: 'Direction du Cabinet',
                    recipientEmail: 'general@cabinet.com',
                    recipientName: 'Salon Général du Cabinet',
                    channel: 'general',
                    text: 'Bienvenue sur le Salon Général du cabinet KBB ! Utilisez cet espace pour échanger en direct avec tous vos confrères et collaborateurs.',
                    timestamp: Date.now() - 3600000,
                    time: '10:00'
                };
                setDoc(doc(db, 'chat_messages', welcomeMsg.id), welcomeMsg).catch(() => {});
            }
        }, (err) => {
            console.warn("Direct Messages subscription notice:", err?.message);
        });
        return () => unsub();
    }, []);

    // 2. Real-time Firestore listener for forum topics
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'forum_topics'), (snapshot) => {
            if (snapshot.empty) {
                // Seed initial topics if empty
                initialDefaultTopics.forEach(async (topic) => {
                    try {
                        await setDoc(doc(db, 'forum_topics', String(topic.id)), topic);
                    } catch (e) {
                        console.warn("Failed seeding forum topic:", e);
                    }
                });
            } else {
                const topics: ForumTopic[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as any;
                    topics.push({
                        id: typeof data.id === 'number' ? data.id : Number(data.id) || 1,
                        title: data.title || '',
                        category: data.category || 'Général',
                        author: data.author || 'Anonyme',
                        role: data.role || 'Membre',
                        date: data.date || '',
                        content: data.content || '',
                        replies: data.replies || []
                    } as ForumTopic);
                });
                topics.sort((a, b) => Number(b.id) - Number(a.id));
                setForumTopics(topics);
            }
        }, (err) => {
            console.warn("Forum Topics subscription notice:", err?.message);
        });
        return () => unsub();
    }, []);

    // Filter messages for currently selected contact or general room
    const activeContactMessages = useMemo(() => {
        if (!selectedContact) return [];

        if (selectedContact.isGeneral) {
            // General channel: all messages posted to general
            return allRawMessages
                .filter(m => m.channel === 'general' || m.recipientEmail === 'general@cabinet.com')
                .map(m => {
                    const isMe = (m.senderEmail && m.senderEmail.toLowerCase().trim() === myEmail) || 
                                 (m.senderName && m.senderName.toLowerCase().trim() === myName.toLowerCase());
                    return {
                        id: m.id,
                        sender: isMe ? 'me' : 'them',
                        senderName: m.senderName || 'Membre du Cabinet',
                        senderRole: m.senderRole || 'Collaborateur',
                        text: m.text,
                        time: m.time || new Date(m.timestamp || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    };
                });
        }

        // Direct private 1-to-1 conversation
        const contactEmail = (selectedContact.email || '').toLowerCase().trim();
        const contactName = (selectedContact.name || '').toLowerCase().trim();

        const filtered = allRawMessages.filter(m => {
            const sEmail = (m.senderEmail || '').toLowerCase().trim();
            const rEmail = (m.recipientEmail || '').toLowerCase().trim();
            const sName = (m.senderName || '').toLowerCase().trim();
            const rName = (m.recipientName || '').toLowerCase().trim();

            const isMatchByEmail = (sEmail === myEmail && rEmail === contactEmail) || (sEmail === contactEmail && rEmail === myEmail);
            const isMatchByName = (sName === myName.toLowerCase() && rName === contactName) || (sName === contactName && rName === myName.toLowerCase());

            return isMatchByEmail || isMatchByName;
        });

        return filtered.map(m => {
            const isMe = (m.senderEmail?.toLowerCase().trim() === myEmail || m.senderName?.toLowerCase().trim() === myName.toLowerCase());
            return {
                id: m.id,
                sender: isMe ? 'me' : 'them',
                senderName: m.senderName || selectedContact.name,
                senderRole: m.senderRole || selectedContact.role,
                text: m.text,
                time: m.time || new Date(m.timestamp || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            };
        });
    }, [allRawMessages, selectedContact, myEmail, myName]);

    // Auto-scroll to bottom whenever active messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeContactMessages.length, selectedContact]);

    // Send a message (General or Direct)
    const sendMessageText = async (textToSend: string) => {
        if (!textToSend.trim() || !selectedContact) return;
        setIsSending(true);

        const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newMsgDoc = {
            id: msgId,
            senderEmail: myEmail || 'cabinet@kbb.cd',
            senderName: myName,
            senderRole: myRole,
            recipientEmail: selectedContact.isGeneral ? 'general@cabinet.com' : selectedContact.email.toLowerCase().trim(),
            recipientName: selectedContact.name,
            channel: selectedContact.isGeneral ? 'general' : 'direct',
            text: textToSend.trim(),
            timestamp: Date.now(),
            time: timeStr
        };

        try {
            await setDoc(doc(db, 'chat_messages', msgId), newMsgDoc);
        } catch (err) {
            console.error("Failed to post message to Firestore:", err);
        } finally {
            setIsSending(false);
            setNewMessage('');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendMessageText(newMessage);
    };

    const handleQuickReply = (text: string) => {
        sendMessageText(text);
    };

    // Post reply on forum
    const handlePostReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newReplyText.trim() === '' || selectedTopicId === null) return;

        const replyText = newReplyText.trim();
        setNewReplyText('');

        const topicToUpdate = forumTopics.find(t => t.id === selectedTopicId);
        if (!topicToUpdate) return;

        const newReply: ForumReply = {
            id: Date.now(),
            author: myName,
            role: myRole,
            text: replyText,
            time: "À l'instant",
            isMe: true
        };

        const updatedReplies = [...(topicToUpdate.replies || []), newReply];

        // Optimistic update
        setForumTopics(prev => prev.map(t => t.id === selectedTopicId ? { ...t, replies: updatedReplies } : t));

        // Firestore update
        try {
            await setDoc(doc(db, 'forum_topics', String(selectedTopicId)), {
                ...topicToUpdate,
                replies: updatedReplies
            }, { merge: true });
        } catch (err) {
            console.error("Failed to post forum reply to Firestore:", err);
        }
    };

    // Create topic action
    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newTopicTitle.trim() === '' || newTopicContent.trim() === '') return;

        const topicId = Date.now();
        const newTopic: ForumTopic = {
            id: topicId,
            title: newTopicTitle.trim(),
            category: newTopicCategory,
            author: myName,
            role: myRole,
            date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + `, ` + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            content: newTopicContent.trim(),
            replies: []
        };

        setSelectedTopicId(topicId);
        setIsCreatingTopic(false);
        setNewTopicTitle('');
        setNewTopicContent('');
        setNewTopicCategory('Général');

        setForumTopics(prev => [newTopic, ...prev]);

        try {
            await setDoc(doc(db, 'forum_topics', String(topicId)), newTopic);
        } catch (err) {
            console.error("Failed to create topic in Firestore:", err);
        }
    };

    // Filter contacts list (excluding current user)
    const filteredChatUsers = registeredUsers.filter(u => 
        u.email !== myEmail &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const onlineUsersCount = registeredUsers.filter(u => u.status === 'online').length;

    const filteredForumTopics = forumTopics.filter(topic => {
        const matchesSearch = topic.title.toLowerCase().includes(forumSearchTerm.toLowerCase()) || 
                              topic.content.toLowerCase().includes(forumSearchTerm.toLowerCase()) ||
                              topic.author.toLowerCase().includes(forumSearchTerm.toLowerCase());
        const matchesCategory = selectedCategoryFilter === 'Tous' || topic.category === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const activeForumTopic = forumTopics.find(t => t.id === selectedTopicId) || null;

    const getCategoryBadgeClass = (category: string) => {
        switch (category) {
            case 'Jurisprudence': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Administration': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'Entraide': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Page Header and Tab Switching Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                        <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <ChatIcon />
                        </span>
                        Espace Communication & Chat
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Échangez en temps réel avec tous les avocats et collaborateurs du cabinet KBB.
                    </p>
                </div>

                {/* Main Tabs Changer */}
                <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('direct');
                            setIsCreatingTopic(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'direct' 
                                ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-700 dark:text-indigo-300' 
                                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        Messagerie d'Équipe
                        <span className="bg-emerald-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                            {onlineUsersCount} en ligne
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('forum')}
                        className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'forum' 
                                ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-700 dark:text-indigo-300' 
                                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Forum du Cabinet
                        <span className="bg-indigo-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                            {forumTopics.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Content Area split wrapper with fixed standard height */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex h-[640px] overflow-hidden">
                
                {/* 1. VIEW MESSAGERIE */}
                {activeTab === 'direct' && (
                    <>
                        {/* Left Side: Canal général + Collaborateurs list */}
                        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-150 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 ${selectedContact && !selectedContact.isGeneral ? 'hidden md:flex' : 'flex'}`}>
                            
                            {/* PINNED SALON GÉNÉRAL BUTTON */}
                            <div className="p-3 border-b border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <button
                                    type="button"
                                    onClick={() => setSelectedContact(GENERAL_CHANNEL)}
                                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between border ${
                                        selectedContact?.isGeneral 
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700' 
                                            : 'bg-indigo-50/60 dark:bg-indigo-950/30 text-slate-800 dark:text-slate-200 border-indigo-200/70 dark:border-indigo-800/50 hover:bg-indigo-100/60'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
                                            selectedContact?.isGeneral ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white shadow-2xs'
                                        }`}>
                                            🏢
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-black truncate">Salon Général</p>
                                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                                    selectedContact?.isGeneral ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                                }`}>
                                                    Tous
                                                </span>
                                            </div>
                                            <p className={`text-[10px] font-medium truncate mt-0.5 ${
                                                selectedContact?.isGeneral ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                Canal d'échange de tout le cabinet
                                            </p>
                                        </div>
                                    </div>
                                    <span className="flex h-2.5 w-2.5 relative shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                </button>
                            </div>

                            {/* Search Filter for Contacts */}
                            <div className="p-3 border-b border-gray-150 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                                        Discussions Privées ({filteredChatUsers.length})
                                    </label>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        {onlineUsersCount} actifs
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Rechercher un avocat, secrétaire..."
                                        className="w-full p-2 pl-8 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* List of colleagues */}
                            <ul className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
                                {filteredChatUsers.length === 0 ? (
                                    <li className="p-6 text-center text-xs text-slate-400 font-semibold">
                                        Aucun collaborateur trouvé pour "{searchTerm}"
                                    </li>
                                ) : (
                                    filteredChatUsers.map(person => (
                                        <li key={person.email}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedContact(person)}
                                                className={`w-full text-left p-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 flex items-center justify-between transition-all duration-150 ${
                                                    selectedContact?.email === person.email && !selectedContact?.isGeneral 
                                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600' 
                                                        : 'border-l-4 border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3 min-w-0">
                                                    <div className="relative flex-shrink-0">
                                                        {person.photo ? (
                                                            <img 
                                                                src={person.photo} 
                                                                alt={person.name} 
                                                                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                                                                {person.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                                            person.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                                        }`}></span>
                                                    </div>
                                                    
                                                    <div className="min-w-0">
                                                        <p className={`text-xs font-bold leading-tight truncate ${
                                                            selectedContact?.email === person.email && !selectedContact?.isGeneral 
                                                                ? 'text-indigo-900 dark:text-indigo-300' 
                                                                : 'text-slate-800 dark:text-slate-200'
                                                        }`}>
                                                            {person.name}
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                                            {person.role}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {person.status === 'online' ? (
                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide shrink-0">
                                                        En ligne
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                                        Absent
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Right Side: Active conversation stream */}
                        <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${selectedContact ? 'flex' : 'hidden md:flex'}`}>
                            {/* Conversation Header banner */}
                            <div className="p-3.5 sm:p-4 border-b border-gray-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/90">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => setSelectedContact(GENERAL_CHANNEL)}
                                        className="md:hidden text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mr-1"
                                    >
                                        ← Salon
                                    </button>
                                    <div className="relative shrink-0">
                                        {selectedContact.isGeneral ? (
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                                🏢
                                            </div>
                                        ) : selectedContact.photo ? (
                                            <img 
                                                src={selectedContact.photo} 
                                                alt={selectedContact.name} 
                                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" 
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                {selectedContact.name.charAt(0)}
                                            </div>
                                        )}
                                        <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                            selectedContact.isGeneral || selectedContact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                                        }`}></span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{selectedContact.name}</h2>
                                            {selectedContact.isGeneral && (
                                                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.2 rounded-full">
                                                    Canal Équipe
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center mt-0.5">
                                            {selectedContact.isGeneral ? (
                                                `Canal public du cabinet • ${onlineUsersCount} collaborateur(s) connecté(s)`
                                            ) : (
                                                <>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${selectedContact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'} mr-1.5`}></span>
                                                    {selectedContact.role} • {selectedContact.status === 'online' ? 'Disponible pour échanger' : 'Actuellement absent(e)'}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 text-2xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {selectedContact.isGeneral ? 'Diffusion Cabinet' : 'Canal Sécurisé'}
                                </div>
                            </div>

                            {/* Messages list */}
                            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/40 dark:bg-slate-950/20 space-y-3.5 custom-scrollbar">
                                {activeContactMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-3">
                                            💬
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Aucun message pour l'instant</h3>
                                        <p className="text-xs text-slate-400 max-w-xs mt-1">
                                            Envoyez un premier message ou utilisez les réponses rapides ci-dessous pour lancer l'échange !
                                        </p>
                                    </div>
                                ) : (
                                    activeContactMessages.map((msg, index) => {
                                        const isMe = msg.sender === 'me';
                                        return (
                                            <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] sm:max-w-md lg:max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                    {/* Sender info in Salon Général when not me */}
                                                    {selectedContact.isGeneral && !isMe && (
                                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                                            <span className="text-[10.5px] font-extrabold text-indigo-700 dark:text-indigo-400">
                                                                {msg.senderName}
                                                            </span>
                                                            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                                                {msg.senderRole}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className={`px-4 py-2.5 rounded-2xl border text-xs leading-relaxed font-medium shadow-3xs ${
                                                        isMe 
                                                            ? 'bg-indigo-600 text-white border-transparent rounded-br-xs' 
                                                            : 'bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 border-gray-200 dark:border-slate-700 rounded-bl-xs'
                                                    }`}>
                                                        <p className="whitespace-pre-line">{msg.text}</p>
                                                        <p className={`text-[9px] mt-1 font-semibold text-right ${
                                                            isMe ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                            {msg.time}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Action Pills & Reply Form */}
                            <div className="p-3 sm:p-4 border-t border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                                {/* Quick interaction pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
                                    <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                                        Réponses directes :
                                    </span>
                                    {QUICK_REPLIES.map((quickText, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleQuickReply(quickText)}
                                            className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-650 dark:text-slate-300 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition shrink-0 whitespace-nowrap"
                                        >
                                            {quickText}
                                        </button>
                                    ))}
                                </div>

                                {/* Form Input */}
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        placeholder={
                                            selectedContact.isGeneral 
                                                ? "Écrire un message à toute l'équipe du cabinet (Appuyez sur Entrée pour envoyer)..." 
                                                : `Écrire un message confidentiel pour ${selectedContact.name}...`
                                        }
                                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        disabled={isSending}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!newMessage.trim() || isSending}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition duration-200 shadow-sm flex-shrink-0 flex items-center justify-center" 
                                        title="Envoyer le message"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </>
                )}

                {/* 2. VIEW FORUM OF DISCUSSIONS */}
                {activeTab === 'forum' && (
                    <>
                        {/* Left Subpanel: Threads index & filters */}
                        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-150 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 ${(selectedTopicId || isCreatingTopic) ? 'hidden md:flex' : 'flex'}`}>
                            
                            {/* Thread Search, Category pills and Topic creator trigger */}
                            <div className="p-3.5 border-b border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Thématiques Juridiques
                                    </label>
                                    {!isCreatingTopic && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingTopic(true)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold rounded-lg transition shadow-2xs"
                                        >
                                            + Nouveau Sujet
                                        </button>
                                    )}
                                </div>

                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Filtrer par titre ou contenu..."
                                        className="w-full p-2 pl-8 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        value={forumSearchTerm}
                                        onChange={(e) => setForumSearchTerm(e.target.value)}
                                    />
                                    <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {['Tous', 'Jurisprudence', 'Administration', 'Entraide', 'Général'].map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategoryFilter(cat)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                                                selectedCategoryFilter === cat 
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Threads list */}
                            <ul className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
                                {filteredForumTopics.length === 0 ? (
                                    <li className="p-6 text-center text-xs text-slate-400 font-semibold">
                                        Aucun sujet correspondant dans le forum.
                                    </li>
                                ) : (
                                    filteredForumTopics.map(topic => (
                                        <li key={topic.id}>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedTopicId(topic.id); setIsCreatingTopic(false); }}
                                                className={`w-full text-left p-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition border-l-4 ${
                                                    selectedTopicId === topic.id && !isCreatingTopic 
                                                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600' 
                                                        : 'border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${getCategoryBadgeClass(topic.category)}`}>
                                                        {topic.category}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-semibold">{topic.date.split(',')[0]}</span>
                                                </div>
                                                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{topic.title}</h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{topic.content}</p>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                    <span>Par {topic.author}</span>
                                                    <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                                                        💬 {topic.replies.length}
                                                    </span>
                                                </div>
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Right Subpanel: Topic Creator or Selected Thread */}
                        <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${(selectedTopicId || isCreatingTopic) ? 'flex' : 'hidden md:flex'}`}>
                            {isCreatingTopic ? (
                                <div className="flex flex-col h-full p-6 overflow-y-auto">
                                    <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3 mb-4">
                                        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                            Créer un nouveau sujet de discussion
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingTopic(false)}
                                            className="text-xs font-bold text-slate-400 hover:text-slate-700"
                                        >
                                            Annuler
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateTopic} className="space-y-4 max-w-xl">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Thématique</label>
                                            <select
                                                value={newTopicCategory}
                                                onChange={(e) => setNewTopicCategory(e.target.value as any)}
                                                className="w-full p-2.5 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="Jurisprudence">Jurisprudence</option>
                                                <option value="Administration">Administration</option>
                                                <option value="Entraide">Entraide</option>
                                                <option value="Général">Général</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Titre du sujet</label>
                                            <input
                                                type="text"
                                                placeholder="ex: Réforme du droit des sûretés OHADA..."
                                                className="w-full p-2.5 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                value={newTopicTitle}
                                                onChange={(e) => setNewTopicTitle(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Votre question / exposé</label>
                                            <textarea
                                                rows={5}
                                                placeholder="Détaillez le point de droit ou la question pour solliciter l'avis des confrères..."
                                                className="w-full p-3 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                value={newTopicContent}
                                                onChange={(e) => setNewTopicContent(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                        >
                                            Publier le sujet sur le Forum
                                        </button>
                                    </form>
                                </div>
                            ) : activeForumTopic ? (
                                <div className="flex flex-col h-full bg-white dark:bg-slate-900">
                                    <div className="p-4 border-b border-gray-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedTopicId(null); setIsCreatingTopic(false); }}
                                            className="md:hidden mb-2 text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline"
                                        >
                                            ← Retour aux sujets
                                        </button>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${getCategoryBadgeClass(activeForumTopic.category)}`}>
                                                Sujet : {activeForumTopic.category}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {activeForumTopic.date}
                                            </span>
                                        </div>
                                        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{activeForumTopic.title}</h2>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
                                        {/* Creator Post */}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-3xs">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                                    {activeForumTopic.author.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{activeForumTopic.author}</h3>
                                                    <p className="text-[9px] font-semibold text-slate-400">{activeForumTopic.role}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-750 dark:text-slate-200 leading-relaxed whitespace-pre-line">{activeForumTopic.content}</p>
                                        </div>

                                        {/* Discussion separator */}
                                        <div className="flex items-center gap-2 text-3xs font-black uppercase tracking-widest text-slate-400">
                                            <span className="h-px bg-gray-200 dark:bg-slate-800 flex-1"></span>
                                            <span>Réponses ({activeForumTopic.replies.length})</span>
                                            <span className="h-px bg-gray-200 dark:bg-slate-800 flex-1"></span>
                                        </div>

                                        {/* Replies list */}
                                        {activeForumTopic.replies.length > 0 ? (
                                            activeForumTopic.replies.map(reply => (
                                                <div key={reply.id} className="flex gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-2xs shrink-0">
                                                        {reply.author.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-3xs">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                                                {reply.author} <span className="text-slate-400 font-normal">({reply.role})</span>
                                                            </span>
                                                            <span className="text-[9px] text-slate-400">{reply.time}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-750 dark:text-slate-200 whitespace-pre-line">{reply.text}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-xs text-slate-400 italic">
                                                Aucune réponse pour le moment sur ce sujet. Prenez la parole en complétant le formulaire ci-dessous !
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Reply area form */}
                                    <div className="p-3.5 border-t border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <form onSubmit={handlePostReply} className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                placeholder="Participer à la discussion en publiant votre avis..."
                                                className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                                                value={newReplyText}
                                                onChange={(e) => setNewReplyText(e.target.value)}
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={!newReplyText.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-3 rounded-xl transition duration-200 shadow-sm flex-shrink-0" 
                                                title="Publier ma réponse"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                </svg>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-500 p-8 text-center">
                                    <div>
                                        <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-3">
                                            ⚖️
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Sélectionnez un sujet</h3>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                            Sélectionnez l'une des thématiques à gauche ou cliquez sur "Nouveau Sujet" pour lancer un débat juridique.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default ChatPage;
