import { clerkFrontendOrigin } from './clerk-accounts.mjs';

const titles = {
  'sign-in': 'Sign in to Draftopus',
  'sign-up': 'Create a Draftopus account',
  legacy: 'Open your existing library',
  link: 'Link your Draftopus account',
  'link-required': 'Finish account setup',
  'sign-out': 'Sign out of Clerk',
  profile: 'Manage your Clerk account',
};

const styles = `
  :root{color-scheme:light dark;--bg:#faf8f3;--card:#fffdf8;--ink:#24201b;--muted:#62584d;
    --line:#dfd8cc;--gold:#80563b;--button:#80563b;--button-ink:#fff;--field:#fff;--danger:#922f2f;
    --shadow:0 18px 50px rgba(54,36,14,.09);font-family:system-ui,sans-serif}
  @media(prefers-color-scheme:dark){:root{--bg:#101010;--card:#191817;--ink:#f3eee6;
    --muted:#b7ad9e;--line:#38322c;--gold:#efba74;--button:#e9b780;--button-ink:#24170a;
    --field:#151413;--danger:#ffaaa4;--shadow:0 18px 50px rgba(0,0,0,.35)}}
  *{box-sizing:border-box}html,body{min-height:100%;margin:0}
  body{min-height:100svh;display:grid;place-items:center;padding:32px 16px;background:var(--bg);color:var(--ink)}
  main{width:min(100%,32rem);margin:auto}
  body[data-mode=profile] main{width:min(100%,58rem)}
  .brand{display:flex;align-items:center;justify-content:center;gap:11px;margin:0 0 24px;
    color:var(--ink);font:700 1.7rem Georgia,serif;letter-spacing:-.018em}
  .brand img{width:32px;height:32px;object-fit:contain}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:clamp(18px,5vw,32px);box-shadow:var(--shadow)}
  .panel[data-widget=true]{padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
  h1{font:700 clamp(1.6rem,4.6vw,2rem)/1.14 Georgia,serif;margin:0 0 10px;overflow-wrap:anywhere}
  h2{font-size:1rem;line-height:1.4;margin:0 0 3px}
  p{margin:0;line-height:1.55;overflow-wrap:anywhere}
  .intro,.fine{color:var(--muted)}.fine{font-size:.875rem}
  .clerk-widget{display:grid;justify-items:center;min-width:0}
  .clerk-widget>div{max-width:100%}
  .identity{margin:16px 0 0;border:1px solid var(--line);border-radius:10px;padding:10px 12px}
  .identity dt{color:var(--muted);font-size:.8125rem}
  .identity dd{margin:3px 0 0;font-size:.9375rem;font-weight:650;overflow-wrap:anywhere}
  .choices{display:grid;gap:10px;margin-top:18px}
  .choice{display:grid;gap:10px;grid-template-columns:1fr auto;align-items:center;
    border:1px solid var(--line);border-radius:10px;padding:12px}
  @media(max-width:430px){.choice{grid-template-columns:1fr;justify-items:start}}
  .actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;margin-top:20px}
  form{margin:0}
  .action{appearance:none;display:inline-flex;align-items:center;justify-content:center;padding:9px 13px;
    min-height:42px;border-radius:8px;border:1px solid var(--line);font:600 .875rem system-ui,sans-serif;
    color:var(--ink);background:var(--card);text-decoration:none;text-align:center;cursor:pointer}
  .primary{border-color:var(--button);color:var(--button-ink);background:var(--button)}
  a:not(.action){color:var(--gold);text-underline-offset:3px}
  .action:hover{filter:brightness(1.08)}
  .action:disabled{opacity:.6;cursor:progress}
  :focus-visible{outline:2px solid var(--gold);outline-offset:3px}
  .status{margin-top:16px;font-size:.875rem;color:var(--muted)}
  .status.error{color:var(--danger)}
  .status:empty{margin-top:0}
  .foot{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
  .panel[data-widget=true] .foot{text-align:center;border-top:0;padding-top:0}
  [hidden]{display:none!important}
`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  })[char]);
}

function action(label, name, primary = false) {
  return `<form method="post" data-action="${name}" aria-describedby="auth-status auth-error">
    <button class="action${primary ? ' primary' : ''}" type="submit" disabled>${label}</button>
  </form>`;
}

function currentLibrary(legacy) {
  const email = typeof legacy?.email === 'string' && legacy.email;
  return email ? `<dl class="identity">
    <dt>Existing Draftopus account</dt><dd>${escapeHtml(email)}</dd>
  </dl>` : '';
}

