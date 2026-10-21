import * as XLSX from 'xlsx';
import { 
  SpreadsheetData, 
  SpreadsheetItem, 
  MatchedScanItem, 
  ALLOWED_STATIONS, 
  AllowedStation 
} from '../types';

export const DEMO_TBR_ORDERS: SpreadsheetItem[] = [
  {
    id: 'ord-1',
    'TBR': 'TBR-295-8022-001',
    'Station': 'PUE2',
    'Pedido': 'PED-90210',
    'Medida / Modelo': '295/80R22.5 Liso Direcional',
    'Marca': 'Michelin X Multi',
    'Lote': 'LT-PUE2-01',
    'Quantidade': 1,
    'Status de Produção': 'Pronto para Montagem',
    'Operador': 'Carlos Silva',
  },
  {
    id: 'ord-2',
    'TBR': 'TBR-295-8022-002',
    'Station': 'PUE2',
    'Pedido': 'PED-90211',
    'Medida / Modelo': '295/80R22.5 Misto Tração',
    'Marca': 'Bridgestone M729',
    'Lote': 'LT-PUE2-01',
    'Quantidade': 1,
    'Status de Produção': 'Pronto para Montagem',
    'Operador': 'Carlos Silva',
  },
  {
    id: 'ord-3',
    'TBR': '7892958022014',
    'Station': 'PUE2',
    'Pedido': 'PED-90212',
    'Medida / Modelo': '295/80R22.5 Direcional Plus',
    'Marca': 'Firestone FS591',
    'Lote': 'LT-PUE2-02',
    'Quantidade': 1,
    'Status de Produção': 'Pronto para Montagem',
    'Operador': 'Carlos Silva',
  },
  {
    id: 'ord-4',
    'TBR': 'TBR-275-8022-003',
    'Station': 'PFO1',
    'Pedido': 'PED-88340',
    'Medida / Modelo': '275/80R22.5 Urbano',
    'Marca': 'Continental HDR2',
    'Lote': 'LT-PFO1-01',
    'Quantidade': 1,
    'Status de Produção': 'Raspagem Concluída',
    'Operador': 'Marcos Lima',
  },
  {
    id: 'ord-5',
    'TBR': 'TBR-295-8022-004',
    'Station': 'PFO1',
    'Pedido': 'PED-88341',
    'Medida / Modelo': '295/80R22.5 Rodoviário',
    'Marca': 'Pirelli FG01',
    'Lote': 'LT-PFO1-01',
    'Quantidade': 1,
    'Status de Produção': 'Raspagem Concluída',
    'Operador': 'Marcos Lima',
  },
  {
    id: 'ord-6',
    'TBR': '7892758022021',
    'Station': 'PFO1',
    'Pedido': 'PED-88342',
    'Medida / Modelo': '275/80R22.5 Urbano Tração',
    'Marca': 'Vipal VJ910',
    'Lote': 'LT-PFO1-02',
    'Quantidade': 1,
    'Status de Produção': 'Aprovado para Aplicação',
    'Operador': 'Marcos Lima',
  },
  {
    id: 'ord-7',
    'TBR': 'TBR-315-8022-005',
    'Station': 'PTU2',
    'Pedido': 'PED-77190',
    'Medida / Modelo': '315/80R22.5 Fora de Estrada',
    'Marca': 'Goodyear KMax D',
    'Lote': 'LT-PTU2-01',
    'Quantidade': 1,
    'Status de Produção': 'Vulcanização em Andamento',
    'Operador': 'Renato Souza',
  },
  {
    id: 'ord-8',
    'TBR': 'TBR-385-6522-006',
    'Station': 'PTU2',
    'Pedido': 'PED-77191',
    'Medida / Modelo': '385/65R22.5 Carreta Single',
    'Marca': 'Vipal VT220',
    'Lote': 'LT-PTU2-01',
    'Quantidade': 1,
    'Status de Produção': 'Cura Finalizada',
    'Operador': 'Renato Souza',
  },
  {
    id: 'ord-9',
    'TBR': '7893158022038',
    'Station': 'PTU2',
    'Pedido': 'PED-77192',
    'Medida / Modelo': '315/80R22.5 Borrachudo Tração',
    'Marca': 'Bandag BDM',
    'Lote': 'LT-PTU2-02',
    'Quantidade': 1,
    'Status de Produção': 'Liberado para Inspeção',
    'Operador': 'Renato Souza',
  }
];

export function isAllowedStation(stationStr: string): boolean {
  if (!stationStr) return false;
  const upper = stationStr.trim().toUpperCase();
  return ALLOWED_STATIONS.includes(upper as AllowedStation);
}

