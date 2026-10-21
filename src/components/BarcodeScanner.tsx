import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  Search, 
  Keyboard, 
  ScanLine, 
  Zap, 
  Lock,
  Unlock,
  Sparkles,
  AlertCircle,
  Tag,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { SpreadsheetData, ALLOWED_STATIONS } from '../types';

interface BarcodeScannerProps {
  spreadsheetData: SpreadsheetData;
  currentStation: string;
  onStationChange: (station: string) => void;
  onScan: (tbr: string, station: string | null, method: 'camera' | 'usb_scanner' | 'manual' | 'image' | 'test') => void;
  isProcessing: boolean;
  onOpenUploadModal?: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  spreadsheetData,
  currentStation,
  onStationChange,
  onScan,
  isProcessing,
  onOpenUploadModal,
}) => {
  const selectedStation = currentStation;
  const setSelectedStation = (st: string) => onStationChange(st);
  const [lockStation, setLockStation] = useState<boolean>(true); // Locked by default for faster workflow!
  const [manualTbr, setManualTbr] = useState('');
  
  const [activeMode, setActiveMode] = useState<'camera' | 'manual' | 'image'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanningImage, setIsScanningImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);

  // USB Scanner buffer
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Cooldown to avoid duplicate consecutive triggers within 600ms on camera
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();

    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        setVideoDevices(devices);
        if (devices.length > 0) {
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('traseira') ||
            d.label.toLowerCase().includes('ambiente')
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[0].deviceId);
        }
      })
      .catch(err => {
        console.warn('Cannot list camera devices:', err);
      });

    return () => {
      stopCamera();
    };
  }, []);

  // USB Scanner global key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (keyBufferRef.current.length >= 2 && timeDiff < 100) {
          const scanned = keyBufferRef.current.trim();
          keyBufferRef.current = '';
          if (scanned) {
            handleDecodedCode(scanned, 'usb_scanner');
          }
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 120 && !isInput) {
          keyBufferRef.current = e.key;
        } else {
          keyBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStation, lockStation]);

  const handleDecodedCode = (
    text: string, 
    method: 'camera' | 'usb_scanner' | 'manual' | 'image' | 'test'
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check if the scanned barcode itself is a station switch (e.g. barcode of PUE2, PFO1, PTU2)
    const upper = trimmed.toUpperCase();
    if (ALLOWED_STATIONS.includes(upper as any)) {
      setSelectedStation(upper);
      return;
    }

    // Fast trigger without delay
    onScan(trimmed, selectedStation, method);
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!codeReaderRef.current || !videoRef.current) return;

    try {
      setIsCameraActive(true);
      const deviceIdToUse = selectedDeviceId || undefined;

      controlsRef.current = await codeReaderRef.current.decodeFromVideoDevice(
        deviceIdToUse,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            const now = Date.now();
            // Fast 700ms cooldown to allow fast consecutive reads of different tires
            if (text && text.trim().length > 0 && now - lastScannedTimeRef.current > 700) {
              lastScannedTimeRef.current = now;
              handleDecodedCode(text, 'camera');
            }
          }
        }
      );
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError('Permissão de câmera necessária ou dispositivo ocupado.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTbr.trim()) return;
    onScan(manualTbr.trim(), selectedStation, 'manual');
    setManualTbr(''); // Instantly clear for next scan!
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningImage(true);
    setCameraError(null);

    try {
      const imageUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result && result.getText()) {
        handleDecodedCode(result.getText(), 'image');
      } else {
        setCameraError('Nenhum código legível encontrado na foto.');
      }
    } catch (err) {
      setCameraError('Falha ao decodificar imagem.');
    } finally {
      setIsScanningImage(false);
      e.target.value = '';
    }
  };

  // Quick tests for PUE2, PFO1, PTU2
  const quickTestOrders = [
    { tbr: 'TBR-295-8022-001', station: 'PUE2', pedido: 'PED-90210', label: 'Michelin Liso' },
    { tbr: 'TBR-275-8022-003', station: 'PFO1', pedido: 'PED-88340', label: 'Continental Urbano' },
    { tbr: 'TBR-315-8022-005', station: 'PTU2', pedido: 'PED-77190', label: 'Goodyear Fora de Estrada' },
    { tbr: '7892958022014', station: 'PUE2', pedido: 'PED-90212', label: 'Firestone Direcional' },
    { tbr: 'TBR-999-INEXISTENTE', station: 'PUE2', pedido: '-', label: 'Teste: Não Encontrado' },
  ];

  return (
    <div className="space-y-4">
      
      {/* Shared Base Spreadsheet Status Banner for all operators */}
      <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white truncate">
                {spreadsheetData.fileName}
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {spreadsheetData.rows.length} itens na base
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {spreadsheetData.uploadedBy ? (
                <span>Carregada por: <b className="text-cyan-300">{spreadsheetData.uploadedBy}</b> {spreadsheetData.uploadedAt ? `(${spreadsheetData.uploadedAt})` : ''}</span>
              ) : (
                <span>Disponível para toda a equipe em tempo real</span>
              )}
            </p>
          </div>
        </div>

        {onOpenUploadModal && (
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Carregar Nova Planilha</span>
          </button>
        )}
      </div>

      {/* Station Selector Bar (Exclusivo: PUE2, PFO1, PTU2) */}
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Estações Aceitas: <span className="text-emerald-400 font-mono">PUE2 • PFO1 • PTU2</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Selecione o posto de trabalho. Cada estação gera sua própria planilha dedicada.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLockStation(!lockStation)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              lockStation
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Fixar para leitura sequencial rápida"
          >
            {lockStation ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3" />}
            <span>{lockStation ? 'Posto Fixado' : 'Alternar'}</span>
          </button>
        </div>

        {/* 3 Large Station Buttons */}
        <div className="grid grid-cols-3 gap-2.5 mt-3">
          {ALLOWED_STATIONS.map((st) => {
            const isSelected = selectedStation === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStation(st)}
                className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-slate-950 font-extrabold border-emerald-400 shadow-lg shadow-emerald-500/25 scale-[1.02]'
                    : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider block">Estação</span>
                <span className="text-xl font-mono font-extrabold block tracking-tight">
                  {st}
                </span>
                {isSelected ? (
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-950/20 text-slate-950">
                    ATIVA
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Selecionar</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Mode Selector */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto">
        <button
          onClick={() => {
            setActiveMode('camera');
            if (!isCameraActive) startCamera();
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMode === 'camera'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          Câmera Rápida
        </button>

        <button
          onClick={() => {
            setActiveMode('manual');
            stopCamera();
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMode === 'manual'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          Pistola USB / Digitar
        </button>

        <button
          onClick={() => {
            setActiveMode('image');
            stopCamera();
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMode === 'image'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          Foto / Imagem
        </button>
      </div>

      {/* Camera Live Mode */}
      {activeMode === 'camera' && (
        <div className="relative max-w-xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                Leitor Ativo: Station <span className="text-emerald-400 font-mono">{selectedStation}</span>
              </span>
            </div>

            {videoDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded-lg border border-slate-700 outline-none"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Câmera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative aspect-video sm:aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
              muted
              playsInline
            />

            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-700">
                  <CameraOff className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-white">Câmera Pausada</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                  Inicie a câmera para leitura ágil das etiquetas de TBR.
                </p>
                <button
                  onClick={startCamera}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Iniciar Câmera
                </button>
              </div>
            )}

            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                <div className="relative w-64 sm:w-80 h-40 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)] bg-emerald-500/5 overflow-hidden flex items-center justify-center">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce duration-700" />
                  <span className="text-[11px] font-mono text-emerald-200/90 bg-slate-950/80 px-2.5 py-1 rounded-md border border-emerald-500/30">
                    Posicione o Código TBR
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              {isCameraActive ? `Leitura contínua ativa (${selectedStation})` : 'Câmera pausada'}
            </span>

            {isCameraActive ? (
              <button
                onClick={stopCamera}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 cursor-pointer"
              >
                Pausar
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer"
              >
                Ativar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual / USB Mode */}
      {activeMode === 'manual' && (
        <div className="max-w-xl mx-auto rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Código TBR do Pneu:
                </label>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  Destino: Planilha {selectedStation}
                </span>
              </div>
              <input
                type="text"
                value={manualTbr}
                onChange={(e) => setManualTbr(e.target.value)}
                placeholder="Ex: TBR-295-8022-001 (aperte Enter ou use o leitor)"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-mono text-white placeholder-slate-500 outline-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={!manualTbr.trim() || isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Verificar e Adicionar à Planilha {selectedStation}</span>
            </button>
          </form>

          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px]">
              <b>Pistola Leitora USB:</b> Basta mirar na etiqueta e disparar o gatilho. Não precisa clicar na tela.
            </span>
          </div>
        </div>
      )}

      {/* Image File Mode */}
      {activeMode === 'image' && (
        <div className="max-w-xl mx-auto rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
          <label className="border-2 border-dashed border-slate-700 hover:border-purple-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-purple-400 mb-2" />
            <span className="text-xs font-semibold text-white">
              {isScanningImage ? 'Processando imagem...' : 'Clique para selecionar foto da etiqueta'}
            </span>
          </label>
        </div>
      )}

      {cameraError && (
        <div className="max-w-xl mx-auto p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Quick Test Barcodes */}
      <div className="max-w-2xl mx-auto p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Teste Rápido por Station:
          </span>
          <span className="text-[11px] text-slate-500">Clique para testar agilidade</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickTestOrders.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedStation(item.station);
                onScan(item.tbr, item.station, 'test');
              }}
              className="p-2 rounded-xl border bg-slate-800/70 hover:bg-emerald-950/40 text-slate-200 border-slate-700 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-bold text-xs text-emerald-400 truncate">
                  {item.tbr}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-950 text-cyan-300 border border-slate-800">
                  {item.station}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-1">
                {item.pedido} • {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
