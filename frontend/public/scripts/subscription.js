/**
 * Subscription Management System
 * Handles user authentication, subscription status, and countdown display
 */

class SubscriptionManager {
    constructor() {
        this.currentUser = null;
        this.subscriptionStatus = null;
        this.countdownInterval = null;
        this.init();
    }

    async init() {
        // Update user avatar immediately to show "Sign up" if not logged in
        this.updateUserAvatar();
        
        // Create subscription UI elements
        this.createSubscriptionUI();
        
        // Update trial banner
        this.updateTrialBanner();
        
        // Check for existing session on page load (this will update avatar again if logged in)
        await this.checkSession();
    }

    async checkSession() {
        try {
            const sessionToken = this.getSessionToken();
            if (!sessionToken) {
                // No token, ensure avatar shows "Sign up"
                this.updateUserAvatar();
                return false;
            }

            const response = await fetch(
                window.API_CONFIG.getApiUrl('/api/v1/auth/session'),
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${sessionToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentUser = data.user;
                    this.subscriptionStatus = data.subscription;
                    
                    // Update localStorage with actual user data to prevent showing hardcoded "JD"
                    if (data.user) {
                        const userData = JSON.parse(localStorage.getItem('ipmas_user_data') || '{}');
                        userData.profile = {
                            fullName: data.user.username || data.user.email?.split('@')[0] || '',
                            email: data.user.email || '',
                            organization: data.user.organizationName || '',
                            role: data.user.role || '',
                            defaultLocation: userData.profile?.defaultLocation || 'nairobi'
                        };
                        localStorage.setItem('ipmas_user_data', JSON.stringify(userData));
                    }
                    
                    this.updateSubscriptionDisplay();
                    this.updateTrialBanner();
                    this.updateUserAvatar();
                    return true;
                }
            }

            // Invalid session, clear it
            this.clearSession();
            this.updateTrialBanner();
            this.updateUserAvatar();
            return false;
        } catch (error) {
            console.error('Session check error:', error);
            return false;
        }
    }

