// Diagnostics contain operation names and timings only, never SQL values or manuscript data.
export function measuredQuery(db, sql, values, measure) {
  const statement = db.prepare(sql).bind(...values);
  if (!measure) return statement;
  const verb = sql.trim().split(/\s+/)[0].toUpperCase();
  const table = sql.match(/\b(?:FROM|INTO|UPDATE|TABLE(?: IF NOT EXISTS)?)\s+([a-z_]+)/i)?.[1] ?? 'schema';
  return { statement, ...Object.fromEntries(['first','all','run'].map(method => [method, (...args) => measure(`db.${verb}.${table}`, () => statement[method](...args))])) };
}
export function measuredBatch(db, statements, measure) {
  const run = () => db.batch(statements.map(s => s.statement ?? s));
  return measure ? measure('db.batch', run) : run();
}
export async function traceApiRequest(request, run) {
  const started = performance.now(), requestId = crypto.randomUUID(), operations = new Map();
  const measure = async (name, work) => {
    const start = performance.now();
    try { return await work(); }
    finally {
      const ms = performance.now() - start, entry = operations.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
      entry.count++; entry.totalMs += ms; entry.maxMs = Math.max(entry.maxMs, ms); operations.set(name, entry);
    }
  };
  let response;
  try { response = await run(measure); }
  catch { response = Response.json({ error: 'This request could not complete. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } }); }
  const totalMs = Math.round(performance.now() - started);
  const entries = [...operations].map(([operation, value]) => ({ operation, count: value.count, totalMs: Math.round(value.totalMs), maxMs: Math.round(value.maxMs) }));
  const queryCount = entries.filter(e => e.operation.startsWith('db.')).reduce((n, e) => n + e.count, 0);
  const dbMs = entries.filter(e => e.operation.startsWith('db.')).reduce((n, e) => n + e.totalMs, 0);
  const r2Ms = entries.filter(e => e.operation.startsWith('r2.')).reduce((n, e) => n + e.totalMs, 0);
  if (totalMs >= 1000 || response.status >= 500 || queryCount > 20 || entries.some(e => e.maxMs >= 500)) {
    const route = new URL(request.url).pathname.replace(/(\/api\/library\/files)(\/.*)?$/, '$1/:attachment');
    console.warn('API request trace', { requestId, method: request.method, route, status: response.status, totalMs, queryCount, operations: entries });
  }
  const headers = new Headers(response.headers);
  headers.set('X-Katchamak-Request', requestId);
  headers.set('Server-Timing', `app;dur=${totalMs}, db;dur=${dbMs};desc="${queryCount} queries", r2;dur=${r2Ms}`);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
