import React from 'react';
import { 
  Barcode, 
  Volume2, 
  VolumeX, 
  FileSpreadsheet, 
  DownloadCloud,
  Calendar,
  UserCheck,
  Shield,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoDownload: boolean;
  onToggleAutoDownload: () => void;
  totalFound: number;
  sourceFileName: string;
  operatorName: string;
  currentDateFormatted: string;
  isAdmin: boolean;
  onOpenOperatorModal: () => void;
  onOpenAdminLogin: () => void;
  activeTab: 'scanner' | 'source' | 'generated';
  onSelectTab: (tab: 'scanner' | 'source' | 'generated') => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  autoDownload,
  onToggleAutoDownload,
  totalFound,
  sourceFileName,
  operatorName,
  currentDateFormatted,
  isAdmin,
  onOpenOperatorModal,
  onOpenAdminLogin,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2.5 gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Barcode className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ScanSheet <span className="text-emerald-400 font-mono text-xs font-semibold">TBR</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <Calendar className="w-3 h-3 text-emerald-400" /> Dia: {currentDateFormatted}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs md:max-w-md">
                Estações: <span className="text-emerald-400 font-mono font-bold">PUE2 • PFO1 • PTU2</span> • Base: <span className="text-slate-300 font-medium">{sourceFileName}</span>
              </p>
            </div>
          </div>

          {/* Controls: Operator, Admin, Sound */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Operator Identifier Badge */}
            <button
              onClick={onOpenOperatorModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm group"
              title="Clique para trocar o operador"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-left text-[11px]">
                <span className="text-slate-400 block text-[9px] uppercase font-bold leading-none">Operador:</span>
                <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {operatorName || 'Identificar'}
                </span>
              </div>
            </button>

            {/* Admin Badge / Login button */}
            {isAdmin ? (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Conectado</span>
              </span>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-amber-300 hover:bg-slate-750 border border-slate-700 transition-all cursor-pointer"
                title="Acesso do Administrador para gerenciar a Planilha Base"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Auto-Download Toggle */}
            <button
              onClick={onToggleAutoDownload}
              title={autoDownload ? "Download automático ativado" : "Download manual"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                autoDownload
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span className="text-[11px]">Auto: <b>{autoDownload ? 'LIGADO' : 'DESL.'}</b></span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-xl text-xs transition-all border ${
                soundEnabled
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={soundEnabled ? "Som Ativado (Beep Industrial)" : "Som Silenciado"}
              aria-label="Controle de Som"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Simplified Operator Navigation Tabs (History removed) */}
        <div className="flex border-t border-slate-800/80 -mb-px overflow-x-auto no-scrollbar gap-2 pt-1 pb-1">
          <button
            onClick={() => onSelectTab('scanner')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Scanner &amp; Leitura Rápida
          </button>

          <button
            onClick={() => onSelectTab('generated')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'generated'
                ? 'bg-slate-800 text-emerald-300 border-b-2 border-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            Planilhas do Dia (PUE2, PFO1, PTU2)
            {totalFound > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                {totalFound}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('source')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'source'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Planilha Base {isAdmin && <span className="text-[10px] text-amber-300 font-bold">(Admin)</span>}
          </button>
        </div>
      </div>
    </header>
  );
};
