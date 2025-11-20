document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('adminToken');
    const statusSelect = document.getElementById('leadStatus');
    const searchInput = document.getElementById('leadSearch');
    const loadButton = document.getElementById('loadLeadsBtn');
    const statusBanner = document.getElementById('adminStatus');
    const tableBody = document.querySelector('#leadTable tbody');

    const persistedToken = localStorage.getItem('ipmasUpgradeAdminToken');
    if (persistedToken && tokenInput) {
        tokenInput.value = persistedToken;
    }

    async function loadLeads() {
        if (!tableBody || !statusBanner) return;

        const token = tokenInput.value.trim();
        const status = statusSelect.value;
        const search = searchInput.value.trim();

        if (!token) {
            statusBanner.textContent = 'Provide an admin token to access leads.';
            statusBanner.className = 'upgrade-status-banner error';
            return;
        }

        statusBanner.textContent = 'Loading leads…';
        statusBanner.className = 'upgrade-status-banner info';
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">Loading…</td>
            </tr>
        `;

        try {
            localStorage.setItem('ipmasUpgradeAdminToken', token);

            const query = new URLSearchParams();
            if (status) query.set('status', status);
            if (search) query.set('search', search);

            const response = await fetch(`/api/v1/upgrade?${query.toString()}`, {
                headers: {
                    'x-admin-token': token
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Unable to load upgrade leads');
            }

            if (!result.results || result.results.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-row">No upgrade requests found.</td>
                    </tr>
                `;
                statusBanner.textContent = 'No leads found for the current filters.';
                statusBanner.className = 'upgrade-status-banner info';
                return;
            }

            const rows = result.results.map((lead) => {
                const createdAt = lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '—';
                const darajaBadge = lead.daraja?.status
                    ? `<span class="badge light">${lead.daraja.status}</span>`
                    : '<span class="badge light">SIMULATED</span>';

                return `
                    <tr>
                        <td>
                            <div><strong>${lead.organizationName}</strong></div>
                            <small>${lead.planTier || 'premium'}</small>
                        </td>
                        <td>
                            <div>${lead.contactPerson}</div>
                            <small>${lead.contactEmail} • ${lead.contactPhone}</small>
                        </td>
                        <td>${lead.paymentMethod}</td>
                        <td><span class="badge">${lead.status || 'received'}</span></td>
                        <td>${createdAt}</td>
                        <td>${darajaBadge}</td>
                    </tr>
                `;
            }).join('');

            tableBody.innerHTML = rows;
            statusBanner.textContent = `Loaded ${result.results.length} lead(s).`;
            statusBanner.className = 'upgrade-status-banner success';
        } catch (error) {
            console.error('Failed to load leads:', error);
            statusBanner.textContent = error.message || 'Unable to load upgrade requests.';
            statusBanner.className = 'upgrade-status-banner error';
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-row">Failed to load leads.</td>
                </tr>
            `;
        }
    }

    if (loadButton) {
        loadButton.addEventListener('click', loadLeads);
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', loadLeads);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                loadLeads();
            }
        });
    }

    if (persistedToken) {
        loadLeads();
    }
});

