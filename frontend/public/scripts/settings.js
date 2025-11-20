/**
 * IPMAS - Settings & User Management JavaScript
 * Handles user settings, account management, and preferences
 */

class SettingsManager {
    constructor() {
        this.userData = {
            profile: {
                fullName: 'John Doe',
                email: 'john.doe@example.com',
                organization: 'Government of Kenya',
                role: 'Data Analyst',
                defaultLocation: 'nairobi'
            },
            preferences: {
                language: 'en',
                timezone: 'Africa/Nairobi',
                dateFormat: 'DD/MM/YYYY',
                mapStyle: 'default',
                autoRefresh: 0,
                theme: 'default'
            },
            notifications: {
                email: true,
                sms: false,
                projects: true,
                insights: false
            },
            account: {
                isPremium: false,
                trialCount: 3,
                usage: {
                    searches: 3,
                    downloads: 0,
                    reports: 0,
                    dataExports: 0
                }
            }
        };
        
        this.init();
    }

    init() {
        console.log('⚙️ Settings Manager Initializing...');
        this.loadUserData();
        this.setupEventListeners();
        this.setupRouting();
        
        // Listen for usage updates
        document.addEventListener('usageUpdated', () => {
            this.updateUsageStats();
        });
        
        // Wait a bit for subscription manager and usage tracker to initialize
        setTimeout(() => {
            this.updateUI();
            this.updateGlobalProfileDisplay();
            this.dispatchProfileUpdated();
            // Update usage stats on page load
            this.updateUsageStats();
            
            // Listen for subscription status changes
            if (window.subscriptionManager) {
                // Check subscription status periodically
                setInterval(() => {
                    this.updateAccountStatus();
                }, 5000);
            }
        }, 500);

        // Listen for connection status changes (from main app)
        document.addEventListener('connectionStatusChanged', (e) => {
            this.updateConnectionDetail(e.detail);
        });

        // Initialize connection detail with current status if available
        if (window.connectionStatus) {
            this.updateConnectionDetail(window.connectionStatus);
        }
        
        console.log('✅ Settings Manager initialized successfully');
    }

