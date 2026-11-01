const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu-button');

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
        }
    });
});

function renderRecentParcels(parcels) {
    const parcelList = document.querySelector('#parcel-list');
    parcelList.replaceChildren();

    if (parcels.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'No parcels yet. Create a parcel to see it here.';
        row.append(cell);
        parcelList.append(row);
        return;
    }

    parcels.slice(-5).reverse().forEach((parcel) => {
        const row = document.createElement('tr');
        const values = [
            parcel.trackingId,
            parcel.recipient,
            parcel.city,
            `Rs. ${Number(parcel.cod || 0).toLocaleString('en-LK')}`,
        ];

        values.forEach((value, index) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            if (index === 0) {
                cell.className = 'tracking-id';
            }
            row.append(cell);
        });

        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        const statusClasses = {
            Delivered: 'delivered-badge',
            'In Transit': 'transit-badge',
            Pending: 'pickup-badge',
            Returned: 'returned-badge',
        };
        statusBadge.className = `status-badge ${statusClasses[parcel.status] || 'pickup-badge'}`;
        statusBadge.textContent = parcel.status;
        statusCell.append(statusBadge);
        row.append(statusCell);
        parcelList.append(row);
    });
}

function renderActivityChart(parcels) {
    const chart = document.querySelector('#weekly-parcel-chart');
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return {
            date,
            dateKey,
            count: parcels.filter((parcel) => parcel.createdAt.slice(0, 10) === dateKey).length,
        };
    });
    const maximum = Math.max(1, ...days.map((day) => day.count));
    chart.classList.remove('chart-empty');
    chart.setAttribute('aria-label', 'Parcel bookings over the last seven days');
    chart.replaceChildren();

    days.forEach(({ date, count }) => {
        const day = document.createElement('div');
        day.className = 'chart-day';
        const bars = document.createElement('div');
        bars.className = 'bar-pair';
        const bar = document.createElement('i');
        bar.style.setProperty('--bar-height', `${count ? Math.max(8, count / maximum * 100) : 0}%`);
        bar.title = `${count} parcel${count === 1 ? '' : 's'} booked`;
        bars.append(bar);
        const label = document.createElement('span');
        label.textContent = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
        day.append(bars, label);
        chart.append(day);
    });
}

function renderStatusSummary(parcels) {
    const statusRows = [
        ['Delivered', 'delivered', 'delivered-count'],
        ['In Transit', 'in-transit', 'in-transit-count'],
        ['Pending', 'pending', 'pending-count-summary'],
        ['Returned', 'returned', 'returned-count'],
    ];
    const counts = statusRows.map(([status]) =>
        parcels.filter((parcel) => parcel.status === status).length
    );
    const maximum = Math.max(1, ...counts);

    statusRows.forEach(([, id, countId], index) => {
        document.querySelector(`#${countId}`).textContent = String(counts[index]);
        document.querySelector(`#${id}-fill`).style.width = `${counts[index] / maximum * 100}%`;
    });

    document.querySelector('#pending-count').textContent = String(counts[2]);
}

async function loadDashboardParcels() {
    try {
        const response = await fetch('parcel-api.php?action=list', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not load parcel data.');
        }

        const parcels = result.parcels;
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const thisMonthCount = parcels.filter((parcel) => parcel.createdAt.startsWith(monthKey)).length;

        document.querySelector('#monthly-parcel-count').textContent = String(thisMonthCount);
        document.querySelector('#monthly-parcel-note').textContent = thisMonthCount
            ? 'Booked this month'
            : 'No parcels booked this month';
        renderStatusSummary(parcels);
        renderActivityChart(parcels);
        renderRecentParcels(parcels);
    } catch (error) {
        console.error('Could not load parcel data from the database.', error);
        document.querySelector('#monthly-parcel-note').textContent = 'Could not load parcel data';
        const parcelList = document.querySelector('#parcel-list');
        parcelList.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = error instanceof Error ? error.message : 'Could not load parcel data.';
        row.append(cell);
        parcelList.append(row);
    }
}

loadDashboardParcels();
