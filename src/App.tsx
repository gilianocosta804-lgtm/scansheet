/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Barcode, 
  FileSpreadsheet, 
  DownloadCloud, 
  Zap,
  Calendar,
  UserCheck,
  Users,
  Radio,
  Layers
} from 'lucide-react';

import { SpreadsheetData, MatchedScanItem, ALLOWED_STATIONS, ActiveOperator } from './types';
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

export default function App() {
  // Device unique client ID for multi-operator presence
  const clientIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? sessionStorage.getItem('scansheet_client_id') || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      : 'client_initial'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scansheet_client_id', clientIdRef.current);
    }
  }, []);

  // Shared Base Spreadsheet (Loaded from Server or Local)
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>(() => {
    const saved = localStorage.getItem('scansheet_persisted_base_sheet');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Falha ao ler planilha base salva:', e);
      }
    }
    return getInitialSpreadsheetData();
  });

  // Synced scan history across all operators
  const [scanHistory, setScanHistory] = useState<MatchedScanItem[]>([]);
  const [lastScannedItem, setLastScannedItem] = useState<MatchedScanItem | null>(null);
  const [activeOperators, setActiveOperators] = useState<ActiveOperator[]>([]);

  // Operator Identification
  const [operatorName, setOperatorName] = useState<string>(() => {
    return localStorage.getItem('scansheet_operator_name') || '';
  });
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('scansheet_operator_name');
  });

  // Active Station selected on this device
  const [currentStation, setCurrentStation] = useState<string>('PUE2');

  // Dates
  const todayNow = new Date();
  const todayISO = todayNow.toISOString().slice(0, 10); // "2026-10-20"
  const todayFormatted = todayNow.toLocaleDateString('pt-BR'); // "20/10/2026"

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoDownload, setAutoDownload] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'source' | 'generated'>('scanner');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync initial state from server
  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.spreadsheet && Array.isArray(data.spreadsheet.rows)) {
          setSpreadsheetData(data.spreadsheet);
        }
        if (Array.isArray(data.scans)) {
          setScanHistory(data.scans);
        }
        if (Array.isArray(data.activeOperators)) {
          setActiveOperators(data.activeOperators);
        }
      }
    } catch (e) {
      // Running standalone/offline fallback
    }
  }, []);

  // Connect to SSE stream and periodic heartbeat
  useEffect(() => {
    fetchServerState();

    // SSE connection for instant updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/scans/stream');
      
      eventSource.addEventListener('scan_added', (e: MessageEvent) => {
        try {
          const newRecord = JSON.parse(e.data);
          setScanHistory(prev => {
            // Avoid local duplicate if already added
            if (prev.some(item => item.id === newRecord.id)) return prev;
            return [newRecord, ...prev];
          });
        } catch {}
      });

      eventSource.addEventListener('spreadsheet_updated', (e: MessageEvent) => {
        try {
          const updatedSheet = JSON.parse(e.data);
          setSpreadsheetData(updatedSheet);
          localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(updatedSheet));
        } catch {}
      });

      eventSource.addEventListener('scans_cleared', () => {
        setScanHistory(prev => prev.filter(i => i.scanDateISO !== todayISO));
      });
    } catch {}

    // Heartbeat every 8s
    const heartbeatTimer = setInterval(() => {
      if (operatorName) {
        fetch('/api/operators/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorId: clientIdRef.current,
            operatorName,
            station: currentStation,
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data.activeOperators)) {
              setActiveOperators(data.activeOperators);
            }
          })
          .catch(() => {});
      }
    }, 8000);

    // Fast polling fallback every 4s to guarantee sync on mobile/sleeper tabs
    const pollTimer = setInterval(fetchServerState, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(heartbeatTimer);
      clearInterval(pollTimer);
    };
  }, [fetchServerState, operatorName, currentStation, todayISO]);

  const handleSaveOperator = (name: string) => {
    setOperatorName(name);
    localStorage.setItem('scansheet_operator_name', name);
    setIsOperatorModalOpen(false);

    // Immediate heartbeat to announce new operator name
    fetch('/api/operators/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorId: clientIdRef.current,
        operatorName: name,
        station: currentStation,
      }),
    }).catch(() => {});
  };

  // Update base spreadsheet across all connected operators
  const handleUpdateSpreadsheet = (newSheet: SpreadsheetData) => {
    setSpreadsheetData(newSheet);
    localStorage.setItem('scansheet_persisted_base_sheet', JSON.stringify(newSheet));

    // Broadcast to server for other operators
    fetch('/api/spreadsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSheet),
    }).catch(() => {});
  };

  // Main Barcode Scan Handler with Cross-Operator Duplicate Detection
  const handleTbrAndStationScan = useCallback(async (
    scannedTbr: string, 
    scannedStation: string | null,
    method: 'camera' | 'usb_scanner' | 'manual' | 'image' | 'test'
  ) => {
    if (!scannedTbr || !scannedTbr.trim()) return;

    if (!operatorName) {
      setIsOperatorModalOpen(true);
      return;
    }

    if (scannedStation) {
      setCurrentStation(scannedStation);
    }

    setIsProcessing(true);

    const now = new Date();
    const searchDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    const scanDateISO = now.toISOString().slice(0, 10);
    const normTbr = normalizeCode(scannedTbr);

    // 1. Fast local check for duplicate
    const existingLocal = scanHistory.find(
      i => (i.status === 'found' || i.status === 'station_mismatch') &&
           normalizeCode(i.scannedTbr) === normTbr &&
           i.scanDateISO === scanDateISO
    );

    if (existingLocal) {
      playDuplicateSound(!soundEnabled);

      const duplicateItem: MatchedScanItem = {
        id: `dup-${Date.now()}`,
        searchDate,
        scanDateISO,
        operatorName,
        scannedTbr: scannedTbr.trim(),
        scannedStation: scannedStation || '',
        resolvedStation: existingLocal.resolvedStation,
        pedido: existingLocal.pedido,
        scanMethod: method,
        matchedRow: existingLocal.matchedRow,
        status: 'duplicate',
        firstScannedAt: existingLocal.searchDate,
        firstOperatorName: existingLocal.operatorName,
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
      const finalStation = resolvedStation || 'PUE2';

      const newItem: MatchedScanItem = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

      // Server-side sync and atomic duplicate check across all devices
      try {
        const response = await fetch('/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.status === 'duplicate') {
            // Another operator beat this device by a fraction of a second!
            playDuplicateSound(!soundEnabled);
            setLastScannedItem(resJson.duplicateItem);
            setIsProcessing(false);
            return;
          }
        }
      } catch {
        // Offline fallback
      }

      // Play success beep
      playSuccessSound(!soundEnabled);
      setScanHistory(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
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
      {/* Header bar with multi-operator live presence */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        autoDownload={autoDownload}
        onToggleAutoDownload={() => setAutoDownload(prev => !prev)}
        totalFound={validTodayItems.length}
        sourceFileName={spreadsheetData.fileName}
        operatorName={operatorName}
        currentDateFormatted={todayFormatted}
        activeOperatorsCount={activeOperators.length}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Operator Setup Modal */}
      <OperatorModal
        isOpen={isOperatorModalOpen}
        currentName={operatorName}
        onSave={handleSaveOperator}
        onClose={() => setIsOperatorModalOpen(false)}
        canDismiss={!!operatorName}
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
          <div className="space-y-4">
            
            {/* Live Multi-Operator Team Strip */}
            {activeOperators.length > 0 && (
              <div className="max-w-2xl mx-auto p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-slate-300">
                    Equipe Operacional Conectada ({activeOperators.length}):
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeOperators.map((op, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 text-[11px] font-medium text-slate-300 border border-slate-800"
                    >
                      <span className="font-mono text-emerald-400 font-bold">{op.station}</span>: {op.operatorName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Modo Multi-Operador em Tempo Real Ativo
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Leitura Simultânea de TBR por Station ({todayFormatted})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Colaboradores podem ler simultaneamente em computadores e celulares diferentes. Todos os pedidos são sincronizados em tempo real nas planilhas do dia sem duplicatas.
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
                <span className="text-[10px] text-slate-500">pedidos da equipe</span>
              </div>

              <div 
                onClick={() => setActiveTab('generated')}
                className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer text-center transition-all hover:border-cyan-500/40"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planilha PFO1</span>
                <span className="text-xl font-mono font-extrabold text-cyan-400 mt-0.5 block">{countPFO1}</span>
                <span className="text-[10px] text-slate-500">pedidos da equipe</span>
              </div>

              <div 
                onClick={() => setActiveTab('generated')}
                className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer text-center transition-all hover:border-purple-500/40"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planilha PTU2</span>
                <span className="text-xl font-mono font-extrabold text-purple-400 mt-0.5 block">{countPTU2}</span>
                <span className="text-[10px] text-slate-500">pedidos da equipe</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Generated New Daily Spreadsheets */}
        {activeTab === 'generated' && (
          <GeneratedSpreadsheetViewer
            items={scanHistory}
            selectedDateISO={todayISO}
            onClear={async () => {
              if (window.confirm(`Limpar as planilhas geradas para o dia ${todayFormatted} para toda a equipe?`)) {
                try {
                  await fetch(`/api/scans/today?date=${todayISO}`, { method: 'DELETE' });
                } catch {}
                setScanHistory(prev => prev.filter(i => i.scanDateISO !== todayISO));
              }
            }}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}

        {/* Tab 3: Planilha Base (Sincronizada em tempo real) */}
        {activeTab === 'source' && (
          <SpreadsheetViewer
            data={spreadsheetData}
            onUpdateData={handleUpdateSpreadsheet}
            onSelectTbrToScan={(tbr, station) => {
              setActiveTab('scanner');
              handleTbrAndStationScan(tbr, station || null, 'manual');
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ScanSheet • Sistema Multi-Operador em Tempo Real (PUE2, PFO1, PTU2)</span>
          <span className="text-[11px] text-slate-600">
            Você está conectado como: <b className="text-slate-300">{operatorName || 'Operador'}</b> • Sincronização Ativa
          </span>
        </div>
      </footer>
    </div>
  );
}