    setupRouting() {
        // Handle initial route after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.handleRoute();
        }, 100);
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
    }

    handleRoute() {
        const hash = window.location.hash.substring(1); // Remove the #
        
        console.log('🔍 Handling route, hash:', hash);
        
        if (hash) {
            this.showDetailView(hash);
        } else {
            this.showListView();
        }
    }

    showListView() {
        const listView = document.getElementById('settingsListView');
        const detailView = document.getElementById('settingsDetailView');
        
        if (listView && detailView) {
            listView.style.display = 'block';
            detailView.style.display = 'none';
        }
        
        // Update usage stats when showing list view
        this.updateUsageStats();
        
        // Update URL without hash
        if (window.location.hash) {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }

    showDetailView(settingId) {
        const listView = document.getElementById('settingsListView');
        const detailView = document.getElementById('settingsDetailView');
        
        if (!listView || !detailView) {
            console.warn('⚠️ Settings views not found, retrying...');
            setTimeout(() => this.showDetailView(settingId), 100);
            return;
        }
        
        console.log('📄 Showing detail view for:', settingId);
        
        // Hide list view and show detail view
        listView.style.display = 'none';
        detailView.style.display = 'block';
        
        // Hide all detail content
        const allDetails = detailView.querySelectorAll('.settings-detail-content');
        allDetails.forEach(detail => {
            detail.style.display = 'none';
        });
        
        // Show the selected detail view
        const targetDetail = document.getElementById(`detail-${settingId}`);
        if (targetDetail) {
            targetDetail.style.display = 'block';
            console.log('✅ Detail view shown:', settingId);
        } else {
            console.warn('⚠️ Detail view not found:', `detail-${settingId}`);
            // If setting not found, go back to list
            this.showListView();
        }
    }

    loadUserData() {
        // Load saved user data from localStorage
        const savedData = localStorage.getItem('ipmas_user_data');
        if (savedData) {
            this.userData = { ...this.userData, ...JSON.parse(savedData) };
        }

        // Ensure theme preference exists
        const currentTheme = window.themeManager?.getCurrentTheme() || this.userData.preferences.theme || 'default';
        this.userData.preferences.theme = currentTheme;
    }

    saveUserData() {
        localStorage.setItem('ipmas_user_data', JSON.stringify(this.userData));
    }

    setupEventListeners() {
        // Profile form
        document.getElementById('profileForm')?.addEventListener('submit', (e) => {
            this.updateProfile(e);
        });

        // Security form
        document.getElementById('securityForm')?.addEventListener('submit', (e) => {
            this.updatePassword(e);
        });

        // Preferences form
        document.getElementById('preferencesForm')?.addEventListener('submit', (e) => {
            this.updatePreferences(e);
        });

        ['language', 'timezone', 'dateFormat', 'mapStyle', 'autoRefresh', 'theme'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (event) => {
                this.handlePreferenceChange(event);
            });
        });

        // Feedback form
        document.getElementById('feedbackForm')?.addEventListener('submit', (e) => {
            this.submitFeedback(e);
        });
    }

    updateUI() {
        // Update account status
        this.updateAccountStatus();
        
        // Update usage stats
        this.updateUsageStats();
        
        // Update form values
        this.updateFormValues();
        
        // Update notification toggles
        this.updateNotificationToggles();
        this.updateGlobalProfileDisplay();
        this.updatePreferencePreview();
    }

    updateAccountStatus() {
        const accountStatus = document.getElementById('accountStatus');
        const trialCounter = document.getElementById('trialCounter');
        
        // Get real account status from subscription manager
        const subscriptionManager = window.subscriptionManager;
        const isPremium = subscriptionManager && 
                         subscriptionManager.subscriptionStatus && 
                         subscriptionManager.subscriptionStatus.hasActiveSubscription;
        
        if (isPremium) {
            accountStatus.textContent = 'Premium Account';
            accountStatus.className = 'status-indicator status-premium';
            trialCounter.style.display = 'none';
            
            // Update userData for consistency
            this.userData.account.isPremium = true;
        } else {
            accountStatus.textContent = 'Trial Account';
            accountStatus.className = 'status-indicator status-trial';
            trialCounter.style.display = 'block';
            
            // Update userData for consistency
            this.userData.account.isPremium = false;
        }
        
        this.saveUserData();
    }

    updateUsageStats() {
        // Only update if we're on the settings page and elements exist
        const trialCountEl = document.getElementById('trialCount');
        if (!trialCountEl && !document.getElementById('settingsListView')) {
            // Not on settings page, skip update
            return;
        }
        
        // Get real usage data from usage tracker
        const usageTracker = window.usageTracker;
        let usage = {
            searches: 0,
            downloads: 0,
            reports: 0,
            dataExports: 0
        };
        
        if (usageTracker) {
            usage = usageTracker.getUsage();
            console.log('📊 Usage stats updated:', usage);
        } else {
            // Fallback to stored data
            usage = this.userData.account.usage || usage;
            console.warn('⚠️ Usage tracker not available, using stored data');
        }
        
        // Calculate trial count - use the maximum of searches, downloads, and insights (reports)
        // Each metric has its own limit of 3, so we show the highest one
        const TRIAL_LIMIT = 3;
        const maxUsage = Math.max(usage.searches || 0, usage.downloads || 0, usage.reports || 0);
        // Cap at the limit to prevent showing "6 of 3" or similar
        const trialCount = Math.min(maxUsage, TRIAL_LIMIT);
        
        // Update UI (trialCountEl already defined above)
        const searchesUsedEl = document.getElementById('searchesUsed');
        const downloadsUsedEl = document.getElementById('downloadsUsed');
        const reportsGeneratedEl = document.getElementById('reportsGenerated');
        
        if (trialCountEl) {
            trialCountEl.textContent = trialCount;
            console.log('✅ Updated trialCount:', trialCount, '(max of searches, downloads, insights)');
        }
        if (searchesUsedEl) {
            // Cap at limit for display
            const searchesValue = Math.min(usage.searches || 0, TRIAL_LIMIT);
            searchesUsedEl.textContent = searchesValue;
            console.log('✅ Updated searchesUsed:', searchesValue);
        }
        if (downloadsUsedEl) {
            // Cap at limit for display
            const downloadsValue = Math.min(usage.downloads || 0, TRIAL_LIMIT);
            downloadsUsedEl.textContent = downloadsValue;
            console.log('✅ Updated downloadsUsed:', downloadsValue);
        }
        if (reportsGeneratedEl) {
            // Cap at limit for display
            const reportsValue = Math.min(usage.reports || 0, TRIAL_LIMIT);
            reportsGeneratedEl.textContent = reportsValue;
            console.log('✅ Updated reportsGenerated (Generating Insights):', reportsValue);
        }
        
        // Update stored data for consistency
        this.userData.account.trialCount = trialCount;
        this.userData.account.usage = usage;
        this.saveUserData();
    }

    updateConnectionDetail(status) {
        const detail = status || window.connectionStatus;
        if (!detail) return;

        const statusDot = document.getElementById('connectionStatusDot');
        const statusText = document.getElementById('connectionStatusText');
        const statusReason = document.getElementById('connectionStatusReason');

        if (statusDot) {
            statusDot.className = `status-dot ${detail.mode === 'online' ? 'online' : 'offline'}`;
        }
        if (statusText) {
            statusText.textContent = detail.label || (detail.mode === 'online' ? 'Online' : 'Offline');
        }
        if (statusReason) {
            statusReason.textContent = detail.reasonMessage || '';
        }
    }

    updateFormValues() {
        // Profile form
        document.getElementById('fullName').value = this.userData.profile.fullName;
        document.getElementById('email').value = this.userData.profile.email;
        document.getElementById('organization').value = this.userData.profile.organization;
        document.getElementById('role').value = this.userData.profile.role;
        document.getElementById('defaultLocation').value = this.userData.profile.defaultLocation;

        // Preferences form
        const languageElement = document.getElementById('language');
        if (languageElement) {
            const allowedLanguages = Array.from(languageElement.options).map(opt => opt.value);
            if (!allowedLanguages.includes(this.userData.preferences.language)) {
                this.userData.preferences.language = 'en';
            }
            languageElement.value = this.userData.preferences.language;
        }
        document.getElementById('timezone').value = this.userData.preferences.timezone;
        document.getElementById('dateFormat').value = this.userData.preferences.dateFormat;
        document.getElementById('mapStyle').value = this.userData.preferences.mapStyle;
        document.getElementById('autoRefresh').value = this.userData.preferences.autoRefresh;
        const themeElement = document.getElementById('theme');
        if (themeElement) {
            const currentTheme = window.themeManager?.getCurrentTheme() || this.userData.preferences.theme;
            themeElement.value = currentTheme;
            this.userData.preferences.theme = currentTheme;
        }
    }

    updateNotificationToggles() {
        Object.keys(this.userData.notifications).forEach(key => {
            const toggle = document.querySelector(`[onclick*="${key}"]`);
            if (toggle) {
                toggle.classList.toggle('active', this.userData.notifications[key]);
            }
        });
    }

    updateProfile(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        this.userData.profile = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            organization: document.getElementById('organization').value,
            role: document.getElementById('role').value,
            defaultLocation: document.getElementById('defaultLocation').value
        };
        
        this.saveUserData();
        this.updateFormValues();
        this.updateGlobalProfileDisplay();
        this.dispatchProfileUpdated();
        this.showSuccess('Profile updated successfully!');
    }

    updatePassword(event) {
        event.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            this.showError('New passwords do not match!');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showError('Password must be at least 8 characters long!');
            return;
        }
        
        // Simulate password update
        this.showSuccess('Password updated successfully!');
        event.target.reset();
    }

    updatePreferences(event) {
        event.preventDefault();
        this.updatePreferencesFromInputs(true);
    }

    submitFeedback(event) {
        event.preventDefault();
        
        const feedbackType = document.getElementById('feedbackType').value;
        const feedbackMessage = document.getElementById('feedbackMessage').value;
        const priority = document.getElementById('priority').value;
        
        if (!feedbackType || !feedbackMessage.trim()) {
            this.showError('Please fill in all required fields!');
            return;
        }
        
        const feedback = {
            type: feedbackType,
            message: feedbackMessage.trim(),
            priority: priority,
            timestamp: new Date().toISOString(),
            user: this.userData.profile.email,
            id: Date.now()
        };
        
        // Save feedback to localStorage
        const savedFeedback = JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
        savedFeedback.push(feedback);
        localStorage.setItem('ipmas_feedback', JSON.stringify(savedFeedback));
        
        this.showSuccess('Feedback submitted successfully! We will review it and get back to you.');
        event.target.reset();
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        const existing = document.querySelector('.settings-toast');
        if (existing) existing.remove();
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        notification.className = 'settings-toast';
        notification.innerHTML = `
            <strong>${type === 'success' ? '✅ Success:' : '❌ Error:'}</strong> ${message}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">×</button>
        `;
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    updateGlobalProfileDisplay() {
        const profile = this.userData?.profile;
        if (!profile) return;

        // Don't update avatar - let subscription manager handle it completely
        // The subscription manager will show "Sign up" if not logged in, or user initials if logged in
        // We should never override the avatar here to avoid showing "JD" from hardcoded data

        // Only update other profile displays (name, email, etc.)
        document.querySelectorAll('[data-user-name]').forEach(el => {
            el.textContent = profile.fullName || '';
        });

        document.querySelectorAll('[data-user-email]').forEach(el => {
            el.textContent = profile.email || '';
        });
    }

    dispatchProfileUpdated() {
        const profile = this.userData?.profile;
        if (!profile) return;

        const event = new CustomEvent('profileUpdated', {
            detail: { profile }
        });
        document.dispatchEvent(event);
    }

    dispatchNotificationsUpdated() {
        const notifications = this.userData?.notifications;
        const event = new CustomEvent('notificationsUpdated', {
            detail: { notifications }
        });
        document.dispatchEvent(event);
    }

    generateInitials(name) {
        if (!name) return 'Sign in';
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'Sign in';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    updatePreferencesFromInputs(showFeedback = false) {
        const autoRefreshValue = parseInt(document.getElementById('autoRefresh').value, 10);
        const themeElement = document.getElementById('theme');
        const themeValue = themeElement ? themeElement.value : this.userData.preferences.theme;

        this.userData.preferences = {
            ...this.userData.preferences,
            language: document.getElementById('language').value,
            timezone: document.getElementById('timezone').value,
            dateFormat: document.getElementById('dateFormat').value,
            mapStyle: document.getElementById('mapStyle').value,
            autoRefresh: Number.isFinite(autoRefreshValue) ? autoRefreshValue : 0,
            theme: themeValue
        };

        if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
            window.themeManager.setTheme(themeValue);
        }

        this.saveUserData();
        this.updatePreferencePreview();
        this.dispatchPreferencesUpdated();

        if (showFeedback) {
            this.showSuccess('Preferences updated successfully!');
        }
    }

    handlePreferenceChange(event) {
        const target = event?.target;
        this.updatePreferencesFromInputs(false);

        if (target) {
            const value = target.options ? target.options[target.selectedIndex].text : target.value;
            const label = this.getPreferenceLabel(target.id);
            if (label) {
                this.showNotification(`${label} set to ${value}`, 'success');
            }

            if (target.id === 'theme' && window.themeManager && typeof window.themeManager.setTheme === 'function') {
                window.themeManager.setTheme(target.value);
            }
        }
    }

    getPreferenceLabel(id) {
        const labels = {
            language: 'Language',
            timezone: 'Time Zone',
            dateFormat: 'Date Format',
            mapStyle: 'Map Style',
            autoRefresh: 'Auto-refresh interval',
            theme: 'Theme'
        };
        return labels[id] || '';
    }

    updatePreferencePreview() {
        const { language, timezone, dateFormat, mapStyle } = this.userData.preferences;
        const sampleDate = new Date();

        const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
        const tzPreviewEl = document.getElementById('timezonePreview');
        if (tzPreviewEl) {
            try {
                const timeFormatter = new Intl.DateTimeFormat(locale, {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                tzPreviewEl.textContent = `Current local time: ${timeFormatter.format(sampleDate)} (${timezone})`;
            } catch (error) {
                tzPreviewEl.textContent = `Current time unavailable for ${timezone}`;
            }
        }

        const dfPreviewEl = document.getElementById('dateFormatPreview');
        if (dfPreviewEl) {
            dfPreviewEl.textContent = `Example: ${this.formatDate(sampleDate, dateFormat, locale)}`;
        }

        const mapPreviewEl = document.getElementById('mapStylePreview');
        if (mapPreviewEl) {
            const names = {
                default: 'Default (Light)',
                satellite: 'Satellite Imagery',
                terrain: 'Terrain'
            };
            mapPreviewEl.textContent = `Map style preview: ${names[mapStyle] || mapStyle}`;
        }
    }

    formatDate(date, format, locale) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        switch (format) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'DD/MM/YYYY':
            default:
                return `${day}/${month}/${year}`;
        }
    }

    dispatchPreferencesUpdated() {
        const preferences = this.userData?.preferences;
        const event = new CustomEvent('preferencesUpdated', {
            detail: { preferences }
        });
        document.dispatchEvent(event);
    }
}

