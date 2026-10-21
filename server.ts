import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Initial default base spreadsheet
const DEFAULT_SPREADSHEET = {
  fileName: 'Controle_Pedidos_TBR_PUE2_PFO1_PTU2.xlsx',
  sheetName: 'Pedidos e Pneus',
  columns: [
    'TBR',
    'Station',
    'Pedido',
    'Medida / Modelo',
    'Marca',
    'Lote',
    'Quantidade',
    'Status de Produção',
    'Operador'
  ],
  rows: [
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
  ],
  tbrColumn: 'TBR',
  stationColumn: 'Station',
  pedidoColumn: 'Pedido',
};

// Shared state in memory for fast multi-operator synchronization
let currentSpreadsheet = DEFAULT_SPREADSHEET;
let scanRecords: any[] = [];
let connectedClients: express.Response[] = [];
let activeOperators: Record<string, { operatorName: string; station: string; lastSeen: number }> = {};

function notifyAllClients(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  connectedClients = connectedClients.filter(res => {
    try {
      res.write(payload);
      return true;
    } catch {
      return false;
    }
  });
}

function cleanInactiveOperators() {
  const now = Date.now();
  Object.keys(activeOperators).forEach(key => {
    if (now - activeOperators[key].lastSeen > 20000) {
      delete activeOperators[key];
    }
  });
}

// REST API for Multi-Operator Sync

// Get complete current state
app.get('/api/state', (req, res) => {
  cleanInactiveOperators();
  res.json({
    spreadsheet: currentSpreadsheet,
    scans: scanRecords,
    activeOperators: Object.values(activeOperators),
    serverTime: new Date().toISOString(),
  });
});

// Update shared base spreadsheet (when any operator uploads a new sheet)
app.post('/api/spreadsheet', (req, res) => {
  const newSheet = req.body;
  if (!newSheet || !Array.isArray(newSheet.rows)) {
    return res.status(400).json({ error: 'Planilha inválida' });
  }
  currentSpreadsheet = newSheet;
  notifyAllClients('spreadsheet_updated', currentSpreadsheet);
  res.json({ success: true, count: currentSpreadsheet.rows.length });
});

// Record a new scan (Server-Authoritative with Cross-Operator Duplicate Detection!)
app.post('/api/scans', (req, res) => {
  const item = req.body;
  if (!item || !item.scannedTbr) {
    return res.status(400).json({ error: 'Item de leitura inválido' });
  }

  const normTbr = String(item.scannedTbr).trim().toLowerCase().replace(/[\s\-\._]/g, '');
  const todayISO = item.scanDateISO || new Date().toISOString().slice(0, 10);

  // Check if ANY operator already scanned this TBR on this day
  const existing = scanRecords.find(i => 
    (i.status === 'found' || i.status === 'station_mismatch') &&
    String(i.scannedTbr).trim().toLowerCase().replace(/[\s\-\._]/g, '') === normTbr &&
    i.scanDateISO === todayISO
  );

  if (existing) {
    // Duplicate detected across operators!
    const duplicateEvent = {
      ...item,
      id: `dup-${Date.now()}-${Math.random()}`,
      status: 'duplicate',
      firstScannedAt: existing.searchDate,
      firstOperatorName: existing.operatorName,
    };
    scanRecords.unshift(duplicateEvent);
    notifyAllClients('scan_added', duplicateEvent);
    return res.json({ status: 'duplicate', duplicateItem: duplicateEvent, existingScan: existing });
  }

  // Valid new scan
  const newRecord = {
    ...item,
    id: `scan-${Date.now()}-${Math.random()}`,
  };

  scanRecords.unshift(newRecord);
  notifyAllClients('scan_added', newRecord);
  res.json({ status: 'ok', item: newRecord });
});

// Operator presence heartbeat
app.post('/api/operators/heartbeat', (req, res) => {
  const { operatorId, operatorName, station } = req.body;
  if (operatorId && operatorName) {
    activeOperators[operatorId] = {
      operatorName,
      station: station || 'PUE2',
      lastSeen: Date.now(),
    };
  }
  cleanInactiveOperators();
  res.json({ activeOperators: Object.values(activeOperators) });
});

// Clear scans for today
app.delete('/api/scans/today', (req, res) => {
  const todayISO = req.query.date || new Date().toISOString().slice(0, 10);
  scanRecords = scanRecords.filter(i => i.scanDateISO !== todayISO);
  notifyAllClients('scans_cleared', { date: todayISO });
  res.json({ success: true });
});

// Server-Sent Events (SSE) for Real-Time live streaming to all devices
app.get('/api/scans/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  connectedClients.push(res);

  // Send initial connected ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientsCount: connectedClients.length })}\n\n`);

  req.on('close', () => {
    connectedClients = connectedClients.filter(c => c !== res);
  });
});

// Vite Middleware for development
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ScanSheet Pro Multi-Operador rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
