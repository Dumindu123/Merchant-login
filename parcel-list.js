const parcelRows = document.querySelector('#parcel-results');
const parcelCount = document.querySelector('#parcel-count');
const resultsSummary = document.querySelector('#results-summary');
const pagination = document.querySelector('#pagination');
const emptyMessage = document.querySelector('#empty-parcels');
const filterForm = document.querySelector('#parcel-filter-form');
const searchInput = document.querySelector('#parcel-search');
const statusFilter = document.querySelector('#status-filter');
const dateFilter = document.querySelector('#date-filter');
const pageSize = 5;

let parcels = [];

function dateOffset(daysAgo) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let filteredParcels = [...parcels];
let currentPage = 1;

function formatCurrency(amount) {
    return `Rs. ${Number(amount).toLocaleString('en-LK')}`;
}

function formatDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function statusClass(status) {
    if (status === 'Delivered') return 'status-delivered';
    if (status === 'In Transit') return 'status-transit';
    if (status === 'Returned') return 'status-returned';
    return 'status-pending';
}

function createCell(text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text;

    if (className) {
        cell.className = className;
    }

    return cell;
}

function renderRows() {
    const start = (currentPage - 1) * pageSize;
    const visibleParcels = filteredParcels.slice(start, start + pageSize);
    parcelRows.replaceChildren();

    visibleParcels.forEach((parcel) => {
        const row = document.createElement('tr');
        row.append(
            createCell(parcel.trackingId, 'parcel-list-tracking'),
            createCell(parcel.recipient),
            createCell(parcel.destination),
            createCell(formatDate(parcel.bookedAt)),
            createCell(formatCurrency(parcel.cod))
        );

        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `parcel-list-status ${statusClass(parcel.status)}`;
        badge.textContent = parcel.status;
        statusCell.append(badge);
        row.append(statusCell);
        parcelRows.append(row);
    });

    parcelCount.textContent = String(filteredParcels.length);
    emptyMessage.hidden = filteredParcels.length !== 0;

    const firstItem = filteredParcels.length === 0 ? 0 : start + 1;
    const lastItem = Math.min(start + pageSize, filteredParcels.length);
    resultsSummary.textContent = `Showing ${firstItem}-${lastItem} of ${filteredParcels.length} parcels`;
    renderPagination();
}

function createPageButton(label, page, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `page-button${options.current ? ' is-current' : ''}`;
    button.textContent = label;
    button.disabled = Boolean(options.disabled);

    if (options.current) {
        button.setAttribute('aria-current', 'page');
    }

    button.addEventListener('click', () => {
        currentPage = page;
        renderRows();
    });

    return button;
}

function renderPagination() {
    pagination.replaceChildren();
    const pageCount = Math.ceil(filteredParcels.length / pageSize);

    if (pageCount <= 1) {
        return;
    }

    pagination.append(createPageButton('‹', Math.max(1, currentPage - 1), { disabled: currentPage === 1 }));

    const pages = new Set([1, pageCount, currentPage, currentPage - 1, currentPage + 1]);
    const visiblePages = [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
    let previousPage = 0;

    visiblePages.forEach((page) => {
        if (page - previousPage > 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '…';
            pagination.append(ellipsis);
        }

        pagination.append(createPageButton(String(page), page, { current: page === currentPage }));
        previousPage = page;
    });

    pagination.append(createPageButton('›', Math.min(pageCount, currentPage + 1), { disabled: currentPage === pageCount }));
}

function applyFilters() {
    const search = searchInput.value.trim().toLocaleLowerCase();
    const selectedStatus = statusFilter.value;
    const days = dateFilter.value === 'all' ? null : Number(dateFilter.value);
    const earliestDate = days === null ? null : dateOffset(days - 1);

    filteredParcels = parcels.filter((parcel) => {
        const matchesSearch = search === '' ||
            `${parcel.trackingId} ${parcel.recipient} ${parcel.destination}`.toLocaleLowerCase().includes(search);
        const matchesStatus = selectedStatus === 'all' || parcel.status === selectedStatus;
        const matchesDate = earliestDate === null || parcel.bookedAt >= earliestDate;
        return matchesSearch && matchesStatus && matchesDate;
    });

    currentPage = 1;
    renderRows();
}

function exportCsv() {
    const headings = ['Tracking ID', 'Recipient', 'Destination', 'Booked Date', 'COD', 'Status'];
    const rows = filteredParcels.map((parcel) => [
        parcel.trackingId,
        parcel.recipient,
        parcel.destination,
        parcel.bookedAt,
        parcel.cod,
        parcel.status,
    ]);
    const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headings, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const file = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'speedx-parcels.csv';
    link.click();
    URL.revokeObjectURL(url);
}

filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters();
});

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
dateFilter.addEventListener('change', applyFilters);
document.querySelector('#export-csv').addEventListener('click', exportCsv);

const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu-button');

menuButton.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

async function loadParcels() {
    emptyMessage.hidden = false;
    emptyMessage.textContent = 'Loading parcels...';

    try {
        const response = await fetch('parcel-api.php?action=list', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not load parcels.');
        }

        parcels = result.parcels.map((parcel) => ({
            trackingId: parcel.trackingId,
            recipient: parcel.recipient,
            destination: parcel.city,
            bookedAt: parcel.createdAt.slice(0, 10),
            cod: Number(parcel.cod),
            status: parcel.status,
        }));
        applyFilters();
    } catch (error) {
        console.error('Could not load parcels from the database.', error);
        parcelRows.replaceChildren();
        parcelCount.textContent = '0';
        resultsSummary.textContent = '';
        pagination.replaceChildren();
        emptyMessage.hidden = false;
        emptyMessage.textContent = error instanceof Error ? error.message : 'Could not load parcels.';
    }
}

loadParcels();
