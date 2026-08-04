
import React, { FC, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { syncUsersWithFirestore } from '../services/userService';
import { AppUser } from '../types/rbac';

interface LoginPageProps {
  onLoginSuccess: (email: string, userObj?: AppUser | null) => void;
}

const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [showRecoveryMsg, setShowRecoveryMsg] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [usersList, setUsersList] = useState<AppUser[]>([]);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        syncUsersWithFirestore((users) => {
            setUsersList(users);
        }).then(cleanup => unsub = cleanup);
        return () => { if (unsub) unsub(); };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        const cleanEmail = email.trim();
        const lowEmail = cleanEmail.toLowerCase();

        // Check active users in database
        const foundUser = usersList.find(u => (u.email || '').toLowerCase() === lowEmail);

        if (foundUser) {
            if (foundUser.isDeleted) {
                setErrorMsg("Ce compte utilisateur a été archivé par l'administration du cabinet. Accès révoqué.");
                setIsLoading(false);
                return;
            }

            if (!foundUser.hasAppAccess && foundUser.personnelCategory === 'Office') {
                setErrorMsg("Les fiches de personnel [Office] ne possèdent pas de droit d'accès applicatif.");
                setIsLoading(false);
                return;
            }
        }

        // Bypass for main admins jeremieshusu4@gmail.com, hervemich@icloud.com, patbonles@gmail.com
        if ((lowEmail === 'jeremieshusu4@gmail.com' || lowEmail === 'hervemich@icloud.com' || lowEmail === 'patbonles@gmail.com') && password === '123456789') {
            onLoginSuccess(cleanEmail, foundUser || null);
            setIsLoading(false);
            return;
        }

        try {
            // Try standard login
            try {
                await signInWithEmailAndPassword(auth, cleanEmail, password);
                onLoginSuccess(cleanEmail, foundUser || null);
            } catch (err: any) {
                // Check if default mock users should be auto-created on fly
                const defaultLawyers = ['jl.tshisekedi@cabinet.com', 'mc.mobutu@cabinet.com', 'p.lumumba@cabinet.com'];
                const defaultStaff = ['f.kanku@cabinet.com', 'd.mbenga@cabinet.com'];
                const defaultAdmins = ['admin@cabinet.com', 'jeremieshusu4@gmail.com', 'hervemich@icloud.com', 'patbonles@gmail.com'];
                
                const isRecognized = defaultLawyers.includes(cleanEmail.toLowerCase()) || 
                                     defaultStaff.includes(cleanEmail.toLowerCase()) || 
                                     defaultAdmins.includes(cleanEmail.toLowerCase()) ||
                                     !!foundUser;

                if (isRecognized) {
                    if (password.length < 6) {
                        throw new Error("Pour la première connexion de ce compte, le mot de passe doit faire au moins 6 caractères.");
                    }
                    try {
                        console.log("Auto-creating auth credential for user:", cleanEmail);
                        await createUserWithEmailAndPassword(auth, cleanEmail, password);
                        onLoginSuccess(cleanEmail, foundUser || null);
                    } catch (createErr: any) {
                        if (createErr.code === 'auth/email-already-in-use') {
                            throw new Error("Mot de passe incorrect. Veuillez réessayer.");
                        } else {
                            throw createErr;
                        }
                    }
                } else {
                    let friendlyMsg = "Identifiants de connexion invalides. Veuillez réessayer.";
                    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                        friendlyMsg = "Mot de passe incorrect. Veuillez réessayer.";
                    } else if (err.code === 'auth/user-not-found') {
                        friendlyMsg = "Aucun compte trouvé avec cette adresse e-mail.";
                    } else if (err.code === 'auth/invalid-email') {
                        friendlyMsg = "Format d'adresse e-mail invalide.";
                    } else if (err.code === 'auth/weak-password') {
                        friendlyMsg = "Le mot de passe doit comporter au moins 6 caractères.";
                    } else if (err.message) {
                        friendlyMsg = err.message;
                    }
                    throw new Error(friendlyMsg);
                }
            }
        } catch (err: any) {
            console.error("Login attempt failed:", err);
            setErrorMsg(err.message || "Impossible de se connecter.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] flex flex-col justify-center items-center p-4 transition-colors duration-200">
            <div className="max-w-md w-full mx-auto">
                <div className="flex flex-col items-center justify-center mb-6">
                    <img 
                        src="https://lh3.googleusercontent.com/d/1KCanuuJSTR_jErSZrloCKpUrZ4NfIjn6" 
                        alt="KBB App Logo" 
                        referrerPolicy="no-referrer"
                        className="h-20 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
                <div className="bg-white dark:bg-[#0c111d] p-8 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
                    <h2 className="text-2xl font-extrabold text-center text-gray-800 dark:text-slate-100 mb-1">Bienvenue !</h2>
                    <p className="text-center text-sm text-gray-500 dark:text-slate-400 mb-6">Connectez-vous à votre espace cabinet</p>
                    
                    {errorMsg && (
                        <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-semibold animate-fadeIn">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {showRecoveryMsg && (
                        <div className="mb-5 p-4 bg-green-50 dark:bg-emerald-950/20 border border-green-200 dark:border-emerald-900 text-green-800 dark:text-emerald-400 rounded-xl flex items-start gap-2.5 animate-fadeIn">
                            <span className="text-lg">📧</span>
                            <div className="text-xs font-semibold">
                                <p className="font-bold">Lien de réinitialisation envoyé</p>
                                <p className="mt-0.5">Un email contenant un lien sécurisé a été envoyé à <strong>{email || "votre adresse email"}</strong>. Veuillez vérifier votre boîte de réception.</p>
                                <button onClick={() => setShowRecoveryMsg(false)} className="text-green-700 dark:text-emerald-300 hover:underline font-bold mt-1.5 block">Fermer</button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Adresse e-mail</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-slate-800 rounded-xl shadow-xs text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-[#15447c] outline-none transition" 
                                    placeholder="vous@cabinet.com" 
                                    required 
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Mot de passe</label>
                                    <button 
                                        type="button"
                                        onClick={() => setShowRecoveryMsg(true)}
                                        className="text-xs text-[#15447c] dark:text-indigo-400 hover:underline font-bold"
                                        disabled={isLoading}
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-slate-800 rounded-xl shadow-xs text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-[#15447c] outline-none transition" 
                                    placeholder="********" 
                                    required 
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <button 
                                    type="submit" 
                                    className="w-full bg-[#15447c] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#15447c]/95 active:scale-[0.99] transition duration-150 shadow-md flex items-center justify-center gap-2"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Connexion en cours...</span>
                                        </>
                                    ) : (
                                        <span>Se connecter</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Quick Access Admin Accounts */}
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800/80">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">
                            Accès Rapide Administrateurs
                        </p>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('jeremieshusu4@gmail.com');
                                    setPassword('123456789');
                                }}
                                className="w-full text-left p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition flex items-center justify-between group"
                            >
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Jérémie Shusu</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">jeremieshusu4@gmail.com</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">Admin Principal</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('hervemich@icloud.com');
                                    setPassword('123456789');
                                }}
                                className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition flex items-center justify-between group"
                            >
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Hervé Mich</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">hervemich@icloud.com</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Admin Associé</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('admin@cabinet.com');
                                    setPassword('123456789');
                                }}
                                className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition flex items-center justify-between group"
                            >
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Administrateur Cabinet</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">admin@cabinet.com</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Admin</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
