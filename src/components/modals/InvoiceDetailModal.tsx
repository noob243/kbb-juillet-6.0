import React, { FC } from 'react';
import { Invoice, Case, Client } from '../../types';
import { X, Mail, Printer, Save, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  cases: Case[];
  clients: Client[];
  onSendEmail: (to: string, subject: string, body: string, recipientName: string, attachmentName: string) => void;
}

const InvoiceDetailModal: FC<InvoiceDetailModalProps> = ({ isOpen, onClose, invoice, cases, clients, onSendEmail }) => {
  if (!isOpen || !invoice) return null;

  const currentCase = cases.find(c => (c.id || '').toLowerCase() === (invoice.caseId || '').toLowerCase());
  const clientName = currentCase ? currentCase.client : 'Aucune entreprise liée';
  const currentClient = clients.find(cl => (cl.name || '').toLowerCase() === (clientName || '').toLowerCase());

  // Generate dynamic client email if none exists
  const clientEmail = currentClient?.email || `${(clientName || '').toLowerCase().replace(/\s+/g, '.')}@entreprise.cd`;
  const clientContact = currentClient?.contact || 'Responsable Facturation';

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Réglée':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-xs font-bold leading-none shrink-0 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status}
          </span>
        );
      case 'En cours':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-150 rounded-full text-xs font-bold leading-none shrink-0 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> {status}
          </span>
        );
      case 'Non réglée':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-xs font-bold leading-none shrink-0 uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMailTrigger = () => {
    const subject = `📥 Cabinet KBB SARL / Transmission Facture N° ${invoice.id}`;
    
    let body = `Bonjour ${clientContact},\n\n`;
    if (invoice.status === 'Réglée') {
      body += `Nous avons bien enregistré votre règlement concernant la facture N'${invoice.id} du dossier "${currentCase?.name || 'Litige commercial'}".\n\n`;
      body += `Détails du paiement :\n`;
      body += `- Montant total : ${formatCurrency(invoice.totalAmount)}\n`;
      body += `- Montant réglé : ${formatCurrency(invoice.paidAmount)}\n`;
      body += `- Statut : ACQUITTÉ\n\n`;
      body += `Nous vous remercions pour votre collaboration.\n\n`;
    } else {
      body += `Nous vous prions de trouver ci-joint les détails de notre facture N'${invoice.id} liée au dossier juridique "${currentCase?.name || 'Contentieux commercial'}".\n\n`;
      body += `Détails de la facture :\n`;
      body += `- Libellé : ${invoice.etiquette || 'Honoraires de Conseil'}\n`;
      body += `- Total Échéance : ${formatCurrency(invoice.totalAmount)}\n`;
      body += `- Déjà Réglé : ${formatCurrency(invoice.paidAmount)}\n`;
      body += `- Reste à Payer : ${formatCurrency(Math.max(0, invoice.totalAmount - invoice.paidAmount))}\n`;
      body += `- Échéance limite: ${invoice.dueDate}\n\n`;
      body += `Nous restons à votre entière disposition pour tout renseignement d'ordre juridique ou comptable.\n\n`;
    }
    body += `Sentiments dévoués,\n\n`;
    body += `Secrétariat général - Cabinet KBB SARL\n`;
    body += `Avocats près la Cour d'Appel\n`;
    body += `contact@kbblawfirmscp.com | Kinshasa, RDC`;

    onSendEmail(
      clientEmail,
      subject,
      body,
      clientName,
      `FACTURE_${invoice.id}.pdf`
    );
  };

  const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-3xl w-full border border-gray-150 overflow-hidden animate-fadeIn my-8">
        
        {/* Top Control Header */}
        <div className="bg-slate-55 border-b border-gray-150 px-6 py-4 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-black text-gray-800">Facture Numérique Certifiée</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              title="Imprimer"
              className="p-2 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={handleMailTrigger}
              title="Envoyer par e-mail"
              className="p-2 hover:bg-indigo-50 text-indigo-700 bg-indigo-50/50 rounded-xl transition flex items-center gap-1.5 text-xs font-bold px-3 py-1.5"
            >
              <Mail className="w-4 h-4" /> Envoyer par mail
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable/Invoice Body */}
        <div id={`invoice-print-${invoice.id}`} className="p-8 md:p-12 print:p-0">
          
          {/* Letterhead & General Ledger Info */}
          <div className="flex flex-col md:flex-row justify-between mb-8 pb-8 border-b border-slate-100 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl font-black text-[#15447c] tracking-tight">KBB</span>
                <span className="text-xs uppercase font-extrabold text-[#15447c] tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded">SARL</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider leading-relaxed">Cabinet KBB • Avocats & Associés</p>
              <p className="text-3xs text-slate-400 font-semibold mt-1 leading-normal">
                42, Boulevard du 30 Juin, Immeuble KBB • Gombe, Kinshasa<br />
                Tél : +243 81 234 5678 • contact@kbblawfirmscp.com
              </p>
            </div>
            
            <div className="md:text-right flex flex-col md:items-end justify-between">
              <div>
                <h2 className="text-base font-black text-slate-850 uppercase tracking-normal mb-1">FACTURE DE PRESTATION</h2>
                <p className="text-xs font-extrabold text-indigo-700 font-mono tracking-tight uppercase">Réf : {invoice.id}</p>
                <p className="text-3xs text-slate-400 font-bold uppercase mt-1">Dossier juridique : {invoice.caseId}</p>
              </div>
              <div className="mt-4 md:mt-0">
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          </div>

          {/* Bill-to details and Billing Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <span className="block text-4xs font-black uppercase tracking-widest text-indigo-600 mb-2">FACTURÉ À</span>
              <h4 className="text-xs font-black text-slate-850">{clientName}</h4>
              <p className="text-3xs text-slate-450 mt-1 font-bold">Contact principal: {clientContact}</p>
              <p className="text-3xs text-slate-400 font-medium">{clientEmail}</p>
            </div>

            <div className="p-5 flex flex-col justify-center">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-3xs font-black uppercase text-slate-400 tracking-wider">Date de facture</span>
                <span className="text-xs text-slate-700 font-mono font-bold">Aujourd'hui</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-3xs font-black uppercase text-slate-400 tracking-wider">Échéance limite de paiement</span>
                <span className="text-xs text-rose-750 font-mono font-black">{invoice.dueDate}</span>
              </div>
            </div>
          </div>

          {/* Line items Table & Services */}
          <div className="border border-slate-150 rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-150">
                <tr className="text-4xs font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4">Désignation des Prestations et Honoraires</th>
                  <th className="p-4 text-center">Quantité / Base</th>
                  <th className="p-4 text-right header-align-right font-black">Prix Unitaire</th>
                  <th className="p-4 text-right header-align-right">Montant Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="p-4 font-bold text-slate-800">
                    {invoice.etiquette || "Honoraires de consultation et suivi de contentieux"}
                    <span className="block text-3xs text-slate-450 mt-0.5 font-normal">Fourniture de conseils juridiques et assistance en contentieux actif (Réf dossier: {invoice.caseId})</span>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-650">Forfaitaire</td>
                  <td className="p-4 text-right font-medium text-slate-650 font-mono">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="p-4 text-right font-bold text-gray-900 font-mono">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sum details breakdown */}
          <div className="flex flex-col items-end">
            <div className="w-full md:w-80 space-y-1.5">
              <div className="flex justify-between text-xs py-1 text-slate-600 font-medium">
                <span>Total HT</span>
                <span className="font-mono">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs py-1 text-slate-600 font-medium border-b border-slate-100 pb-2">
                <span>TVA (0.0% - Convention d'exonération)</span>
                <span className="font-mono">0,00 €</span>
              </div>
              
              <div className="flex justify-between text-sm py-1.5 text-slate-850 font-black border-b border-slate-200 pb-2.5">
                <span>Total TTC</span>
                <span className="font-mono text-base text-gray-950 font-black">{formatCurrency(invoice.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-xs py-1.5 text-emerald-700 font-bold">
                <span>Déjà Réglé (Acomptes)</span>
                <span className="font-mono">{formatCurrency(invoice.paidAmount)}</span>
              </div>

              <div className="flex justify-between text-sm py-2 text-rose-700 bg-rose-50/15 p-2 rounded-xl border border-rose-100 font-black">
                <span>Solde Restant à Régler (EUR)</span>
                <span className="font-mono text-base">{formatCurrency(remaining)}</span>
              </div>
            </div>
          </div>

          {/* Rib Payment instructions */}
          <div className="mt-8 pt-8 border-t border-slate-100 bg-slate-50/20 p-5 rounded-2xl border border-dashed border-slate-200">
            <span className="block text-4xs font-black uppercase tracking-widest text-[#15447c] mb-1.5">Informations de règlement bancaire</span>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              Veuillez libeller votre virement en précisant la référence de facture : <strong className="text-[#15447c] font-black">{invoice.id}</strong>.<br />
              Banque : <strong className="text-slate-700 font-semibold">ECOBANK RDC S.A.</strong> • Compte : <strong className="text-slate-700 font-mono">00101-23456789-90</strong> • Swift : <strong className="text-slate-700 font-mono font-semibold">ECOBCDKIXXX</strong>
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between text-gray-400 text-3xs font-semibold uppercase tracking-wider">
          <span>Cabinet KBB SARL • Kinshasa Gombe DRC</span>
          <button 
            onClick={onClose}
            className="bg-indigo-900 hover:bg-slate-900 text-white font-extrabold text-2xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition"
          >
            Fermer l'aperçu
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceDetailModal;
