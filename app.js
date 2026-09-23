const RANKING_URL = 'ranking.json';

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
  statusEl.textContent = 'Carregando ranking...';
  updated.textContent = 'Atualizando...';

  try {
    const response = await fetch(`${RANKING_URL}?_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const data = Array.isArray(payload.ranking) ? payload.ranking : [];

    if (!data.length) throw new Error('Ranking vazio.');

    data.sort((a, b) =>
      Number(b.pontos) - Number(a.pontos) ||
      Number(b.kg) - Number(a.kg) ||
      String(a.turma).localeCompare(String(b.turma), 'pt-BR')
    );

    render(data, payload.updatedAt);
  } catch (error) {
    table.hidden = true;
    barChart.innerHTML = '';
    statusEl.hidden = false;
    statusEl.textContent = 'Não foi possível carregar o ranking agora. Tente novamente em alguns instantes.';
    updated.textContent = 'Falha ao atualizar os dados';
    console.error(error);
  }
}

refreshBtn.addEventListener('click', loadRanking);
loadRanking();
setInterval(loadRanking, 5 * 60 * 1000);
