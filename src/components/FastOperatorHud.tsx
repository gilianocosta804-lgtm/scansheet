import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Download,
  CopyX,
  User
} from 'lucide-react';
import { MatchedScanItem } from '../types';

interface FastOperatorHudProps {
  lastItem: MatchedScanItem | null;
  onDownloadStationSheet: (station: string) => void;
}

export const FastOperatorHud: React.FC<FastOperatorHudProps> = ({
  lastItem,
  onDownloadStationSheet,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastItem) return;
    setVisible(true);

    // Auto fade after 2.4s for smooth agility
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2400);

    return () => clearTimeout(timer);
  }, [lastItem]);

  if (!lastItem || !visible) return null;

  const isFound = lastItem.status === 'found';
  const isDuplicate = lastItem.status === 'duplicate';
  const isMismatch = lastItem.status === 'station_mismatch';
  const isDisallowed = lastItem.status === 'station_disallowed';
  const isNotFound = lastItem.status === 'not_found';

  return (
    <aside
      aria-label="Notificação Rápida de Leitura"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none transition-all duration-150 animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 ${
          isFound
            ? 'bg-slate-900/95 border-emerald-500/80 shadow-emerald-500/20 text-white'
            : isDuplicate
            ? 'bg-slate-900/95 border-amber-400 shadow-amber-500/30 text-white animate-pulse'
            : isMismatch
            ? 'bg-slate-900/95 border-amber-500/80 shadow-amber-500/20 text-white'
            : isDisallowed
            ? 'bg-slate-900/95 border-purple-500/80 shadow-purple-500/20 text-white'
            : 'bg-slate-900/95 border-rose-500/80 shadow-rose-500/20 text-white'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Status Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isFound
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : isDuplicate
                ? 'bg-amber-400 text-slate-950 font-bold'
                : isMismatch
                ? 'bg-amber-500 text-slate-950 font-bold'
                : isDisallowed
                ? 'bg-purple-500 text-white font-bold'
                : 'bg-rose-500 text-white font-bold'
            }`}
          >
            {isFound ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isDuplicate ? (
              <CopyX className="w-5 h-5" />
            ) : isMismatch || isDisallowed ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>

          {/* Quick Details Message */}
          <div className="min-w-0">
            {isFound && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
                  {lastItem.resolvedStation}
                </span>
                <span className="font-mono font-bold text-sm text-white">
                  {lastItem.scannedTbr}
                </span>
                {lastItem.pedido && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {lastItem.pedido}
                  </span>
                )}
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" /> Planilha {lastItem.resolvedStation} Atualizada!
                </span>
              </div>
            )}

            {isDuplicate && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40">
                    ITEM JÁ LIDO ANTERIORMENTE!
                  </span>
                  <span className="font-mono font-bold text-xs text-white">
                    {lastItem.scannedTbr}
                  </span>
                </div>
                <p className="text-[11px] text-amber-200 mt-0.5">
                  1ª leitura registrada às <b>{lastItem.firstScannedAt || 'nesta sessão'}</b>. Considerado apenas o primeiro registro.
                </p>
              </div>
            )}

            {isMismatch && (
              <div>
                <span className="text-xs font-bold text-amber-300 block">
                  Station Divergente: Registrado para {lastItem.resolvedStation}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  TBR: {lastItem.scannedTbr} • Planilha {lastItem.resolvedStation} criada
                </span>
              </div>
            )}

            {isDisallowed && (
              <div>
                <span className="text-xs font-bold text-purple-300 block">
                  Estação Não Permitida ({lastItem.resolvedStation})
                </span>
                <span className="text-[11px] text-slate-300">
                  Aceitas apenas: <b>PUE2</b>, <b>PFO1</b> ou <b>PTU2</b>
                </span>
              </div>
            )}

            {isNotFound && (
              <div>
                <span className="text-xs font-bold text-rose-300 block">
                  TBR Não Encontrado na Planilha
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  Código: {lastItem.scannedTbr}
                </span>
              </div>
            )}

            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {lastItem.searchDate}
              </span>
              {lastItem.operatorName && (
                <span className="flex items-center gap-1 text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  {lastItem.operatorName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick 1-click Download */}
        {isFound && (
          <button
            onClick={() => onDownloadStationSheet(lastItem.resolvedStation)}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            title={`Baixar planilha diária da ${lastItem.resolvedStation}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Baixar {lastItem.resolvedStation}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
