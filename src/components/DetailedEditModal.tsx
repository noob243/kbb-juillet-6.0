import React, { useState } from 'react';
import { Client, Case, Avocat, Personnel } from '../types';

interface DetailedEditModalProps {
  type: 'client' | 'case' | 'avocat' | 'personnel' | 'event' | 'task' | 'invoice' | 'fournisseur';
  item: any;
  clients: Client[];
  onClose: () => void;
  onSave: (updatedItem: any) => void;
}

export const DetailedEditModal: React.FC<DetailedEditModalProps> = ({
  type,
  item,
  clients,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<any>(() => {
    // Deep clone to avoid mutating item reference during active session editing
    return JSON.parse(JSON.stringify(item));
  });
  const [editTagInput, setEditTagInput] = useState('');
  const [editAdversaryInput, setEditAdversaryInput] = useState('');

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      if (!prev) return prev;
      const up = { ...prev, [field]: value };
      if (field === 'hasChildren' && value === 'Non') {
        up.childrenCount = 0;
      }
      return up;
    });
  };

  const handlePhotoUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleFieldChange(field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    const cleanTag = editTagInput.trim().toLowerCase();
    if (cleanTag) {
      const currentTags = formData.tags || [];
      if (!currentTags.includes(cleanTag)) {
        handleFieldChange('tags', [...currentTags, cleanTag]);
      }
    }
    setEditTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = formData.tags || [];
    handleFieldChange('tags', currentTags.filter((t: string) => t !== tagToRemove));
  };

  const handleAddAdversary = () => {
    const cleanAdversary = editAdversaryInput.trim();
    if (cleanAdversary) {
      const currentAdversaries = formData.adversaires || [];
      if (!currentAdversaries.includes(cleanAdversary)) {
        handleFieldChange('adversaires', [...currentAdversaries, cleanAdversary]);
      }
    }
    setEditAdversaryInput('');
  };

  const handleRemoveAdversary = (adversaryToRemove: string) => {
    const currentAdversaries = formData.adversaires || [];
    handleFieldChange('adversaires', currentAdversaries.filter((a: string) => a !== adversaryToRemove));
  };

  const handleSave = () => {
    if (!formData) return;
    
    // Synergistic sync for Case procedures backward compatibility
    if (type === 'case') {
      const up = { ...formData };
      if (up.procedures && up.procedures.length > 0) {
        const primaryProc = up.procedures[0];
        up.procedure = primaryProc?.name || '';
        up.procedureInstance = primaryProc?.instance || '';
        up.procedureObjet = primaryProc?.objet || '';
        up.procedureDateDebut = primaryProc?.dateDebut || '';
        up.procedureDateFin = primaryProc?.dateFin || '';
        up.procedureStatus = primaryProc?.status || '';
      } else {
        up.procedure = '';
        up.procedureInstance = '';
        up.procedureObjet = '';
        up.procedureDateDebut = '';
        up.procedureDateFin = '';
        up.procedureStatus = '';
      }
      up.adversaire = (up.adversaires || []).join(', ');
      onSave(up);
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              ⚙️ Modification Détaillée – {
                type === 'avocat' ? 'Fiche Avocat' :
                type === 'client' ? 'Fiche Client' :
                type === 'case' ? 'Dossier Judiciaire' :
                type === 'personnel' ? 'Fiche Personnel' :
                type === 'event' ? 'Événement' :
                type === 'task' ? 'Tâche' :
                type === 'invoice' ? 'Facture' :
                'Fiche Fournisseur'
              }
            </h3>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5 font-mono">ID: {formData.id}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-655 transition p-1 hover:bg-slate-100 rounded-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* CASE 1: AVOCAT */}
          {type === 'avocat' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-4 p-3 bg-slate-50 dark:bg-[#121b2d] rounded-2xl border border-slate-150 dark:border-[#1e293b]">
                <div className="relative w-16 h-16 rounded-full bg-slate-200 dark:bg-[#0d1524] overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Photo de profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl">⚖️</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Photo de profil</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('photoUrl', e)}
                    className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-gray-700 hover:file:bg-slate-50 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Format recommandé : Carré, max 2Mo</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  value={formData.fullName || ''} 
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Numéro ONA</label>
                <input 
                  type="text" 
                  value={formData.onaNumber || ''} 
                  onChange={(e) => handleFieldChange('onaNumber', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Niveau / Statut Cabinet</label>
                <select 
                  value={formData.cabinetStatus || 'Junior'} 
                  onChange={(e) => handleFieldChange('cabinetStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Senior of counsel">Senior of counsel</option>
                  <option value="Senior">Senior</option>
                  <option value="Associé">Associé</option>
                  <option value="Junior">Junior</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Statut de Service</label>
                <select 
                  value={formData.serviceStatus || 'Actif'} 
                  onChange={(e) => handleFieldChange('serviceStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Actif">Actif</option>
                  <option value="Omis">Omis</option>
                  <option value="Mise en disponibilité">Mise en disponibilité</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Barreau Principal</label>
                <select 
                  value={formData.mainBar || 'Kinshasa-Gombe'} 
                  onChange={(e) => handleFieldChange('mainBar', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Kinshasa-Gombe">Kinshasa-Gombe</option>
                  <option value="Kinshasa-Matete">Kinshasa-Matete</option>
                  <option value="Lualaba">Lualaba</option>
                  <option value="Haut Katanga">Haut Katanga</option>
                  <option value="Kwilu">Kwilu</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Barreaux Secondaires</label>
                <input 
                  type="text" 
                  value={formData.secondaryBar || ''} 
                  onChange={(e) => handleFieldChange('secondaryBar', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="Ex: Kongo Central, Tshopo..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Rôle Cabinet</label>
                <input 
                  type="text" 
                  value={formData.cabinetRole || ''} 
                  onChange={(e) => handleFieldChange('cabinetRole', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Téléphone Principal</label>
                <input 
                  type="text" 
                  value={formData.phone || ''} 
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Emails (Séparés par des virgules)</label>
                <input 
                  type="text" 
                  value={formData.emails ? formData.emails.join(', ') : ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const emailsArray = val.split(',').map(m => m.trim()).filter(Boolean);
                    setFormData((prev: any) => ({ ...prev, emails: emailsArray }));
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="Ex: d.tshisekedi@kbb.cd, d.tshisekedi@gmail.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Date d'Entrée en Service</label>
                <input 
                  type="date" 
                  value={formData.serviceStartDate || ''} 
                  onChange={(e) => handleFieldChange('serviceStartDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Date Première Prestation de Serment</label>
                <input 
                  type="date" 
                  value={formData.firstOathDate || ''} 
                  onChange={(e) => handleFieldChange('firstOathDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Date Deuxième Prestation de Serment</label>
                <input 
                  type="date" 
                  value={formData.secondOathDate || ''} 
                  onChange={(e) => handleFieldChange('secondOathDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">État Civil</label>
                <select 
                  value={formData.maritalStatus || 'Célibataire'} 
                  onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">A des enfants ?</label>
                  <select 
                    value={formData.hasChildren || 'Non'} 
                    onChange={(e) => handleFieldChange('hasChildren', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                  >
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nombre d'enfants</label>
                  <input 
                    type="number" 
                    disabled={formData.hasChildren !== 'Oui'}
                    value={formData.childrenCount || 0} 
                    onChange={(e) => handleFieldChange('childrenCount', parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-gray-400"
                    min="0"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adresse Physique</label>
                <input 
                  type="text" 
                  value={formData.physicalAddress || ''} 
                  onChange={(e) => handleFieldChange('physicalAddress', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="N° Avenue, Quartier, Commune, Ville..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Fiches et Mesures disciplinaires</label>
                <textarea 
                  value={formData.disciplinaryMeasures || ''} 
                  onChange={(e) => handleFieldChange('disciplinaryMeasures', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 min-h-[70px]"
                  placeholder="Aucune sanction au dossier par défaut..."
                />
              </div>

              {/* Comptes Bancaires */}
              <div className="md:col-span-2 border border-slate-200 p-4 rounded-2xl bg-indigo-50/15">
                <div className="flex justify-between items-center pb-2 border-b border-indigo-100 mb-3">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">💳 Comptes Bancaires ({formData.bankAccounts?.length || 0})</h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      const current = formData.bankAccounts || [];
                      setFormData((prev: any) => ({
                        ...prev,
                        bankAccounts: [...current, { bankName: '', accountNumber: '' }]
                      }));
                    }}
                    className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-850 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase transition"
                  >
                    + Ajouter un compte
                  </button>
                </div>
                {(!formData.bankAccounts || formData.bankAccounts.length === 0) ? (
                  <p className="text-2xs text-[#15447c]/60 italic">Aucun compte bancaire pré-enregistré.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {formData.bankAccounts.map((acc: any, index: number) => (
                      <div key={index} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-gray-400">Nom de la Banque</label>
                            <input 
                              type="text" 
                              value={acc.bankName}
                              onChange={(e) => {
                                const updated = [...formData.bankAccounts];
                                updated[index].bankName = e.target.value;
                                setFormData((prev: any) => ({ ...prev, bankAccounts: updated }));
                              }}
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                              placeholder="Rawbank, TMB, Equity..."
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-gray-400">Numéro de Compte</label>
                            <input 
                              type="text" 
                              value={acc.accountNumber}
                              onChange={(e) => {
                                const updated = [...formData.bankAccounts];
                                updated[index].accountNumber = e.target.value;
                                setFormData((prev: any) => ({ ...prev, bankAccounts: updated }));
                              }}
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold font-mono"
                              placeholder="0101-123456-78"
                              required
                            />
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = formData.bankAccounts.filter((_: any, idx: number) => idx !== index);
                            setFormData((prev: any) => ({ ...prev, bankAccounts: updated }));
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl text-xs font-bold self-end shrink-0"
                          title="Supprimer ce compte"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASE 2: CLIENT */}
          {type === 'client' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-[#121b2d] rounded-2xl border border-slate-150 dark:border-[#1e293b]">
                <div className="relative w-16 h-16 rounded-full bg-slate-200 dark:bg-[#0d1524] overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo client" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl">🏢</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Logo du Client / Entreprise</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('logoUrl', e)}
                    className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-gray-700 hover:file:bg-slate-50 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Format recommandé : Carré, max 2Mo</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nom / Raison Sociale</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Dénomination client</label>
                  <input 
                    type="text" 
                    value={formData.denomination || ''} 
                    onChange={(e) => handleFieldChange('denomination', e.target.value)}
                    placeholder="ex: Nom commercial, enseigne..."
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Contact Principal (Nom du gestionnaire)</label>
                  <input 
                    type="text" 
                    value={formData.contact || ''} 
                    onChange={(e) => handleFieldChange('contact', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adresse E-mail</label>
                  <input 
                    type="email" 
                    value={formData.email || ''} 
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Téléphone Direct</label>
                  <input 
                    type="text" 
                    value={formData.phone || ''} 
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Secteur d'Activité</label>
                  <input 
                    type="text" 
                    value={formData.secteur || ''} 
                    onChange={(e) => handleFieldChange('secteur', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                    placeholder="Ex: Minier, Fret, Télécoms..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Dirigeant Principal</label>
                  <input 
                    type="text" 
                    value={formData.dirigeant || ''} 
                    onChange={(e) => handleFieldChange('dirigeant', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Siège Social / Adresse additionnelle</label>
                  <input 
                    type="text" 
                    value={formData.siege || ''} 
                    onChange={(e) => handleFieldChange('siege', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                    placeholder="Adresse de facturation / siège ou adresse additionnelle"
                  />
                </div>
              </div>

              {/* Types de facturation multi select */}
              <div className="border border-slate-200 p-4 rounded-xl">
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-2">Modes de Facturation acceptés (Sélection multiple possible)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Forfaitaire',
                    'Taux horaire',
                    'Abonnement mensuel',
                    'Abonnement annuel',
                    'Au dossier (Ponctuelle)'
                  ].map(opt => {
                    const currentTypes = (formData.typeFacturation || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                    const isChecked = currentTypes.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-gray-150">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let newTypes;
                            if (isChecked) {
                              newTypes = currentTypes.filter((t: string) => t !== opt);
                            } else {
                              newTypes = [...currentTypes, opt];
                            }
                            handleFieldChange('typeFacturation', newTypes.join(', '));
                          }}
                          className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Référents */}
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-4">
                <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-wide">👥 Référents direct et Contacts additionnels</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-[10px] font-extrabold uppercase text-gray-400 font-mono">Référent Principal #1</div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Nom Complet</label>
                      <input 
                        type="text" 
                        value={formData.ref1_nom || ''} 
                        onChange={(e) => handleFieldChange('ref1_nom', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Téléphone</label>
                      <input 
                        type="text" 
                        value={formData.ref1_phone || ''} 
                        onChange={(e) => handleFieldChange('ref1_phone', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Adresse E-mail</label>
                      <input 
                        type="email" 
                        value={formData.ref1_email || ''} 
                        onChange={(e) => handleFieldChange('ref1_email', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-[10px] font-extrabold uppercase text-gray-400 font-mono">Référent Secondaire #2</div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Nom Complet</label>
                      <input 
                        type="text" 
                        value={formData.ref2_nom || ''} 
                        onChange={(e) => handleFieldChange('ref2_nom', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Téléphone</label>
                      <input 
                        type="text" 
                        value={formData.ref2_phone || ''} 
                        onChange={(e) => handleFieldChange('ref2_phone', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Adresse E-mail</label>
                      <input 
                        type="email" 
                        value={formData.ref2_email || ''} 
                        onChange={(e) => handleFieldChange('ref2_email', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASE 3: DOSSIER (CASE) */}
          {type === 'case' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Intitulé Unique du Dossier</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Dossier N° / Identifiant</label>
                  <input 
                    type="text" 
                    value={formData.id || ''} 
                    disabled
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Client Titulaire</label>
                  <select 
                    value={formData.client || ''} 
                    onChange={(e) => handleFieldChange('client', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                  >
                    <option value="">-- Choisir un client --</option>
                    {clients.map(cl => (
                      <option key={cl.id} value={cl.name}>{cl.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Statut Général du dossier</label>
                  <select 
                    value={formData.status || 'En cours'} 
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                  >
                    <option value="En cours">En cours</option>
                    <option value="En attente">En attente</option>
                    <option value="Clôturé">Clôturé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Prochaine Audience fixée</label>
                  <input 
                    type="date" 
                    value={formData.nextHearing || ''} 
                    onChange={(e) => handleFieldChange('nextHearing', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Mots clés / Tags (type de contenu)</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Saisissez un mot clé (ex: Civil, Pénal, Urgent...) et cliquez sur Ajouter" 
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1 p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddTag}
                      className="bg-[#15447c] hover:bg-[#15447c]/90 text-white font-bold py-2 px-4 rounded-xl text-xs transition shrink-0"
                    >
                      Ajouter
                    </button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {formData.tags.map((tag: string) => (
                        <span 
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-extrabold text-3xs border border-indigo-150 uppercase tracking-wider"
                        >
                          #{tag}
                          <button 
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-red-500 hover:text-red-750 font-black text-2xs ml-0.5 hover:bg-red-50 rounded px-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adversaires (Plusieurs possibles)</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Saisissez le nom d'un adversaire (ex: Entreprise X, Mr. Y) et cliquez sur Ajouter" 
                      value={editAdversaryInput}
                      onChange={(e) => setEditAdversaryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAdversary();
                        }
                      }}
                      className="flex-1 p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddAdversary}
                      className="bg-[#15447c] hover:bg-[#15447c]/90 text-white font-bold py-2 px-4 rounded-xl text-xs transition shrink-0"
                    >
                      Ajouter
                    </button>
                  </div>
                  {formData.adversaires && formData.adversaires.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {formData.adversaires.map((adv: string) => (
                        <span 
                          key={adv}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 font-extrabold text-3xs border border-red-150"
                        >
                          {adv}
                          <button 
                            type="button"
                            onClick={() => handleRemoveAdversary(adv)}
                            className="text-red-500 hover:text-red-750 font-black text-2xs ml-0.5 hover:bg-red-50 rounded px-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-3xs text-gray-400 italic">Aucun adversaire ajouté pour le moment.</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Notes internes & Commentaires généraux</label>
                  <textarea 
                    value={formData.notes || ''} 
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 min-h-[90px]"
                    placeholder="..."
                  />
                </div>
              </div>

              {/* Procedures List */}
              <div className="md:col-span-2 border border-slate-200 p-4 rounded-2xl bg-indigo-50/15">
                <div className="flex justify-between items-center pb-2 border-b border-indigo-100 mb-3">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">⚖️ Procédures associées ({formData.procedures?.length || 0})</h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      const current = formData.procedures || [];
                      const newProc = {
                        id: `PROC-${Date.now().toString().slice(-4)}`,
                        name: '',
                        instance: '',
                        objet: '',
                        dateDebut: '',
                        dateFin: '',
                        status: 'En cours'
                      };
                      setFormData((prev: any) => ({
                        ...prev,
                        procedures: [...current, newProc]
                      }));
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase transition"
                  >
                    + Ajouter une procédure
                  </button>
                </div>
                {(!formData.procedures || formData.procedures.length === 0) ? (
                  <p className="text-2xs text-gray-400 italic">Aucune procédure enregistrée.</p>
                ) : (
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                    {formData.procedures.map((proc: any, index: number) => (
                      <div key={proc.id} className="relative bg-white p-3 rounded-xl border border-gray-200 space-y-3 shadow-3xs">
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = formData.procedures.filter((p: any) => p.id !== proc.id);
                            setFormData((prev: any) => ({ ...prev, procedures: updated }));
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-md text-[10px] font-black transition"
                          title="Supprimer cette procédure"
                        >
                          ✕ Supprimer
                        </button>
                        <div className="text-[10px] text-gray-400 font-extrabold font-mono uppercase">Procédure #{index + 1} ({proc.id})</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Nom de la procédure</label>
                            <input 
                              type="text" 
                              value={proc.name || ''} 
                              onChange={(e) => {
                                const updated = [...formData.procedures];
                                updated[index].name = e.target.value;
                                setFormData((prev: any) => ({ ...prev, procedures: updated }));
                              }}
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold"
                              placeholder="Nom de la procédure (ex: Cour de cassation)..."
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Instance juridique</label>
                            <input 
                              type="text" 
                              value={proc.instance || ''} 
                              onChange={(e) => {
                                const updated = [...formData.procedures];
                                updated[index].instance = e.target.value;
                                setFormData((prev: any) => ({ ...prev, procedures: updated }));
                              }}
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                              placeholder="Tribunal, Cour..."
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Objet de la procédure</label>
                            <input 
                              type="text" 
                              value={proc.objet || ''} 
                              onChange={(e) => {
                                const updated = [...formData.procedures];
                                updated[index].objet = e.target.value;
                                setFormData((prev: any) => ({ ...prev, procedures: updated }));
                              }}
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                              placeholder="Objet..."
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Statut</label>
                            <select 
                              value={proc.status || 'En cours'} 
                              onChange={(e) => {
                                const updated = [...formData.procedures];
                                updated[index].status = e.target.value;
                                setFormData((prev: any) => ({ ...prev, procedures: updated }));
                              }}
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white"
                            >
                              <option value="En cours">En cours</option>
                              <option value="En suspens">En suspens</option>
                              <option value="Plaidé">Plaidé</option>
                              <option value="Gagné">Gagné</option>
                              <option value="Perdu">Perdu</option>
                              <option value="Terminé">Terminé</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Date Début</label>
                            <input 
                              type="date" 
                              value={proc.dateDebut || ''} 
                              onChange={(e) => {
                                const updated = [...formData.procedures];
                                updated[index].dateDebut = e.target.value;
                                setFormData((prev: any) => ({ ...prev, procedures: updated }));
                              }}
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Date Fin</label>
                            <input 
                              type="date" 
                              value={proc.dateFin || ''} 
                              onChange={(e) => {
                                const updated = [...formData.procedures];
                                updated[index].dateFin = e.target.value;
                                setFormData((prev: any) => ({ ...prev, procedures: updated }));
                              }}
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASE 4: PERSONNEL */}
          {type === 'personnel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-4 p-3 bg-slate-50 dark:bg-[#121b2d] rounded-2xl border border-slate-150 dark:border-[#1e293b]">
                <div className="relative w-16 h-16 rounded-full bg-slate-200 dark:bg-[#0d1524] overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Photo du personnel" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl">👤</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Photo de profil</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('photo', e)}
                    className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-gray-700 hover:file:bg-slate-50 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Format recommandé : Carré, max 2Mo</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  value={formData.fullName || ''} 
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Rôle / Fonction au cabinet</label>
                <select 
                  value={formData.role || 'Secrétaire'} 
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Secrétaire">Secrétaire</option>
                  <option value="Stagiaire">Stagiaire</option>
                  <option value="Assistant juridique">Assistant juridique</option>
                  <option value="Chauffeur">Chauffeur</option>
                  <option value="Assistant de direction">Assistant de direction</option>
                  <option value="Cleaner">Cleaner</option>
                  <option value="Courtier">Courtier</option>
                  <option value="Intendant">Intendant</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adresse E-mail</label>
                <input 
                  type="email" 
                  value={formData.email || ''} 
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Téléphone direct</label>
                <input 
                  type="text" 
                  value={formData.phone || ''} 
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Date d'Entrée en Service</label>
                <input 
                  type="date" 
                  value={formData.serviceStartDate || ''} 
                  onChange={(e) => handleFieldChange('serviceStartDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Statut d'Activité</label>
                <select 
                  value={formData.serviceStatus || 'Actif'} 
                  onChange={(e) => handleFieldChange('serviceStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Mise en disponibilité">Mise en disponibilité</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Salaire Mensuel ($ USD)</label>
                <input 
                  type="number" 
                  value={formData.salary || 0} 
                  onChange={(e) => handleFieldChange('salary', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/15"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">État Civil</label>
                <select 
                  value={formData.maritalStatus || 'Célibataire'} 
                  onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">A des enfants ?</label>
                  <select 
                    value={formData.hasChildren || 'Non'} 
                    onChange={(e) => handleFieldChange('hasChildren', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                  >
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nombre d'enfants</label>
                  <input 
                    type="number" 
                    disabled={formData.hasChildren !== 'Oui'}
                    value={formData.childrenCount || 0} 
                    onChange={(e) => handleFieldChange('childrenCount', parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-gray-400"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adresse Physique</label>
                <input 
                  type="text" 
                  value={formData.address || ''} 
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-rose-150 p-4 rounded-xl bg-rose-50/10">
                <div className="sm:col-span-2 text-[10px] font-black text-rose-900 uppercase tracking-wider">🔴 Mesures Disciplinaires et Sanctions de Travail</div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Statut Sanction</label>
                  <select 
                    value={formData.disciplinaryStatus || 'Aucune'} 
                    onChange={(e) => handleFieldChange('disciplinaryStatus', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white text-rose-800"
                  >
                    <option value="Aucune">Aucune mesure</option>
                    <option value="En cours d'instruction">En cours d'instruction</option>
                    <option value="Avertissement oral">Avertissement oral</option>
                    <option value="Avertissement écrit">Avertissement écrit</option>
                    <option value="Blâme">Blâme</option>
                    <option value="Mise à pied">Mise à pied</option>
                    <option value="Suspension temporaire">Suspension temporaire</option>
                    <option value="Licenciement">Licenciement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Motifs / Détails de la sanction</label>
                  <input 
                    type="text" 
                    value={formData.disciplinaryMeasure || ''} 
                    onChange={(e) => handleFieldChange('disciplinaryMeasure', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 text-rose-850"
                    placeholder="..."
                  />
                </div>
              </div>

              {/* Comptes Bancaires */}
              <div className="md:col-span-2 border border-slate-200 p-4 rounded-2xl bg-indigo-50/15">
                <div className="flex justify-between items-center pb-2 border-b border-indigo-100 mb-3">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">💳 Comptes Bancaires associés ({formData.bankAccounts?.length || 0})</h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      const current = formData.bankAccounts || [];
                      setFormData((prev: any) => ({
                        ...prev,
                        bankAccounts: [...current, { bankName: '', accountNumber: '' }]
                      }));
                    }}
                    className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-850 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase transition"
                  >
                    + Ajouter un compte
                  </button>
                </div>
                {(!formData.bankAccounts || formData.bankAccounts.length === 0) ? (
                  <p className="text-2xs text-[#15447c]/60 italic">Aucun compte bancaire pré-enregistré.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {formData.bankAccounts.map((acc: any, index: number) => (
                      <div key={index} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-gray-400">Nom de la Banque</label>
                            <input 
                              type="text" 
                              value={acc.bankName}
                              onChange={(e) => {
                                const updated = [...formData.bankAccounts];
                                updated[index].bankName = e.target.value;
                                setFormData((prev: any) => ({ ...prev, bankAccounts: updated }));
                              }}
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                              placeholder="Rawbank, TMB, Equity..."
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-gray-400">Numéro de Compte</label>
                            <input 
                              type="text" 
                              value={acc.accountNumber}
                              onChange={(e) => {
                                const updated = [...formData.bankAccounts];
                                updated[index].accountNumber = e.target.value;
                                setFormData((prev: any) => ({ ...prev, bankAccounts: updated }));
                              }}
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold font-mono"
                              placeholder="0101-123456-78"
                              required
                            />
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = formData.bankAccounts.filter((_: any, idx: number) => idx !== index);
                            setFormData((prev: any) => ({ ...prev, bankAccounts: updated }));
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl text-xs font-bold self-end shrink-0"
                          title="Supprimer ce compte"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASE 5: EVENT */}
          {type === 'event' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-4 p-3 bg-slate-50 dark:bg-[#121b2d] rounded-2xl border border-slate-150 dark:border-[#1e293b]">
                <div className="relative w-16 h-16 rounded-full bg-slate-200 dark:bg-[#0d1524] overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  {formData.photoProfil ? (
                    <img src={formData.photoProfil} alt="Illustration de l'événement" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl">📅</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Image / Illustration de l'événement</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('photoProfil', e)}
                    className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-gray-700 hover:file:bg-slate-50 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Format recommandé : Carré ou Paysage, max 2Mo</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nom de l'événement</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Type d'événement</label>
                <select 
                  value={formData.type || 'Atelier'} 
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Atelier">Atelier</option>
                  <option value="Conférence">Conférence</option>
                  <option value="Colloque">Colloque</option>
                  <option value="Séminaire">Séminaire</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Date</label>
                <input 
                  type="date" 
                  value={formData.date || ''} 
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Lieu</label>
                <input 
                  type="text" 
                  value={formData.lieu || ''} 
                  onChange={(e) => handleFieldChange('lieu', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Partenaires / Sponsors</label>
                <input 
                  type="text" 
                  value={formData.partenaires || ''} 
                  onChange={(e) => handleFieldChange('partenaires', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Budget Prévisionnel ($)</label>
                  <input 
                    type="text" 
                    value={formData.budgetPrevisionnel || ''} 
                    onChange={(e) => handleFieldChange('budgetPrevisionnel', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Budget Réalisé ($)</label>
                  <input 
                    type="text" 
                    value={formData.budgetRealise || ''} 
                    onChange={(e) => handleFieldChange('budgetRealise', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CASE 6: TASK */}
          {type === 'task' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Intitulé de la tâche</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Responsable (Avocat / Agent)</label>
                <input 
                  type="text" 
                  value={formData.lawyer || ''} 
                  onChange={(e) => handleFieldChange('lawyer', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Date d'échéance</label>
                <input 
                  type="date" 
                  value={formData.dueDate || ''} 
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Statut</label>
                <select 
                  value={formData.status || 'Non effectué'} 
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Non effectué">Non effectué</option>
                  <option value="Effectué à moitié">Effectué à moitié</option>
                  <option value="Effectué">Effectué</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Commentaires / Notes</label>
                <textarea 
                  value={formData.notes || ''} 
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* CASE 7: INVOICE */}
          {type === 'invoice' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">ID Dossier associé</label>
                <input 
                  type="text" 
                  value={formData.caseId || ''} 
                  onChange={(e) => handleFieldChange('caseId', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Étiquette / Catégorie</label>
                <input 
                  type="text" 
                  value={formData.etiquette || ''} 
                  onChange={(e) => handleFieldChange('etiquette', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="Ex: Honoraires de Conseil..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Échéance de paiement</label>
                <input 
                  type="date" 
                  value={formData.dueDate || ''} 
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Statut</label>
                <select 
                  value={formData.status || 'Non réglée'} 
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Non réglée">Non réglée</option>
                  <option value="En cours">En cours</option>
                  <option value="Réglée">Réglée</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Montant Total ($ USD)</label>
                <input 
                  type="number" 
                  value={formData.totalAmount || 0} 
                  onChange={(e) => handleFieldChange('totalAmount', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Montant Réglé ($ USD)</label>
                <input 
                  type="number" 
                  value={formData.paidAmount || 0} 
                  onChange={(e) => handleFieldChange('paidAmount', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          )}

          {/* CASE 8: FOURNISSEUR */}
          {type === 'fournisseur' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-4 p-3 bg-slate-50 dark:bg-[#121b2d] rounded-2xl border border-slate-150 dark:border-[#1e293b]">
                <div className="relative w-16 h-16 rounded-full bg-slate-200 dark:bg-[#0d1524] overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo fournisseur" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl">📦</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Logo du Fournisseur</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('logo', e)}
                    className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-300 file:text-xs file:font-bold file:bg-white file:text-gray-700 hover:file:bg-slate-50 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Format recommandé : Carré, max 2Mo</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nom du Fournisseur</label>
                <input 
                  type="text" 
                  value={formData.nomComplet || ''} 
                  onChange={(e) => handleFieldChange('nomComplet', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Nature de la Prestation</label>
                <select 
                  value={formData.naturePrestation || 'Services'} 
                  onChange={(e) => handleFieldChange('naturePrestation', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Services">Services</option>
                  <option value="Bien">Bien</option>
                  <option value="Baie locative">Baie locative</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Désignation de la Prestation</label>
                <input 
                  type="text" 
                  value={formData.designationPrestation || ''} 
                  onChange={(e) => handleFieldChange('designationPrestation', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Type de Facturation</label>
                <select 
                  value={formData.typeFacturation || 'Ponctuelle'} 
                  onChange={(e) => handleFieldChange('typeFacturation', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 bg-white"
                >
                  <option value="Ponctuelle">Ponctuelle</option>
                  <option value="Périodique">Périodique</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Montant ($)</label>
                <input 
                  type="number" 
                  value={formData.montant || 0} 
                  onChange={(e) => handleFieldChange('montant', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adresse E-mail du contact</label>
                <input 
                  type="email" 
                  value={formData.adresseMail || ''} 
                  onChange={(e) => handleFieldChange('adresseMail', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Dirigeant Principal</label>
                <input 
                  type="text" 
                  value={formData.dirigeantPrincipal || ''} 
                  onChange={(e) => handleFieldChange('dirigeantPrincipal', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Adresse Physique</label>
                <input 
                  type="text" 
                  value={formData.adressePhysique || ''} 
                  onChange={(e) => handleFieldChange('adressePhysique', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          )}

          {/* SECTION UNIQUE POUR LES PIÈCES JOINTES (Tous les types) */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              📎 Gestion des Pièces Jointes ({ (formData.piecesJointes || formData.attachments || []).length })
            </h4>
            
            {/* Drag and Drop Zone or Manual File Selection */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 hover:bg-indigo-50/20 transition text-center relative cursor-pointer group">
              <input 
                type="file" 
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Content = reader.result as string;
                        const newAttachment = {
                          name: file.name,
                          size: (file.size / 1024).toFixed(1) + ' KB',
                          content: base64Content
                        };
                        setFormData((prev: any) => {
                          const existingPieces = prev.piecesJointes || prev.attachments || [];
                          const updatedList = [...existingPieces, newAttachment];
                          return {
                            ...prev,
                            piecesJointes: updatedList,
                            attachments: prev.attachments !== undefined ? updatedList : undefined
                          };
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-white shadow-2xs border border-slate-200 rounded-full flex items-center justify-center text-indigo-650 group-hover:scale-115 transition">
                  <svg className="w-5 h-5 text-indigo-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Glisser-déposer des documents ou cliquer pour parcourir</p>
                  <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Tous types de fichiers acceptés (PDF, JPG, PNG, DOC, XLS etc.)</p>
                </div>
              </div>
            </div>

            {/* List of Files */}
            {((formData.piecesJointes || formData.attachments || []).length === 0) ? (
              <div className="mt-4 p-4 text-center bg-slate-50 border border-slate-150 rounded-xl">
                <p className="text-xs text-slate-400 italic font-medium">Aucune pièce jointe liée à cette fiche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {(formData.piecesJointes || formData.attachments || []).map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-3xs hover:border-slate-300 transition group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 bg-slate-50 border border-slate-150 text-slate-500 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase font-mono">
                        {file.name.split('.').pop()?.slice(0, 3)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>{file.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono">{file.size}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {file.content && (
                        <a 
                          href={file.content} 
                          download={file.name}
                          className="w-7 h-7 bg-indigo-50 border border-indigo-150 text-indigo-750 hover:bg-indigo-600 hover:text-white rounded-lg flex items-center justify-center text-xs transition shadow-2xs"
                          title="Télécharger"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev: any) => {
                            const existingPieces = prev.piecesJointes || prev.attachments || [];
                            const updatedList = existingPieces.filter((_: any, i: number) => i !== index);
                            return {
                              ...prev,
                              piecesJointes: updatedList,
                              attachments: prev.attachments !== undefined ? updatedList : undefined
                            };
                          });
                        }}
                        className="w-7 h-7 bg-rose-50 border border-rose-150 text-rose-650 hover:bg-rose-600 hover:text-white rounded-lg flex items-center justify-center text-xs transition shadow-2xs"
                        title="Supprimer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003-3h10a3 3 0 003-3v-1m-4-4l-4 4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition"
          >
            Annuler
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            className="px-6 py-2 bg-[#15447c] text-white hover:bg-indigo-700 font-extrabold text-xs rounded-xl transition shadow-sm"
          >
            Enregistrer les modifications
          </button>
        </div>

      </div>
    </div>
  );
};
