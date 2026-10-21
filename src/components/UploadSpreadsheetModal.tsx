import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Tag, 
  Layers, 
  Hash, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SpreadsheetData } from '../types';
import { parseSpreadsheetFile } from '../utils/spreadsheet';

interface UploadSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorName: string;
  onUploadSuccess: (newSheet: SpreadsheetData, uploaderName: string) => void;
}

export const UploadSpreadsheetModal: React.FC<UploadSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  operatorName,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<SpreadsheetData | null>(null);
  const [tbrCol, setTbrCol] = useState<string>('');
  const [stationCol, setStationCol] = useState<string>('');
  const [pedidoCol, setPedidoCol] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const parsed = await parseSpreadsheetFile(file);
      setParsedPreview(parsed);
      setTbrCol(parsed.tbrColumn);
      setStationCol(parsed.stationColumn);
      setPedidoCol(parsed.pedidoColumn);
    } catch (err: any) {
      setError(err.message || 'Falha ao interpretar o arquivo. Envie um arquivo Excel (.xlsx, .xls) ou CSV válido.');
      setParsedPreview(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleConfirmUpload = () => {
    if (!parsedPreview) return;

    const uploader = operatorName || 'Operador';
    const finalSheet: SpreadsheetData = {
      ...parsedPreview,
      tbrColumn: tbrCol || parsedPreview.tbrColumn,
      stationColumn: stationCol || parsedPreview.stationColumn,
      pedidoColumn: pedidoCol || parsedPreview.pedidoColumn,
      uploadedBy: uploader,
      uploadedAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR'),
    };

    onUploadSuccess(finalSheet, uploader);
    onClose();
    setParsedPreview(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative overflow-hidden">
        {/* Accent glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Carregar Planilha Base para Toda a Equipe
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Sincronizada automaticamente com todos os operadores em rede.
            </p>
          </div>
        </div>

        {/* Dropzone */}
        {!parsedPreview && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/50 hover:bg-slate-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, .tsv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-white mb-1">
              {isProcessing ? 'Lendo e interpretando arquivo...' : 'Arraste ou clique para selecionar a planilha'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3">
              Formatos aceitos: <b>.xlsx</b> (Excel), <b>.xls</b> ou <b>.csv</b>.
            </p>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Detecção automática de colunas TBR, Station e Pedido
            </span>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview and Confirmation */}
        {parsedPreview && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white truncate max-w-xs">
                    {parsedPreview.fileName}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {parsedPreview.rows.length} itens encontrados
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aba: <b className="text-slate-200">{parsedPreview.sheetName}</b> • Carregador: <b className="text-cyan-300">{operatorName || 'Operador'}</b>
              </p>

              {/* Column verification */}
              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-400" /> Coluna TBR:
                  </label>
                  <select
                    value={tbrCol}
                    onChange={(e) => setTbrCol(e.target.value)}
                    className="w-full bg-slate-900 text-emerald-300 text-xs px-2 py-1.5 rounded-lg border border-slate-700 outline-none"
                  >
                    {parsedPreview.columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" /> Coluna Station:
                  </label>
                  <select
                    value={stationCol}
                    onChange={(e) => setStationCol(e.target.value)}
                    className="w-full bg-slate-900 text-cyan-300 text-xs px-2 py-1.5 rounded-lg border border-slate-700 outline-none"
                  >
                    {parsedPreview.columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-purple-400" /> Coluna Pedido:
                  </label>
                  <select
                    value={pedidoCol}
                    onChange={(e) => setPedidoCol(e.target.value)}
                    className="w-full bg-slate-900 text-purple-300 text-xs px-2 py-1.5 rounded-lg border border-slate-700 outline-none"
                  >
                    {parsedPreview.columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Trocar Arquivo
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <span>Sincronizar e Disponibilizar para Toda a Equipe</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>ScanSheet • Compartilhamento em Rede Local e Nuvem</span>
          <span>Acesso liberado sem necessidade de administrador</span>
        </div>
      </div>
    </div>
  );
};
