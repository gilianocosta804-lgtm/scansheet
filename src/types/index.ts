export const ALLOWED_STATIONS = ['PUE2', 'PFO1', 'PTU2'] as const;
export type AllowedStation = typeof ALLOWED_STATIONS[number];

export interface SpreadsheetItem {
  id: string;
  [key: string]: any;
}

export interface SpreadsheetData {
  fileName: string;
  sheetName: string;
  columns: string[];
  rows: SpreadsheetItem[];
  tbrColumn: string;       // Coluna para Código TBR
  stationColumn: string;   // Coluna para Station
  pedidoColumn: string;    // Coluna para Pedido / Ordem
  uploadedBy?: string;     // Nome do operador que carregou a planilha
  uploadedAt?: string;     // Data e hora do upload
}

export interface MatchedScanItem {
  id: string;
  searchDate: string;      // Data e hora em que foi pesquisado (DD/MM/AAAA HH:MM:SS)
  scanDateISO: string;     // Data no formato YYYY-MM-DD para agrupamento diário
  operatorName: string;    // Nome do operador responsável por esta leitura
  scannedTbr: string;      // Código TBR lido
  scannedStation: string;  // Station lida ou selecionada
  resolvedStation: string; // Station final validada
  pedido: string;          // Pedido correspondente
  scanMethod: 'camera' | 'usb_scanner' | 'manual' | 'image' | 'test';
  matchedRow: SpreadsheetItem;
  status: 'found' | 'duplicate' | 'not_found' | 'station_mismatch' | 'station_disallowed';
  firstScannedAt?: string; // Horário da primeira leitura caso seja duplicata
  firstOperatorName?: string; // Nome do colega que leu primeiro caso seja duplicata
}

export interface ActiveOperator {
  operatorName: string;
  station: string;
  lastSeen: number;
}

export interface StationSpreadsheetCollection {
  PUE2: MatchedScanItem[];
  PFO1: MatchedScanItem[];
  PTU2: MatchedScanItem[];
}
