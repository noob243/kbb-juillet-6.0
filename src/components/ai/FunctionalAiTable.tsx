import React, { FC, useState, useMemo } from 'react';

interface FunctionalAiTableProps {
  rawLines: string[];
  isDarkMode: boolean;
}

export const FunctionalAiTable: FC<FunctionalAiTableProps> = ({ rawLines, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Parse headers and rows
  const { headers, rows } = useMemo(() => {
    let extractedHeaders: string[] = [];
    const extractedRows: string[][] = [];

    rawLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.includes('---') || trimmed.includes('|-')) return;

      const rawCells = trimmed.split('|');
      // If line starts and/or ends with |, remove boundary empties
      let cells = rawCells.map(c => c.trim());
      if (trimmed.startsWith('|') && cells.length > 0) cells.shift();
      if (trimmed.endsWith('|') && cells.length > 0) cells.pop();

      if (cells.length === 0) return;

      if (extractedHeaders.length === 0) {
        extractedHeaders = cells;
      } else {
        extractedRows.push(cells);
      }
    });

    return { headers: extractedHeaders, rows: extractedRows };
  }, [rawLines]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(row => row.some(cell => cell.toLowerCase().includes(term)));
  }, [rows, searchTerm]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (sortCol === null) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = (a[sortCol] || '').replace(/[*_`]/g, '').trim();
      const valB = (b[sortCol] || '').replace(/[*_`]/g, '').trim();

      // Check if both are numbers / currencies
      const numA = parseFloat(valA.replace(/[^0-9.-]+/g, ''));
      const numB = parseFloat(valB.replace(/[^0-9.-]+/g, ''));

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [filteredRows, sortCol, sortAsc]);

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
    }
  };

  const handleCopyTable = (format: 'tsv' | 'csv') => {
    const separator = format === 'csv' ? ';' : '\t';
    const headerLine = headers.join(separator);
    const dataLines = sortedRows.map(row => row.join(separator));
    const fullText = [headerLine, ...dataLines].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopyFeedback(format === 'csv' ? 'CSV copié !' : 'Tableau copié !');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const renderCellContent = (cell: string) => {
    const cleanText = cell.trim();

    // Check status badges
    const lower = cleanText.toLowerCase();
    if (['effectué', 'effectue', 'payée', 'payee', 'clôturé', 'cloture', 'gagné', 'validé', 'actif', 'traité', 'réglée'].some(s => lower.includes(s))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          ● {cleanText.replace(/\*\*/g, '')}
        </span>
      );
    }
    if (['en cours', 'en attente', 'partiel', 'à moitié', 'a moitie'].some(s => lower.includes(s))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          ● {cleanText.replace(/\*\*/g, '')}
        </span>
      );
    }
    if (['non effectué', 'non effectue', 'non réglée', 'impayé', 'en retard', 'urgent', 'perdu', 'rejeté', 'bloqué'].some(s => lower.includes(s))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          ● {cleanText.replace(/\*\*/g, '')}
        </span>
      );
    }

    // Bold tags & IDs formatting
    const parts = cleanText.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="font-extrabold text-[#15447c] dark:text-indigo-300">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-2xs text-indigo-600 dark:text-indigo-400">{part.slice(1, -1)}</code>;
          }
          return part;
        })}
      </span>
    );
  };

  if (headers.length === 0) return null;

  return (
    <div className={`my-4 border rounded-2xl overflow-hidden shadow-md transition-all ${
      isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'
    }`}>
      {/* Table Toolbar / Actions */}
      <div className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b text-xs ${
        isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            📊 Tableau de données
          </span>
          <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {sortedRows.length} {sortedRows.length > 1 ? 'entrées' : 'entrée'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {rows.length > 2 && (
            <input
              type="text"
              placeholder="Filtrer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-2.5 py-1 text-2xs rounded-lg border outline-none transition focus:ring-1 focus:ring-indigo-500 ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700 text-slate-200 placeholder-gray-500' 
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopyTable('tsv')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition flex items-center gap-1 hover:scale-105 active:scale-95 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-slate-300 hover:bg-gray-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Copier pour Excel / Word"
            >
              📋 {copyFeedback || 'Copier'}
            </button>
            <button
              onClick={() => handleCopyTable('csv')}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition hover:scale-105 active:scale-95 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-slate-400 hover:text-slate-200' 
                  : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Copier au format CSV"
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className={`min-w-full divide-y text-xs ${
          isDarkMode ? 'divide-gray-800 text-gray-200' : 'divide-slate-200 text-slate-800'
        }`}>
          <thead>
            <tr className={isDarkMode ? 'bg-gray-800/90 text-indigo-300' : 'bg-slate-100/90 text-slate-900'}>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(idx)}
                  className="px-4 py-3 text-left font-black uppercase tracking-wider text-[11px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition select-none whitespace-nowrap"
                  title="Cliquer pour trier"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header.replace(/\*\*/g, '')}</span>
                    {sortCol === idx ? (
                      <span className="text-indigo-500 font-bold">{sortAsc ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-slate-400 opacity-40 hover:opacity-100 text-[9px]">↕</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-slate-100'}`}>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-slate-400 text-xs italic">
                  Aucun résultat trouvé pour "{searchTerm}"
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`transition ${
                    rowIdx % 2 === 0
                      ? (isDarkMode ? 'bg-gray-900/40' : 'bg-white')
                      : (isDarkMode ? 'bg-gray-800/20' : 'bg-slate-50/50')
                  } ${isDarkMode ? 'hover:bg-indigo-950/20' : 'hover:bg-indigo-50/40'}`}
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap text-xs leading-relaxed">
                      {renderCellContent(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
