/**
 * Usage Tracker - Tracks user actions (searches, downloads, reports, exports)
 * Stores usage data per user and syncs with subscription system
 */

class UsageTracker {
    constructor() {
        this.storageKey = 'ipmas_usage_tracking';
        this.init();
    }

    init() {
        // Ensure usage data structure exists
        this.ensureUsageData();
        console.log('✅ Usage Tracker initialized. Current usage:', this.getUsage());
    }

    ensureUsageData() {
        const userId = this.getUserId();
        // Always ensure usage data exists, even for anonymous users

        let allUsage = this.getAllUsage();
        if (!allUsage[userId]) {
            allUsage[userId] = {
                searches: 0,
                downloads: 0,
                reports: 0,
                dataExports: 0,
                lastUpdated: new Date().toISOString()
            };
            this.saveAllUsage(allUsage);
        }
    }

    getUserId() {
        // Get user ID from subscription manager or generate one
        if (window.subscriptionManager && window.subscriptionManager.currentUser) {
            return window.subscriptionManager.currentUser.email || 
                   window.subscriptionManager.currentUser.id || 
                   'anonymous';
        }
        // For anonymous users, use a consistent ID stored in localStorage
        let anonymousId = localStorage.getItem('ipmas_anonymous_id');
        if (!anonymousId) {
            anonymousId = 'anonymous_' + Date.now();
            localStorage.setItem('ipmas_anonymous_id', anonymousId);
        }
        return anonymousId;
    }

    getAllUsage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading usage data:', error);
            return {};
        }
    }

    saveAllUsage(usageData) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(usageData));
        } catch (error) {
            console.error('Error saving usage data:', error);
        }
    }

    getUsage() {
        const userId = this.getUserId();
        const allUsage = this.getAllUsage();
        return allUsage[userId] || {
            searches: 0,
            downloads: 0,
            reports: 0,
            dataExports: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    incrementUsage(type) {
        try {
            const userId = this.getUserId();
            console.log(`📊 incrementUsage called: type=${type}, userId=${userId}`);
            
            // Always allow tracking, even for anonymous users
            const allUsage = this.getAllUsage();
            console.log('📊 All usage data loaded:', allUsage);
            
            if (!allUsage[userId]) {
                console.log(`📊 Creating new usage entry for userId: ${userId}`);
                allUsage[userId] = {
                    searches: 0,
                    downloads: 0,
                    reports: 0,
                    dataExports: 0,
                    lastUpdated: new Date().toISOString()
                };
            }

            const validTypes = ['searches', 'downloads', 'reports', 'dataExports'];
            if (validTypes.includes(type)) {
                const oldValue = allUsage[userId][type] || 0;
                allUsage[userId][type] = oldValue + 1;
                allUsage[userId].lastUpdated = new Date().toISOString();
                
                console.log(`📊 Updating ${type}: ${oldValue} -> ${allUsage[userId][type]}`);
                
                this.saveAllUsage(allUsage);
                
                const total = allUsage[userId].searches + allUsage[userId].downloads + allUsage[userId].reports + allUsage[userId].dataExports;
                console.log(`📊 Usage tracked: ${type} = ${allUsage[userId][type]}, Total: ${total}`);

                // Dispatch event for other components to listen
                const event = new CustomEvent('usageUpdated', {
                    detail: { type, usage: allUsage[userId] }
                });
                document.dispatchEvent(event);
                console.log('✅ usageUpdated event dispatched:', event.detail);
            } else {
                console.warn(`⚠️ Invalid usage type: ${type}`);
            }
        } catch (error) {
            console.error('❌ Error in incrementUsage:', error);
        }
    }

    trackSearch() {
        this.incrementUsage('searches');
    }

    trackDownload() {
        this.incrementUsage('downloads');
    }

    trackReport() {
        this.incrementUsage('reports');
    }

    trackDataExport() {
        this.incrementUsage('dataExports');
    }

    getTrialCount() {
        const usage = this.getUsage();
        // Trial count is the maximum of searches, downloads, and insights (reports)
        // Each metric has its own limit of 3
        const TRIAL_LIMIT = 3;
        const maxUsage = Math.max(usage.searches || 0, usage.downloads || 0, usage.reports || 0);
        return Math.min(maxUsage, TRIAL_LIMIT);
    }

    isPremiumUser() {
        // Check if user has active premium subscription
        if (window.subscriptionManager && window.subscriptionManager.subscriptionStatus) {
            return window.subscriptionManager.subscriptionStatus.hasActiveSubscription === true;
        }
        return false;
    }

    canPerformAction(actionType) {
        // Premium users have unlimited access
        if (this.isPremiumUser()) {
            return { allowed: true, reason: 'premium' };
        }

        // Check individual limits for each action type
        const TRIAL_LIMIT = 3;
        const usage = this.getUsage();
        let currentUsage = 0;
        let metricName = '';

        switch (actionType) {
            case 'search':
                currentUsage = usage.searches || 0;
                metricName = 'searches';
                break;
            case 'download':
                currentUsage = usage.downloads || 0;
                metricName = 'downloads';
                break;
            case 'report':
                currentUsage = usage.reports || 0;
                metricName = 'generating insights';
                break;
            case 'export':
                currentUsage = usage.dataExports || 0;
                metricName = 'data exports';
                break;
            default:
                // Unknown action type, default to checking total
                const maxUsage = Math.max(usage.searches || 0, usage.downloads || 0, usage.reports || 0);
                if (maxUsage >= TRIAL_LIMIT) {
                    return {
                        allowed: false,
                        reason: 'trial_exceeded',
                        message: `You've reached your trial limit. Upgrade to Premium for unlimited access.`
                    };
                }
                return { allowed: true, reason: 'trial' };
        }

        // Check if this specific metric has reached its limit
        if (currentUsage >= TRIAL_LIMIT) {
            const actionName = metricName === 'generating insights' ? 'Generate Insights' : 
                             metricName === 'searches' ? 'Perform Searches' :
                             metricName === 'downloads' ? 'Download Reports' : 'Export Data';
            return {
                allowed: false,
                reason: 'trial_exceeded',
                message: `You've used all ${TRIAL_LIMIT} free ${metricName}. Upgrade to Premium to continue ${actionName}.`
            };
        }

        return { allowed: true, reason: 'trial' };
    }

    checkAndTrack(actionType, callback) {
        // Check if action is allowed
        const check = this.canPerformAction(actionType);
        
        if (!check.allowed) {
            // Show notification and redirect to upgrade
            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    'Trial Limit Reached',
                    check.message || 'You\'ve reached your trial limit. Upgrade to Premium to continue.',
                    'warning'
                );
            } else {
                alert(check.message || 'You\'ve reached your trial limit. Upgrade to Premium to continue.');
            }

            // Redirect to upgrade page after a short delay
            setTimeout(() => {
                window.location.href = '/upgrade.html';
            }, 2000);

            return false;
        }

        // Track the action
        switch (actionType) {
            case 'search':
                this.trackSearch();
                break;
            case 'download':
                this.trackDownload();
                break;
            case 'report':
                this.trackReport();
                break;
            case 'export':
                this.trackDataExport();
                break;
        }

        // Execute callback if provided
        if (callback && typeof callback === 'function') {
            callback();
        }

        return true;
    }

    resetUsage() {
        const userId = this.getUserId();
        if (!userId) return;

        const allUsage = this.getAllUsage();
        allUsage[userId] = {
            searches: 0,
            downloads: 0,
            reports: 0,
            dataExports: 0,
            lastUpdated: new Date().toISOString()
        };
        this.saveAllUsage(allUsage);
    }
}

