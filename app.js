const toolRows = document.getElementById('toolRows');
const addToolBtn = document.getElementById('addToolBtn');
const assessBtn = document.getElementById('assessBtn');
const results = document.getElementById('results');

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function createCell(html) {
  const td = document.createElement('td');
  td.innerHTML = html;
  return td;
}

function addRow(defaults = {}) {
  const tr = document.createElement('tr');
  tr.append(
    createCell(`<input type="text" class="tool" placeholder="e.g. Slack" value="${defaults.tool || ''}" />`),
    createCell(`
      <select class="category">
        <option ${defaults.category === 'Communication' ? 'selected' : ''}>Communication</option>
        <option ${defaults.category === 'Project Management' ? 'selected' : ''}>Project Management</option>
        <option ${defaults.category === 'CRM' ? 'selected' : ''}>CRM</option>
        <option ${defaults.category === 'Marketing' ? 'selected' : ''}>Marketing</option>
        <option ${defaults.category === 'Other' || !defaults.category ? 'selected' : ''}>Other</option>
      </select>
    `),
    createCell(`<input type="number" class="seats" min="1" value="${defaults.seats || 10}" />`),
    createCell(`<input type="number" class="cost" min="0" step="0.01" value="${defaults.cost || 15}" />`),
    createCell(`
      <select class="term">
        <option value="monthly" ${defaults.term === 'monthly' ? 'selected' : ''}>Monthly</option>
        <option value="annual" ${defaults.term === 'annual' || !defaults.term ? 'selected' : ''}>Annual</option>
        <option value="multi" ${defaults.term === 'multi' ? 'selected' : ''}>Multi-year</option>
      </select>
    `),
    createCell(`
      <select class="usage">
        <option value="high" ${defaults.usage === 'high' ? 'selected' : ''}>High</option>
        <option value="medium" ${defaults.usage === 'medium' || !defaults.usage ? 'selected' : ''}>Medium</option>
        <option value="low" ${defaults.usage === 'low' ? 'selected' : ''}>Low</option>
      </select>
    `),
    createCell('<button class="btn remove">Remove</button>')
  );

  tr.querySelector('.remove').addEventListener('click', () => tr.remove());
  toolRows.appendChild(tr);
}

function termMultiplier(term) {
  if (term === 'monthly') return 1;
  if (term === 'annual') return 1 / 12;
  return 1 / 12;
}

function assess() {
  const rows = [...toolRows.querySelectorAll('tr')];
  const data = rows.map((tr) => {
    const tool = tr.querySelector('.tool').value.trim() || 'Unnamed tool';
    const category = tr.querySelector('.category').value;
    const seats = Number(tr.querySelector('.seats').value || 0);
    const cost = Number(tr.querySelector('.cost').value || 0);
    const term = tr.querySelector('.term').value;
    const usage = tr.querySelector('.usage').value;
    const monthly = seats * cost * termMultiplier(term);
    return { tool, category, seats, cost, term, usage, monthly };
  });

  const totalMonthly = data.reduce((sum, item) => sum + item.monthly, 0);
  const totalAnnual = totalMonthly * 12;

  const findings = [];
  const recommendations = [];

  data.forEach((item) => {
    if (item.usage === 'low' && item.seats >= 10) {
      findings.push(`${item.tool}: Low usage with ${item.seats} seats may indicate unused licenses.`);
      recommendations.push(`${item.tool}: Reduce seats by 15-30% and reassign on-demand.`);
    }
    if (item.cost >= 40 && item.category !== 'CRM') {
      findings.push(`${item.tool}: Higher than expected per-user cost ($${item.cost.toFixed(2)}).`);
      recommendations.push(`${item.tool}: Benchmark 2-3 alternatives before renewal.`);
    }
    if (item.term === 'monthly' && item.seats >= 8) {
      findings.push(`${item.tool}: Monthly contract likely misses annual discount savings.`);
      recommendations.push(`${item.tool}: Request annual pricing; target 10-20% reduction.`);
    }
  });

  const categorySpend = {};
  data.forEach((item) => {
    categorySpend[item.category] = (categorySpend[item.category] || 0) + item.monthly;
  });
  Object.entries(categorySpend).forEach(([category, spend]) => {
    if (spend > totalMonthly * 0.35) {
      recommendations.push(`${category}: Represents ${Math.round((spend / totalMonthly) * 100)}% of spend—prioritize vendor negotiation here.`);
    }
  });

  if (!findings.length) {
    findings.push('No major overpayment flags detected based on current rules.');
    recommendations.push('Maintain quarterly usage audits and renewal calendar reminders.');
  }

  document.getElementById('totalMonthly').textContent = currency.format(totalMonthly);
  document.getElementById('totalAnnual').textContent = currency.format(totalAnnual);

  const findingsEl = document.getElementById('findings');
  const recEl = document.getElementById('recommendations');
  findingsEl.innerHTML = '';
  recEl.innerHTML = '';

  findings.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    findingsEl.appendChild(li);
  });
  recommendations.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    recEl.appendChild(li);
  });

  results.hidden = false;
}

addToolBtn.addEventListener('click', () => addRow());
assessBtn.addEventListener('click', assess);

addRow({ tool: 'Slack', category: 'Communication', seats: 30, cost: 17, term: 'annual', usage: 'medium' });
addRow({ tool: 'Notion', category: 'Project Management', seats: 25, cost: 12, term: 'monthly', usage: 'low' });
addRow({ tool: 'HubSpot', category: 'CRM', seats: 8, cost: 55, term: 'annual', usage: 'high' });
