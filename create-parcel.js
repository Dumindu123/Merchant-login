const parcelForm = document.querySelector('#create-parcel-form');
const payoutAmount = document.querySelector('#payout-amount');
const bookingMessage = document.querySelector('#booking-message');
const saveDraftButton = document.querySelector('#save-draft');
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.mobile-menu-button');
const mobileField = parcelForm.elements.namedItem('mobile');
const trackingIdField = parcelForm.elements.namedItem('trackingId');
const storageKey = 'speedx-parcel-draft';

function validateMobile() {
    const value = mobileField.value.trim();
    const valid = value === '' || /^[+0-9()\s-]{7,20}$/.test(value);
    mobileField.setCustomValidity(valid ? '' : 'Enter a valid phone number.');
}

function getFieldValue(name) {
    return parcelForm.elements.namedItem(name).value;
}

function formatLkr(amount) {
    return `Rs. ${Math.max(0, amount).toLocaleString('en-LK')}`;
}

function updatePayout() {
    const cod = Number(getFieldValue('cod')) || 0;
    const deliveryFee = Number(getFieldValue('delivery_fee')) || 0;
    const insurance = Number(getFieldValue('insurance')) || 0;
    payoutAmount.textContent = formatLkr(cod - deliveryFee - insurance);
}

function collectParcelDetails() {
    return Object.fromEntries(new FormData(parcelForm).entries());
}

function saveDraft() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(collectParcelDetails()));
        bookingMessage.textContent = 'Draft saved in this browser.';
    } catch (error) {
        bookingMessage.textContent = 'Could not save the draft in this browser. Check storage availability and try again.';
    }
}

function loadDraft() {
    try {
        const draft = localStorage.getItem(storageKey);

        if (!draft) {
            return;
        }

        const details = JSON.parse(draft);

        Object.entries(details).forEach(([name, value]) => {
            const field = parcelForm.elements.namedItem(name);

            if (field && typeof value === 'string') {
                field.value = value;
            }
        });
    } catch (error) {
        bookingMessage.textContent = 'The saved draft could not be read. You can continue with a new parcel.';
    }
}

parcelForm.addEventListener('input', updatePayout);
parcelForm.addEventListener('change', updatePayout);
mobileField.addEventListener('input', validateMobile);
saveDraftButton.addEventListener('click', saveDraft);

parcelForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!parcelForm.reportValidity()) {
        return;
    }

    submitParcel();
});

async function submitParcel() {
    try {
        if (!await window.merchantProfileReady) {
            throw new Error('Sign in to create a parcel.');
        }

        const response = await fetch('parcel-api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': window.merchantProfileCsrfToken,
            },
            body: JSON.stringify(collectParcelDetails()),
        });
        const result = await response.json();

        if (!response.ok) {
            const error = new Error(result.error || 'Could not save this parcel. Please try again.');
            error.status = response.status;
            throw error;
        }

        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Parcel was saved to MySQL but its local draft could not be removed.', error);
        }

        bookingMessage.textContent = `Parcel ${result.trackingId} saved to the database.`;
    } catch (error) {
        if (error.status === 409) {
            trackingIdField.value = '';
            await loadTrackingId();
            bookingMessage.textContent = 'That parcel ID was already used. A new ID has been generated; please try again.';
        } else {
            bookingMessage.textContent = error instanceof TypeError
                ? 'Could not reach the parcel database. Run the site through PHP and check the database connection.'
                : error.message;
        }
    }
}

menuButton.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

async function loadTrackingId() {
    if (trackingIdField.value) {
        return;
    }

    try {
        if (!await window.merchantProfileReady) {
            throw new Error('Sign in to create a parcel.');
        }

        const response = await fetch('parcel-api.php?action=next-id');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not generate a parcel ID.');
        }

        trackingIdField.value = result.trackingId;
    } catch (error) {
        bookingMessage.textContent = error instanceof TypeError
            ? 'Could not reach the parcel database. Run the site through PHP and check the database connection.'
            : error.message;
    }
}

loadDraft();
loadTrackingId();
updatePayout();
