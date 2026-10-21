import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  Trash2, 
  Clock, 
  ArrowRight,
  Layers,
  FileCheck,
  Calendar,
  User,
  ShieldCheck
} from 'lucide-react';
import { MatchedScanItem, ALLOWED_STATIONS } from '../types';
import { exportStationDailySpreadsheet, exportAllStationsDailyWorkbook } from '../utils/spreadsheet';

interface GeneratedSpreadsheetViewerProps {
  items: MatchedScanItem[];
  selectedDateISO: string;
  onClear: () => void;
  onGoToScanner: () => void;
}

export const GeneratedSpreadsheetViewer: React.FC<GeneratedSpreadsheetViewerProps> = ({
  items,
  selectedDateISO,
  onClear,
  onGoToScanner,
}) => {
  const [selectedStationTab, setSelectedStationTab] = useState<string>('PUE2');
  const [currentDateFilter, setCurrentDateFilter] = useState<string>(selectedDateISO);

  // Only valid non-duplicate items are included in the generated spreadsheets!
  const validItems = items.filter(i => i.status === 'found' || i.status === 'station_mismatch');

  // List of unique dates in the session
  const availableDates = Array.from(new Set(validItems.map(i => i.scanDateISO || selectedDateISO)));
  if (!availableDates.includes(selectedDateISO)) {
    availableDates.unshift(selectedDateISO);
  }

  // Filter items for the selected day
  const dailyItems = validItems.filter(i => (i.scanDateISO || selectedDateISO) === currentDateFilter);

  const getStationCount = (st: string) => {
    return dailyItems.filter(i => i.resolvedStation.toUpperCase() === st.toUpperCase()).length;
  };

  const currentStationItems = dailyItems.filter(i => 
    i.resolvedStation.toUpperCase() === selectedStationTab.toUpperCase()
  );

  const handleDownloadStation = (station: string) => {
    exportStationDailySpreadsheet(station, dailyItems, currentDateFilter, 'xlsx');
  };

  const handleDownloadAll = () => {
    exportAllStationsDailyWorkbook(dailyItems, currentDateFilter, 'xlsx');
  };

  const handleDownloadCsv = (station: string) => {
    exportStationDailySpreadsheet(station, dailyItems, currentDateFilter, 'csv');
  };

  if (dailyItems.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center max-w-xl mx-auto shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          Nenhuma Planilha Gerada para o Dia {currentDateFilter}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
          Ao realizar leituras nas estações <b>PUE2</b>, <b>PFO1</b> ou <b>PTU2</b>, as planilhas do dia são criadas automaticamente, desconsiderando duplicatas e identificando o operador.
        </p>
        <button
          onClick={onGoToScanner}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <span>Iniciar Leitura Rápida</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const allRowKeys = Array.from(
    new Set(dailyItems.flatMap(i => Object.keys(i.matchedRow).filter(k => k !== 'id' && k !== 'TBR' && k !== 'Station' && k !== 'Pedido')))
  );

  return (
    <div className="space-y-6">
      
      {/* Date Header Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Planilhas Diárias: {currentDateFilter}
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {dailyItems.length} {dailyItems.length === 1 ? 'item validado' : 'itens validados'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cada dia gera automaticamente seu arquivo individualizado por estação. Itens repetidos são ignorados.
            </p>
          </div>
        </div>

        {/* Date Selector if multiple dates */}
        {availableDates.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Dia:</span>
            <select
              value={currentDateFilter}
              onChange={(e) => setCurrentDateFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 outline-none"
            >
              {availableDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3 Dedicated Station Cards (PUE2, PFO1, PTU2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ALLOWED_STATIONS.map((st) => {
          const count = getStationCount(st);
          const isSelected = selectedStationTab === st;

          return (
            <div
              key={st}
              onClick={() => setSelectedStationTab(st)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    count > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {st}
                  </div>
                  <span className="font-bold text-white text-sm">Planilha {st} ({currentDateFilter})</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  count > 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                }`}>
                  {count} {count === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mb-3">
                {count > 0 ? `Planilha diária com ${count} pedidos únicos validados.` : 'Sem leituras para esta estação hoje.'}
              </p>

              {count > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadStation(st);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha_{st}_{currentDateFilter}.xlsx</span>
                </button>
              ) : (
                <div className="text-[11px] text-slate-600 italic py-1 text-center">
                  Aguardando leituras
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Table for the Selected Station */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Planilha do Dia: <span className="text-emerald-400 font-mono">{selectedStationTab}</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({currentStationItems.length} registros únicos)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Data: {currentDateFilter} • Pedidos separados da estação {selectedStationTab} com operador carimbado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStationItems.length > 0 && (
              <button
                onClick={() => handleDownloadStation(selectedStationTab)}
                className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar {selectedStationTab} (.xlsx)</span>
              </button>
            )}

            <button
              onClick={handleDownloadAll}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Baixar todas as 3 estações do dia no mesmo arquivo Excel em abas separadas"
            >
              <span>Baixar Todas do Dia (.xlsx)</span>
            </button>

            <button
              onClick={onClear}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
              title="Limpar registros gerados"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {currentStationItems.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5 text-slate-400 font-semibold w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 text-cyan-300 font-semibold whitespace-nowrap bg-cyan-950/20">
                    Data e Hora
                  </th>
                  <th className="py-2.5 px-3.5 text-purple-300 font-semibold whitespace-nowrap">
                    Operador
                  </th>
                  <th className="py-2.5 px-3.5 text-emerald-400 font-semibold whitespace-nowrap bg-emerald-950/20">
                    Station
                  </th>
                  <th className="py-2.5 px-3.5 text-white font-semibold whitespace-nowrap bg-slate-900">
                    Pedido
                  </th>
                  <th className="py-2.5 px-3.5 text-emerald-300 font-semibold whitespace-nowrap">
                    Código TBR
                  </th>
                  <th className="py-2.5 px-3.5 text-slate-400 font-semibold whitespace-nowrap">
                    Método
                  </th>
                  {allRowKeys.map(key => (
                    <th key={key} className="py-2.5 px-3.5 text-slate-300 font-semibold whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {currentStationItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3.5 text-slate-500 text-center font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3.5 font-mono font-bold text-cyan-300 bg-cyan-950/10 whitespace-nowrap">
                      {item.searchDate}
                    </td>
                    <td className="py-2 px-3.5 whitespace-nowrap text-purple-300 font-medium">
                      {item.operatorName || 'Operador'}
                    </td>
                    <td className="py-2 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {item.resolvedStation}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 font-mono font-bold text-white whitespace-nowrap">
                      {item.pedido || item.matchedRow['Pedido'] || '-'}
                    </td>
                    <td className="py-2 px-3.5 font-mono font-semibold text-emerald-400 whitespace-nowrap">
                      {item.scannedTbr}
                    </td>
                    <td className="py-2 px-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                      {item.scanMethod}
                    </td>
                    {allRowKeys.map(key => {
                      const val = item.matchedRow[key];
                      return (
                        <td key={key} className="py-2 px-3.5 whitespace-nowrap text-slate-200">
                          {String(val !== undefined && val !== null ? val : '-')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhum pedido escaneado para a Station <b>{selectedStationTab}</b> na data selecionada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