function pageContent(mode, legacy, linked, linkedToAnotherAccount) {
  if (mode === 'profile') {
    return '<div id="clerk-widget" class="clerk-widget" hidden></div><div class="foot fine"><a href="/?auth=clerk">Return to Draftopus</a></div>';
  }
  if (mode === 'sign-out') {
    return '<p class="intro">Sign out of Draftopus on this device.</p><div class="actions"><button id="clerk-sign-out" class="action primary" type="button" aria-describedby="auth-status auth-error" disabled>Sign out</button><a class="action" href="/?auth=clerk">Cancel</a></div>';
  }
  if (mode === 'sign-in' || mode === 'sign-up') {
    return `<div id="clerk-widget" class="clerk-widget" hidden></div>
      <div id="clerk-session" hidden>
        <dl class="identity"><dt>Signed in with Clerk</dt><dd id="clerk-identity"></dd></dl>
        <div class="actions"><a id="clerk-continue" class="action primary">Continue with Clerk</a>
          <button id="clerk-sign-out" class="action" type="button" aria-describedby="auth-status auth-error" disabled>Sign out of Clerk</button></div>
      </div>
      <nav aria-label="Existing Draftopus account" class="foot fine"><a href="/auth/legacy">Link or open your existing account</a></nav>`;
  }
  if (mode === 'legacy') {
    return `<p class="intro">${legacy ? 'Link a new sign-in once to keep using this account, with the same projects, permissions, and license.'
      : 'Use your original ChatGPT sign-in to confirm ownership of your Draftopus account.'}</p>${currentLibrary(legacy)}
      <div class="actions">
        ${legacy ? '<a class="action primary" href="/auth/clerk?intent=link">Link a new sign-in</a><a class="action" href="/auth/sites/continue">Open your library</a>'
          : '<a class="action primary" href="/signin-with-chatgpt?return_to=%2Fauth%2Flegacy" target="_top">Sign in with ChatGPT</a>'}
      </div>
      <div class="foot fine"><a href="/auth/clerk">Back to Clerk sign-in</a></div>`;
  }
  if (mode === 'link') {
    if (linkedToAnotherAccount) {
      return `<p class="intro">This sign-in already opens a different Draftopus account.</p>${currentLibrary(legacy)}
        <div class="actions"><a class="action primary" href="/auth/clerk?intent=link">Switch sign-in</a>
          <a class="action" href="/auth/legacy">Back</a></div>`;
    }
    if (linked) {
      return '<p class="intro">Your new sign-in opens this Draftopus account.</p><div class="actions"><a class="action primary" href="/?auth=clerk">Open Draftopus</a></div>';
    }
    return `<p class="intro">Connect this sign-in to your existing Draftopus account to keep its projects, permissions, and license.</p>${currentLibrary(legacy)}
        <div class="actions">${action('Confirm account link', 'link', true)}
          <a class="action" href="/auth/legacy">Back</a></div>`;
  }
  return `<p class="intro">Your sign-in is ready. Choose which Draftopus account to open.</p>
    <div class="choices">
      <div class="choice"><div><h2>New Draftopus account</h2><p class="fine">Start with a new library. No purchase required.</p></div>
        ${action('Create account', 'register', true)}
      </div>
      <div class="choice"><div><h2>Existing Draftopus account</h2><p class="fine">Link your original account to keep its projects and license.</p></div>
        <a class="action" href="${legacy ? '/auth/clerk?intent=link' : '/auth/legacy'}">Link existing account</a>
      </div>
    </div>
    <div class="foot fine"><a href="/auth/clerk">Back to Clerk sign-in</a></div>`;
}

