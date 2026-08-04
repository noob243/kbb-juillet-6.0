import React, { FC, useState, useEffect, useMemo } from 'react';
import { Mail, Send, X, Check, Loader2, FileText, Plus, Users, ExternalLink, Trash2, Search, Sparkles, BookOpen, UserPlus } from 'lucide-react';
import { dbCreateDoc } from '../../lib/firestoreService';

export interface ContactOption {
  name: string;
  email: string;
  role?: string;
}

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  recipientName?: string;
  attachmentName?: string;
  contacts?: ContactOption[];
  onAddToast?: (type: 'success' | 'error', text: string) => void;
}

export interface SentEmailRecord {
  id: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  date: string;
  status: 'Sent' | 'Delivered' | 'Pending';
}

const EmailComposerModal: FC<EmailComposerModalProps> = ({
  isOpen,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  recipientName = '',
  attachmentName = '',
  contacts = [],
  onAddToast
}) => {
  const [toRecipients, setToRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [showCC, setShowCC] = useState(false);
  
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  
  // Contact picker directory modal
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  // History
  const [sentHistory, setSentHistory] = useState<SentEmailRecord[]>([]);

  // Parse defaultTo into array of emails
  useEffect(() => {
    if (isOpen) {
      if (defaultTo) {
        const parsed = defaultTo
          .split(/[,;\s]+/)
          .map(e => e.trim())
          .filter(e => e.length > 0);
        
        setToRecipients(parsed.length > 0 ? Array.from(new Set(parsed)) : []);
      } else {
        setToRecipients([]);
      }
      setCcRecipients([]);
      setShowCC(false);
      setToInput('');
      setCcInput('');
      setSubject(defaultSubject);
      setBody(defaultBody);
      setIsSent(false);
      setError('');
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody]);

  // Filtered contacts for picker
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) || 
      (c.role && c.role.toLowerCase().includes(q))
    );
  }, [contacts, contactSearch]);

  if (!isOpen) return null;

  // Add email helper
  const handleAddToRecipient = (rawEmail: string) => {
    const trimmed = rawEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError(`L'adresse e-mail "${trimmed}" ne semble pas valide.`);
      return;
    }
    if (toRecipients.includes(trimmed)) {
      setToInput('');
      return;
    }
    setToRecipients(prev => [...prev, trimmed]);
    setToInput('');
    setError('');
  };

  const handleAddCcRecipient = (rawEmail: string) => {
    const trimmed = rawEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError(`L'adresse e-mail CC "${trimmed}" ne semble pas valide.`);
      return;
    }
    if (ccRecipients.includes(trimmed)) {
      setCcInput('');
      return;
    }
    setCcRecipients(prev => [...prev, trimmed]);
    setCcInput('');
    setError('');
  };

  const handleKeyDownTo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', ' '].includes(e.key)) {
      e.preventDefault();
      handleAddToRecipient(toInput);
    }
  };

  const handleKeyDownCc = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', ' '].includes(e.key)) {
      e.preventDefault();
      handleAddCcRecipient(ccInput);
    }
  };

  const removeToRecipient = (emailToRemove: string) => {
    setToRecipients(prev => prev.filter(e => e !== emailToRemove));
  };

  const removeCcRecipient = (emailToRemove: string) => {
    setCcRecipients(prev => prev.filter(e => e !== emailToRemove));
  };

  // Quick select contact
  const handleSelectContact = (email: string, target: 'to' | 'cc' = 'to') => {
    if (target === 'to') {
      if (!toRecipients.includes(email.toLowerCase())) {
        setToRecipients(prev => [...prev, email.toLowerCase()]);
      }
    } else {
      if (!ccRecipients.includes(email.toLowerCase())) {
        setCcRecipients(prev => [...prev, email.toLowerCase()]);
      }
    }
  };

  // Quick Template Injectors
  const applyTemplate = (type: 'facture' | 'pieces' | 'rdv' | 'politesse') => {
    if (type === 'facture') {
      setSubject(prev => prev || "Rappel de facture - Cabinet KBB");
      setBody(prev => prev + (prev ? "\n\n" : "") + "Madame, Monsieur,\n\nSauf erreur de notre part, nous constatons que la facture visée ci-dessus est en attente de règlement. Nous vous prions de bien vouloir procéder à son régularisation dans les meilleurs délais.\n\nSincères salutations,\nL'équipe Cabinet KBB");
    } else if (type === 'pieces') {
      setSubject(prev => prev || "Transmission de pièces justificatives - Cabinet KBB");
      setBody(prev => prev + (prev ? "\n\n" : "") + "Bonjour,\n\nVeuillez trouver ci-joint les pièces et documents relatifs à l'instruction de votre dossier.\n\nRestant à votre entière disposition pour tout renseignement complémentaire.\n\nCordialement,");
    } else if (type === 'rdv') {
      setSubject(prev => prev || "Confirmation de rendez-vous - Cabinet KBB");
      setBody(prev => prev + (prev ? "\n\n" : "") + "Bonjour,\n\nNous vous confirmons notre prochain rendez-vous au sein du Cabinet KBB.\nMerci de vous munir des originaux des pièces présentées.\n\nBien cordialement,");
    } else if (type === 'politesse') {
      setBody(prev => prev + (prev ? "\n\n" : "") + "Veuillez agréer, Madame, Monsieur, l'expression de nos sentiments distingués et dévoués.\n\nCabinet d'Avocats KBB\nSCP Avocats - RDC");
    }
  };

  // Handle Send via System
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there is pending input in toInput that wasn't added yet
    let finalTo = [...toRecipients];
    if (toInput.trim() && toInput.includes('@')) {
      finalTo.push(toInput.trim().toLowerCase());
    }

    let finalCc = [...ccRecipients];
    if (ccInput.trim() && ccInput.includes('@')) {
      finalCc.push(ccInput.trim().toLowerCase());
    }

    if (finalTo.length === 0) {
      setError('Veuillez ajouter au moins un destinataire e-mail valide.');
      return;
    }
    if (!subject.trim()) {
      setError('Veuillez spécifier un sujet d\'e-mail.');
      return;
    }
    if (!body.trim()) {
      setError('Le corps du message ne peut pas être vide.');
      return;
    }

    setIsSending(true);
    setError('');

    const toStr = finalTo.join(', ');
    const ccStr = finalCc.join(', ');

    // 1. Construct mailto link
    let mailtoUrl = `mailto:${encodeURIComponent(toStr)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (ccStr) {
      mailtoUrl += `&cc=${encodeURIComponent(ccStr)}`;
    }

    // 2. Open native mail client automatically so message reaches recipient inbox
    try {
      window.location.href = mailtoUrl;
    } catch (e) {
      console.warn("Could not auto-trigger mailto:", e);
    }

    // Simulate transfer handshake & database archive
    await new Promise(resolve => setTimeout(resolve, 800));

    const newRecord: SentEmailRecord = {
      id: `MSG-${Date.now().toString().slice(-6)}`,
      to: finalTo,
      cc: finalCc,
      subject,
      body,
      date: new Date().toLocaleString('fr-FR'),
      status: 'Sent'
    };

    setSentHistory(prev => [newRecord, ...prev].slice(0, 5));

    // Note: Archiving to correspondances disabled as requested
    setIsSending(false);
    setIsSent(true);

    if (onAddToast) {
      onAddToast('success', `Messagerie ouverte avec succès pour ${finalTo.length} destinataire(s)`);
    }
  };

  // Handle Send via Native Mailto Client
  const handleOpenMailto = () => {
    let finalTo = [...toRecipients];
    if (toInput.trim() && toInput.includes('@')) {
      finalTo.push(toInput.trim().toLowerCase());
    }
    if (finalTo.length === 0) {
      setError('Veuillez spécifier au moins un destinataire pour ouvrir votre logiciel e-mail.');
      return;
    }

    const toJoined = finalTo.join(',');
    const ccJoined = ccRecipients.join(',');
    
    let mailtoUrl = `mailto:${encodeURIComponent(toJoined)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (ccJoined) {
      mailtoUrl += `&cc=${encodeURIComponent(ccJoined)}`;
    }

    // Open mailto link
    window.location.href = mailtoUrl;

    if (onAddToast) {
      onAddToast('success', 'Ouverture de votre messagerie (Outlook/Gmail) en cours...');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[110] flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-3xl w-full border border-gray-100 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#15447c] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-800/80 rounded-xl text-indigo-100 border border-indigo-700/50">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight">Messagerie Sécurisée KBB</h3>
                <span className="bg-indigo-600/60 text-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/40">
                  Infomaniak Pro
                </span>
              </div>
              <p className="text-[11px] text-indigo-200">contact@kbblawfirmscp.com • Envoi d'e-mails & suivi des correspondances</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-indigo-800/50 hover:bg-indigo-800 rounded-xl text-indigo-200 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSent ? (
          /* Success Screen */
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[380px] bg-slate-50/50">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-300 mb-3 animate-bounce">
              <Check className="w-7 h-7 text-emerald-700 stroke-[3]" />
            </div>
            <h4 className="text-base font-black text-slate-800 mb-1">Messagerie déclenchée !</h4>
            <p className="text-xs text-slate-600 max-w-lg mb-4 leading-relaxed">
              Votre message pour <strong className="text-indigo-900">{toRecipients.join(', ')}</strong> a été préparé.
              Votre client de messagerie s'est ouvert automatiquement.
            </p>

            <div className="w-full max-w-md bg-white p-4 rounded-xl border border-slate-200 shadow-2xs mb-5 text-left space-y-2.5">
              <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider block">
                Options d'expédition Webmail directe
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(toRecipients.join(','))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir dans Gmail
                </a>
                <a
                  href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(toRecipients.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir dans Outlook
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`A: ${toRecipients.join(', ')}\nSujet: ${subject}\n\n${body}`);
                  if (onAddToast) onAddToast('success', 'Texte de l\'e-mail copié dans le presse-papier !');
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-200 flex items-center justify-center gap-1.5"
              >
                Copier le texte de l'e-mail
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Fermer la fenêtre
            </button>
          </div>
        ) : (
          /* Composer Content */
          <div className="p-6 overflow-y-auto space-y-4">
            {/* 1. Recipient Chips Input (To) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-3xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-700" />
                  Destinataires Principaux (À / To)
                  {toRecipients.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                      {toRecipients.length}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  {!showCC && (
                    <button 
                      type="button" 
                      onClick={() => setShowCC(true)}
                      className="text-[11px] text-indigo-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Ajouter CC
                    </button>
                  )}
                  {contacts.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setShowContactPicker(!showContactPicker)}
                      className="text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold hover:bg-indigo-100 transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3" /> Annuaire du Cabinet
                    </button>
                  )}
                </div>
              </div>

              {/* Chips container */}
              <div className="p-2 border border-gray-200 rounded-xl bg-slate-50/70 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition min-h-[46px] flex flex-wrap items-center gap-1.5">
                {toRecipients.map((email, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 bg-indigo-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs group"
                  >
                    <span>{email}</span>
                    <button 
                      type="button" 
                      onClick={() => removeToRecipient(email)}
                      className="text-indigo-300 hover:text-white hover:bg-indigo-800 p-0.5 rounded-full transition"
                      title="Retirer ce destinataire"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input 
                  type="text" 
                  value={toInput} 
                  onChange={e => setToInput(e.target.value)}
                  onKeyDown={handleKeyDownTo}
                  onBlur={() => { if (toInput.trim()) handleAddToRecipient(toInput); }}
                  placeholder={toRecipients.length === 0 ? "Tapez une adresse e-mail puis tapez Entrée ou une virgule..." : "+ Autre destinataire..."}
                  className="flex-1 min-w-[200px] text-xs bg-transparent border-none focus:outline-hidden p-1 text-slate-800 placeholder:text-slate-400"
                />

                {toInput.trim() && (
                  <button 
                    type="button" 
                    onClick={() => handleAddToRecipient(toInput)}
                    className="bg-indigo-800 text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-indigo-900 transition shrink-0"
                  >
                    + Ajouter
                  </button>
                )}
              </div>
            </div>

            {/* 2. CC Recipients Input (Optional) */}
            {showCC && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 animate-fadeIn">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-3xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Copie Conforme (CC)
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setShowCC(false); setCcRecipients([]); setCcInput(''); }}
                    className="text-[10px] text-slate-400 hover:text-rose-600 font-bold"
                  >
                    Masquer CC
                  </button>
                </div>

                <div className="p-2 border border-gray-200 rounded-lg bg-white min-h-[40px] flex flex-wrap items-center gap-1.5">
                  {ccRecipients.map((email, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 bg-slate-700 text-white text-xs font-semibold px-2.5 py-0.5 rounded-md"
                    >
                      <span>{email}</span>
                      <button 
                        type="button" 
                        onClick={() => removeCcRecipient(email)}
                        className="text-slate-300 hover:text-white p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <input 
                    type="text" 
                    value={ccInput} 
                    onChange={e => setCcInput(e.target.value)}
                    onKeyDown={handleKeyDownCc}
                    onBlur={() => { if (ccInput.trim()) handleAddCcRecipient(ccInput); }}
                    placeholder="Tapez un e-mail CC puis appuyez sur Entrée..."
                    className="flex-1 min-w-[180px] text-xs bg-transparent border-none focus:outline-hidden p-1 text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {/* Contact Picker Panel (Dropdown) */}
            {showContactPicker && (
              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                    Annuaire des Contacts du Cabinet
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowContactPicker(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input 
                    type="text" 
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    placeholder="Rechercher un client, avocat, personnel..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-indigo-200 rounded-lg bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white p-2 rounded-lg border border-indigo-100">
                  {filteredContacts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">Aucun contact trouvé.</p>
                  ) : (
                    filteredContacts.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 hover:bg-indigo-50/70 rounded-md transition">
                        <div className="truncate pr-2">
                          <strong className="text-slate-800 font-bold">{c.name}</strong>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">&lt;{c.email}&gt;</span>
                          {c.role && (
                            <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-semibold">
                              {c.role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button" 
                            onClick={() => handleSelectContact(c.email, 'to')}
                            className="text-[10px] bg-indigo-800 text-white font-bold px-2 py-0.5 rounded hover:bg-indigo-900 transition"
                          >
                            + À
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setShowCC(true); handleSelectContact(c.email, 'cc'); }}
                            className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded hover:bg-slate-300 transition"
                          >
                            + CC
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Quick suggestions bar if contacts present */}
            {contacts.length > 0 && !showContactPicker && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 shrink-0">Suggestions rapides :</span>
                {contacts.slice(0, 5).map((c, idx) => (
                  <button 
                    key={idx} 
                    type="button"
                    onClick={() => handleSelectContact(c.email, 'to')}
                    className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full shrink-0 transition flex items-center gap-1"
                  >
                    <UserPlus className="w-2.5 h-2.5 text-indigo-600" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 3. Subject Input */}
            <div>
              <label className="block text-3xs font-black text-slate-500 uppercase tracking-wider mb-1">
                Sujet de l'e-mail *
              </label>
              <input 
                type="text" 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                placeholder="ex: Transmission de pièce - Dossier N° KBB-2026-001"
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden bg-slate-50/50 hover:border-gray-300 transition font-medium"
                required
              />
            </div>

            {/* Quick Templates Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Insérer modèle :
              </span>
              <button 
                type="button" 
                onClick={() => applyTemplate('pieces')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition"
              >
                📄 Pièces jointes
              </button>
              <button 
                type="button" 
                onClick={() => applyTemplate('facture')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition"
              >
                💳 Rappel Facture
              </button>
              <button 
                type="button" 
                onClick={() => applyTemplate('rdv')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition"
              >
                📅 Confirmation RDV
              </button>
              <button 
                type="button" 
                onClick={() => applyTemplate('politesse')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition"
              >
                ⚖️ Politesse Avocat
              </button>
            </div>

            {/* 4. Attachment if present */}
            {attachmentName && (
              <div className="bg-indigo-50/70 border border-indigo-150 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-indigo-950 truncate">{attachmentName}</p>
                    <p className="text-[9px] text-indigo-600 font-medium">Document officiel du Cabinet attaché au message</p>
                  </div>
                </div>
                <span className="text-[9px] bg-indigo-200/60 text-indigo-900 font-bold px-2 py-0.5 rounded-full shrink-0">
                  Pièce jointe
                </span>
              </div>
            )}

            {/* 5. Body Textarea */}
            <div>
              <label className="block text-3xs font-black text-slate-500 uppercase tracking-wider mb-1">
                Corps du Message *
              </label>
              <textarea 
                rows={7}
                value={body} 
                onChange={e => setBody(e.target.value)}
                placeholder="Rédigez votre message ici..."
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden bg-white hover:border-gray-300 transition font-sans leading-relaxed"
                required
              />
            </div>

            {error && (
              <p className="text-2xs text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        {!isSent && (
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition duration-150"
            >
              Annuler
            </button>

            <div className="flex items-center gap-2">
              {/* Native Mailto Link Action */}
              <button 
                type="button"
                onClick={handleOpenMailto}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3.5 rounded-xl text-xs transition duration-150 flex items-center gap-1.5"
                title="Ouvre votre client de messagerie installé (Outlook, Apple Mail, Gmail)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span>Ouvrir client Mail (Outlook/Gmail)</span>
              </button>

              {/* Direct System Send Action */}
              <button 
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="bg-[#15447c] hover:bg-indigo-900 text-white font-bold py-2 px-5 rounded-xl text-xs transition duration-150 flex items-center gap-2 disabled:bg-indigo-400 shadow-xs"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer par KBB Mail ({toRecipients.length || 1})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailComposerModal;
