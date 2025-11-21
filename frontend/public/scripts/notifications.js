/**
 * IPMAS Real-time Notifications System
 * Provides alerts for data changes, thresholds, and scheduled events
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.subscriptions = this.loadSubscriptions();
        this.alertThresholds = {
            povertyIncrease: 5, // % increase
            povertyDecrease: 3, // % decrease
            dataUpdate: true,
            newReport: true
        };
        // Load user notification preferences from settings
        this.userNotificationSettings = this.loadUserNotificationSettings();
        this.unreadCount = 0;
        this.init();
    }
    
    loadUserNotificationSettings() {
        try {
            const userData = localStorage.getItem('ipmas_user_data');
            if (userData) {
                const parsed = JSON.parse(userData);
                return parsed.notifications || {
                    email: true,
                    sms: false,
                    projects: true,
                    insights: false
                };
            }
        } catch (error) {
            console.warn('Error loading user notification settings:', error);
        }
        // Default settings
        return {
            email: true,
            sms: false,
            projects: true,
            insights: false
        };
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;
        if (this.unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = this.unreadCount > 99 ? '99+' : String(this.unreadCount);
        } else {
            badge.style.display = 'none';
        }
    }

    renderPanel() {
        const panelContent = document.getElementById('notificationPanelContent');
        if (!panelContent) return;

        if (!this.notifications.length) {
            panelContent.innerHTML = `
                <div style="padding:8px 10px; font-size:0.85rem; opacity:0.7;">
                    No notifications yet.
                </div>
            `;
            return;
        }

        const itemsHtml = this.notifications
            .slice(0, 20)
            .map(n => {
                const time = new Date(n.timestamp).toLocaleTimeString();
                return `
                    <div class="notification-item" data-notification-id="${n.id}" style="padding:8px 10px; border-bottom:1px solid rgba(0,0,0,0.05); font-size:0.85rem; display:flex; justify-content:space-between; gap:8px;">
                        <div style="flex:1;">
                            <div style="font-weight:600; margin-bottom:2px;">${n.title}</div>
                            ${n.message ? `<div style="opacity:0.8;">${n.message}</div>` : ''}
                            <div style="opacity:0.6; font-size:0.75rem; margin-top:2px;">${time}</div>
                        </div>
                        <button class="notification-clear-btn" data-notification-id="${n.id}" style="border:none;background:none;color:#dc3545;font-size:0.8rem;cursor:pointer;white-space:nowrap;">Clear</button>
                    </div>
                `;
            })
            .join('');

        panelContent.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid rgba(0,0,0,0.05); font-size:0.85rem; font-weight:600;">
                <span>Notifications</span>
                <button id="notificationClearAll" style="background:none; border:none; color:#0d6efd; font-size:0.8rem; cursor:pointer;">Clear all</button>
            </div>
            <div>${itemsHtml}</div>
        `;

        // Ensure clear button listeners are attached (using event delegation on panel)
        this.ensureClearListeners();
    }

    ensureClearListeners() {
        // Only attach once - check if already attached
        if (this._clearListenersAttached) return;
        
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.addEventListener('click', (e) => {
                // Handle individual clear button
                if (e.target.classList.contains('notification-clear-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const notificationId = e.target.getAttribute('data-notification-id');
                    if (notificationId) {
                        this.clearNotification(notificationId);
                    }
                    return;
                }
                // Handle clear all button
                if (e.target.id === 'notificationClearAll') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.clearAllNotifications();
                    return;
                }
            });
            this._clearListenersAttached = true;
        }
    }

    clearNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.renderPanel();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.unreadCount = 0;
        this.updateBadge();
        this.renderPanel();
    }
    init() {
        console.log('🔔 Notification System initializing...');
        console.log('🔔 Window object:', {
            notificationSystem: !!window.notificationSystem,
            ipmasApp: !!window.ipmasApp,
            io: typeof io !== 'undefined',
            socket: window.ipmasApp?.socket?.connected,
            documentReadyState: document.readyState
        });
        
        try {
            this.createNotificationUI();
            this.setupEventListeners();
            this.setupSocketIO();
            this.loadNotifications();
            this.startMonitoring();
            
            // Add test function to window for debugging
            window.testNotification = () => {
                console.log('🧪 Testing notification system...');
                if (this && typeof this.showNotification === 'function') {
                    this.showNotification('🧪 Test', 'success', 'Manual test notification', 5000);
                } else {
                    console.error('❌ showNotification is not available');
                }
            };
            
            // Add function to test API endpoint
            window.testNotificationAPI = async () => {
                try {
                    console.log('🧪 Testing notification API...');
                    const response = await fetch('/api/v1/user-data/notifications/test', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    console.log('🧪 API Response:', data);
                    return data;
                } catch (error) {
                    console.error('🧪 API Error:', error);
                    return { error: error.message };
                }
            };
            
            console.log('✅ Notification System initialized');
            console.log('🔔 Test functions available: window.testNotification() and window.testNotificationAPI()');
            console.log('🔔 Notification System instance:', this);
        } catch (error) {
            console.error('❌ Error during notification system initialization:', error);
            console.error('Error stack:', error.stack);
        }
    }

    setupSocketIO() {
        console.log('🔔 Setting up Socket.IO for notifications...');
        
        // Function to check Socket.IO availability
        const checkSocketIO = () => {
            // Check if Socket.IO library is loaded
            if (typeof io === 'undefined') {
                console.warn('🔔 Socket.IO library not loaded');
                return false;
            }
            return true;
        };
        
        // Function to setup socket connection
        const setupConnection = () => {
            // Try to use existing socket connection from IPMASApp first
            if (window.ipmasApp && window.ipmasApp.socket) {
                if (window.ipmasApp.socket.connected) {
                    this.socket = window.ipmasApp.socket;
                    console.log('✅ Notification System: Using existing Socket.IO connection from IPMASApp');
                    this.attachSocketListeners();
                    return true;
                } else {
                    console.log('🔔 IPMASApp socket exists but not connected, waiting...');
                    // Wait for connection
                    const connectHandler = () => {
                        if (window.ipmasApp.socket.connected) {
                            this.socket = window.ipmasApp.socket;
                            console.log('✅ Notification System: Socket connected, using IPMASApp connection');
                            this.attachSocketListeners();
                            window.ipmasApp.socket.off('connect', connectHandler);
                            return true;
                        }
                    };
                    window.ipmasApp.socket.on('connect', connectHandler);
                    return false;
                }
            } else if (checkSocketIO()) {
                // Create new Socket.IO connection
                const socketUrl = window.API_CONFIG?.getSocketUrl?.() || window.API_CONFIG?.SOCKET_URL || 'http://localhost:3001';
                console.log('🔔 Creating new Socket.IO connection to:', socketUrl);
                
                try {
                    this.socket = io(socketUrl, {
                        transports: ['websocket', 'polling'],
                        timeout: 5000,
                        reconnection: true,
                        reconnectionAttempts: 5,
                        reconnectionDelay: 1000
                    });
                    
                    // Set up listeners immediately (will work once connected)
                    this.attachSocketListeners();
                    
                    // Log connection status
                    this.socket.on('connect', () => {
                        console.log('✅ Notification System: Socket.IO connected');
                        // Identify user once connected
                        if (window.ipmasApp && window.ipmasApp.identifyUser) {
                            window.ipmasApp.identifyUser();
                        }
                    });
                    
                    this.socket.on('connect_error', (error) => {
                        console.warn('🔔 Socket.IO connection error:', error.message);
                    });
                    
                    return true;
                } catch (error) {
                    console.error('🔔 Error creating Socket.IO connection:', error);
                    return false;
                }
            }
            return false;
        };

        // Try immediately
        if (!setupConnection() && checkSocketIO()) {
            // Try again after delays
            console.log('🔔 Socket.IO not ready yet, retrying...');
            const retryTimes = [1000, 3000, 5000];
            let retryIndex = 0;
            
            const retrySetup = () => {
                if (setupConnection()) {
                    console.log('✅ Socket.IO setup successful');
                    return;
                }
                
                if (retryIndex < retryTimes.length) {
                    setTimeout(retrySetup, retryTimes[retryIndex] - (retryIndex > 0 ? retryTimes[retryIndex - 1] : 0));
                    retryIndex++;
                } else {
                    console.warn('🔔 Socket.IO setup failed after retries - notifications will work via events only');
                }
            };
            
            setTimeout(retrySetup, 1000);
        } else if (!checkSocketIO()) {
            console.warn('🔔 Socket.IO library not available - notifications will work via events only');
        }
    }

    attachSocketListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('🔔 Notification System: Socket.IO connected');
        });

        this.socket.on('disconnect', () => {
            console.log('🔔 Notification System: Socket.IO disconnected');
        });

        // Listen for notification events from server
        this.socket.on('notification', (notificationData) => {
            console.log('🔔 Received notification from server:', notificationData);
            
            // Validate notification data
            if (!notificationData || !notificationData.title) {
                console.warn('🔔 Invalid notification data received:', notificationData);
                return;
            }
            
            // Add to notifications list
            const notificationId = `n-${notificationData.id || Date.now()}`;
            
            // Check if notification already exists
            const exists = this.notifications.some(n => n.id === notificationId);
            if (!exists) {
                const newNotification = {
                    id: notificationId,
                    title: notificationData.title || 'Notification',
                    type: notificationData.type || 'info',
                    message: notificationData.message || '',
                    timestamp: notificationData.timestamp || new Date().toISOString(),
                    read: false,
                    metadata: notificationData.metadata || {}
                };
                
                this.notifications.unshift(newNotification);
                this.unreadCount += 1;
                this.updateBadge();
                this.renderPanel();
                
                console.log('✅ Notification added to list. Total:', this.notifications.length, 'Unread:', this.unreadCount);
            } else {
                console.log('🔔 Notification already exists, skipping duplicate');
            }
            
            // Show visual notification
            this.showNotification(
                notificationData.title || 'Notification',
                notificationData.type || 'info',
                notificationData.message || '',
                4000
            );
        });
    }

    async createNotificationFallback(reportData) {
        // Fallback: Create notification via API if Socket.IO didn't work
        try {
            const response = await fetch('/api/v1/user-data/notifications', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: '📥 Report Downloaded',
                    message: `${reportData.type || 'Report'} (${reportData.format?.toUpperCase() || ''}) has been downloaded successfully`,
                    type: 'success',
                    metadata: reportData
                })
            });
            
            if (response.ok) {
                console.log('✅ Notification created via API fallback');
            }
        } catch (error) {
            console.warn('🔔 Could not create notification via API fallback:', error);
        }
    }

    async loadNotifications() {
        try {
            // Fetch notifications from API
            const response = await fetch('/api/v1/user-data/notifications', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.notifications) {
                    // Add notifications to the list
                    this.notifications = data.notifications.map(n => ({
                        id: `n-${n.id}`,
                        title: n.title,
                        type: n.type,
                        message: n.message,
                        timestamp: n.created_at,
                        read: n.read_status
                    }));
                    
                    // Update unread count
                    this.unreadCount = this.notifications.filter(n => !n.read).length;
                    this.updateBadge();
                    this.renderPanel();
                }
            }
        } catch (error) {
            console.warn('Error loading notifications:', error);
        }
    }

    createNotificationUI() {
        console.log('🔔 Creating notification UI...');
        
        // Create notification container
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                overflow-y: auto;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(notificationContainer);
            console.log('✅ Notification container created');
        } else {
            console.log('✅ Notification container already exists');
        }

        // Create notification bell with counter and dropdown panel in header
        const header = document.querySelector('.header');
        if (header && !document.getElementById('notificationBell')) {
            const bellWrapper = document.createElement('div');
            bellWrapper.style.position = 'relative';

            bellWrapper.innerHTML = `
                <button id="notificationBell" class="btn btn-sm btn-secondary" style="margin-left: 10px; position: relative;">
                    🔔
                    <span id="notificationBadge" style="display:none; position:absolute; top:-6px; right:-4px; background:#dc3545; color:#fff; border-radius:999px; padding:0 5px; font-size:0.7rem; min-width:16px; text-align:center;">0</span>
                </button>
                <div id="notificationPanel" style="display:none; position:absolute; right:0; top:32px; width:320px; max-height:400px; overflow-y:auto; background:var(--panel-bg,#fff); color:var(--text-primary,#000); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:10001;">
                    <div id="notificationPanelContent" style="padding:10px;">
                        <div style="font-size:0.85rem; opacity:0.7;">No notifications yet.</div>
                    </div>
                </div>
            `;

            const headerActions = header.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(bellWrapper, headerActions.firstChild);
            }
        }
    }

    setupEventListeners() {
        // Listen for notification settings updates from settings page
        document.addEventListener('notificationsUpdated', (e) => {
            if (e.detail && e.detail.notifications) {
                this.userNotificationSettings = e.detail.notifications;
                console.log('🔔 Notification settings updated:', this.userNotificationSettings);
            }
        });

        // Listen for data updates
        document.addEventListener('dataUpdated', (e) => {
            if (this.alertThresholds.dataUpdate && this.shouldShowNotification('insights')) {
                this.showNotification('Data has been updated', 'info', 'New data is available');
            }
        });

        // Toggle notification panel
        document.addEventListener('click', (e) => {
            const bell = document.getElementById('notificationBell');
            const panel = document.getElementById('notificationPanel');
            if (!bell || !panel) return;

            if (bell.contains(e.target)) {
                const isVisible = panel.style.display === 'block';
                panel.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    // Mark all as read when opening
                    this.unreadCount = 0;
                    this.updateBadge();
                }
            } else if (!panel.contains(e.target)) {
                panel.style.display = 'none';
            }
        });

        // Listen for report generation
        document.addEventListener('reportGenerated', (e) => {
            // Always show notification for report generation (user requested action)
            this.showNotification(
                '✅ New Report Generated', 
                'success', 
                `Report "${e.detail.type}" (${e.detail.format?.toUpperCase() || ''}) has been generated successfully`
            );
        });
        
        // Listen for report downloads - use capture phase to catch early
        document.addEventListener('reportDownloaded', (e) => {
            console.log('🔔 reportDownloaded event received:', e.detail);
            console.log('🔔 Event target:', e.target);
            console.log('🔔 Event currentTarget:', e.currentTarget);
            
            // Always show notification for report downloads
            if (typeof this.showNotification === 'function') {
                this.showNotification(
                    '📥 Report Downloaded', 
                    'success', 
                    `${e.detail.type || 'Report'} (${e.detail.format?.toUpperCase() || ''}) has been downloaded successfully`,
                    4000
                );
            } else {
                console.error('❌ showNotification is not a function!');
            }
            
            // Also try to create notification in backend (if Socket.IO isn't working)
            // This is a fallback to ensure notifications are stored
            if (typeof this.createNotificationFallback === 'function') {
                this.createNotificationFallback(e.detail);
            }
        }, true); // Use capture phase to catch event early

        // Listen for filter changes that might trigger threshold alerts
        document.addEventListener('filtersChanged', (e) => {
            this.checkThresholds(e.detail.filteredData);
        });
    }
    
    shouldShowNotification(type) {
        // Map notification types to user settings
        const typeMapping = {
            'email': 'email',
            'sms': 'sms',
            'projects': 'projects',
            'insights': 'insights',
            'report': 'email', // Reports use email notifications
            'data': 'insights' // Data updates use insights notifications
        };
        
        const settingKey = typeMapping[type] || 'email';
        return this.userNotificationSettings[settingKey] !== false;
    }

    startMonitoring() {
        // Monitor for changes every 30 seconds (or when data updates)
        setInterval(() => {
            this.checkForDataChanges();
        }, 30000); // Check every 30 seconds

        console.log('🔔 Notification monitoring started');
    }

    checkForDataChanges() {
        // Check if data has changed significantly
        if (window.ipmasApp && window.ipmasApp.locations) {
            // Compare with previous snapshot
            this.detectSignificantChanges();
        }
    }

    detectSignificantChanges() {
        // Implementation would compare current data with previous snapshot
        // and trigger alerts if thresholds are breached
    }

    checkThresholds(filteredData) {
        if (!filteredData || filteredData.length === 0) return;

        // Only check if insights notifications are enabled
        if (!this.shouldShowNotification('insights')) return;

        // Calculate average poverty index
        const avgPoverty = filteredData.reduce((sum, loc) => sum + (loc.poverty_index || 0), 0) / filteredData.length;
        
        // Compare with previous average
        const previousAvg = this.lastAveragePoverty || avgPoverty;
        const change = avgPoverty - previousAvg;

        if (Math.abs(change) >= this.alertThresholds.povertyIncrease) {
            if (change > 0) {
                this.showNotification(
                    '⚠️ Poverty Alert',
                    'warning',
                    `Poverty index increased by ${change.toFixed(1)}% in selected area`,
                    5000
                );
            } else {
                this.showNotification(
                    '✅ Improvement Alert',
                    'success',
                    `Poverty index decreased by ${Math.abs(change).toFixed(1)}% in selected area`,
                    5000
                );
            }
        }

        this.lastAveragePoverty = avgPoverty;
    }

    showNotification(title, type = 'info', message = '', duration = 4000) {
        console.log('🔔 showNotification called:', { title, type, message, duration });
        
        // Ensure UI is created first
        this.createNotificationUI();
        
        const container = document.getElementById('notificationContainer');
        if (!container) {
            console.error('❌ Notification container still not found after createNotificationUI()');
            // Fallback: use alert
            alert(`${title}: ${message || ''}`);
            return;
        }
        
        console.log('✅ Notification container found, creating notification...');

        // Store notification and update badge / panel list
        this.notifications.unshift({
            id: `n-${Date.now()}`,
            title,
            type,
            message,
            timestamp: new Date().toISOString()
        });
        this.unreadCount += 1;
        this.updateBadge();
        this.renderPanel();

        const notification = document.createElement('div');
        const notificationId = `notif-${Date.now()}`;
        notification.id = notificationId;
        
        const colors = {
            info: { bg: '#17a2b8', icon: 'ℹ️' },
            success: { bg: '#28a745', icon: '✅' },
            warning: { bg: '#ffc107', icon: '⚠️' },
            error: { bg: '#dc3545', icon: '❌' }
        };

        const color = colors[type] || colors.info;

        notification.style.cssText = `
            background: ${color.bg};
            color: white;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            pointer-events: auto;
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;

        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                        <span>${color.icon}</span>
                        <span>${title}</span>
                    </div>
                    ${message ? `<div style="font-size: 0.9rem; opacity: 0.95;">${message}</div>` : ''}
                </div>
                <button onclick="document.getElementById('${notificationId}').remove()" 
                    style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 5px;">
                    ×
                </button>
            </div>
        `;

        container.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (document.getElementById(notificationId)) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (document.getElementById(notificationId)) {
                        document.getElementById(notificationId).remove();
                    }
                }, 300);
            }
        }, duration);

        // Notification already stored above (in the unshift operation)
        // Don't store twice to prevent duplicates

        // Play sound if enabled
        this.playNotificationSound(type);
    }

    playNotificationSound(type) {
        // Create audio context for notification sounds
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different types
            const frequencies = {
                info: 440,
                success: 523.25,
                warning: 392,
                error: 330
            };

            oscillator.frequency.value = frequencies[type] || 440;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Audio context may not be available
            console.log('Audio notification not available');
        }
    }

    loadSubscriptions() {
        try {
            const stored = localStorage.getItem('ipmas_notifications');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            return {};
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('ipmas_notification_settings', JSON.stringify(this.alertThresholds));
        } catch (error) {
            console.error('Error saving notification settings:', error);
        }
    }
}

// Add CSS animations
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize notification system immediately when script loads
console.log('🔔 Notification script file loaded');
console.log('   typeof NotificationSystem:', typeof NotificationSystem);
console.log('   typeof window:', typeof window);

// Ensure NotificationSystem is available globally
if (typeof window !== 'undefined' && typeof NotificationSystem !== 'undefined') {
    window.NotificationSystem = NotificationSystem;
    console.log('✅ NotificationSystem class exposed to window');
}

function initializeNotificationSystem() {
    try {
        console.log('🔔 initializeNotificationSystem() called');
        console.log('   typeof NotificationSystem:', typeof NotificationSystem);
        console.log('   typeof window.NotificationSystem:', typeof window.NotificationSystem);
        
        // Check if NotificationSystem class is available
        const NSClass = typeof NotificationSystem !== 'undefined' ? NotificationSystem : 
                       (typeof window !== 'undefined' && window.NotificationSystem) ? window.NotificationSystem : null;
        
        if (!NSClass) {
            console.error('❌ NotificationSystem class not found!');
            console.error('   Available globals:', Object.keys(window).filter(k => k.includes('Notification') || k.includes('notif')));
            return;
        }
        
        // Don't initialize if already exists
        if (window.notificationSystem) {
            console.log('🔔 Notification System already initialized, reusing existing instance');
            return window.notificationSystem;
        }
        
        console.log('🔔 Creating new NotificationSystem instance...');
        window.notificationSystem = new NSClass();
        console.log('✅ Notification System instance created:', window.notificationSystem);
        console.log('   Type:', typeof window.notificationSystem);
        console.log('   Has showNotification:', typeof window.notificationSystem.showNotification === 'function');
        
        // Expose test functions globally
        if (window.notificationSystem) {
            window.testNotification = () => {
                console.log('🧪 Testing notification system...');
                if (window.notificationSystem && typeof window.notificationSystem.showNotification === 'function') {
                    window.notificationSystem.showNotification('🧪 Test', 'success', 'Manual test notification', 5000);
                } else {
                    console.error('❌ showNotification not available');
                    console.error('   notificationSystem:', window.notificationSystem);
                }
            };
            
            window.testNotificationAPI = async () => {
                try {
                    console.log('🧪 Testing notification API...');
                    const response = await fetch('/api/v1/user-data/notifications/test', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    console.log('🧪 API Response:', data);
                    return data;
                } catch (error) {
                    console.error('🧪 API Error:', error);
                    return { error: error.message };
                }
            };
            
            console.log('✅ Test functions exposed: window.testNotification() and window.testNotificationAPI()');
        }
        
        return window.notificationSystem;
    } catch (error) {
        console.error('❌ Error initializing Notification System:', error);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        return null;
    }
}

// Initialize immediately - don't wait for DOM
console.log('🔔 Setting up initialization...');
console.log('   Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    // DOM not ready yet, wait for it
    console.log('🔔 Waiting for DOM to load...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔔 DOM loaded, initializing notification system...');
        initializeNotificationSystem();
    });
} else {
    // DOM already ready, initialize immediately
    console.log('🔔 DOM ready, initializing notification system immediately...');
    setTimeout(() => {
        initializeNotificationSystem();
    }, 100); // Small delay to ensure class is defined
}

// Also try to initialize after a short delay as fallback
setTimeout(() => {
    if (!window.notificationSystem) {
        console.warn('🔔 Notification system not initialized yet, trying again...');
        initializeNotificationSystem();
    } else {
        console.log('✅ Notification system confirmed initialized');
    }
}, 500);

// Try one more time after longer delay
setTimeout(() => {
    if (!window.notificationSystem) {
        console.warn('🔔 Notification system still not initialized, final attempt...');
        initializeNotificationSystem();
    }
}, 1500);

