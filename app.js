const PUBLISHED_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN6YMI0r8MAfC3l8jYLY05shv9L-ZFTkCSyq3GL6wCUNlBVpZBjAFNuCyfjQbN-wAjs7nWRoPMH433/pub?gid=1035928882&single=true&output=csv';

const statusEl = document.getElementById('status');
const table = document.getElementById('rankingTable');
const tbody = table.querySelector('tbody');
const podium = document.getElementById('podium');
const updated = document.getElementById('updated');
const refreshBtn = document.getElementById('refreshBtn');

function number(value) {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return 0;
  return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

function extractRanking(rows) {
  return rows
    .slice(1)
    .map(row => ({
      turma: String(row[0] || '').trim(),
      kg: number(row[1]),
      pontos: number(row[2])
    }))
    .filter(item => item.turma)
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

async function loadRanking() {
  table.hidden = true;
  statusEl.hidden = false;
  statusEl.textContent = 'Carregando ranking...';

  try {
    const response = await fetch(`${PUBLISHED_CSV_URL}&_=${Date.now()}`, {
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rows = parseCSV(await response.text());
    const data = extractRanking(rows);

    if (!data.length) throw new Error('Nenhuma turma encontrada.');
    render(data);
  } catch (error) {
    statusEl.textContent = 'Não foi possível carregar o ranking agora. Tente atualizar novamente em alguns instantes.';
    updated.textContent = 'Falha ao atualizar os dados';
    console.error(error);
  }
}

refreshBtn.addEventListener('click', loadRanking);
loadRanking();
setInterval(loadRanking, 5 * 60 * 1000);
