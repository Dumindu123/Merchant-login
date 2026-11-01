const detailsButton = document.querySelector('#settlement-details-button');
const settlementDialog = document.querySelector('#settlement-dialog');
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu-button');
const transactionRows = document.querySelector('#wallet-transactions');

function formatCurrency(amount) {
    return `Rs. ${Number(amount).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(value) {
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
        return 'Date unavailable';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function setTableMessage(message) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = message;
    row.append(cell);
    transactionRows.replaceChildren(row);
}

function renderTransactions(transactions) {
    transactionRows.replaceChildren();

    if (transactions.length === 0) {
        setTableMessage('No parcel COD records yet.');
        return;
    }

    transactions.forEach((transaction) => {
        const row = document.createElement('tr');
        const values = [
            formatDate(transaction.createdAt),
            transaction.trackingId,
            `${transaction.status} parcel COD`,
            formatCurrency(transaction.amount),
            '—',
        ];

        values.forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.append(cell);
        });
        transactionRows.append(row);
    });
}

function updateWallet(summary, transactions) {
    const deliveredNet = formatCurrency(summary.deliveredNet);
    const inTransitCod = formatCurrency(summary.inTransitCod);
    const pendingCod = formatCurrency(summary.pendingCod);

    document.querySelector('#wallet-delivered-cod').textContent = deliveredNet;
    document.querySelector('#wallet-in-transit-cod').textContent = inTransitCod;
    document.querySelector('#wallet-pending-cod').textContent = pendingCod;
    document.querySelector('#wallet-settlement-estimate').textContent = deliveredNet;

    document.querySelector('#wallet-paid-this-month').textContent =
        summary.paidThisMonth === null ? '—' : formatCurrency(summary.paidThisMonth);
    document.querySelector('#wallet-paid-note').textContent = summary.paidThisMonth === null
        ? 'No payment records available'
        : 'Recorded payments this month';

    document.querySelector('#dialog-delivered-cod').textContent = deliveredNet;
    document.querySelector('#dialog-in-transit-cod').textContent = inTransitCod;
    document.querySelector('#dialog-pending-cod').textContent = pendingCod;
    document.querySelector('#dialog-total-cod').textContent = formatCurrency(summary.totalCod);
    renderTransactions(transactions);
}

async function loadWallet() {
    try {
        const response = await fetch('parcel-api.php?action=wallet', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not load COD wallet data.');
        }

        updateWallet(result.summary, result.transactions);
    } catch (error) {
        console.error('Could not load COD wallet data from the database.', error);
        const message = error instanceof Error ? error.message : 'Could not load COD wallet data.';
        for (const id of [
            'wallet-delivered-cod',
            'wallet-in-transit-cod',
            'wallet-pending-cod',
            'wallet-settlement-estimate',
            'dialog-delivered-cod',
            'dialog-in-transit-cod',
            'dialog-pending-cod',
            'dialog-total-cod',
        ]) {
            document.querySelector(`#${id}`).textContent = '—';
        }
        document.querySelector('#wallet-paid-note').textContent = message;
        setTableMessage(message);
    }
}

detailsButton.addEventListener('click', () => {
    settlementDialog.showModal();
});

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

loadWallet();
window.setInterval(loadWallet, 30000);