const browserScript = `
  const mode = document.body.dataset.mode;
  const clerkForm = mode === 'sign-in' || mode === 'sign-up';
  const params = new URLSearchParams(location.search);
  const linking = params.get('intent') === 'link';
  const signInUrl = '/auth/clerk' + (linking ? '?intent=link' : '');
  const signUpUrl = '/auth/clerk?mode=sign-up' + (linking ? '&intent=link' : '');
  const signInTitle = linking ? 'Sign in to link your account' : 'Sign in to Draftopus';
  const signUpTitle = linking ? 'Set up a new sign-in' : 'Create a Draftopus account';
  const signUpDescription = linking ? 'Connect this sign-in to your original account.' : 'No purchase required.';
  const appFragment = location.hash === '#library' || location.hash.startsWith('#workspace?') ? location.hash : '';
  const continueTo = linking ? '/auth/link' : '/auth/clerk/continue' + appFragment;
  const status = document.getElementById('auth-status');
  const alert = document.getElementById('auth-error');
  const panel = document.getElementById('auth-panel');
  const signOut = document.getElementById('clerk-sign-out');
  const logo = document.getElementById('brand-logo');
  if (logo.complete && !logo.naturalWidth) logo.hidden = true;
  logo.addEventListener('error', () => { logo.hidden = true; });

  function feedback(message, isError = false) {
    status.textContent = isError ? '' : message;
    alert.textContent = isError ? message : '';
  }

  function showWidget(widget) {
    widget.hidden = false;
    panel.dataset.widget = 'true';
    document.getElementById('auth-heading').hidden = true;
  }

  async function resumeExistingSession(clerk) {
    if (mode !== 'sign-in' || linking || params.get('resume') !== '1' || !clerk.session) return;
    const marker = 'draftopus:clerk:resume-at';
    try {
      if (Date.now() - Number(sessionStorage.getItem(marker)) < 15000) return;
      if (!await clerk.session.getToken({ skipCache: true })) return;
      sessionStorage.setItem(marker, String(Date.now()));
      location.replace(continueTo);
    } catch {
      // Continue with Clerk remains available when resume cannot refresh the session.
    }
  }

  const actions = {
    link: {
      paths: ['/api/auth/link/start', '/api/auth/link/complete'],
      target: '/?auth=clerk', pending: 'Linking your accounts…', success: 'Accounts linked. Opening your library…',
    },
    register: {
      paths: ['/api/auth/register'], target: '/?auth=clerk',
      pending: 'Creating your account…', success: 'Account ready. Opening your library…',
    },
  };

  const clerkReady = new Promise(resolve => {
    document.addEventListener('DOMContentLoaded', async () => {
      const clerk = window.Clerk;
      if (!clerk) {
        if (document.getElementById('clerk-widget')) feedback('Couldn’t load this Clerk page. Reload to try again.', true);
        resolve(null);
        return;
      }
      const style = getComputedStyle(document.documentElement);
      const color = name => style.getPropertyValue(name).trim();
      try {
        await clerk.load({
          ui: { ClerkUI: window.__internal_ClerkUICtor },
          signInUrl, signUpUrl,
          signInForceRedirectUrl: continueTo, signUpForceRedirectUrl: continueTo,
          afterSignOutUrl: signInUrl, allowedRedirectOrigins: [location.origin],
          localization: {
            signIn: { start: {
              title: signInTitle, titleCombined: signInTitle,
              actionText: linking ? 'Need a new sign-in?' : 'New to Draftopus?',
              actionLink: linking ? 'Set one up' : 'Create an account',
            } },
            signUp: { start: {
              title: signUpTitle, titleCombined: signUpTitle,
              subtitle: signUpDescription, subtitleCombined: signUpDescription,
            } },
          },
          appearance: { variables: {
            colorPrimary: color('--button'), colorPrimaryForeground: color('--button-ink'),
            colorBackground: color('--card'), colorForeground: color('--ink'),
            colorMutedForeground: color('--muted'), colorInput: color('--field'),
            colorInputForeground: color('--ink'), colorBorder: color('--line'),
            colorDanger: color('--danger'), borderRadius: '0.55rem',
          } },
        });
        if (clerkForm) {
          if (clerk.isSignedIn) {
            const email = clerk.user?.primaryEmailAddress?.emailAddress;
            document.getElementById('auth-heading').textContent = linking ? 'Continue linking your accounts' : 'Continue to Draftopus';
            document.getElementById('clerk-identity').textContent = email || 'Your current session';
            document.getElementById('clerk-continue').href = continueTo;
            document.getElementById('clerk-session').hidden = false;
            void resumeExistingSession(clerk);
          } else {
            const widget = document.getElementById('clerk-widget');
            const options = {
              routing: 'hash', signInUrl, signUpUrl, forceRedirectUrl: continueTo,
              signInForceRedirectUrl: continueTo, signUpForceRedirectUrl: continueTo,
            };
            if (mode === 'sign-up') clerk.mountSignUp(widget, options);
            else clerk.mountSignIn(widget, options);
            showWidget(widget);
          }
          feedback('');
        } else if (mode === 'profile') {
          if (!clerk.isSignedIn) {
            feedback('Your Clerk session has ended. Return to Draftopus to sign in again.', true);
          } else {
            const widget = document.getElementById('clerk-widget');
            clerk.mountUserProfile(widget, { routing: 'hash' });
            showWidget(widget);
            feedback('');
          }
        }
        resolve(clerk);
      } catch {
        if (clerkForm || mode === 'profile') feedback('Couldn’t load this Clerk page. Reload to try again.', true);
        resolve(null);
      }
    }, { once: true });
  });

  document.querySelectorAll('form[data-action]').forEach(form => {
    const name = form.dataset.action;
    const action = actions[name];
    const button = form.querySelector('button');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!action || button.disabled) return;
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      feedback(action.pending);
      try {
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        const clerk = await clerkReady;
        const token = await clerk?.session?.getToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        for (const path of action.paths) {
          const response = await fetch(path, {
            method: 'POST', credentials: 'same-origin', redirect: 'error',
            headers, body: '{}', cache: 'no-store',
          });
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(typeof data?.error === 'string' ? data.error : 'Could not complete this action. Try again.');
          }
        }
        if (action.success) feedback(action.success);
        location.replace(action.target);
      } catch (error) {
        feedback(error instanceof TypeError ? 'Couldn’t reach Draftopus. Try again.' : error?.message || 'Could not complete this action. Try again.', true);
        button.disabled = false;
        form.removeAttribute('aria-busy');
        button.focus();
      }
    });
    button.disabled = false;
  });

  signOut?.addEventListener('click', async () => {
    if (signOut.disabled) return;
    signOut.disabled = true;
    feedback('Signing out…');
    try {
      const clerk = await clerkReady;
      if (!clerk) throw new Error();
      if (clerk.session?.id) await clerk.signOut({ sessionId: clerk.session.id, redirectUrl: signInUrl });
      else location.replace(signInUrl);
    } catch {
      feedback('Could not sign out of Clerk. Try again.', true);
      signOut.disabled = false;
      signOut.focus();
    }
  });
  if (signOut) signOut.disabled = false;
`;

