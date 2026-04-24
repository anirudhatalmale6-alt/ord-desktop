let lastCorrected = '';
let lastRephrased = '';
let lastTranslated = '';
let loggedInUser = null;

const RTL_LANGS = ['ar', 'ur', 'prs'];

function isRtl(lang) { return RTL_LANGS.includes(lang); }

// ─── Init ───
async function init() {
  const session = await ord.getSession();
  if (session && session.user) {
    loggedInUser = session.user;
    showMainApp();
  } else {
    showLoginView();
  }
}

function showLoginView() {
  hideAll();
  document.getElementById('view-login').classList.add('active');
}

function showRegisterView() {
  hideAll();
  document.getElementById('view-register').classList.add('active');
}

function showMainApp() {
  hideAll();
  document.getElementById('mainApp').style.display = 'flex';
  document.getElementById('view-checker').classList.add('active');
  document.querySelector('[data-view="checker"]').classList.add('active');

  const userInfo = document.getElementById('userInfo');
  userInfo.textContent = loggedInUser.name || loggedInUser.email;

  const badge = document.getElementById('planBadge');
  badge.textContent = (loggedInUser.plan || 'free').toUpperCase();
  badge.className = 'plan-badge plan-' + (loggedInUser.plan || 'free');

  const apiKeyEl = document.getElementById('apiKeyDisplay');
  apiKeyEl.textContent = loggedInUser.api_key || '';

  const storedLang = localStorage.getItem('ord-lang') || 'en';
  document.getElementById('settingsLang').value = storedLang;
  document.getElementById('langSelect').value = storedLang;
  updateRtl();

  ord.getAutoStart().then(enabled => {
    document.getElementById('autoStartToggle').checked = enabled;
  });
}

function hideAll() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('mainApp').style.display = 'none';
}

function updateRtl() {
  const lang = document.getElementById('langSelect').value;
  const textInput = document.getElementById('textInput');
  if (isRtl(lang)) {
    textInput.classList.add('rtl');
  } else {
    textInput.classList.remove('rtl');
  }
}

// ─── Login ───
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please enter email and password';
    errEl.style.display = 'block';
    return;
  }

  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = 'Signing in...';

  const resp = await ord.login(email, password);
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').textContent = 'Sign In';

  if (resp.error) {
    errEl.textContent = resp.error;
    errEl.style.display = 'block';
    return;
  }

  loggedInUser = resp.user;
  showMainApp();
}

// ─── Register ───
document.getElementById('registerBtn').addEventListener('click', doRegister);
document.getElementById('registerPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); });

async function doRegister() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const errEl = document.getElementById('registerError');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please enter email and password';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters';
    errEl.style.display = 'block';
    return;
  }

  document.getElementById('registerBtn').disabled = true;
  document.getElementById('registerBtn').textContent = 'Creating account...';

  const resp = await ord.register(name, email, password);
  document.getElementById('registerBtn').disabled = false;
  document.getElementById('registerBtn').textContent = 'Create Account';

  if (resp.error) {
    errEl.textContent = resp.error;
    errEl.style.display = 'block';
    return;
  }

  loggedInUser = resp.user;
  showMainApp();
}

// ─── Navigation ───
document.getElementById('showRegisterBtn').addEventListener('click', showRegisterView);
document.getElementById('showLoginBtn').addEventListener('click', showLoginView);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await ord.logout();
  loggedInUser = null;
  showLoginView();
});

// ─── Tabs ───
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#mainApp .view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
  });
});

document.getElementById('closeBtn').addEventListener('click', () => ord.quitApp());
document.getElementById('minimizeBtn').addEventListener('click', () => ord.hideWindow());

document.getElementById('pasteHint').addEventListener('click', async () => {
  const text = await ord.getClipboard();
  if (text) document.getElementById('textInput').value = text;
});

document.getElementById('checkBtn').addEventListener('click', () => doCheck());
document.getElementById('rephraseBtn').addEventListener('click', () => doRephrase('rephrase'));
document.getElementById('formalBtn').addEventListener('click', () => doRephrase('formal'));
document.getElementById('casualBtn').addEventListener('click', () => doRephrase('casual'));
document.getElementById('translateBtn').addEventListener('click', () => doTranslate());

document.getElementById('langSelect').addEventListener('change', updateRtl);

document.getElementById('applyBtn').addEventListener('click', async () => {
  const text = lastCorrected || lastRephrased || lastTranslated;
  if (text) {
    await ord.setClipboard(text);
    showToast('Copied! Paste with Ctrl+V');
  }
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = lastCorrected || lastRephrased || lastTranslated;
  if (text) {
    await ord.setClipboard(text);
    showToast('Copied to clipboard!');
  }
});

document.getElementById('autoStartToggle').addEventListener('change', async (e) => {
  await ord.setAutoStart(e.target.checked);
  showToast(e.target.checked ? 'Auto-start enabled' : 'Auto-start disabled');
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const lang = document.getElementById('settingsLang').value;
  document.getElementById('langSelect').value = lang;
  localStorage.setItem('ord-lang', lang);
  updateRtl();
  showToast('Settings saved!');
});

// ─── Actions ───
ord.onStartAction(async (action) => {
  if (!loggedInUser) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#mainApp .view').forEach(v => v.classList.remove('active'));
  document.querySelector('[data-view="checker"]').classList.add('active');
  document.getElementById('view-checker').classList.add('active');

  const clipText = await ord.getClipboard();
  if (clipText && clipText.trim().length > 0) {
    document.getElementById('textInput').value = clipText;
  }

  if (action === 'check') doCheck();
  else doRephrase(action);
});

