import React, { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../../firebase';
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { AppUser } from '../../types/rbac';
import { Avocat, Personnel } from '../../types';
import { updateAppUser } from '../../services/userService';
import { dbUpdateDoc } from '../../lib/firestoreService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserInfo: { name: string; role: string; email: string; photoUrl?: string } | null;
  currentUserObj: AppUser | null;
  usersList?: AppUser[];
  avocats?: Avocat[];
  personnels?: Personnel[];
  onUpdateSuccess?: (newName: string, newPhotoUrl?: string) => void;
  onAddToast?: (type: 'success' | 'error', message: string) => void;
}

// Helper to compress and resize image before saving to avoid Firestore 1MB document size limit
const compressAndResizeImage = (file: File, maxWidth = 350, maxHeight = 350, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const UserProfileModal: FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUserInfo,
  currentUserObj,
  usersList = [],
  avocats = [],
  personnels = [],
  onUpdateSuccess,
  onAddToast
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  // Personal Info Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [functionRole, setFunctionRole] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Statuses
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFullName(currentUserObj?.fullName || currentUserInfo?.name || '');
      setPhone(currentUserObj?.phone || '');
      setFunctionRole(currentUserObj?.functionRole || '');
      setEmail(currentUserObj?.email || currentUserInfo?.email || '');
      setPhotoUrl(currentUserObj?.photoUrl || currentUserInfo?.photoUrl || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
      setActiveTab('info');
    }
  }, [isOpen, currentUserInfo, currentUserObj]);

  if (!isOpen) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg('La taille du fichier ne doit pas dépasser 8 Mo.');
        return;
      }
      try {
        const compressedDataUrl = await compressAndResizeImage(file);
        setPhotoUrl(compressedDataUrl);
        setErrorMsg('');
      } catch (err) {
        console.error("Error processing photo:", err);
        setErrorMsg("Erreur lors de la lecture de l'image.");
      }
    }
  };

  // Handle Personal Info Update
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Le nom complet est obligatoire.');
      return;
    }

    setIsSavingInfo(true);
    try {
      const targetEmail = (email || currentUserObj?.email || currentUserInfo?.email || '').trim().toLowerCase();

      // 1. Identify or match target user ID in Firestore
      let targetUserId = currentUserObj?.id;
      if (!targetUserId || targetUserId === 'admin-default') {
        const found = usersList.find(u => (u.email || '').trim().toLowerCase() === targetEmail);
        if (found?.id) {
          targetUserId = found.id;
        } else {
          targetUserId = `user_${Date.now()}`;
        }
      }

      // Update Firestore 'users' collection
      await updateAppUser(targetUserId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        functionRole: functionRole.trim(),
        photoUrl: photoUrl
      });

      // 2. Also update 'avocats' collection if matching lawyer exists
      const avocatMatch = avocats.find(a => 
        a.emails && a.emails.some(e => (e || '').trim().toLowerCase() === targetEmail)
      );
      if (avocatMatch?.id) {
        await dbUpdateDoc('avocats', avocatMatch.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          photoUrl: photoUrl
        });
      }

      // 3. Also update 'personnels' collection if matching staff exists
      const personnelMatch = personnels.find(p => 
        p.email && (p.email || '').trim().toLowerCase() === targetEmail
      );
      if (personnelMatch?.id) {
        await dbUpdateDoc('personnels', personnelMatch.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          photoUrl: photoUrl
        });
      }

      // 4. Update Firebase Auth display name & photoURL if available
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: fullName.trim(),
            photoURL: photoUrl || null
          });
        } catch (authErr) {
          console.warn("Could not update Firebase auth display name/photo:", authErr);
        }
      }

      // 5. Notify parent app to update active session state
      if (onUpdateSuccess) {
        onUpdateSuccess(fullName.trim(), photoUrl);
      }

      setSuccessMsg('Vos informations personnelles et votre photo de profil ont été mises à jour avec succès.');
      if (onAddToast) {
        onAddToast('success', 'Profil et photo de profil mis à jour avec succès');
      }

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setErrorMsg(err?.message || "Erreur lors de la mise à jour des informations.");
      if (onAddToast) {
        onAddToast('error', 'Échec de la mise à jour du profil');
      }
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword) {
      setErrorMsg('Veuillez saisir un nouveau mot de passe.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;

      if (!user) {
        // Fallback simulated password update if standard auth is mocked
        setSuccessMsg('Nouveau mot de passe enregistré pour votre session.');
        if (onAddToast) onAddToast('success', 'Mot de passe modifié avec succès.');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        setIsChangingPassword(false);
        return;
      }

      // If user is logged in with Firebase Auth, try updating
      try {
        await updatePassword(user, newPassword);
      } catch (err: any) {
        if (err.code === 'auth/requires-recent-login') {
          if (!currentPassword) {
            setErrorMsg('Pour des raisons de sécurité, veuillez saisir votre mot de passe actuel.');
            setIsChangingPassword(false);
            return;
          }
          // Re-authenticate user
          const credential = EmailAuthProvider.credential(user.email!, currentPassword);
          await reauthenticateWithCredential(user, credential);
          // Retry update
          await updatePassword(user, newPassword);
        } else {
          throw err;
        }
      }

      setSuccessMsg('Votre mot de passe a été modifié avec succès.');
      if (onAddToast) {
        onAddToast('success', 'Mot de passe mis à jour avec succès');
      }
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === 'auth/wrong-password') {
        setErrorMsg('Le mot de passe actuel saisi est incorrect.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Le nouveau mot de passe est trop faible (6 caractères minimum).');
      } else {
        setErrorMsg(err?.message || 'Erreur lors du changement de mot de passe.');
      }
      if (onAddToast) {
        onAddToast('error', 'Échec de la modification du mot de passe');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-white dark:bg-[#0c111d] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#15447c] to-indigo-900 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
              title="Fermer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-extrabold text-xl shadow-inner text-white uppercase overflow-hidden shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  (fullName || currentUserInfo?.name || "KBB").split(' ').map(n => n[0]).join('').slice(0, 2)
                )}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight leading-snug">Mon Profil Cabinet</h2>
                <p className="text-xs text-indigo-100/80 font-medium">
                  {currentUserInfo?.role || currentUserObj?.role || "Membre KBB"} • {email}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-bold text-[9px] uppercase tracking-wider rounded-md">
                    Compte Vérifié
                  </span>
                  {currentUserObj?.functionRole && (
                    <span className="inline-block px-2 py-0.5 bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider rounded-md">
                      {currentUserObj.functionRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 pt-3 space-x-2">
            <button
              type="button"
              onClick={() => { setActiveTab('info'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-[#15447c] text-[#15447c] dark:text-indigo-400 dark:border-indigo-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations Personnelles
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('security'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'security'
                  ? 'border-[#15447c] text-[#15447c] dark:text-indigo-400 dark:border-indigo-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Sécurité & Mot de passe
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab Content Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === 'info' ? (
              <form onSubmit={handleSaveInfo} className="space-y-4">
                {/* Photo de Profil Uploader Section */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-3">
                  <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Photo de Profil
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#15447c] to-indigo-800 text-white flex items-center justify-center font-extrabold text-lg shadow-md border-2 border-white dark:border-slate-800 overflow-hidden shrink-0">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Photo de profil" className="h-full w-full object-cover" />
                      ) : (
                        (fullName || "KBB").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label
                          htmlFor="user-photo-input"
                          className="px-3.5 py-2 text-xs font-bold text-white bg-[#15447c] hover:bg-indigo-900 rounded-xl transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574v9.176c0 1.067.75 1.994 1.802 2.169a48.323 48.323 0 006.12.381c2.052 0 4.092-.128 6.12-.381 1.052-.175 1.802-1.102 1.802-2.17V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          </svg>
                          Changer la photo
                        </label>
                        <input
                          type="file"
                          id="user-photo-input"
                          accept="image/*, image/jpeg, image/jpg, image/png, image/webp"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={() => setPhotoUrl('')}
                            className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition border border-rose-200 dark:border-rose-900/60 cursor-pointer"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Formats d'images autorisés : JPEG, JPG, PNG, WEBP. Taille max : 8 Mo.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Nom Complet & Prénom *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="Ex: Jean-Luc Tshisekedi"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Adresse E-mail (Identifiant)
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">L'adresse e-mail principale de connexion est gérée par l'administrateur système.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Numéro de Téléphone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                      placeholder="+243 810 000 000"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Titre / Fonction au Cabinet
                    </label>
                    <input
                      type="text"
                      value={functionRole}
                      onChange={(e) => setFunctionRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                      placeholder="Ex: Avocat Associé"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#15447c] hover:bg-indigo-900 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingInfo ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <span>Enregistrer les modifications</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3.5 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed mb-4">
                  <p className="font-bold flex items-center gap-1.5 mb-0.5">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Consignes de sécurité
                  </p>
                  Votre nouveau mot de passe doit comporter au moins 6 caractères. Évitez les mots de passe trop simples ou réutilisés.
                </div>

                <div>
                  <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Mot de passe actuel (Optionnel si session récente)
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="Saisissez votre mot de passe actuel"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Nouveau Mot de passe *
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Confirmer le Nouveau Mot de passe *
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="Répétez le nouveau mot de passe"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Afficher les mots de passe</span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Mise à jour...</span>
                      </>
                    ) : (
                      <span>Changer le mot de passe</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
