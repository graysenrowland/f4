function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseEquipmentManifest(yaml) {
  const equipment = {};
  let currentId = null;
  let currentLoan = null;

  yaml.split(/\r?\n/).forEach(line => {
    if (!line.trim() || line.trim() === 'equipment:') return;

    const itemMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (itemMatch) {
      currentId = itemMatch[1];
      equipment[currentId] = { id: currentId, loaned: [] };
      currentLoan = null;
      return;
    }

    if (!currentId) return;

    const propMatch = line.match(/^    ([A-Za-z0-9_-]+):\s*(.*)$/);
    if (propMatch) {
      const key = propMatch[1];
      const value = propMatch[2].trim();
      if (key === 'loaned' || key === 'buy') return;
      equipment[currentId][key] = key === 'have' ? Number(value) : value;
      return;
    }

    const loanStart = line.match(/^      - name:\s*(.*)$/);
    if (loanStart) {
      currentLoan = { name: loanStart[1].trim() };
      equipment[currentId].loaned.push(currentLoan);
      return;
    }

    const loanProp = line.match(/^        ([A-Za-z0-9_-]+):\s*(.*)$/);
    if (loanProp && currentLoan) {
      currentLoan[loanProp[1]] = loanProp[2].trim();
    }
  });

  return Object.values(equipment);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderEquipment(items) {
  const tbody = document.getElementById('equipment-body');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">No equipment listed yet.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const loaned = item.loaned || [];
    const have = Number(item.have || 0);
    const available = Math.max(have - loaned.length, 0);
    const id = escapeHtml(item.id);
    const image = item.img ? `<img class="equipment-img" src="resources/equipment/${escapeHtml(item.img)}" alt="${id}">` : '';
    const loansHtml = loaned.length
      ? `<table class="loan-table"><thead><tr><th>Borrower</th><th>Taken</th><th>Expected Return</th></tr></thead><tbody>${loaned.map(loan => `<tr><td>${escapeHtml(loan.name)}</td><td>${escapeHtml(formatDate(loan.taken))}</td><td>${escapeHtml(formatDate(loan.returns))}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">Nothing is currently loaned out.</p>';

    return `
      <tr class="equipment-row" tabindex="0" aria-expanded="false">
        <td><strong>${id}</strong></td>
        <td>${image}</td>
        <td>${available}</td>
        <td>${loaned.length}</td>
      </tr>
      <tr class="equipment-details"><td colspan="4"><div class="equipment-details-inner"><h3>${id} loans</h3>${loansHtml}</div></td></tr>
    `;
  }).join('');

  document.querySelectorAll('.equipment-row').forEach(row => {
    const toggle = () => {
      const open = row.classList.toggle('is-open');
      row.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  });
}

fetch('resources/equipment/manifest.yaml')
  .then(response => {
    if (!response.ok) throw new Error('Could not load manifest.');
    return response.text();
  })
  .then(text => renderEquipment(parseEquipmentManifest(text)))
  .catch(() => {
    document.getElementById('equipment-body').innerHTML = '<tr><td colspan="4" class="muted">Equipment manifest could not be loaded.</td></tr>';
  });
