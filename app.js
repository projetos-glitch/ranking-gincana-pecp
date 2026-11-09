const RANKING_URL = 'ranking.json';
const SHEET_ID = '145Ap0Z2q7tekanL-j9BBYhfbZXQhNq6cRQYtEehstrM';
const SHEET_GID = '1035928882';

function numeric(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  return Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw) || 0;
}

// Google Visualization provides a cross-origin callback for publicly readable Sheets.
function fetchLiveRanking() {
  return new Promise((resolve, reject) => {
    const callbackName = '__pecpRankingCallback';
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(new Error('Tempo esgotado ao consultar a planilha.')), 12000);
    function finish(error, value) {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      if (error) reject(error); else resolve(value);
    }
    window[callbackName] = response => {
      try {
        if (response.status !== 'ok' || !response.table) throw new Error('Planilha indisponível ou sem acesso público.');
        const rows = response.table.rows || [];
        const ranking = rows.map(row => ({
          turma: String(row.c?.[0]?.v ?? '').trim(),
          kg: numeric(row.c?.[1]?.v),
          pontos: numeric(row.c?.[2]?.v)
        })).filter(row => row.turma && row.turma.toUpperCase() !== 'TURMA');
        if (!ranking.length) throw new Error('Planilha sem dados.');
        finish(null, ranking);
      } catch (error) { finish(error); }
    };
    script.onerror = () => finish(new Error('Falha ao acessar a planilha.'));
    const query = encodeURIComponent('select A,B,C');
    script.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
      '/gviz/tq?gid=' + SHEET_GID + '&tq=' + query +
      '&tqx=responseHandler:' + callbackName + '&_=' + Date.now();
    document.head.appendChild(script);
  });
}

const statusEl = document.getElementById('status');
const table = document.getElementById('rankingTable');
const tbody = table.querySelector('tbody');
const podium = document.getElementById('podium');
const barChart = document.getElementById('barChart');
const updated = document.getElementById('updated');
const refreshBtn = document.getElementById('refreshBtn');

function formatNumber(value, max = 2) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max }).format(Number(value) || 0);
}

function renderChart(data) {
  barChart.innerHTML = '';

  const maxPoints = Math.max(...data.map(item => Number(item.pontos) || 0), 1);

  data.forEach((item, index) => {
    const points = Number(item.pontos) || 0;
    const width = Math.max((points / maxPoints) * 100, points > 0 ? 2 : 0);

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-label">${index + 1}º ${item.turma}</div>
      <div class="bar-track" aria-label="${item.turma}: ${formatNumber(points)} pontos">
        <div class="bar-fill" style="width: ${width}%"></div>
      </div>
      <div class="bar-value">${formatNumber(points)} pts</div>
    `;
    barChart.appendChild(row);
  });
}

function render(data, updatedAt) {
  tbody.innerHTML = '';

  data.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}º</td>
      <td>${item.turma}</td>
      <td><strong>${formatNumber(item.pontos)} pts</strong></td>
      <td>${formatNumber(item.kg)} kg</td>
    `;
    tbody.appendChild(tr);
  });

  podium.innerHTML = '';
  const classes = ['first', 'second', 'third'];

  data.slice(0, 3).forEach((item, index) => {
    const card = document.createElement('article');
    card.className = `podium-card ${classes[index]}`;
    card.innerHTML = `
      <div class="medal">${index + 1}º</div>
      <h3>${item.turma}</h3>
      <div class="score">${formatNumber(item.pontos)} pts</div>
      <div class="kg">${formatNumber(item.kg)} kg coletados</div>
    `;
    podium.appendChild(card);
  });

  renderChart(data);

  statusEl.hidden = true;
  table.hidden = false;

  const date = updatedAt ? new Date(updatedAt) : new Date();
  updated.textContent = `Dados atualizados em ${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)}`;
}

async function loadRanking() {
  statusEl.hidden = false;
  statusEl.textContent = 'Consultando a planilha...';
  updated.textContent = 'Atualizando...';

  try {
    const data = await fetchLiveRanking();
    data.sort((a, b) => b.pontos - a.pontos || b.kg - a.kg ||
      a.turma.localeCompare(b.turma, 'pt-BR'));
    render(data, new Date().toISOString());
    updated.textContent = 'Dados consultados na planilha em ' +
      new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  } catch (liveError) {
    console.warn('Consulta ao Google Planilhas falhou:', liveError);
    try {
      const response = await fetch(RANKING_URL + '?_=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const payload = await response.json();
      const data = Array.isArray(payload.ranking) ? payload.ranking : [];
      if (!data.length) throw new Error('Ranking vazio.');
      data.sort((a, b) => numeric(b.pontos) - numeric(a.pontos) || numeric(b.kg) - numeric(a.kg));
      render(data, payload.updatedAt);
      updated.textContent = 'Dados de referência de ' +
        new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          .format(new Date(payload.updatedAt)) + ' (sem atualização ao vivo)';
      statusEl.hidden = false;
      statusEl.textContent = 'Não foi possível consultar a planilha em tempo real. Exibindo a última cópia disponível.';
    } catch (error) {
      table.hidden = true;
      barChart.innerHTML = '';
      podium.innerHTML = '';
      statusEl.hidden = false;
      statusEl.textContent = 'Não foi possível carregar o ranking. Verifique o acesso à planilha.';
      updated.textContent = 'Falha ao atualizar os dados';
      console.error(error);
    }
  }
}

refreshBtn.addEventListener('click', loadRanking);
loadRanking();
setInterval(loadRanking, 5 * 60 * 1000);
