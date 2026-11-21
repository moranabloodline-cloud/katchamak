import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-static';
export async function GET() {
  const script = await readFile(path.join(process.cwd(), 'node_modules/pagedjs/dist/paged.polyfill.min.js'), 'utf8');
  return new Response(script, {headers:{'Content-Type':'application/javascript; charset=utf-8'}});
}