export function clerkAccountPage({publishableKey, mode, legacy, linked, linkedToAnotherAccount}) {
  const page = Object.hasOwn(titles, mode) ? mode : 'sign-in';
  const needsClerk = page !== 'legacy';
  const fapi = needsClerk ? clerkFrontendOrigin(publishableKey) : null;
  const nonce = crypto.randomUUID();
  const clerkScriptOrigins = fapi + ' https://challenges.cloudflare.com https://*.protect.clerk.com';
  const scripts = fapi ? `<script defer nonce="${nonce}" crossorigin="anonymous"
    src="${fapi}/npm/@clerk/ui@1/dist/ui.browser.js"></script>
    <script defer nonce="${nonce}" crossorigin="anonymous"
    data-clerk-publishable-key="${escapeHtml(publishableKey)}"
    src="${fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>` : '';
  const loading = fapi && (page === 'sign-in' || page === 'sign-up') ? 'Loading sign-in…'
    : fapi && page === 'profile' ? 'Loading account settings…' : '';
  const body = needsClerk && !fapi
    ? '<p class="intro">Draftopus sign-in is unavailable.</p><div class="actions"><a class="action" href="/auth/legacy">Use your original sign-in</a></div>'
    : pageContent(page, legacy, linked, linkedToAnotherAccount);
  return new Response(`<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow"><title>${titles[page]} · Draftopus</title>
  <style>${styles}</style>${scripts}</head>
  <body data-mode="${page}"><main>
    <div class="brand"><img id="brand-logo" src="/draftopus-logo.png" alt="" width="32" height="32">Draftopus</div>
    <section id="auth-panel" class="panel" aria-label="Draftopus account">
      <h1 id="auth-heading">${titles[page]}</h1>${body}
      <p id="auth-status" class="status" role="status" aria-live="polite">${loading}</p>
      <p id="auth-error" class="status error" role="alert"></p>
      <noscript><p class="fine">Turn on JavaScript to sign in.</p></noscript>
    </section>
  </main><script nonce="${nonce}">${browserScript}</script></body></html>`, {
    status: needsClerk && !fapi ? 503 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': [
        "default-src 'none'", "base-uri 'none'", "object-src 'none'",
        "frame-ancestors 'self'", "form-action 'self'", "style-src 'unsafe-inline'",
        `script-src 'nonce-${nonce}'${fapi ? ' ' + clerkScriptOrigins : ''}`,
        `connect-src 'self'${fapi ? ' ' + fapi + ' https://clerk-telemetry.com https://*.protect.clerk.com:*' : ''}`,
        `img-src 'self' data:${fapi ? ' https://img.clerk.com' : ''}`,
        "worker-src 'self' blob:",
        `frame-src 'self'${fapi ? ' https://challenges.cloudflare.com https://*.protect.clerk.com' : ''}`,
      ].join('; '),
    },
  });
}