// Initialize usage tracker
const usageTracker = new UsageTracker();
window.usageTracker = usageTracker;

// Expose a test function for debugging
window.testUsageTracker = function() {
    try {
        console.log('🧪 Testing Usage Tracker...');
        if (!window.usageTracker) {
            console.error('❌ Usage tracker not found!');
            return { error: 'Usage tracker not found' };
        }
        
        const usage = window.usageTracker.getUsage();
        const userId = window.usageTracker.getUserId();
        const allUsage = window.usageTracker.getAllUsage();
        const isPremium = window.usageTracker.isPremiumUser();
        const trialCount = window.usageTracker.getTrialCount();
        const canSearch = window.usageTracker.canPerformAction('search');
        
        console.log('✅ Usage tracker found');
        console.log('Current usage:', usage);
        console.log('User ID:', userId);
        console.log('All usage data:', allUsage);
        console.log('Is premium?', isPremium);
        console.log('Trial count:', trialCount);
        console.log('Can perform search?', canSearch);
        
        // Test tracking
        console.log('Testing trackSearch...');
        window.usageTracker.trackSearch();
        const newUsage = window.usageTracker.getUsage();
        console.log('After trackSearch, usage:', newUsage);
        console.log('✅ Test complete!');
        
        // Return a summary object so it shows in console instead of undefined
        return {
            success: true,
            usage: newUsage,
            userId: userId,
            isPremium: isPremium,
            trialCount: trialCount,
            canSearch: canSearch.allowed,
            message: 'Check console for detailed logs'
        };
    } catch (error) {
        console.error('❌ Error in testUsageTracker:', error);
        return { error: error.message, stack: error.stack };
    }
};

// Log when script loads
console.log('📜 usage-tracker.js loaded');
