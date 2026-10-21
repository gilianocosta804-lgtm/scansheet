import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Search, 
  Plus, 
  RotateCcw, 
  Download,
  AlertCircle,
  Hash,
  Database,
  Layers,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { SpreadsheetData, SpreadsheetItem } from '../types';
import { parseSpreadsheetFile, getInitialSpreadsheetData } from '../utils/spreadsheet';
import * as XLSX from 'xlsx';

interface SpreadsheetViewerProps {
  data: SpreadsheetData;
  onUpdateData: (newData: SpreadsheetData) => void;
  onSelectTbrToScan?: (tbr: string, station?: string) => void;
}

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
  data,
  onUpdateData,
  onSelectTbrToScan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const parsed = await parseSpreadsheetFile(file);
      onUpdateData(parsed);
      localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(parsed));
      setUploadSuccess(`Planilha "${file.name}" carregada com sucesso! (${parsed.rows.length} itens encontrados)`);
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao carregar e interpretar o arquivo de planilha.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleResetToDemo = () => {
    if (window.confirm('Restaurar a planilha base de exemplo padrão?')) {
      const demo = getInitialSpreadsheetData();
      onUpdateData(demo);
      localStorage.removeItem('scansheet_persisted_base_sheet');
      setUploadError(null);
      setUploadSuccess('Planilha restaurada para o modelo padrão.');
    }
  };

  const handleDownloadCurrentSheet = () => {
    const exportRows = data.rows.map(({ id, ...rest }) => rest);
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, data.sheetName || 'TBR_Producao');
    XLSX.writeFile(workbook, data.fileName || 'Planilha_Base_TBR.xlsx');
  };

  const handleTbrColumnChange = (columnName: string) => {
    const updated = { ...data, tbrColumn: columnName };
    onUpdateData(updated);
    localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(updated));
  };

  const handleStationColumnChange = (columnName: string) => {
    const updated = { ...data, stationColumn: columnName };
    onUpdateData(updated);
    localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(updated));
  };

  const handlePedidoColumnChange = (columnName: string) => {
    const updated = { ...data, pedidoColumn: columnName };
    onUpdateData(updated);
    localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(updated));
  };

  const handleAddNewRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData[data.tbrColumn]?.trim()) {
      alert(`Preencha ao menos o campo '${data.tbrColumn}'!`);
      return;
    }

    const newItem: SpreadsheetItem = {
      id: `custom-tbr-${Date.now()}`,
      ...newRowData,
    };

    const updated = {
      ...data,
      rows: [newItem, ...data.rows],
    };

    onUpdateData(updated);
    localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(updated));

    setShowAddModal(false);
    setNewRowData({});
  };

  const filteredRows = data.rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Upload Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl border bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Planilha Base de Validação
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {data.rows.length} itens cadastrados
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Arquivo ativo: <span className="text-slate-200 font-semibold">{data.fileName}</span> | 
                TBR: <span className="text-emerald-400 font-mono font-semibold">{data.tbrColumn}</span> | 
                Station: <span className="text-cyan-400 font-mono font-semibold">{data.stationColumn}</span> | 
                Pedido: <span className="text-purple-400 font-mono font-semibold">{data.pedidoColumn}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Direct Upload Button for Operator */}
            <label className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Carregando...' : 'Carregar Minha Planilha (.xlsx/.csv)'}</span>
            </label>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Novo Item
            </button>

            <button
              onClick={handleDownloadCurrentSheet}
              className="p-2.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Baixar planilha base atual como Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetToDemo}
              className="p-2.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Restaurar Planilha Modelo Padrão"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {uploadSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Column Selectors */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* TBR Column */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                Coluna TBR:
              </span>
              <select
                value={data.tbrColumn}
                onChange={(e) => handleTbrColumnChange(e.target.value)}
                className="bg-slate-950 text-emerald-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 focus:border-emerald-400 outline-none"
              >
                {data.columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Station Column */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Coluna Station:
              </span>
              <select
                value={data.stationColumn}
                onChange={(e) => handleStationColumnChange(e.target.value)}
                className="bg-slate-950 text-cyan-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 focus:border-cyan-400 outline-none"
              >
                {data.columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Pedido Column */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-purple-400" />
                Coluna Pedido:
              </span>
              <select
                value={data.pedidoColumn}
                onChange={(e) => handlePedidoColumnChange(e.target.value)}
                className="bg-slate-950 text-purple-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 focus:border-purple-400 outline-none"
              >
                {data.columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pneu, station, pedido..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 text-slate-400 font-semibold w-12 text-center">#</th>
                {data.columns.map((col) => {
                  const isTbr = col === data.tbrColumn;
                  const isStation = col === data.stationColumn;
                  const isPedido = col === data.pedidoColumn;
                  return (
                    <th
                      key={col}
                      className={`py-3 px-4 font-semibold whitespace-nowrap ${
                        isTbr
                          ? 'text-emerald-400 bg-emerald-950/20'
                          : isStation
                          ? 'text-cyan-400 bg-cyan-950/20'
                          : isPedido
                          ? 'text-purple-300 bg-purple-950/20'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {col}
                        {isTbr && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                            TBR
                          </span>
                        )}
                        {isStation && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-normal">
                            Station
                          </span>
                        )}
                        {isPedido && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-normal">
                            Pedido
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-4 text-slate-400 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => {
                  const tbrValue = row[data.tbrColumn];
                  const stationValue = row[data.stationColumn];
                  return (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2.5 px-4 text-slate-500 text-center font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      {data.columns.map((col) => {
                        const val = row[col];
                        const isTbr = col === data.tbrColumn;
                        const isStation = col === data.stationColumn;
                        const isPedido = col === data.pedidoColumn;
                        return (
                          <td
                            key={col}
                            className={`py-2.5 px-4 whitespace-nowrap ${
                              isTbr
                                ? 'font-mono font-bold text-emerald-400 bg-emerald-950/10'
                                : isStation
                                ? 'font-mono font-semibold text-cyan-300 bg-cyan-950/10'
                                : isPedido
                                ? 'font-mono font-bold text-purple-300 bg-purple-950/10'
                                : 'text-slate-200'
                            }`}
                          >
                            {String(val !== undefined && val !== null ? val : '')}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {onSelectTbrToScan && tbrValue && (
                          <button
                            onClick={() => onSelectTbrToScan(String(tbrValue), stationValue ? String(stationValue) : undefined)}
                            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                          >
                            Testar este TBR
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={data.columns.length + 2}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    Nenhum item corresponde à busca &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Row Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Adicionar Item à Planilha Base</h3>
            <p className="text-xs text-slate-400 mb-4">
              Preencha os dados do novo item.
            </p>

            <form onSubmit={handleAddNewRow} className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {data.columns.map((col) => (
                <div key={col}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {col} {col === data.tbrColumn && <span className="text-emerald-400 font-bold">*</span>}
                  </label>
                  <input
                    type="text"
                    value={newRowData[col] || ''}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, [col]: e.target.value })
                    }
                    placeholder={`Valor de ${col}`}
                    required={col === data.tbrColumn}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Salvar na Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
