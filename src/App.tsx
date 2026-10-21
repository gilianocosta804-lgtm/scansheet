/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Barcode, 
  FileSpreadsheet, 
  DownloadCloud, 
  Zap,
  Calendar,
  UserCheck,
  ShieldCheck,
  Lock
} from 'lucide-react';

import { SpreadsheetData, MatchedScanItem, ALLOWED_STATIONS } from './types';
import { 
  getInitialSpreadsheetData, 
  findRowByTbrAndStation, 
  exportStationDailySpreadsheet,
  exportAllStationsDailyWorkbook,
  normalizeCode
} from './utils/spreadsheet';
import { 
  playSuccessSound, 
  playDuplicateSound,
  playNotFoundSound, 
  playStationRejectSound 
} from './utils/audio';

import { Header } from './components/Header';
import { BarcodeScanner } from './components/BarcodeScanner';
import { SpreadsheetViewer } from './components/SpreadsheetViewer';
import { GeneratedSpreadsheetViewer } from './components/GeneratedSpreadsheetViewer';
import { FastOperatorHud } from './components/FastOperatorHud';
import { OperatorModal } from './components/OperatorModal';
import { AdminLoginModal } from './components/AdminLoginModal';

export default function App() {
  // Planilha Base: Carrega a planilha persistida fornecida pelo Administrador, ou o modelo inicial.
  // Garante que "quando o operador acessar a planilha base já esteja lá".
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>(() => {
    const saved = localStorage.getItem('scansheet_persisted_base_sheet');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Falha ao ler planilha base persistida:', e);
      }
    }
    return getInitialSpreadsheetData();
  });

  const [scanHistory, setScanHistory] = useState<MatchedScanItem[]>([]);
  const [lastScannedItem, setLastScannedItem] = useState<MatchedScanItem | null>(null);

  // Operator Identification (Sem turnos, apenas nome do operador)
  const [operatorName, setOperatorName] = useState<string>(() => {
    return localStorage.getItem('scansheet_operator_name') || '';
  });
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('scansheet_operator_name');
  });

  // Admin Authentication (Login: AdminSva9, Senha: BSBsva961)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Current Date in ISO and formatted
  const todayNow = new Date();
  const todayISO = todayNow.toISOString().slice(0, 10); // "2026-10-20"
  const todayFormatted = todayNow.toLocaleDateString('pt-BR'); // "20/10/2026"

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoDownload, setAutoDownload] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'source' | 'generated'>('scanner');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveOperator = (name: string) => {
    setOperatorName(name);
    localStorage.setItem('scansheet_operator_name', name);
    setIsOperatorModalOpen(false);
  };

  // Main Barcode Scan Handler
  const handleTbrAndStationScan = useCallback((
    scannedTbr: string, 
    scannedStation: string | null,
    method: 'camera' | 'usb_scanner' | 'manual' | 'image' | 'test'
  ) => {
    if (!scannedTbr || !scannedTbr.trim()) return;

    // Prompt operator if not identified
    if (!operatorName) {
      setIsOperatorModalOpen(true);
      return;
    }

    setIsProcessing(true);

    const now = new Date();
    const searchDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    const scanDateISO = now.toISOString().slice(0, 10);

    const normTbr = normalizeCode(scannedTbr);

    // 1. Check for Duplicate (same TBR read on this day)
    // "se o mesmo item for lido 2 vezes avise, e considere apenas o primeiro"
    const existingScan = scanHistory.find(
      i => (i.status === 'found' || i.status === 'station_mismatch') &&
           normalizeCode(i.scannedTbr) === normTbr &&
           i.scanDateISO === scanDateISO
    );

    if (existingScan) {
      playDuplicateSound(!soundEnabled);

      const duplicateItem: MatchedScanItem = {
        id: `dup-${Date.now()}`,
        searchDate,
        scanDateISO,
        operatorName,
        scannedTbr: scannedTbr.trim(),
        scannedStation: scannedStation || '',
        resolvedStation: existingScan.resolvedStation,
        pedido: existingScan.pedido,
        scanMethod: method,
        matchedRow: existingScan.matchedRow,
        status: 'duplicate',
        firstScannedAt: existingScan.searchDate,
      };

      setScanHistory(prev => [duplicateItem, ...prev]);
      setLastScannedItem(duplicateItem);
      setIsProcessing(false);
      return;
    }

    // 2. Validate in spreadsheet
    const { row: matchedRow, status, resolvedStation, pedido } = findRowByTbrAndStation(
      scannedTbr,
      scannedStation,
      spreadsheetData.rows,
      spreadsheetData.tbrColumn,
      spreadsheetData.stationColumn,
      spreadsheetData.pedidoColumn
    );

    if (status === 'found' || status === 'station_mismatch') {
      playSuccessSound(!soundEnabled);

      const finalStation = resolvedStation || 'PUE2';

      const newItem: MatchedScanItem = {
        id: `match-${Date.now()}-${Math.random()}`,
        searchDate,
        scanDateISO,
        operatorName,
        scannedTbr: scannedTbr.trim(),
        scannedStation: scannedStation || '',
        resolvedStation: finalStation,
        pedido: pedido || String(matchedRow?.['Pedido'] || '-'),
        scanMethod: method,
        matchedRow: matchedRow || { id: `item-${Date.now()}` },
        status,
      };

      setScanHistory(prev => [newItem, ...prev]);
      setLastScannedItem(newItem);

      if (autoDownload) {
        try {
          exportStationDailySpreadsheet(finalStation, [newItem], scanDateISO, 'xlsx');
        } catch (err) {
          console.error('Auto download error:', err);
        }
      }
    } else if (status === 'station_disallowed') {
      playStationRejectSound(!soundEnabled);

      const newItem: MatchedScanItem = {
        id: `disallowed-${Date.now()}`,
        searchDate,
        scanDateISO,
        operatorName,
        scannedTbr: scannedTbr.trim(),
        scannedStation: scannedStation || '',
        resolvedStation: resolvedStation || 'Não Permitida',
        pedido: pedido || '-',
        scanMethod: method,
        matchedRow: matchedRow || { id: `item-${Date.now()}` },
        status: 'station_disallowed',
      };

      setScanHistory(prev => [newItem, ...prev]);
      setLastScannedItem(newItem);
    } else {
      playNotFoundSound(!soundEnabled);

      const newItem: MatchedScanItem = {
        id: `miss-${Date.now()}`,
        searchDate,
        scanDateISO,
        operatorName,
        scannedTbr: scannedTbr.trim(),
        scannedStation: scannedStation || '',
        resolvedStation: scannedStation || 'Não Identificada',
        pedido: '-',
        scanMethod: method,
        matchedRow: { id: `unmatched-${Date.now()}` },
        status: 'not_found',
      };

      setScanHistory(prev => [newItem, ...prev]);
      setLastScannedItem(newItem);
    }

    setIsProcessing(false);
  }, [spreadsheetData, soundEnabled, autoDownload, operatorName, scanHistory]);

  const validTodayItems = scanHistory.filter(
    i => (i.status === 'found' || i.status === 'station_mismatch') && i.scanDateISO === todayISO
  );
  const countPUE2 = validTodayItems.filter(i => i.resolvedStation === 'PUE2').length;
  const countPFO1 = validTodayItems.filter(i => i.resolvedStation === 'PFO1').length;
  const countPTU2 = validTodayItems.filter(i => i.resolvedStation === 'PTU2').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header bar */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        autoDownload={autoDownload}
        onToggleAutoDownload={() => setAutoDownload(prev => !prev)}
        totalFound={validTodayItems.length}
        sourceFileName={spreadsheetData.fileName}
        operatorName={operatorName}
        currentDateFormatted={todayFormatted}
        isAdmin={isAdmin}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Operator Setup Modal (Sem turnos) */}
      <OperatorModal
        isOpen={isOperatorModalOpen}
        currentName={operatorName}
        onSave={handleSaveOperator}
        onClose={() => setIsOperatorModalOpen(false)}
        canDismiss={!!operatorName}
      />

      {/* Admin Login Modal (Login: AdminSva9, Senha: BSBsva961) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          setIsAdmin(true);
          setActiveTab('source');
        }}
      />

      {/* Fast Non-blocking Operator HUD alert */}
      <FastOperatorHud
        lastItem={lastScannedItem}
        onDownloadStationSheet={(st) => exportStationDailySpreadsheet(st, validTodayItems, todayISO, 'xlsx')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* Tab 1: Fast Scanner */}
        {activeTab === 'scanner' && (
          <div className="space-y-5">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Leitor Industrial • Proteção Contra Duplicatas
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Leitura de TBR por Station ({todayFormatted})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Colaborador: <b className="text-emerald-400">{operatorName || 'Identifique-se no topo'}</b>.
                Itens lidos 2 vezes são avisados e apenas a primeira leitura é considerada.
              </p>
            </div>

            <BarcodeScanner
              spreadsheetData={spreadsheetData}
              onScan={handleTbrAndStationScan}
              isProcessing={isProcessing}
            />

            {/* Quick 3 Station Counters for Today */}
            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto pt-2">
              <div 
                onClick={() => setActiveTab('generated')}
                className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer text-center transition-all hover:border-emerald-500/40"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planilha PUE2</span>
                <span className="text-xl font-mono font-extrabold text-emerald-400 mt-0.5 block">{countPUE2}</span>
                <span className="text-[10px] text-slate-500">pedidos únicos</span>
              </div>

              <div 
                onClick={() => setActiveTab('generated')}
                className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer text-center transition-all hover:border-cyan-500/40"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planilha PFO1</span>
                <span className="text-xl font-mono font-extrabold text-cyan-400 mt-0.5 block">{countPFO1}</span>
                <span className="text-[10px] text-slate-500">pedidos únicos</span>
              </div>

              <div 
                onClick={() => setActiveTab('generated')}
                className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer text-center transition-all hover:border-purple-500/40"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planilha PTU2</span>
                <span className="text-xl font-mono font-extrabold text-purple-400 mt-0.5 block">{countPTU2}</span>
                <span className="text-[10px] text-slate-500">pedidos únicos</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Generated New Daily Spreadsheets */}
        {activeTab === 'generated' && (
          <GeneratedSpreadsheetViewer
            items={scanHistory}
            selectedDateISO={todayISO}
            onClear={() => {
              if (window.confirm(`Limpar as planilhas geradas para o dia ${todayFormatted}?`)) {
                setScanHistory(prev => prev.filter(i => i.scanDateISO !== todayISO));
              }
            }}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}

        {/* Tab 3: Planilha Base (Gerenciada pelo Administrador, acessível para o operador) */}
        {activeTab === 'source' && (
          <SpreadsheetViewer
            data={spreadsheetData}
            isAdmin={isAdmin}
            onOpenAdminLogin={() => setIsAdminModalOpen(true)}
            onAdminLogout={() => setIsAdmin(false)}
            onUpdateData={setSpreadsheetData}
            onSelectTbrToScan={(tbr, station) => {
              setActiveTab('scanner');
              handleTbrAndStationScan(tbr, station || null, 'manual');
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ScanSheet • Controle Diário de TBR por Station (PUE2, PFO1, PTU2)</span>
          <span className="text-[11px] text-slate-600">
            Planilha Base fornecida pelo Administrador • Operador: {operatorName || 'Pendente'}
          </span>
        </div>
      </footer>
    </div>
  );
}
