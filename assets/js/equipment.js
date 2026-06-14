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

function openImageModal(src, alt) {
  let modal = document.querySelector('.image-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = '<button class="image-modal-close" type="button" aria-label="Close image">×</button><img class="image-modal-img" alt="">';
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.classList.contains('image-modal-close')) {
        closeImageModal();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeImageModal();
    });
  }

  const img = modal.querySelector('.image-modal-img');
  img.src = src;
  img.alt = alt;
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function closeImageModal() {
  const modal = document.querySelector('.image-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
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
    const description = escapeHtml(item.description || item.id);
    const imgSrc = item.img ? `resources/equipment/${escapeHtml(item.img)}` : '';
    const image = imgSrc ? `<button class="equipment-image-button" type="button" data-img-src="${imgSrc}" data-img-alt="${description}" aria-label="View ${description} image"><img class="equipment-img" src="${imgSrc}" alt="${description}"></button>` : '';
    const loansHtml = loaned.length
      ? `<table class="loan-table"><thead><tr><th>Borrower</th><th>Taken</th><th>Expected Return</th></tr></thead><tbody>${loaned.map(loan => `<tr><td>${escapeHtml(loan.name)}</td><td>${escapeHtml(formatDate(loan.taken))}</td><td>${escapeHtml(formatDate(loan.returns))}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">Nothing is currently loaned out.</p>';

    return `
      <tr class="equipment-row" tabindex="0" aria-expanded="false">
        <td><strong>${description}</strong></td>
        <td>${image}</td>
        <td>${available}</td>
        <td>${loaned.length}</td>
      </tr>
      <tr class="equipment-details"><td colspan="4"><div class="equipment-details-inner"><h3>${description} loans</h3>${loansHtml}</div></td></tr>
    `;
  }).join('');

  document.querySelectorAll('.equipment-image-button').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      openImageModal(button.dataset.imgSrc, button.dataset.imgAlt);
    });
  });

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

fetch(`resources/equipment/manifest.yaml?v=${Date.now()}`)
  .then(response => {
    if (!response.ok) throw new Error('Could not load manifest.');
    return response.text();
  })
  .then(text => renderEquipment(parseEquipmentManifest(text)))
  .catch(() => {
    document.getElementById('equipment-body').innerHTML = '<tr><td colspan="4" class="muted">Equipment manifest could not be loaded.</td></tr>';
  });