ord.onShowSettings(() => {
  if (!loggedInUser) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#mainApp .view').forEach(v => v.classList.remove('active'));
  document.querySelector('[data-view="settings"]').classList.add('active');
  document.getElementById('view-settings').classList.add('active');
});

async function doCheck() {
  const text = document.getElementById('textInput').value.trim();
  if (!text || text.length < 3) return;

  const lang = document.getElementById('langSelect').value;
  showLoading();
  const resp = await ord.checkGrammar(text, lang);

  if (resp.error) {
    showError(resp.error);
    return;
  }

  const data = resp.result;
  lastCorrected = data.corrected || text;
  lastRephrased = '';
  lastTranslated = '';
  showCheckResults(data);
}

async function doRephrase(style) {
  const text = document.getElementById('textInput').value.trim();
  if (!text || text.length < 3) return;

  const lang = document.getElementById('langSelect').value;
  showLoading();
  const resp = await ord.rephrase(text, lang, style);

  if (resp.error) {
    showError(resp.error);
    return;
  }

  const data = resp.result;
  lastRephrased = data.rephrased || '';
  lastCorrected = '';
  lastTranslated = '';
  showRephraseResult(data, lang);
}

async function doTranslate() {
  const text = document.getElementById('textInput').value.trim();
  if (!text || text.length < 3) return;

  const sourceLang = document.getElementById('langSelect').value;
  const targetLang = document.getElementById('targetLangSelect').value;

  if (sourceLang === targetLang) {
    showError('Source and target languages are the same');
    return;
  }

  showLoading('Translating...');
  const resp = await ord.translate(text, sourceLang, targetLang);

  if (resp.error) {
    showError(resp.error);
    return;
  }

  const data = resp.result;
  lastTranslated = data.translated || '';
  lastCorrected = '';
  lastRephrased = '';
  showTranslateResult(data, targetLang);
}

function showLoading(msg) {
  const results = document.getElementById('results');
  results.innerHTML = '<div class="loading"><div class="spinner"></div><span>' + esc(msg || 'Analyzing...') + '</span></div>';
  document.getElementById('scoreBar').style.display = 'none';
  document.getElementById('actionBar').style.display = 'none';
}

function showError(msg) {
  document.getElementById('results').innerHTML = `<div class="error-msg">${esc(msg)}</div>`;
}

function showCheckResults(data) {
  const results = document.getElementById('results');
  const issues = data.issues || [];
  const score = data.score || 100;

  const scoreBar = document.getElementById('scoreBar');
  scoreBar.style.display = 'flex';
  const fill = document.getElementById('scoreFill');
  fill.style.width = score + '%';
  fill.style.background = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  document.getElementById('scoreValue').textContent = score;

  if (issues.length === 0) {
    results.innerHTML = '<div class="perfect"><span style="font-size:18px;color:#22c55e">&#10003;</span> Text looks perfect!</div>';
    document.getElementById('actionBar').style.display = 'none';
    return;
  }

  document.getElementById('actionBar').style.display = 'flex';

  const typeIcons = { grammar: 'G', spelling: 'S', punctuation: 'P', style: 'T' };
  const typeColors = { grammar: '#ef4444', spelling: '#f59e0b', punctuation: '#8b5cf6', style: '#3b82f6' };
  const typeLabels = { grammar: 'Grammar', spelling: 'Spelling', punctuation: 'Punctuation', style: 'Style' };

  results.innerHTML = `
    <div class="issue-count">${issues.length} issue${issues.length === 1 ? '' : 's'} found</div>
    ${issues.map(issue => `
      <div class="issue">
        <div class="issue-header">
          <span class="issue-type" style="background:${typeColors[issue.type] || '#6b7280'}">${typeIcons[issue.type] || '?'}</span>
          <span class="issue-type-label">${typeLabels[issue.type] || issue.type}</span>
        </div>
        <div class="issue-content">
          <div class="issue-original"><del>${esc(issue.original)}</del> &rarr; <strong>${esc(issue.suggestion)}</strong></div>
          <div class="issue-explanation">${esc(issue.explanation)}</div>
        </div>
      </div>
    `).join('')}
  `;
}

function showRephraseResult(data, lang) {
  const results = document.getElementById('results');
  document.getElementById('scoreBar').style.display = 'none';
  document.getElementById('actionBar').style.display = 'flex';

  const rtlClass = isRtl(lang) ? ' rtl' : '';
  results.innerHTML = `
    <div class="rephrase-result">
      <div class="rephrase-label">Rephrased:</div>
      <div class="rephrase-text${rtlClass}">${esc(data.rephrased)}</div>
      ${data.changes ? `<div class="rephrase-changes">${esc(data.changes)}</div>` : ''}
    </div>
  `;
}

function showTranslateResult(data, targetLang) {
  const results = document.getElementById('results');
  document.getElementById('scoreBar').style.display = 'none';
  document.getElementById('actionBar').style.display = 'flex';

  const rtlClass = isRtl(targetLang) ? ' rtl' : '';
  results.innerHTML = `
    <div class="translate-result">
      <div class="translate-label">${esc(data.sourceLang || '')} &rarr; ${esc(data.targetLang || '')}</div>
      <div class="translate-text${rtlClass}">${esc(data.translated)}</div>
    </div>
  `;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

init();
