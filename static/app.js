const contactsBody = document.getElementById('contactsBody');
const listsEl = document.getElementById('lists');
const dealsEl = document.getElementById('deals');
const metricsGrid = document.getElementById('metricsGrid');

let lastContacts = [];

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

function selectedIds() {
  return [...document.querySelectorAll('input[name="pick"]:checked')].map((el) => Number(el.value));
}

function renderContacts(contacts) {
  lastContacts = contacts;
  contactsBody.innerHTML = contacts
    .map(
      (c) => `
      <tr>
        <td><input type="checkbox" name="pick" value="${c.id}" /></td>
        <td>${c.name}</td>
        <td>${c.title}</td>
        <td>${c.company}</td>
        <td>${c.industry}</td>
        <td>${c.intent_score}</td>
        <td><button onclick="enrich(${c.id})">Enrich</button></td>
      </tr>
    `,
    )
    .join('');
}

async function loadContacts() {
  const q = new URLSearchParams({
    industry: document.getElementById('industry').value,
    location: document.getElementById('location').value,
    seniority: document.getElementById('seniority').value,
    technology: document.getElementById('technology').value,
    minEmployees: document.getElementById('minEmployees').value || 0,
    minIntent: document.getElementById('minIntent').value || 0,
  });
  const contacts = await fetchJSON(`/api/contacts?${q.toString()}`);
  renderContacts(contacts);
}

async function loadLists() {
  const lists = await fetchJSON('/api/lists');
  listsEl.innerHTML = lists.map((l) => `<li><strong>${l.name}</strong> (${l.count})</li>`).join('');
}

async function loadDeals() {
  const deals = await fetchJSON('/api/deals');
  dealsEl.innerHTML = deals.map((d) => `<li>${d.company} — $${d.value.toLocaleString()} (${d.stage})</li>`).join('');
}

async function loadMetrics() {
  const m = await fetchJSON('/api/dashboard');
  const entries = [
    ['Total Contacts', m.totalContacts],
    ['High Intent', m.highIntentContacts],
    ['Total Pipeline', `$${m.totalPipeline.toLocaleString()}`],
    ['Active Sequences', m.activeSequences],
    ['Conversion Rate', `${m.conversionRate}%`],
  ];
  metricsGrid.innerHTML = entries.map(([k, v]) => `<div class="metric"><strong>${k}</strong><br/>${v}</div>`).join('');
}

async function enrich(contactId) {
  const details = await fetchJSON('/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });
  alert(`LinkedIn: ${details.linkedin}\nSignals: ${details.signals.join(', ')}`);
}

async function saveList() {
  const name = document.getElementById('listName').value;
  const ids = selectedIds();
  if (!name || ids.length === 0) {
    alert('Provide a list name and select at least one contact.');
    return;
  }
  await fetchJSON('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ids }),
  });
  await loadLists();
}

async function createSequence() {
  const ids = selectedIds();
  if (ids.length === 0) {
    alert('Select contacts to add to a sequence.');
    return;
  }
  await fetchJSON('/api/sequences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Outbound Sequence',
      contactIds: ids,
      steps: [
        { day: 1, channel: 'email', message: 'Intro email' },
        { day: 3, channel: 'linkedin', message: 'Connection request' },
        { day: 6, channel: 'email', message: 'Case study follow-up' },
      ],
    }),
  });
  await loadMetrics();
  alert('Sequence created.');
}

document.getElementById('searchBtn').addEventListener('click', loadContacts);
document.getElementById('saveListBtn').addEventListener('click', saveList);
document.getElementById('createSequenceBtn').addEventListener('click', createSequence);

loadContacts();
loadLists();
loadDeals();
loadMetrics();

window.enrich = enrich;