export function detectTbrColumn(columns: string[]): string {
  const candidates = [
    'tbr', 'codigo tbr', 'código tbr', 'cod tbr', 'tbr code', 'tbr_id', 'tbr_code',
    'pneu', 'tire', 'serial', 'codigo_tbr', 'código de barras', 'codigo de barras',
    'barcode', 'ean', 'sku', 'id'
  ];

  for (const candidate of candidates) {
    const found = columns.find(c => c.toLowerCase().trim() === candidate);
    if (found) return found;
  }
  for (const candidate of candidates) {
    const found = columns.find(c => c.toLowerCase().includes(candidate));
    if (found) return found;
  }
  return columns[0] || 'TBR';
}

export function detectStationColumn(columns: string[]): string {
  const candidates = [
    'station', 'estacao', 'estação', 'posto', 'linha', 'etapa', 'setor',
    'station_id', 'station name', 'nome station', 'estacao_trabalho', 'fase'
  ];

  for (const candidate of candidates) {
    const found = columns.find(c => c.toLowerCase().trim() === candidate);
    if (found) return found;
  }
  for (const candidate of candidates) {
    const found = columns.find(c => c.toLowerCase().includes(candidate));
    if (found) return found;
  }
  return columns[1] || 'Station';
}

export function detectPedidoColumn(columns: string[]): string {
  const candidates = [
    'pedido', 'ped', 'ordem', 'ordem_producao', 'op', 'order', 'order_id',
    'numero_pedido', 'num_pedido', 'os', 'num_ordem'
  ];

  for (const candidate of candidates) {
    const found = columns.find(c => c.toLowerCase().trim() === candidate);
    if (found) return found;
  }
  for (const candidate of candidates) {
    const found = columns.find(c => c.toLowerCase().includes(candidate));
    if (found) return found;
  }
  return columns.find(c => c.toLowerCase().includes('ped')) || 'Pedido';
}

export function getInitialSpreadsheetData(): SpreadsheetData {
  const columns = [
    'TBR',
    'Station',
    'Pedido',
    'Medida / Modelo',
    'Marca',
    'Lote',
    'Quantidade',
    'Status de Produção',
    'Operador'
  ];

  return {
    fileName: 'Controle_Pedidos_TBR_PUE2_PFO1_PTU2.xlsx',
    sheetName: 'Pedidos e Pneus',
    columns,
    rows: DEMO_TBR_ORDERS,
    tbrColumn: 'TBR',
    stationColumn: 'Station',
    pedidoColumn: 'Pedido',
  };
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Nenhuma aba encontrada no arquivo.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  const columnSet = new Set<string>();
  jsonData.forEach(row => {
    Object.keys(row).forEach(key => columnSet.add(key));
  });
  const columns = Array.from(columnSet);

  const rows: SpreadsheetItem[] = jsonData.map((row, index) => ({
    ...row,
    id: `row-${index + 1}-${Date.now()}`
  }));

  const tbrColumn = detectTbrColumn(columns);
  const stationColumn = detectStationColumn(columns);
  const pedidoColumn = detectPedidoColumn(columns);

  return {
    fileName: file.name,
    sheetName: firstSheetName,
    columns,
    rows,
    tbrColumn,
    stationColumn,
    pedidoColumn,
  };
}

export function normalizeCode(code: any): string {
  if (code === null || code === undefined) return '';
  return String(code).trim().toLowerCase().replace(/[\s\-\._]/g, '');
}

/**
 * Searches the spreadsheet by TBR and Station
 */
export function findRowByTbrAndStation(
  scannedTbr: string,
  scannedStation: string | null,
  rows: SpreadsheetItem[],
  tbrColumn: string,
  stationColumn: string,
  pedidoColumn: string
): { 
  row: SpreadsheetItem | null; 
  status: 'found' | 'not_found' | 'station_mismatch' | 'station_disallowed';
  resolvedStation: string;
  pedido: string;
} {
  const normSearchTbr = normalizeCode(scannedTbr);
  if (!normSearchTbr) {
    return { row: null, status: 'not_found', resolvedStation: '', pedido: '' };
  }

  // Find row matching TBR
  const matchedRow = rows.find(r => {
    const val = normalizeCode(r[tbrColumn]);
    return val === normSearchTbr || val.replace(/^0+/, '') === normSearchTbr.replace(/^0+/, '');
  });

  if (!matchedRow) {
    return { row: null, status: 'not_found', resolvedStation: '', pedido: '' };
  }

  const rowStationRaw = String(matchedRow[stationColumn] || '').trim().toUpperCase();
  const rowPedido = String(matchedRow[pedidoColumn] || matchedRow['Pedido'] || '').trim();

  // Check if row station is in [PUE2, PFO1, PTU2]
  if (!isAllowedStation(rowStationRaw)) {
    return { 
      row: matchedRow, 
      status: 'station_disallowed', 
      resolvedStation: rowStationRaw, 
      pedido: rowPedido 
    };
  }

  // If user has a selected/scanned active station, check match
  if (scannedStation && scannedStation.trim()) {
    const normScannedStation = scannedStation.trim().toUpperCase();
    if (!isAllowedStation(normScannedStation)) {
      return { 
        row: matchedRow, 
        status: 'station_disallowed', 
        resolvedStation: normScannedStation, 
        pedido: rowPedido 
      };
    }

    if (rowStationRaw !== normScannedStation) {
      return { 
        row: matchedRow, 
        status: 'station_mismatch', 
        resolvedStation: rowStationRaw, 
        pedido: rowPedido 
      };
    }
  }

  return { 
    row: matchedRow, 
    status: 'found', 
    resolvedStation: rowStationRaw, 
    pedido: rowPedido 
  };
}

