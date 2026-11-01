const supportForm = document.querySelector('#support-ticket-form');
const supportStatus = document.querySelector('#support-form-status');

supportForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!supportForm.reportValidity()) {
        return;
    }

    const formData = new FormData(supportForm);
    const subject = `[${formData.get('category')}] ${formData.get('subject')}`;
    const trackingNumber = formData.get('trackingNumber');
    const message = [
        `Category: ${formData.get('category')}`,
        trackingNumber ? `Tracking number: ${trackingNumber}` : '',
        '',
        formData.get('message'),
        '',
        `Merchant: ${document.body.dataset.merchantName || 'Merchant'} (${document.body.dataset.merchantId || 'unknown ID'})`,
    ].filter(Boolean).join('\n');

    supportStatus.textContent = 'Opening your email app…';
    window.location.href = `mailto:support@speedx.lk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
});
