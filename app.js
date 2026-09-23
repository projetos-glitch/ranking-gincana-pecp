const PUBLISHED_GVIZ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN6YMI0r8MAfC3l8jYLY05shv9L-ZFTkCSyq3GL6wCUNlBVpZBjAFNuCyfjQbN-wAjs7nWRoPMH433/gviz/tq?gid=1035928882&tqx=responseHandler:rankingCallback';

const statusEl = document.getElementById('status');
const table = document.getElementById('rankingTable');
const tbody = table.querySelector('tbody');
const podium = document.getElementById('podium');
const updated = document.getElementById('updated');
const refreshBtn = document.getElementById('refreshBtn');

let currentScript = null;
let loadTimeout = null;

function number(value) {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return 0;
  return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}

function extractRanking(payload) {
  const rows = payload?.table?.rows || [];

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
  updated.textContent = `Atualizado em ${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date())}`;
}

window.rankingCallback = function(payload) {
  clearTimeout(loadTimeout);

  try {
    const data = extractRanking(payload);

    if (!data.length) {
      throw new Error('Nenhuma turma encontrada.');
    }

    render(data);
  } catch (error) {
    statusEl.hidden = false;
    table.hidden = true;
    statusEl.textContent = 'Os dados foram publicados, mas não foi possível montar o ranking.';
    updated.textContent = 'Falha ao processar os dados';
    console.error(error);
  } finally {
    if (currentScript) {
      currentScript.remove();
      currentScript = null;
    }
  }
};

function loadRanking() {
  table.hidden = true;
  statusEl.hidden = false;
  statusEl.textContent = 'Carregando ranking...';
  updated.textContent = 'Atualizando...';

  if (currentScript) {
    currentScript.remove();
  }

  currentScript = document.createElement('script');
  currentScript.src = `${PUBLISHED_GVIZ_URL}&_=${Date.now()}`;
  currentScript.async = true;

  currentScript.onerror = function() {
    clearTimeout(loadTimeout);
    statusEl.textContent = 'Não foi possível carregar os dados publicados agora.';
    updated.textContent = 'Falha ao atualizar os dados';
    currentScript?.remove();
    currentScript = null;
  };

  document.body.appendChild(currentScript);

  clearTimeout(loadTimeout);
  loadTimeout = setTimeout(() => {
    statusEl.textContent = 'A leitura dos dados demorou mais que o esperado. Tente novamente.';
    updated.textContent = 'Falha ao atualizar os dados';
  }, 12000);
}

refreshBtn.addEventListener('click', loadRanking);
loadRanking();
setInterval(loadRanking, 5 * 60 * 1000);
