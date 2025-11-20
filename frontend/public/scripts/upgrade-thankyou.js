document.addEventListener('DOMContentLoaded', () => {
    try {
        const raw = sessionStorage.getItem('premiumUpgradeReceipt');
        if (!raw) {
            return;
        }

        const data = JSON.parse(raw);

        const organizationEl = document.getElementById('summaryOrganization');
        const contactEl = document.getElementById('summaryContact');
        const emailEl = document.getElementById('summaryEmail');
        const paymentEl = document.getElementById('summaryPayment');
        const notesWrapper = document.getElementById('summaryNotesWrapper');
        const notesEl = document.getElementById('summaryNotes');
        const statusWrapper = document.getElementById('summaryStatusWrapper');
        const statusEl = document.getElementById('summaryStatus');
        const statusDetailEl = document.getElementById('summaryStatusDetail');

        if (organizationEl) organizationEl.textContent = data.organizationName || '—';
        if (contactEl) contactEl.textContent = `${data.contactPerson || ''} (${data.contactPhone || ''})`;
        if (emailEl) emailEl.textContent = data.contactEmail || '—';
        if (paymentEl) paymentEl.textContent = data.paymentMethod || '—';

        if (data.notes) {
            notesWrapper.hidden = false;
            notesEl.textContent = data.notes;
        }

        if (data.daraja) {
            statusWrapper.hidden = false;
            statusEl.textContent = data.daraja.status || 'SIMULATED';
            if (statusDetailEl) {
                const checkoutId = data.daraja.checkoutRequestId ? `Checkout ID: ${data.daraja.checkoutRequestId}` : '';
                const merchantId = data.daraja.merchantRequestId ? `Merchant ID: ${data.daraja.merchantRequestId}` : '';
                statusDetailEl.textContent = [data.daraja.mode ? `Mode: ${data.daraja.mode}` : '', checkoutId, merchantId]
                    .filter(Boolean)
                    .join(' • ');
            }
        }

        // Clear session storage so the summary is only shown once
        sessionStorage.removeItem('premiumUpgradeReceipt');
    } catch (error) {
        console.error('Unable to render upgrade summary:', error);
    }
});

