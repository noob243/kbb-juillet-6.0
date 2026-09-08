
import React, { FC, useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { syncUsersWithFirestore, checkUserPassword, INITIAL_USERS } from '../services/userService';
import { AppUser } from '../types/rbac';

interface LoginPageProps {
  onLoginSuccess: (email: string, userObj?: AppUser | null) => void;
}

const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [showRecoveryMsg, setShowRecoveryMsg] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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

        // 1. Locate user in current usersList, cache, or INITIAL_USERS
        let foundUser = usersList.find(u => (u.email || '').trim().toLowerCase() === lowEmail);

        if (!foundUser) {
            try {
                const cachedUsersStr = localStorage.getItem('kbb_cache_users');
                if (cachedUsersStr) {
                    const cached = JSON.parse(cachedUsersStr);
                    if (Array.isArray(cached)) {
                        foundUser = cached.find((u: AppUser) => (u.email || '').trim().toLowerCase() === lowEmail);
                    }
                }
            } catch (e) {}
        }

        if (!foundUser) {
            foundUser = INITIAL_USERS.find(u => (u.email || '').trim().toLowerCase() === lowEmail);
        }

        // 2. Validate user account status
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

        // 3. Admin quick-bypass credentials
        const isMasterAdminPassword = (lowEmail === 'jeremieshusu4@gmail.com' || lowEmail === 'hervemich@icloud.com' || lowEmail === 'patbonles@gmail.com') && 
            (password === '123456789' || password === 'Cabinet2025!');

        // 4. Verify password against user profile
        const isPasswordMatch = foundUser ? checkUserPassword(foundUser, password) : false;

        try {
            // 5. Attempt direct Firebase Auth login
            let firebaseAuthSuccess = false;
            try {
                await signInWithEmailAndPassword(auth, cleanEmail, password);
                firebaseAuthSuccess = true;
            } catch (authErr: any) {
                console.log("Direct Firebase auth status:", authErr?.code);
            }

            // 6. If either Firebase Auth succeeded or the password matches the user credentials
            if (firebaseAuthSuccess || isPasswordMatch || isMasterAdminPassword) {
                // If Firebase Auth didn't succeed directly (e.g. account not created yet or password updated in app),
                // make sure Firebase Auth has an active session
                if (!firebaseAuthSuccess) {
                    try {
                        if (password.length >= 6) {
                            await createUserWithEmailAndPassword(auth, cleanEmail, password);
                        }
                    } catch (createErr: any) {
                        // User already in Firebase Auth or cannot be created; ensure anonymous sign-in so Firestore works
                        if (!auth.currentUser) {
                            await signInAnonymously(auth).catch(() => {});
                        }
                    }
                }

                onLoginSuccess(cleanEmail, foundUser || null);
                return;
            }

            // 7. If password did NOT match
            if (foundUser) {
                setErrorMsg(`Mot de passe incorrect pour le compte ${cleanEmail}. Veuillez vérifier votre saisie.`);
            } else {
                setErrorMsg(`Aucun compte trouvé avec l'adresse e-mail "${cleanEmail}".`);
            }
        } catch (err: any) {
            console.error("Login attempt error:", err);
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
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        name="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 pr-11 border border-gray-300 dark:border-slate-800 rounded-xl shadow-xs text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-[#15447c] outline-none transition" 
                                        placeholder="Saisissez votre mot de passe" 
                                        required 
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition p-1"
                                        title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                                    <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                                    <span>Les avocats et membres créés se connectent avec leur email et mot de passe défini.</span>
                                </p>
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
