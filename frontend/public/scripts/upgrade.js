document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upgradeRequestForm');
    const submitButton = form?.querySelector('button[type="submit"]');
    const statusBanner = document.createElement('div');
    const paymentMethodInputs = form?.querySelectorAll('input[name="paymentMethod"]');

    // Create payment-specific input containers
    const paymentInputsContainer = document.createElement('div');
    paymentInputsContainer.id = 'paymentInputsContainer';
    paymentInputsContainer.className = 'payment-inputs-container';
    
    if (form) {
        statusBanner.className = 'upgrade-status-banner';
        form.parentElement.insertBefore(statusBanner, form);
        
        // Insert payment inputs container after payment method selection
        const paymentMethodGroup = form.querySelector('.payment-options')?.parentElement;
        if (paymentMethodGroup) {
            paymentMethodGroup.insertAdjacentElement('afterend', paymentInputsContainer);
        }

        // Handle payment method selection changes
        paymentMethodInputs?.forEach(input => {
            input.addEventListener('change', () => {
                updatePaymentInputs(input.value);
            });
        });

        // Function to show/hide payment-specific inputs
        function updatePaymentInputs(method) {
            paymentInputsContainer.innerHTML = '';
            
            if (method === 'M-Pesa') {
                paymentInputsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="mpesaTransactionCode">M-Pesa Transaction Code *</label>
                        <input id="mpesaTransactionCode" type="text" placeholder="Enter M-Pesa transaction code (e.g., QL8X9K2M1N)" required>
                        <small class="form-hint">Enter the transaction code you received via SMS from M-Pesa</small>
                    </div>
                `;
            } else if (method === 'PayPal') {
                paymentInputsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="paypalEmail">PayPal Email Address *</label>
                        <input id="paypalEmail" type="email" placeholder="Enter your PayPal email address" required>
                        <small class="form-hint">Enter the email address associated with your PayPal account</small>
                    </div>
                `;
            } else if (method === 'Card') {
                paymentInputsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="cardNumber">Card Number *</label>
                        <input id="cardNumber" type="text" placeholder="1234 5678 9012 3456" maxlength="19" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="cardExpiry">Expiry Date *</label>
                            <input id="cardExpiry" type="text" placeholder="MM/YY" maxlength="5" required>
                        </div>
                        <div class="form-group">
                            <label for="cardCVC">CVC *</label>
                            <input id="cardCVC" type="text" placeholder="123" maxlength="4" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="cardName">Cardholder Name *</label>
                        <input id="cardName" type="text" placeholder="Name on card" required>
                    </div>
                `;
            }
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!submitButton) return;

            const selectedPaymentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || '';
            
            const subscriptionAmount = parseFloat(document.getElementById('subscriptionAmount').value) || 5000;
            
            if (subscriptionAmount < 5000) {
                statusBanner.textContent = '⚠️ Minimum subscription amount is 5,000 KES.';
                statusBanner.classList.add('error');
                return;
            }

            const payload = {
                organizationName: document.getElementById('organizationName').value.trim(),
                contactPerson: document.getElementById('contactPerson').value.trim(),
                contactEmail: document.getElementById('contactEmail').value.trim(),
                contactPhone: document.getElementById('contactPhone').value.trim(),
                paymentMethod: selectedPaymentMethod,
                subscriptionAmount: subscriptionAmount,
                notes: document.getElementById('upgradeNotes').value.trim(),
                planTier: 'premium'
            };

            // Add payment-specific data
            if (selectedPaymentMethod === 'M-Pesa') {
                const mpesaCode = document.getElementById('mpesaTransactionCode')?.value.trim();
                if (!mpesaCode) {
                    statusBanner.textContent = '⚠️ Please enter your M-Pesa transaction code.';
                    statusBanner.classList.add('error');
                    return;
                }
                payload.paymentDetails = { transactionCode: mpesaCode };
            } else if (selectedPaymentMethod === 'PayPal') {
                const paypalEmail = document.getElementById('paypalEmail')?.value.trim();
                if (!paypalEmail) {
                    statusBanner.textContent = '⚠️ Please enter your PayPal email address.';
                    statusBanner.classList.add('error');
                    return;
                }
                payload.paymentDetails = { paypalEmail: paypalEmail };
            } else if (selectedPaymentMethod === 'Card') {
                const cardNumber = document.getElementById('cardNumber')?.value.trim();
                const cardExpiry = document.getElementById('cardExpiry')?.value.trim();
                const cardCVC = document.getElementById('cardCVC')?.value.trim();
                const cardName = document.getElementById('cardName')?.value.trim();
                
                if (!cardNumber || !cardExpiry || !cardCVC || !cardName) {
                    statusBanner.textContent = '⚠️ Please complete all card details.';
                    statusBanner.classList.add('error');
                    return;
                }
                payload.paymentDetails = {
                    cardNumber: cardNumber.replace(/\s/g, ''),
                    cardExpiry: cardExpiry,
                    cardCVC: cardCVC,
                    cardName: cardName
                };
            }

            if (!payload.organizationName || !payload.contactPerson || !payload.contactEmail || !payload.contactPhone || !payload.paymentMethod) {
                statusBanner.textContent = '⚠️ Please complete all required fields before submitting.';
                statusBanner.classList.add('error');
                return;
            }

            statusBanner.textContent = 'Submitting your request…';
            statusBanner.className = 'upgrade-status-banner info';
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting…';

            try {
                const apiUrl = window.API_CONFIG 
                    ? window.API_CONFIG.getApiUrl('/api/v1/upgrade')
                    : '/api/v1/upgrade';
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        errorData = { error: `Server error: ${response.status} ${response.statusText}` };
                    }
                    throw new Error(errorData.error || `Request failed with status ${response.status}`);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Unable to submit upgrade request');
                }

                sessionStorage.setItem('premiumUpgradeReceipt', JSON.stringify({
                    ...result.data,
                    message: result.message,
                    subscription: result.subscription,
                    daraja: result.daraja
                }));

                if (result.premiumActivated && result.subscription) {
                    const expiryDate = new Date(result.subscription.dateTo).toLocaleDateString();
                    const days = result.subscription.days;
                    statusBanner.textContent = `✅ ${result.message} Subscription expires on ${expiryDate} (${days} days).`;
                } else {
                    statusBanner.textContent = '✅ Request received! Redirecting to next steps…';
                }
                statusBanner.className = 'upgrade-status-banner success';

                setTimeout(() => {
                    window.location.href = '/premium-thank-you.html';
                }, 800);
            } catch (error) {
                console.error('Upgrade request failed:', error);
                statusBanner.textContent = error.message || 'An unexpected error occurred. Please try again.';
                statusBanner.className = 'upgrade-status-banner error';
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Upgrade Request';
            }
        });
    }
});
