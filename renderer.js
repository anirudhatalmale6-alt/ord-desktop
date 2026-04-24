let lastCorrected = '';
let lastRephrased = '';

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
  });
});

document.getElementById('closeBtn').addEventListener('click', () => ord.hideWindow());
document.getElementById('minimizeBtn').addEventListener('click', () => ord.hideWindow());

document.getElementById('pasteHint').addEventListener('click', async () => {
  const text = await ord.getClipboard();
  if (text) document.getElementById('textInput').value = text;
});

document.getElementById('checkBtn').addEventListener('click', () => doCheck());
document.getElementById('rephraseBtn').addEventListener('click', () => doRephrase('rephrase'));
document.getElementById('formalBtn').addEventListener('click', () => doRephrase('formal'));
document.getElementById('casualBtn').addEventListener('click', () => doRephrase('casual'));

document.getElementById('applyBtn').addEventListener('click', async () => {
  const text = lastCorrected || lastRephrased;
  if (text) {
    await ord.setClipboard(text);
    showToast('Copied! Paste with Ctrl+V');
  }
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = lastCorrected || lastRephrased;
  if (text) {
    await ord.setClipboard(text);
    showToast('Copied to clipboard!');
  }
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('settingsApiKey').value.trim();
  const lang = document.getElementById('settingsLang').value;
  await ord.saveSettings({ apiKey });
  document.getElementById('langSelect').value = lang;
  localStorage.setItem('ord-lang', lang);
  localStorage.setItem('ord-apikey', apiKey);
  showToast('Settings saved!');
});

async function loadSettings() {
  const saved = await ord.loadSettings();
  const storedKey = localStorage.getItem('ord-apikey') || '';
  const storedLang = localStorage.getItem('ord-lang') || 'en';

  const apiKey = saved.apiKey || storedKey;
  if (apiKey) {
    document.getElementById('settingsApiKey').value = apiKey;
    await ord.saveSettings({ apiKey });
  }
  document.getElementById('settingsLang').value = storedLang;
  document.getElementById('langSelect').value = storedLang;
}

loadSettings();

ord.onStartAction(async (action) => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
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
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
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
  showRephraseResult(data);
}

function showLoading() {
  const results = document.getElementById('results');
  results.innerHTML = '<div class="loading"><div class="spinner"></div><span>Analyzing...</span></div>';
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

function showRephraseResult(data) {
  const results = document.getElementById('results');
  document.getElementById('scoreBar').style.display = 'none';
  document.getElementById('actionBar').style.display = 'flex';

  results.innerHTML = `
    <div class="rephrase-result">
      <div class="rephrase-label">Rephrased:</div>
      <div class="rephrase-text">${esc(data.rephrased)}</div>
      ${data.changes ? `<div class="rephrase-changes">${esc(data.changes)}</div>` : ''}
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
