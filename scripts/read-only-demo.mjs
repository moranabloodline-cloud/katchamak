import { formatDate as formatStoryDate, TIMELINE_LIMIT, validCalendar } from '../src/lib/kachamak/story-calendar.ts';

const demoKey = 'morrigans-ocean';
const reader = 'https://draftopus.com/reader';
const tour = 'https://draftopus.com/#tour';
const maxDemoSize = 20 * 1024 * 1024;
const maxNotes = 2000;
const catalogPath = /^shared-demos\/morrigans-ocean\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/project\.json$/;
const sections = { binder: 'Binder', codex: 'Codex', timeline: 'Timeline', canvas: 'Canvas' };
const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const text = value => typeof value === 'string' ? value : '';
const escapeHtml = value => text(value).replace(/[&<>"']/g, char => escapes[char]);

const styles = `
  :root{color-scheme:dark;--back:#11100e;--paper:#171512;--line:#34302a;--ink:#f4eee4;
    --muted:#b9ad9e;--gold:#ebbf7f;font-family:system-ui,sans-serif}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--back);color:var(--ink)}
  a{color:inherit;text-underline-offset:.2em}a:hover{color:var(--gold)}
  a:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:.25rem}
  .top{min-height:4rem;padding:1rem 1.5rem;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .brand{display:flex;align-items:center;gap:.65rem;font:700 1.4rem Georgia,serif}
  .brand img{width:1.7rem;height:1.7rem;object-fit:contain}
  .controls{display:flex;gap:1rem;align-items:center;font-size:.9rem}.controls span{color:var(--muted)}
  .surface{display:grid;grid-template-columns:minmax(14rem,20rem) minmax(0,1fr);min-height:calc(100vh - 4rem)}
  aside{padding:1.25rem;border-right:1px solid var(--line);background:var(--paper)}
  .project{font:700 1.25rem Georgia,serif;margin:0 0 1rem;overflow-wrap:anywhere}
  .tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.3rem;margin-bottom:1rem;padding:.2rem;background:var(--back);border:1px solid var(--line);border-radius:.55rem}
  .tabs a{padding:.45rem;text-align:center;border-radius:.35rem;text-decoration:none;font-size:.875rem}
  .tabs a[aria-current=page]{color:var(--gold);background:#33291d}
  .notes{margin:0;padding:0;list-style:none;max-height:calc(100dvh - 12rem);overflow:auto}
  .notes a{display:block;padding:.4rem .5rem .4rem calc(.5rem + var(--depth) * .65rem);border-radius:.35rem;overflow-wrap:anywhere;text-decoration:none;font-size:.875rem}
  .notes a:hover,.notes a[aria-current=page]{background:#2b241a;color:var(--gold)}
  main{padding:clamp(1.5rem,5vw,4rem);min-width:0}
  article{width:min(100%,45rem);margin:auto}
  .context{color:var(--muted);font-size:.8125rem;margin:0 0 .5rem}
  h1{font:700 clamp(1.9rem,4vw,2.6rem)/1.12 Georgia,serif;margin:0 0 1.25rem;overflow-wrap:anywhere}
  .cover{display:block;width:auto;max-width:min(100%,18rem);max-height:18rem;border:1px solid var(--line);border-radius:.5rem;margin:0 0 1.25rem;object-fit:contain}
  .copy,.empty{color:var(--muted);line-height:1.6;overflow-wrap:anywhere}
  .body{font:1.085rem/1.76 Georgia,serif;overflow-wrap:anywhere}.body p{margin:0 0 1rem}
  .date{margin:0 0 1.1rem;color:var(--gold);font-size:.9rem}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(14rem,100%),1fr));gap:.65rem}
  .card{padding:.8rem;border:1px solid var(--line);border-radius:.5rem;background:var(--paper);overflow-wrap:anywhere}
  .card h2{font:700 1.05rem/1.35 Georgia,serif;margin:0 0 .45rem}.card p{font-size:.9rem;line-height:1.55;margin:.3rem 0 0}
  .reader{display:inline-flex;padding:.6rem .85rem;border:1px solid var(--line);border-radius:.5rem;color:var(--gold);margin-top:.7rem}
  @media (max-width:42rem){.surface{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--line)}.notes{max-height:12rem}}
`;

function decodeEntity(entity, key) {
  if (Object.hasOwn(entities, key)) return entities[key];
  if (!key.startsWith('#')) return entity;
  const hex = key.toLowerCase().startsWith('#x');
  const code = Number.parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
  return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : entity;
}

function paragraphs(html) {
  // Treat the published note as text and emit only our own paragraph markup.
  return text(html)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style|iframe|object|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<br\b[^>]*>|<\/(?:blockquote|div|h[1-6]|li|p|pre|tr)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function image(gallery, source) {
  const ref = text(source);
  const asset = ref.startsWith('gallery:') && Array.isArray(gallery)
    ? gallery.find(item => item?.kind === 'image' && item.id === ref.slice(8))?.image : ref;
  return typeof asset === 'string' && asset.length <= 700_000 &&
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(asset) ? asset : '';
}

function indexNotes(roots) {
  if (!Array.isArray(roots)) return [];
  const pending = roots.slice().reverse().map(node => ({ node, depth: 0 }));
  const notes = [];
  while (pending.length && notes.length < maxNotes) {
    const { node, depth } = pending.pop();
    if (!node || typeof node !== 'object' || node.hidden) continue;
    notes.push({ node, depth, key: String(notes.length + 1) });
    if (!Array.isArray(node.children)) continue;
    for (let i = node.children.length - 1; i >= 0; i--) pending.push({ node: node.children[i], depth: depth + 1 });
  }
  return notes;
}

async function readPublishedDemo({ DB, BUCKET }) {
  if (!DB || !BUCKET) return null;
  try {
    const catalog = await DB.prepare('SELECT object_key,version FROM demo_catalog WHERE demo_key=?').bind(demoKey).first();
    if (!catalog || !catalogPath.test(catalog.object_key)) return null;
    const object = await BUCKET.get(catalog.object_key);
    if (!object || object.size > maxDemoSize) return null;
    const payload = await object.text();
    if (payload.length > maxDemoSize) return null;
    const novel = JSON.parse(payload);
    if (novel?.demo?.key !== demoKey || novel.demo.version !== catalog.version || novel.demo.source ||
        !novel.sections || !Object.keys(sections).some(section => sectionEntries(novel, section).length)) return null;
    return novel;
  } catch {
    return null;
  }
}

function sectionLink(key, label, selected) {
  return `<a href="/demo?tab=${key}"${selected ? ' aria-current="page"' : ''}>${label}</a>`;
}

function noteTitle(note) {
  return text(note.title).trim() || 'Untitled note';
}

function sectionEntries(novel, tab) {
  if (tab !== 'canvas') return indexNotes(novel.sections[tab]);
  const pages = [...(!novel.homepageRemoved && novel.homepage ? [novel.homepage] : []),
    ...(Array.isArray(novel.homePages) ? novel.homePages : [])];
  return pages.filter(page => !page?.hidden && (page?.blocks?.length || page?.storyBoard?.scenes?.length))
    .map((page, index) => ({ node: { ...page, title: page.title || 'Homepage' }, key: String(index + 1), depth: 0 }));
}

function timelineDate(event, calendar) {
  if (!Number.isSafeInteger(event?.start) || Math.abs(event.start) > TIMELINE_LIMIT || !validCalendar(calendar)) return '';
  const precision = ['year', 'month', 'day', 'time'].includes(event.precision) ? event.precision : 'day';
  const start = formatStoryDate(calendar, event.start, precision);
  if (!Number.isSafeInteger(event.end) || event.end <= event.start || Math.abs(event.end) > TIMELINE_LIMIT) return start;
  const end = formatStoryDate(calendar, event.end, precision);
  return start === end ? start : start + ' – ' + end;
}

function canvasCards(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const scenes = Array.isArray(page?.storyBoard?.scenes) ? page.storyBoard.scenes : [];
  const cards = [...blocks.filter(block => block && !['line', 'divider'].includes(block.layout)).map(block => ({
    title: block.title, text: block.text,
  })), ...scenes.filter(Boolean).map(scene => ({title:scene.title,text:scene.synopsis}))];
  return cards.filter(card => text(card.title).trim() || text(card.text).trim()).map(card =>
    `<section class="card">${text(card.title).trim() ? '<h2>' + escapeHtml(card.title) + '</h2>' : ''}
      ${paragraphs(card.text).map(line => '<p>' + escapeHtml(line) + '</p>').join('')}</section>`,
  ).join('');
}

function projectPage(novel, params) {
  const requestedTab = params.get('tab');
  const tab = Object.hasOwn(sections, requestedTab) ? requestedTab : 'binder';
  const label = sections[tab];
  const title = text(novel.title).trim() || 'Morrigan’s Ocean';
  const notes = sectionEntries(novel, tab);
  const selected = notes.find(({ key }) => key === params.get('note')) ??
    notes.find(({ node }) => node.kind !== 'folder' && text(node.content).trim()) ?? notes[0];
  const nav = Object.entries(sections).map(([key, name]) => sectionLink(key, name, key === tab)).join('');
  const tree = notes.map(({ node, key, depth }) =>
    `<li><a style="--depth:${Math.min(depth, 7)}" href="/demo?tab=${tab}&amp;note=${key}"${key === selected?.key ? ' aria-current="page"' : ''}>${escapeHtml(noteTitle(node))}</a></li>`,
  ).join('');
  const note = selected?.node;
  const art = image(novel.gallery, note?.image || novel.cover?.image);
  const body = paragraphs(note?.content);
  const preview = body.length ? body : paragraphs(note?.synopsis);
  const date = tab === 'timeline' ? timelineDate(note?.event, novel.timeline?.calendar) : '';
  const cards = tab === 'canvas' ? canvasCards(note) : '';
  return `<div class="surface"><aside>
    <p class="project">${escapeHtml(title)}</p>
    <nav class="tabs" aria-label="Demo sections">${nav}</nav>
    <nav aria-label="${label} notes"><ul class="notes">${tree}</ul></nav>
  </aside><main><article>
    <p class="context">${label}</p>
    <h1>${escapeHtml(note ? noteTitle(note) : title)}</h1>
    ${date ? '<p class="date">' + escapeHtml(date) + '</p>' : ''}
    ${art ? `<img class="cover" src="${art}" alt="" decoding="async">` : ''}
    ${preview.length ? `<div class="body">${preview.map(line => '<p>' + escapeHtml(line) + '</p>').join('')}</div>` : ''}
    ${cards ? `<div class="cards">${cards}</div>` : ''}
    ${!preview.length && !cards ? (notes.length ? '<p class="empty">There is no text on this page.</p>'
      : `<p class="empty">This section is not included in the published demo.</p>
        <a class="reader" href="${tab === 'canvas' ? tour + '/canvas/home' : tour}">Explore the Draftopus tour</a>`) : ''}
  </article></main></div>`;
}

export async function readOnlyDemo(request, env) {
  if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET' } });
  const url = new URL(request.url);
  if (url.pathname !== '/demo') return new Response('Not found.', { status: 404 });
  const novel = await readPublishedDemo(env);
  const body = novel ? projectPage(novel, url.searchParams)
    : `<main><article><h1>Read-only demo</h1>
      <p class="copy">The in-app demo is unavailable. You can read Morrigan’s Ocean in the public reader.</p>
      <a class="reader" href="${reader}">Open public reader</a></article></main>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow">
    <title>Read-only demo · Draftopus</title><style>${styles}</style></head><body>
    <header class="top"><div class="brand"><img src="/draftopus-logo.png" width="28" height="28" alt="">Draftopus</div>
      <div class="controls"><span>Read-only demo</span><a href="/">My Draftopus</a></div></header>${body}
    </body></html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
