// Deployment smoke test: `pnpm smoke [baseUrl]` (default http://127.0.0.1:3001).
//
// Builds a small fictitious shift-close workbook in memory, then checks the web page, the health
// check, the analysis (3 views for 2 branches) and both reports of the combined view. Nothing is
// written to disk. Exit code 0 = every check passed, 1 = at least one failed.
//
// It lives in apps/api so `exceljs` resolves from the API's own dependencies (no new packages).
// With Vercel Authentication enabled, set VERCEL_PROTECTION_BYPASS to a Protection Bypass for
// Automation secret; it is sent as the `x-vercel-protection-bypass` header.
import ExcelJS from 'exceljs';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:3001').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 90_000;
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EXPECTED_SHEETS = ['Resumen', 'Ranking', 'Podio', 'Observaciones', 'Control de caja'];

const HEADERS = [
  'succodigo',
  'sucursal',
  'sucdescrip',
  'turno',
  'caja',
  'usulogin',
  'turiniciaturno',
  'turcierre',
  'totaltiquets',
  'sv_noactivada',
  'sv_rechazada',
  'sv_aceptada',
  'venta',
  'turefectivo',
  'turdiferencia',
  'ventaclubgrido',
  'desde',
  'hasta',
];

/** Excel wall-clock date as exceljs reads it back: a Date whose UTC fields are the local time. */
const at = (isoWallClock) => new Date(`${isoWallClock}Z`);

/** Two fictitious branches, two fictitious cashiers each, one day and one night shift. */
function fictitiousRows() {
  const branches = [
    { code: 1, name: 'Sucursal Norte', cashiers: ['cajero-norte-a', 'cajero-norte-b'] },
    { code: 2, name: 'Sucursal Sur', cashiers: ['cajero-sur-a', 'cajero-sur-b'] },
  ];
  let turno = 5000;
  const rows = [];
  for (const branch of branches) {
    branch.cashiers.forEach((login, index) => {
      for (const [start, end] of [
        ['2026-10-19T08:00:00', '2026-10-19T15:00:00'],
        ['2026-10-20T16:00:00', '2026-10-20T23:00:00'],
      ]) {
        turno += 1;
        rows.push({
          succodigo: branch.name,
          sucursal: branch.code,
          sucdescrip: 'TODAS',
          turno,
          caja: index + 1,
          usulogin: login,
          turiniciaturno: at(start),
          turcierre: at(end),
          totaltiquets: 40 + index * 5,
          sv_noactivada: 10,
          sv_rechazada: 20,
          sv_aceptada: 10 + index * 5,
          venta: 150000,
          turefectivo: 60000,
          turdiferencia: 0,
          ventaclubgrido: 70000,
          desde: at('2026-10-19T00:00:00'),
          hasta: at('2026-10-25T00:00:00'),
        });
      }
    });
  }
  return rows;
}

async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Hoja1');
  sheet.addRow(HEADERS);
  for (const row of fictitiousRows()) sheet.addRow(HEADERS.map((header) => row[header]));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function headers(extra = {}) {
  const bypass = process.env.VERCEL_PROTECTION_BYPASS;
  return bypass ? { 'x-vercel-protection-bypass': bypass, ...extra } : extra;
}

function workbookForm(workbook, view) {
  const form = new FormData();
  if (view) form.append('view', view);
  form.append('file', new Blob([workbook], { type: XLSX_TYPE }), 'smoke-ficticio.xlsx');
  return form;
}

async function call(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: headers(init.headers),
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body = Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType, body };
}

function expectStatus(result, status) {
  if (result.status !== status) {
    const snippet = result.body.toString('utf8', 0, 200).replace(/\s+/g, ' ');
    throw new Error(`expected HTTP ${status}, got ${result.status} (${snippet})`);
  }
}

function expectType(result, pattern) {
  if (!pattern.test(result.contentType)) {
    throw new Error(`unexpected content-type "${result.contentType}"`);
  }
}

const checks = [
  [
    'GET / serves the web app',
    async () => {
      const result = await call('/', { headers: { Accept: 'text/html' } });
      expectStatus(result, 200);
      expectType(result, /text\/html/);
      return `${result.body.length} bytes of HTML`;
    },
  ],
  [
    'GET /api/health',
    async () => {
      const result = await call('/api/health');
      expectStatus(result, 200);
      expectType(result, /application\/json/);
      const body = JSON.parse(result.body.toString('utf8'));
      if (body.status !== 'ok') throw new Error(`status "${body.status}"`);
      return 'status ok';
    },
  ],
  [
    'POST /api/analysis returns 3 views for 2 branches',
    async (workbook) => {
      const result = await call('/api/analysis', {
        method: 'POST',
        body: workbookForm(workbook),
      });
      expectStatus(result, 200);
      const ids = JSON.parse(result.body.toString('utf8')).views.map((view) => view.id);
      if (ids.length !== 3 || !ids.includes('all')) {
        throw new Error(`views ${JSON.stringify(ids)}`);
      }
      return ids.join(', ');
    },
  ],
  [
    'POST /api/exports/pdf (view all)',
    async (workbook) => {
      const result = await call('/api/exports/pdf', {
        method: 'POST',
        body: workbookForm(workbook, 'all'),
      });
      expectStatus(result, 200);
      expectType(result, /application\/pdf/);
      if (result.body.subarray(0, 5).toString('latin1') !== '%PDF-') {
        throw new Error('body does not start with %PDF-');
      }
      return `${result.body.length} bytes`;
    },
  ],
  [
    'POST /api/exports/xlsx (view all)',
    async (workbook) => {
      const result = await call('/api/exports/xlsx', {
        method: 'POST',
        body: workbookForm(workbook, 'all'),
      });
      expectStatus(result, 200);
      expectType(result, /spreadsheetml\.sheet/);
      const report = new ExcelJS.Workbook();
      await report.xlsx.load(result.body);
      const names = report.worksheets.map((sheet) => sheet.name);
      const missing = EXPECTED_SHEETS.filter((name) => !names.includes(name));
      if (missing.length > 0) throw new Error(`missing sheets ${missing.join(', ')}`);
      return names.join(', ');
    },
  ],
];

async function main() {
  console.log(`Smoke test against ${baseUrl}`);
  const workbook = await buildWorkbook();
  let failures = 0;
  for (const [name, run] of checks) {
    try {
      console.log(`ok    ${name}: ${await run(workbook)}`);
    } catch (error) {
      failures += 1;
      console.log(`FAIL  ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

await main();
