import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import FournisseurModal from '../components/modals/FournisseurModal';
import { SearchIcon, UsersIcon, TrashIcon, CourthouseIcon, PhoneIcon, BriefcaseIcon } from '../components/Icons';
import { Fournisseur } from '../types';

interface FournisseursPageProps {
  fournisseurs: Fournisseur[];
  onAddFournisseur: (fournisseur: Fournisseur) => void;
  onDeleteFournisseur: (id: string) => void;
  onSendEmail: (to: string, subject: string, body: string, recipientName?: string, attachmentName?: string) => void;
}

const FournisseursPage: FC<FournisseursPageProps> = ({ fournisseurs, onAddFournisseur, onDeleteFournisseur, onSendEmail }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getNatureClass = (nature: 'Bien' | 'Services' | 'Baie locative') => {
        if (nature === 'Services') return 'bg-purple-100 text-purple-800 border-purple-200';
        if (nature === 'Bien') return 'bg-cyan-100 text-cyan-800 border-cyan-200';
        return 'bg-amber-100 text-amber-850 border-amber-200';
    };

    const getBillingTypeClass = (type: 'Périodique' | 'Ponctuelle') => {
        return type === 'Périodique'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-250'
            : 'bg-indigo-100 text-indigo-800 border-indigo-250';
    };

    const query = (searchQuery || '').toLowerCase();
    const filtered = (fournisseurs || []).filter(f => 
        (f.nomComplet || '').toLowerCase().includes(query) ||
        (f.designationPrestation || '').toLowerCase().includes(query) ||
        (f.dirigeantPrincipal && f.dirigeantPrincipal.toLowerCase().includes(query)) ||
        (f.adressePhysique && f.adressePhysique.toLowerCase().includes(query))
    );

    return (
        <>
            <PageContainer 
                title="Fournisseurs du Cabinet" 
                buttonLabel="Ajouter un fournisseur" 
                onButtonClick={() => setIsAddModalOpen(true)}
            >
                {/* Search Bar section */}
                <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 mb-6">
                    <div className="flex items-center gap-2 max-w-sm bg-slate-50 border border-gray-200 px-3 py-2 rounded-xl">
                        <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Rechercher un prestataire, prestation, adresse, gérant..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs font-medium focus:outline-hidden bg-transparent text-gray-700"
                        />
                    </div>
                </div>

                {/* Primary Data Grid with Detail Panel */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                    
                    {/* Database Table list (takes up 2 columns) */}
                    <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs xl:col-span-2">
                        <div className="overflow-x-auto font-sans">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="bg-slate-50 border-b border-gray-150">
                                    <tr className="text-2xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="p-4">Prestataire / Gérant</th>
                                        <th className="p-4">Désignation Prestation</th>
                                        <th className="p-4">Nature</th>
                                        <th className="p-4">Facturation & Montant</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-xs text-gray-400 font-bold">
                                                Aucun prestataire enregistré correspondant à votre recherche.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map(f => {
                                            const isSelected = selectedFournisseur?.id === f.id;
                                            return (
                                                <tr 
                                                    key={f.id} 
                                                    className={`border-b border-gray-100 hover:bg-slate-50/70 transition cursor-pointer ${isSelected ? 'bg-indigo-50/40 font-semibold' : ''}`}
                                                    onClick={() => setSelectedFournisseur(f)}
                                                >
                                                    {/* Nom & Dirigeant */}
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 overflow-hidden shrink-0 flex items-center justify-center shadow-3xs">
                                                                {f.logo ? (
                                                                    <img src={f.logo} alt="" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-gray-800 leading-tight">{f.nomComplet}</h4>
                                                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                                                                    <UsersIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                                                    <span>{f.dirigeantPrincipal || 'Non spécifié'}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* Prestation Details */}
                                                    <td className="p-4">
                                                        <div className="max-w-xs truncate text-xs text-slate-700" title={f.designationPrestation}>
                                                            {f.designationPrestation}
                                                        </div>
                                                        <span className="text-[9px] font-mono text-gray-403 uppercase bg-slate-100 px-1 py-0.2 rounded-sm border border-slate-200 mt-0.5 inline-block">ID: {f.id}</span>
                                                    </td>

                                                    {/* Nature badge */}
                                                    <td className="p-4">
                                                        <span className={`inline-block px-2 py-0.5 border text-3xs font-black uppercase rounded-lg ${getNatureClass(f.naturePrestation)}`}>
                                                            {f.naturePrestation}
                                                        </span>
                                                    </td>

                                                    {/* Billing type, periodic and amount */}
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-mono text-emerald-800 font-bold">
                                                                {formatCurrency(f.montant)}
                                                            </span>
                                                            <span className={`inline-block w-fit px-1.5 py-0.2 border text-[9px] font-bold rounded ${getBillingTypeClass(f.typeFacturation)}`}>
                                                                {f.typeFacturation} {f.periode ? `(${f.periode})` : ''}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button 
                                                                onClick={() => setSelectedFournisseur(f)}
                                                                className="px-2.5 py-1 text-2xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg border border-indigo-100 transition cursor-pointer"
                                                            >
                                                                Voir
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    onSendEmail(
                                                                        f.adresseMail || 'support@prestataire.cd',
                                                                        `Suivi de prestations — Cabinet KBB SARL`,
                                                                        `Bonjour,\n\nNous vous contactons concernant vos prestations au cabinet :\n- Unité : ${f.nomComplet}\n- Prestation : ${f.designationPrestation}\n- Montant : ${formatCurrency(f.montant)}\n\nCordialement,\nSecrétariat Général`,
                                                                        f.nomComplet
                                                                    );
                                                                }}
                                                                className="p-1 text-slate-500 hover:text-indigo-800 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                                                                title="Envoyer un e-mail"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if (true) {
                                                                        onDeleteFournisseur(f.id);
                                                                        if (selectedFournisseur?.id === f.id) {
                                                                            setSelectedFournisseur(null);
                                                                        }
                                                                    }
                                                                }}
                                                                className="px-2 py-1 text-2xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                                                                title="Supprimer ce fournisseur"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed supplier sidebar info */}
                    <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs min-h-[450px]">
                        {selectedFournisseur ? (
                            <div className="space-y-6">
                                <div className="border-b border-gray-150 pb-4 flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-150 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                                        {selectedFournisseur.logo ? (
                                            <img src={selectedFournisseur.logo} alt="" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                                        ) : (
                                            <BriefcaseIcon className="w-6 h-6 text-gray-300 shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mr-2">
                                            Fiche Fournisseur
                                        </span>
                                        <h3 className="text-base font-black text-gray-800 mt-1.5 leading-snug">{selectedFournisseur.nomComplet}</h3>
                                        <div className="text-xs text-gray-500 mt-1 border-t border-slate-150/50 pt-2 flex items-center justify-between gap-1 w-full">
                                            <span className="flex items-center gap-1.5 truncate">
                                                <MailIcon className="w-3.5 h-3.5 text-indigo-550 shrink-0" />
                                                {selectedFournisseur.adresseMail ? (
                                                    <a href={`mailto:${selectedFournisseur.adresseMail}`} className="text-indigo-650 hover:text-indigo-800 hover:underline transition truncate block">
                                                        {selectedFournisseur.adresseMail}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic">Aucune adresse mail</span>
                                                )}
                                            </span>
                                            {selectedFournisseur.adresseMail && (
                                                <button
                                                    onClick={() => onSendEmail(
                                                        selectedFournisseur.adresseMail!,
                                                        `Suivi de prestations — Cabinet KBB SARL`,
                                                        `Bonjour,\n\nNous faisons suite à l'accord de fourniture de services liant nos entités respectives.\nComme convenu...\n\nSentiments dévoués,\nSecrétariat Général`,
                                                        selectedFournisseur.nomComplet
                                                    )}
                                                    className="text-[10px] bg-indigo-100/60 hover:bg-indigo-100 text-indigo-850 font-bold px-2 py-0.5 rounded transition cursor-pointer shrink-0"
                                                >
                                                    📩 Écrire
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Prestation Details */}
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Prestation Spécifiée</span>
                                        <p className="text-xs text-slate-800 font-bold mt-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl leading-relaxed">
                                            {selectedFournisseur.designationPrestation}
                                        </p>
                                    </div>

                                    {/* Financial info summary */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-indigo-50/20 border border-indigo-50 rounded-xl">
                                            <span className="block text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Tarification</span>
                                            <span className="text-sm font-mono font-black text-indigo-900 mt-1 block">{formatCurrency(selectedFournisseur.montant)}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Récurrence</span>
                                            <span className="text-2xs font-bold text-slate-800 uppercase mt-1 block">
                                                {selectedFournisseur.typeFacturation === 'Périodique' 
                                                    ? `Périodique (${selectedFournisseur.periode})` 
                                                    : 'Achat Unique / Ponctuelle'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Other metadata */}
                                    <div className="space-y-2 text-xs font-semibold">
                                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                                            <span className="text-gray-400"><UsersIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 inline-block -mt-1 mr-1" /> Dirigeant Principal :</span>
                                            <span className="text-gray-800 font-bold">{selectedFournisseur.dirigeantPrincipal || 'Non identifié'}</span>
                                        </div>
                                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1">
                                            <span className="text-gray-400">📍 Adresse Physique :</span>
                                            {selectedFournisseur.adressePhysique ? (
                                                <a 
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedFournisseur.adressePhysique)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    referrerPolicy="no-referrer"
                                                    className="text-indigo-650 hover:text-indigo-800 hover:underline text-xs font-bold leading-relaxed transition"
                                                    title="Rechercher sur Google Maps"
                                                >
                                                    {selectedFournisseur.adressePhysique} ↗
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">Non spécifiée</span>
                                            )}
                                        </div>
                                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                                            <span className="text-gray-400"><CourthouseIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 inline-block -mt-1 mr-1" /> Nature de Preuve :</span>
                                            <span className="text-gray-800 font-bold">{selectedFournisseur.naturePrestation}</span>
                                        </div>
                                    </div>

                                    {/* Multi referents display */}
                                    <div className="border-t border-gray-150 pt-4">
                                        <h4 className="text-2xs font-extrabold text-indigo-700 uppercase tracking-widest mb-3 flex justify-between items-center">
                                            <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4 text-indigo-650 shrink-0" /> Référents chez le prestataire</span>
                                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                                {selectedFournisseur.referents?.length || 0}
                                            </span>
                                        </h4>
                                        {selectedFournisseur.referents && selectedFournisseur.referents.length > 0 ? (
                                            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1 custom-scrollbar">
                                                {selectedFournisseur.referents.map((ref, i) => (
                                                    <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                                        <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                                            <UsersIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0 inline-block -mt-0.5 mr-1" /> {ref.nom}
                                                        </p>
                                                        {ref.phone && (
                                                            <p className="text-3xs font-mono font-bold text-indigo-800 flex items-center gap-1">
                                                                <PhoneIcon className="w-3 h-3 text-indigo-500 shrink-0 inline-block -mt-0.5 mr-1" /> 
                                                                <a href={`tel:${ref.phone}`} className="hover:underline hover:text-indigo-950 transition">
                                                                    {ref.phone}
                                                                </a>
                                                            </p>
                                                        )}
                                                        {ref.email && (
                                                            <p className="text-3xs font-bold text-slate-500 truncate flex items-center gap-1">
                                                                <span>📧</span> 
                                                                <a href={`mailto:${ref.email}`} className="text-indigo-650 hover:text-indigo-850 hover:underline truncate transition">
                                                                    {ref.email}
                                                                </a>
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-2xs italic text-gray-400 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                Aucun référent de liaison enregistré sous ce prestataire.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col justify-center items-center text-center py-16 px-4">
                                <BriefcaseIcon className="w-10 h-10 text-gray-300 mb-3 shrink-0" />
                                <h4 className="text-xs font-black text-gray-700 uppercase">Aucun Fournisseur Sélectionné</h4>
                                <p className="text-2xs text-gray-400 font-bold mt-1 max-w-[200px] leading-relaxed">
                                    Cliquez sur une ligne dans le tableau pour afficher l'ensemble de ses informations et de ses référents enregistrés.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </PageContainer>

            {/* Modal for adding provider */}
            <FournisseurModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSave={onAddFournisseur} 
                fournisseurs={fournisseurs}
            />
        </>
    );
};

export default FournisseursPage;
