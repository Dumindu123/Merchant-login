const trackingForm = document.querySelector('#tracking-form');
const trackingInput = document.querySelector('#tracking-number');
const trackingMessage = document.querySelector('#tracking-message');
const trackingResults = document.querySelector('#tracking-results');
const trackingTimeline = document.querySelector('#tracking-timeline');
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu-button');

const timelineSteps = [
    { title: 'Parcel booked', description: 'Your parcel booking has been confirmed.' },
    { title: 'Picked up', description: 'Collected from your store.' },
    { title: 'In transit', description: 'Parcel is moving to the delivery hub.' },
    { title: 'Out for delivery', description: 'Rider will take the parcel to the recipient.' },
    { title: 'Delivered', description: 'Delivery confirmation will appear here.' },
];

const statusStep = {
    Pending: 0,
    'In Transit': 2,
    Delivered: 4,
    Returned: 4,
};

function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Awaiting update';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatCurrency(value) {
    return `Rs. ${Number(value).toLocaleString('en-LK')}`;
}

function appendTimelineStep(step, index, completedStep, bookedAt) {
    const item = document.createElement('li');
    item.className = `timeline-item${index <= completedStep ? ' is-complete' : ''}`;

    const marker = document.createElement('span');
    marker.className = 'timeline-marker';
    marker.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('div');
    copy.className = 'timeline-copy';

    const titleRow = document.createElement('div');
    titleRow.className = 'timeline-title-row';

    const title = document.createElement('strong');
    title.textContent = step.title;

    const time = document.createElement('time');
    time.textContent = index <= completedStep
        ? formatTimestamp(index === 0 ? bookedAt : new Date(new Date(bookedAt).getTime() + index * 2.5 * 60 * 60 * 1000))
        : 'Awaiting update';

    const description = document.createElement('p');
    description.textContent = step.description;

    titleRow.append(title, time);
    copy.append(titleRow, description);
    item.append(marker, copy);
    trackingTimeline.append(item);
}

async function showShipment(trackingId) {
    try {
        const response = await fetch(`parcel-api.php?action=tracking&trackingId=${encodeURIComponent(trackingId)}`, {
            cache: 'no-store',
        });
        const shipment = await response.json();

        if (!response.ok) {
            throw new Error(shipment.error || 'Could not load this parcel.');
        }

        trackingMessage.textContent = '';
        trackingResults.hidden = false;
        document.querySelector('#shipment-id').textContent = shipment.trackingId;
        document.querySelector('#shipment-route').textContent = `${shipment.destination}  •  ${shipment.district}, Sri Lanka`;

        const status = document.querySelector('#shipment-status');
        status.textContent = shipment.status;
        status.className = `shipment-status${shipment.status === 'Delivered' ? ' status-delivered' : ''}${shipment.status === 'Returned' ? ' status-returned' : ''}`;

        document.querySelector('#recipient-name').textContent = shipment.recipient;
        document.querySelector('#recipient-phone').textContent = shipment.phone;
        document.querySelector('#recipient-address').textContent = `${shipment.address}\n${shipment.destination}, ${shipment.district}`;
        document.querySelector('#recipient-address').style.whiteSpace = 'pre-line';
        document.querySelector('#recipient-cod').textContent = formatCurrency(shipment.cod);

        trackingTimeline.replaceChildren();
        const completedStep = statusStep[shipment.status] ?? 0;
        timelineSteps.forEach((step, index) => appendTimelineStep(step, index, completedStep, shipment.bookedAt));
    } catch (error) {
        trackingResults.hidden = true;
        trackingMessage.textContent = error instanceof Error
            ? error.message
            : 'Could not load this parcel. Please try again.';
    }
}

trackingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const trackingId = trackingInput.value.trim().toUpperCase();

    if (!trackingId) {
        trackingResults.hidden = true;
        trackingMessage.textContent = 'Enter a tracking number to continue.';
        return;
    }

    trackingInput.value = trackingId;
    showShipment(trackingId);
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
