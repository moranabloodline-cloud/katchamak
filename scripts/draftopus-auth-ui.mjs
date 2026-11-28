const styles = `
  :root{color-scheme:light dark;--page:#f5f2eb;--panel:#fffdfa;--ink:#27231d;--muted:#625a50;
    --line:#ded7cb;--field:#fff;--accent:#895717;--button:#f2b746;--button-ink:#241708;--error:#992e2e;
    --shadow:0 18px 54px #33260f12;font:1rem/1.5 'Segoe UI',system-ui,sans-serif}
  @media(prefers-color-scheme:dark){:root{--page:#101010;--panel:#191817;--ink:#f3efe7;--muted:#bdb3a5;
    --line:#39342e;--field:#151413;--accent:#edba70;--button:#eab662;--button-ink:#231608;--error:#ffaca5;
    --shadow:0 18px 54px #0005}}
  *{box-sizing:border-box} body{margin:0;min-height:100svh;display:grid;place-items:center;padding:32px 16px;
    background:var(--page);color:var(--ink)}
  main{width:min(100%,27rem)}
  .brand{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 0 22px;color:var(--ink);
    font:700 1.65rem/1.2 Georgia,serif;text-decoration:none}
  .brand img{width:32px;height:32px;object-fit:contain}
  section{background:var(--panel);border:1px solid var(--line);border-radius:16px;
    padding:clamp(18px,5vw,28px);box-shadow:var(--shadow)}
  h1{font:700 clamp(1.55rem,5vw,1.95rem)/1.15 Georgia,serif;margin:0 0 9px;overflow-wrap:anywhere}
  p{margin:0;overflow-wrap:anywhere}.muted{color:var(--muted)}
  form{margin:0}.fields{display:grid;gap:14px;margin-top:19px}
  label{display:grid;gap:5px;font-weight:600;font-size:.9rem}
  label span{font-weight:400;color:var(--muted)}
  input:not([type=hidden]){width:100%;min-height:44px;border:1px solid var(--line);border-radius:8px;
    padding:8px 10px;color:var(--ink);background:var(--field);font:inherit}
  .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
  .action{display:inline-flex;justify-content:center;align-items:center;gap:8px;min-height:44px;padding:8px 13px;
    border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);
    font:600 .9rem 'Segoe UI',system-ui,sans-serif;text-align:center;text-decoration:none;cursor:pointer}
  .action.primary{background:var(--button);color:var(--button-ink);border-color:var(--button)}
  .action.full{width:100%}.action:hover{filter:brightness(.96)}
  a{color:var(--accent);text-underline-offset:3px}:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  .message{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-top:14px;color:var(--error);font-size:.9rem}
  .alternative{display:flex;align-items:center;gap:10px;margin:15px 0;color:var(--muted);font-size:.85rem}
  .alternative::before,.alternative::after{content:'';flex:1;border-top:1px solid var(--line)}
  footer{border-top:1px solid var(--line);margin-top:20px;padding-top:13px;color:var(--muted);font-size:.9rem}
  footer p + p{margin-top:7px}
  .membership{display:grid;gap:3px;margin:18px 0 0;padding:12px;border:1px solid var(--line);border-radius:8px}
  .membership dt{color:var(--muted);font-size:.85rem}.membership dd{margin:0;font-weight:650}
`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function renderPage(title, content, status = 200, providerOrigin) {
  const oauthOrigins = typeof providerOrigin === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(providerOrigin)
    ? ` ${providerOrigin} https://accounts.google.com` : '';
  return new Response(`<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><title>${title} · Draftopus</title><style>${styles}</style>
  </head><body><main>
    <a class="brand" href="https://draftopus.com"><img src="/draftopus-logo.png" alt="" width="32" height="32">Draftopus</a>
    <section aria-labelledby="auth-title"><h1 id="auth-title">${title}</h1>${content}</section>
  </main></body></html>`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': `default-src 'none'; base-uri 'none'; form-action 'self'${oauthOrigins}; frame-ancestors 'none'; img-src 'self'; style-src 'unsafe-inline'`,
    },
  });
}

