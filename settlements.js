const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu-button');
const settlementRows = document.querySelector('#settlement-records');

function formatCurrency(amount) {
    return `Rs. ${Number(amount).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function renderSettlementRows(settlements) {
    settlementRows.replaceChildren();

    if (settlements.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.textContent = 'No settlement records in the database yet.';
        row.append(cell);
        settlementRows.append(row);
        return;
    }

    settlements.forEach((settlement) => {
        const row = document.createElement('tr');
        const values = [
            settlement.reference,
            formatDate(settlement.paidAt || settlement.createdAt),
            String(settlement.parcelCount),
            formatCurrency(settlement.grossCod),
            formatCurrency(settlement.deductions),
            settlement.status === 'Paid'
                ? formatCurrency(settlement.netPaid)
                : `${formatCurrency(settlement.netPaid)} (${settlement.status})`,
        ];
        const labels = ['Settlement ID', 'Date', 'Parcels', 'Gross COD', 'Deductions', 'Net paid'];

        values.forEach((value, index) => {
            const cell = document.createElement('td');
            cell.dataset.label = labels[index];
            cell.textContent = value;
            row.append(cell);
        });
        settlementRows.append(row);
    });
}

async function loadSettlements() {
    try {
        const response = await fetch('parcel-api.php?action=settlements', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not load settlement history.');
        }

        document.querySelector('#settled-total').textContent = formatCurrency(result.summary.totalSettled);
        document.querySelector('#last-settlement-date').textContent = formatDate(result.summary.lastPaidAt);
        document.querySelector('#pending-settlement-total').textContent = formatCurrency(result.summary.pendingAmount);
        document.querySelector('#settlement-bank-name').textContent = result.bank.name || 'Not set';
        document.querySelector('#settlement-bank-branch').textContent = result.bank.branch || 'Branch not set';
        renderSettlementRows(result.settlements);
    } catch (error) {
        console.error('Could not load settlements from the database.', error);
        const message = error instanceof Error ? error.message : 'Could not load settlement history.';
        for (const id of [
            'settled-total',
            'last-settlement-date',
            'pending-settlement-total',
            'settlement-bank-name',
        ]) {
            document.querySelector(`#${id}`).textContent = '—';
        }
        document.querySelector('#settlement-bank-branch').textContent = message;
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.textContent = message;
        row.append(cell);
        settlementRows.replaceChildren(row);
    }
}

menuButton.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 760) {
            sidebar.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
            menuButton.setAttribute('aria-label', 'Open navigation');
        }
    });
});

loadSettlements();
window.setInterval(loadSettlements, 30000);