/**
 * Format a single matched scan item for the daily Excel spreadsheet
 */
function formatRowForExport(item: MatchedScanItem, index: number) {
  const { matchedRow, searchDate, operatorName, scannedTbr, resolvedStation, pedido, scanMethod } = item;
  const base: Record<string, any> = {
    'Ordem': index + 1,
    'Data e Hora da Leitura': searchDate,
    'Operador Responsável': operatorName || 'Operador',
    'Station': resolvedStation,
    'Pedido': pedido || matchedRow['Pedido'] || '-',
    'Código TBR': scannedTbr,
    'Método de Leitura': scanMethod === 'camera' ? 'Câmera ao Vivo' :
                         scanMethod === 'usb_scanner' ? 'Pistola Leitora USB' :
                         scanMethod === 'image' ? 'Imagem' :
                         scanMethod === 'test' ? 'Simulador' : 'Manual',
    'Status Auditoria': 'VALIDADO (ÚNICO)',
  };

  Object.entries(matchedRow).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'Station' && key !== 'Pedido' && key !== 'TBR') {
      base[key] = value;
    }
  });

  return base;
}

/**
 * Exports a daily spreadsheet for a specific station (PUE2, PFO1 or PTU2)
 * File name: Planilha_PUE2_2026-10-20.xlsx
 */
export function exportStationDailySpreadsheet(
  station: string,
  items: MatchedScanItem[],
  targetDateISO: string,
  format: 'xlsx' | 'csv' = 'xlsx'
): string {
  // Only valid unique items for this station and this date
  const stationItems = items.filter(i => 
    i.resolvedStation.toUpperCase() === station.toUpperCase() && 
    (i.status === 'found' || i.status === 'station_mismatch') &&
    i.scanDateISO === targetDateISO
  );

  if (!stationItems.length) {
    throw new Error(`Nenhum pedido/TBR registrado na Station ${station} no dia ${targetDateISO}.`);
  }

  const exportRows = stationItems.map((item, idx) => formatRowForExport(item, idx));
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  const cleanSheetName = `Planilha_${station}_${targetDateISO}`.slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

  const fileName = `Planilha_${station}_${targetDateISO}.${format}`;

  if (format === 'csv') {
    XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
  }

  return fileName;
}

/**
 * Exports a consolidated daily workbook with separate tabs for PUE2, PFO1, PTU2
 * File name: Planilha_Diaria_PUE2_PFO1_PTU2_2026-10-20.xlsx
 */
export function exportAllStationsDailyWorkbook(
  items: MatchedScanItem[],
  targetDateISO: string,
  format: 'xlsx' | 'csv' = 'xlsx'
): string {
  const dailyItems = items.filter(i => 
    (i.status === 'found' || i.status === 'station_mismatch') &&
    i.scanDateISO === targetDateISO
  );

  if (!dailyItems.length) {
    throw new Error(`Nenhum pedido registrado no dia ${targetDateISO}.`);
  }

  const workbook = XLSX.utils.book_new();

  // Sheets for each allowed station
  ALLOWED_STATIONS.forEach(station => {
    const stItems = dailyItems.filter(i => i.resolvedStation.toUpperCase() === station);
    if (stItems.length > 0) {
      const rows = stItems.map((item, idx) => formatRowForExport(item, idx));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, ws, `Planilha_${station}`);
    }
  });

  // Consolidated sheet
  const allRows = dailyItems.map((item, idx) => formatRowForExport(item, idx));
  const consWs = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(workbook, consWs, 'Geral_Consolidado_Dia');

  const fileName = `Planilha_Diaria_${targetDateISO}.${format}`;

  if (format === 'csv') {
    XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
  }

  return fileName;
}