export const readAuthDestination = value => ['demo', 'account', 'membership'].includes(value) ? value : '';
export const authDestinationQuery = value => readAuthDestination(value) ? '?next=' + value : '';

export function draftopusAuthPage({ mode, next, googleEnabled, providerOrigin, error, status = 200 }) {
  const destination = readAuthDestination(next);
  const query = authDestinationQuery(destination);
  if (mode === 'check-email') {
    return renderPage('Check your email', `<p class="muted">If registration can proceed, you’ll receive a confirmation link. Open it in this browser to finish creating your account.</p>
      <div class="actions"><a class="action primary" href="/auth/sign-in${query}">Back to sign in</a></div>`, status);
  }
  if (mode === 'logout') {
    return renderPage('Sign out of Draftopus', `<p class="muted">End your current Draftopus session on this device.</p>
      <form method="post" action="/auth/logout"><div class="actions"><button class="action primary" type="submit">Sign out</button>
      <a class="action" href="/account">Cancel</a></div></form>`, status);
  }
  const newAccount = mode === 'sign-up';
  const submitQuery = authDestinationQuery(destination || (newAccount ? 'demo' : ''));
  const label = newAccount ? 'Create account' : 'Sign in';
  const route = newAccount ? 'sign-up' : 'sign-in';
  const title = newAccount ? 'Create your Draftopus account' : 'Sign in to Draftopus';
  const intro = newAccount ? 'Create an account for free. A lifetime license unlocks project editing.'
    : 'Open your account, writing workspace, and license.';
  return renderPage(title, `<p class="muted">${intro}</p>
    ${error ? `<p class="message" role="alert">${escapeHtml(error)}</p>` : ''}
    <form class="fields" method="post" action="/auth/${route}${submitQuery}">
      <label>Email address<input type="email" name="email" autocomplete="email" maxlength="254" required></label>
      <label>Password${newAccount ? '<span>Use at least 8 characters.</span>' : ''}
        <input type="password" name="password" autocomplete="${newAccount ? 'new-password' : 'current-password'}" ${newAccount ? 'minlength="8"' : ''} maxlength="128" required></label>
      <button class="action primary full" type="submit">${label}</button>
    </form>
    ${googleEnabled ? `<div class="alternative">or</div>
      <form method="post" action="/auth/google${submitQuery}"><button class="action full" type="submit">Continue with Google</button></form>` : ''}
    <footer>
      <p>${newAccount ? `Already have an account? <a href="/auth/sign-in${query}">Sign in</a>`
        : `New to Draftopus? <a href="/auth/sign-up${query}">Create an account</a>`}</p>
      <p><a href="https://draftopus.com/reader">Read the demo</a></p>
    </footer>`, status, googleEnabled ? providerOrigin : undefined);
}

export function draftopusAccountPage({ email, active, billingAvailable, existingAccount }) {
  if (!email) return new Response(null, {
    status: 303, headers: { Location: '/auth/sign-in?next=account', 'Cache-Control': 'private, no-store' },
  });
  if (existingAccount) {
    return renderPage('Your Draftopus account', `<p class="muted">${escapeHtml(email)}</p>
      <p class="message" role="status">This email belongs to an existing account. Use your original Draftopus workspace or contact support to link your sign-in.</p>
      <div class="actions"><a class="action primary" href="https://nikola-novel-studio.morana-bloodline.chatgpt.site/#library">Open your original workspace</a></div>
      <footer><a href="/auth/logout">Sign out</a></footer>`, 409);
  }
  const action = active ? '<a class="action primary" href="/">Open Draftopus</a>'
    : billingAvailable ? '<a class="action primary" href="/checkout">Buy a lifetime license</a>' : '';
  return renderPage('Your Draftopus account', `<p class="muted">${escapeHtml(email)}</p>
    <dl class="membership" id="membership"><dt>Membership &amp; License</dt>
      <dd>${active ? 'Lifetime license active' : 'No active license'}</dd></dl>
    <div class="actions">${action}<a class="action" href="https://draftopus.com/reader">Read the demo</a></div>
    <footer><a href="/auth/logout">Sign out</a></footer>`);
}
