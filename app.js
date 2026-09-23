const SPREADSHEET_ID = '145Ap0Z2q7tekanL-j9BBYhfbZXQhNq6cRQYtEehstrM';
const SHEET_NAME = 'Ranking Público';

const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json&tq=${encodeURIComponent('select A,B,C where A is not null')}`;

const statusEl = document.getElementById('status');
const table = document.getElementById('rankingTable');
const tbody = table.querySelector('tbody');
const podium = document.getElementById('podium');
const updated = document.getElementById('updated');
const refreshBtn = document.getElementById('refreshBtn');

function number(value) {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

function parseGviz(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('Resposta inválida do Google Planilhas.');
  return JSON.parse(text.slice(start, end + 1));
}

function extractRanking(payload) {
  const rows = payload.table?.rows || [];
  return rows
    .map(row => ({
      turma: String(row.c?.[0]?.v || '').trim(),
      kg: number(row.c?.[1]?.v),
      pontos: number(row.c?.[2]?.v)
    }))
    .filter(item => item.turma && item.turma.toUpperCase() !== 'TURMA')
    .sort((a, b) => b.pontos - a.pontos || b.kg - a.kg || a.turma.localeCompare(b.turma, 'pt-BR'));
}

function formatNumber(value, max = 2) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max }).format(value);
}

function render(data) {
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

  statusEl.hidden = true;
  table.hidden = false;
  updated.textContent = `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
}

async function loadRanking() {
  table.hidden = true;
  statusEl.hidden = false;
  statusEl.textContent = 'Carregando ranking...';

  try {
    const response = await fetch(`${GVIZ_URL}&_=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = parseGviz(await response.text());
    const data = extractRanking(payload);

    if (!data.length) throw new Error('Nenhuma turma encontrada.');
    render(data);
  } catch (error) {
    statusEl.innerHTML = 'O ranking ainda não está liberado para leitura pública. Publique somente a aba <strong>Ranking Público</strong> do Google Planilhas e recarregue esta página.';
    updated.textContent = 'Aguardando publicação dos dados';
  }
}

refreshBtn.addEventListener('click', loadRanking);
loadRanking();
setInterval(loadRanking, 5 * 60 * 1000);