// Global functions for HTML onclick handlers
function toggleNotification(element, type) {
    element.classList.toggle('active');
    
    if (window.settingsManager) {
        element.classList.add('pending');
        window.settingsManager.userData.notifications[type] = element.classList.contains('active');
        window.settingsManager.saveUserData();
        window.settingsManager.dispatchNotificationsUpdated();
        window.settingsManager.dispatchProfileUpdated();
        setTimeout(() => element.classList.remove('pending'), 150);
    }
}

function regenerateApiKey() {
    const regenerate = confirm('Are you sure you want to regenerate your API key? This will invalidate the current key.');
    
    if (regenerate) {
        const newApiKey = 'ipmas_sk_' + Math.random().toString(36).substr(2, 32);
        document.getElementById('apiKey').value = newApiKey;
        
        alert('✅ New API key generated successfully!\n\nPlease save this key securely. It will not be shown again.');
    }
}

function viewApiDocumentation() {
    window.open('https://docs.ipmas.go.ke/api', '_blank');
}

function downloadPersonalData() {
    const download = confirm(`
📥 Download Personal Data

This will download all your personal data including:
• Profile information
• Usage statistics
• Search history
• Feedback submissions

Do you want to proceed?
    `);
    
    if (download) {
        const userData = window.settingsManager?.userData || {};
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ipmas_personal_data_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        alert('✅ Personal data download initiated!');
    }
}

function deleteAccount() {
    const deleteConfirm = confirm(`
⚠️ DELETE ACCOUNT

This action cannot be undone!

This will permanently delete:
• Your account and profile
• All your data and preferences
• Search history and feedback
• API access and keys

Are you absolutely sure you want to delete your account?
    `);
    
    if (deleteConfirm) {
        const finalConfirm = confirm('This is your final warning. Type "DELETE" to confirm account deletion.');
        
        if (finalConfirm) {
            // Clear all user data
            localStorage.removeItem('ipmas_user_data');
            localStorage.removeItem('ipmas_feedback');
            
            alert('✅ Account deleted successfully.\n\nYou will be redirected to the home page.');
            window.location.href = '/';
        }
    }
}

function goToDashboard() {
    window.location.href = '/';
}

// Navigation functions for settings
function navigateToSetting(settingId) {
    window.location.hash = settingId;
}

function navigateBackToList() {
    // Clear hash and show list view
    window.location.hash = '';
    // The hashchange event will trigger showListView via handleRoute
    // But call it directly to ensure immediate update
    if (window.settingsManager) {
        window.settingsManager.showListView();
    }
}

// Initialize the settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});