    createSubscriptionUI() {
        // Create subscription login modal
        const modal = document.createElement('div');
        modal.id = 'subscriptionModal';
        modal.className = 'subscription-modal';
        modal.innerHTML = `
            <div class="subscription-modal-content">
                <div class="subscription-modal-header">
                    <h2>🔒 Check Subscription Status</h2>
                    <button class="subscription-modal-close" onclick="subscriptionManager.closeModal()">&times;</button>
                </div>
                <div class="subscription-modal-body">
                    <form id="subscriptionLoginForm" onsubmit="subscriptionManager.handleLogin(event)">
                        <div class="form-group">
                            <label for="subscriptionEmail">Email Address</label>
                            <input 
                                type="email" 
                                id="subscriptionEmail" 
                                name="email" 
                                required 
                                placeholder="Enter your email"
                                autocomplete="email"
                            />
                        </div>
                        <div class="form-group">
                            <label for="subscriptionPassword">Password</label>
                            <input 
                                type="password" 
                                id="subscriptionPassword" 
                                name="password" 
                                required 
                                placeholder="Enter your password"
                                autocomplete="current-password"
                            />
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary" id="subscriptionLoginBtn">
                                Check Subscription
                            </button>
                        </div>
                        <div class="form-group">
                            <p class="form-help">
                                Don't have an account? Your account is created automatically when you make a payment.
                                <a href="#" onclick="subscriptionManager.showRegisterForm(event)">Register here</a>
                            </p>
                        </div>
                    </form>

                    <!-- Register Form (hidden by default) -->
                    <form id="subscriptionRegisterForm" onsubmit="subscriptionManager.handleRegister(event)" style="display: none;">
                        <div class="form-group">
                            <label for="registerEmail">Email Address</label>
                            <input 
                                type="email" 
                                id="registerEmail" 
                                name="email" 
                                required 
                                placeholder="Enter your email"
                                autocomplete="email"
                            />
                        </div>
                        <div class="form-group">
                            <label for="registerPassword">Password</label>
                            <input 
                                type="password" 
                                id="registerPassword" 
                                name="password" 
                                required 
                                placeholder="Create a password (min 6 characters)"
                                autocomplete="new-password"
                            />
                        </div>
                        <div class="form-group">
                            <label for="registerUsername">Username (Optional)</label>
                            <input 
                                type="text" 
                                id="registerUsername" 
                                name="username" 
                                placeholder="Enter your username"
                            />
                        </div>
                        <div class="form-group">
                            <label for="registerOrganization">Organization (Optional)</label>
                            <input 
                                type="text" 
                                id="registerOrganization" 
                                name="organizationName" 
                                placeholder="Enter organization name"
                            />
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary" id="subscriptionRegisterBtn">
                                Register
                            </button>
                        </div>
                        <div class="form-group">
                            <p class="form-help">
                                Already have an account? 
                                <a href="#" onclick="subscriptionManager.showLoginForm(event)">Login here</a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Create subscription status display
        const statusDisplay = document.createElement('div');
        statusDisplay.id = 'subscriptionStatusDisplay';
        statusDisplay.className = 'subscription-status-display';
        statusDisplay.style.display = 'none';
        
        // Insert after header
        const header = document.querySelector('.header');
        if (header) {
            header.insertAdjacentElement('afterend', statusDisplay);
        }
    }

    updateTrialBanner() {
        const banner = document.getElementById('trialBanner');
        if (!banner) return;

        const link = banner.querySelector('a');
        if (!link) return;

        // Check if user is logged in
        if (this.currentUser) {
            // Check if user has active premium subscription
            if (this.subscriptionStatus && this.subscriptionStatus.hasActiveSubscription) {
                // User has already upgraded - show "Check Subscription" only
                link.textContent = 'Check Subscription';
                link.href = '#';
                link.onclick = (e) => {
                    e.preventDefault();
                    this.showModal();
                };
            } else {
                // User is logged in but hasn't upgraded - show "Upgrade to Premium" only
                link.textContent = 'Upgrade to Premium';
                link.href = '/upgrade.html';
                link.onclick = (e) => {
                    // Allow default navigation to upgrade.html
                    // No need to prevent default
                };
            }
            banner.style.display = 'block';
        } else {
            // User not logged in - show "Upgrade to Premium" and navigate to upgrade page
            link.textContent = 'Upgrade to Premium';
            link.href = '/upgrade.html';
            link.onclick = (e) => {
                // Allow default navigation to upgrade.html
                // No need to prevent default - let them see premium details first
            };
            banner.style.display = 'block';
        }
    }

    showModal() {
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            modal.style.display = 'flex';
            // Show register form by default for new users
            this.showRegisterForm();
            
            // Close on outside click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            };
        }
    }

    closeModal() {
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            modal.style.display = 'none';
            // Clear form
            const loginForm = document.getElementById('subscriptionLoginForm');
            const registerForm = document.getElementById('subscriptionRegisterForm');
            if (loginForm) loginForm.reset();
            if (registerForm) registerForm.reset();
        }
    }

    showLoginForm(event) {
        if (event) event.preventDefault();
        document.getElementById('subscriptionLoginForm').style.display = 'block';
        document.getElementById('subscriptionRegisterForm').style.display = 'none';
    }

    showRegisterForm(event) {
        if (event) event.preventDefault();
        document.getElementById('subscriptionLoginForm').style.display = 'none';
        document.getElementById('subscriptionRegisterForm').style.display = 'block';
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('subscriptionEmail').value;
        const password = document.getElementById('subscriptionPassword').value;
        const loginBtn = document.getElementById('subscriptionLoginBtn');
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Checking...';

        try {
            const response = await fetch(
                window.API_CONFIG.getApiUrl('/api/v1/auth/login'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                }
            );

            const data = await response.json();

            if (data.success) {
                // Store session token
                this.setSessionToken(data.session.token);
                this.currentUser = data.user;
                this.subscriptionStatus = data.subscription;
                
                // Update localStorage with actual user data to prevent showing hardcoded "JD"
                if (data.user) {
                    const userData = JSON.parse(localStorage.getItem('ipmas_user_data') || '{}');
                    userData.profile = {
                        fullName: data.user.username || data.user.email?.split('@')[0] || '',
                        email: data.user.email || '',
                        organization: data.user.organizationName || '',
                        role: data.user.role || '',
                        defaultLocation: userData.profile?.defaultLocation || 'nairobi'
                    };
                    localStorage.setItem('ipmas_user_data', JSON.stringify(userData));
                }
                
                // Close modal
                this.closeModal();
                
                // Update UI - update avatar first to show username immediately
                this.updateUserAvatar();
                this.updateSubscriptionDisplay();
                this.updateTrialBanner();
                
                // Dispatch login success event
                const loginEvent = new CustomEvent('loginSuccess', {
                    detail: { user: this.currentUser }
                });
                document.dispatchEvent(loginEvent);
                
                // Check if we're already on the upgrade page
                const isOnUpgradePage = window.location.pathname.includes('upgrade.html');
                
                if (isOnUpgradePage) {
                    // Already on upgrade page - just show success message
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification('Successfully logged in!', 'success');
                    }
                } else {
                    // Not on upgrade page - redirect to upgrade page
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification('Successfully logged in! Redirecting to payment page...', 'success');
                    }
                    setTimeout(() => {
                        window.location.href = '/upgrade.html';
                    }, 1000);
                }
            } else {
                alert(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Check Subscription';
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const username = document.getElementById('registerUsername').value;
        const organizationName = document.getElementById('registerOrganization').value;
        const registerBtn = document.getElementById('subscriptionRegisterBtn');
        
        registerBtn.disabled = true;
        registerBtn.textContent = 'Registering...';

        try {
            const response = await fetch(
                window.API_CONFIG.getApiUrl('/api/v1/auth/register'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        email, 
                        password, 
                        username: username || null,
                        organizationName: organizationName || null
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                alert('Registration successful! Please login with your credentials.');
                this.showLoginForm();
                document.getElementById('subscriptionEmail').value = email;
            } else {
                alert(data.error || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('An error occurred during registration. Please try again.');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register';
        }
    }

    updateSubscriptionDisplay() {
        const display = document.getElementById('subscriptionStatusDisplay');
        if (!display) return;

        if (!this.currentUser || !this.subscriptionStatus) {
            display.style.display = 'none';
            // Dispatch event for dashboard and settings to update
            document.dispatchEvent(new CustomEvent('subscriptionUpdated', {
                detail: { subscriptionStatus: null }
            }));
            return;
        }

        if (this.subscriptionStatus.hasActiveSubscription) {
            const subscription = this.subscriptionStatus.subscription;
            const expiryDate = new Date(subscription.dateTo);
            const daysRemaining = this.subscriptionStatus.daysRemaining;

            display.innerHTML = `
                <div class="subscription-status-content">
                    <div class="subscription-status-icon">✨</div>
                    <div class="subscription-status-info">
                        <div class="subscription-status-title">Premium Subscription Active</div>
                        <div class="subscription-status-details">
                            <span>Expires: ${expiryDate.toLocaleDateString()}</span>
                            <span class="subscription-countdown" id="subscriptionCountdown"></span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="subscriptionManager.logout()">Logout</button>
                </div>
            `;
            display.style.display = 'block';
            display.className = 'subscription-status-display active';

            // Start countdown
            this.startCountdown(expiryDate);
            
            // Dispatch subscription updated event
            document.dispatchEvent(new CustomEvent('subscriptionUpdated', {
                detail: { subscriptionStatus: this.subscriptionStatus }
            }));
        } else {
            display.innerHTML = `
                <div class="subscription-status-content">
                    <div class="subscription-status-icon">⚠️</div>
                    <div class="subscription-status-info">
                        <div class="subscription-status-title">No Active Subscription</div>
                        <div class="subscription-status-details">
                            <a href="/upgrade.html" class="subscription-upgrade-link">Upgrade to Premium</a>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="subscriptionManager.logout()">Logout</button>
                </div>
            `;
            display.style.display = 'block';
            display.className = 'subscription-status-display inactive';
            
            // Dispatch subscription updated event
            document.dispatchEvent(new CustomEvent('subscriptionUpdated', {
                detail: { subscriptionStatus: this.subscriptionStatus }
            }));
        }
    }

    startCountdown(expiryDate) {
        // Clear existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        const updateCountdown = () => {
            const now = new Date();
            const diff = expiryDate - now;

            if (diff <= 0) {
                // Subscription expired
                const countdownEl = document.getElementById('subscriptionCountdown');
                if (countdownEl) {
                    countdownEl.textContent = 'Expired';
                    countdownEl.className = 'subscription-countdown expired';
                }
                clearInterval(this.countdownInterval);
                // Refresh subscription status
                this.checkSession();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const countdownEl = document.getElementById('subscriptionCountdown');
            if (countdownEl) {
                countdownEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
                countdownEl.className = days <= 7 ? 'subscription-countdown warning' : 'subscription-countdown';
            }
        };

        // Update immediately
        updateCountdown();

        // Update every second
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }

    async logout() {
        try {
            const sessionToken = this.getSessionToken();
            if (sessionToken) {
                await fetch(
                    window.API_CONFIG.getApiUrl('/api/v1/auth/logout'),
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ token: sessionToken })
                    }
                );
            }
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Clear local session
        this.clearSession();
        this.currentUser = null;
        this.subscriptionStatus = null;

        // Update UI
        this.updateSubscriptionDisplay();
        this.updateTrialBanner();
        this.updateUserAvatar();

        if (window.app && window.app.showNotification) {
            window.app.showNotification('Logged out successfully', 'info');
        }
        
        // Reload page to ensure clean state
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    updateUserAvatar() {
        const avatar = document.getElementById('userAvatar');
        if (!avatar) return;

        // Update avatar immediately to show "Sign up" if not logged in
        if (!this.currentUser) {
            avatar.textContent = 'Sign up';
            avatar.title = 'Click to sign up or login';
            avatar.style.width = 'auto';
            avatar.style.borderRadius = '18px';
            avatar.style.padding = '0 12px';
            avatar.onclick = (e) => {
                e.stopPropagation();
                this.showModal();
            };
            avatar.style.cursor = 'pointer';
            
            // Hide dropdown when not logged in
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            return;
        }

        if (this.currentUser && (this.currentUser.username || this.currentUser.email)) {
            // Show full username when logged in
            let displayText = '';
            if (this.currentUser.username && this.currentUser.username.trim()) {
                displayText = this.currentUser.username.trim();
            } else if (this.currentUser.email) {
                // If no username, use email username part (before @)
                displayText = this.currentUser.email.split('@')[0];
            }
            
            // If still no text, show "Sign up"
            if (!displayText) {
                avatar.textContent = 'Sign up';
                avatar.title = 'Click to sign up or login';
                avatar.style.width = 'auto';
                avatar.style.borderRadius = '18px';
                avatar.style.padding = '0 12px';
                avatar.onclick = (e) => {
                    e.stopPropagation();
                    this.showModal();
                };
                avatar.style.cursor = 'pointer';
                return;
            }
            
            avatar.textContent = displayText;
            avatar.title = this.currentUser.username || this.currentUser.email || 'User';
            
            // Make it pill-shaped for full username
            avatar.style.width = 'auto';
            avatar.style.borderRadius = '18px';
            avatar.style.padding = '0 12px';
            
            // When logged in, clicking avatar should toggle dropdown
            avatar.onclick = () => {
                if (typeof toggleUserDropdown === 'function') {
                    toggleUserDropdown();
                }
            };
            avatar.style.cursor = 'pointer';
        } else {
            // When not logged in, show "Sign up" text for new users
            avatar.textContent = 'Sign up';
            avatar.title = 'Click to sign up or login';
            
            // Make it pill-shaped for "Sign up" text
            avatar.style.width = 'auto';
            avatar.style.borderRadius = '18px';
            avatar.style.padding = '0 12px';
            
            // When not logged in, clicking avatar should open modal (shows sign up form by default)
            avatar.onclick = (e) => {
                e.stopPropagation();
                this.showModal();
            };
            avatar.style.cursor = 'pointer';
            
            // Hide dropdown when not logged in
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        }
    }

    // Session management
    setSessionToken(token) {
        // Store in localStorage
        localStorage.setItem('ipmas_session_token', token);
        
        // Also set as cookie (for server-side access if needed)
        document.cookie = `session_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }

    getSessionToken() {
        // Try localStorage first
        let token = localStorage.getItem('ipmas_session_token');
        if (token) return token;

        // Fallback to cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'session_token') {
                return value;
            }
        }

        return null;
    }

    clearSession() {
        localStorage.removeItem('ipmas_session_token');
        document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    // Public method to check if user has premium access
    hasPremiumAccess() {
        return this.subscriptionStatus?.hasActiveSubscription === true;
    }
}

// Initialize subscription manager
const subscriptionManager = new SubscriptionManager();
window.subscriptionManager = subscriptionManager;

