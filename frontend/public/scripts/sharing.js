/**
 * IPMAS Sharing System
 * Enables sharing reports, visualizations, and data via links and email
 */

class SharingSystem {
    constructor() {
        this.shareLinks = new Map();
        this.init();
    }

    init() {
        console.log('🔗 Sharing System initializing...');
        this.addSharingButtons();
        console.log('✅ Sharing System initialized');
    }

    addSharingButtons() {
        // Reports page removed - sharing functionality disabled

        // Add share button to dashboard
        if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
            this.addDashboardSharing();
        }

        // Add share button to poverty models
        if (window.location.pathname.includes('poverty-models')) {
            this.addModelSharing();
        }
    }

    addReportSharing() {
        const reportHistory = document.getElementById('reportHistory');
        if (!reportHistory) return;

        // Add share button to each report item
        const observer = new MutationObserver(() => {
            document.querySelectorAll('.report-item').forEach(item => {
                if (!item.querySelector('.share-report-btn')) {
                    const shareBtn = document.createElement('button');
                    shareBtn.className = 'btn btn-sm btn-secondary share-report-btn';
                    shareBtn.textContent = '🔗 Share';
                    shareBtn.style.marginLeft = '8px';
                    shareBtn.onclick = (e) => {
                        e.stopPropagation();
                        const reportId = item.dataset.reportId || Date.now();
                        this.shareReport(reportId);
                    };
                    
                    const downloadBtn = item.querySelector('.btn');
                    if (downloadBtn) {
                        downloadBtn.parentNode.insertBefore(shareBtn, downloadBtn.nextSibling);
                    }
                }
            });
        });

        observer.observe(reportHistory, { childList: true, subtree: true });
    }

    addDashboardSharing() {
        const statsHeader = document.querySelector('.stats-header');
        if (!statsHeader) return;

        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn btn-secondary btn-sm';
        shareBtn.id = 'shareDashboardBtn';
        shareBtn.innerHTML = '🔗 Share Dashboard';
        shareBtn.onclick = () => this.shareDashboard();

        const refreshControls = statsHeader.querySelector('.refresh-controls');
        if (refreshControls) {
            refreshControls.insertBefore(shareBtn, refreshControls.firstChild);
        }
    }

    addModelSharing() {
        // Add share button to model results
        const modelCards = document.querySelectorAll('.model-card');
        modelCards.forEach(card => {
            const actions = card.querySelector('.model-actions');
            if (actions && !actions.querySelector('.share-model-btn')) {
                const shareBtn = document.createElement('button');
                shareBtn.className = 'btn btn-secondary share-model-btn';
                shareBtn.textContent = '🔗 Share Results';
                shareBtn.onclick = () => this.shareModelResults();
                actions.appendChild(shareBtn);
            }
        });
    }

    shareReport(reportId) {
        const shareUrl = this.generateShareUrl('report', { id: reportId });
        this.showShareDialog(shareUrl, 'Report');
    }

    shareDashboard() {
        // Capture current filter state
        const filters = window.advancedFilters ? window.advancedFilters.getActiveFilters() : {};
        const shareUrl = this.generateShareUrl('dashboard', { filters: filters });
        this.showShareDialog(shareUrl, 'Dashboard View');
    }

    shareModelResults() {
        const modelData = window.povertyModelsManager ? {
            currentModel: window.povertyModelsManager.currentModel,
            modelData: window.povertyModelsManager.modelData
        } : {};
        const shareUrl = this.generateShareUrl('poverty-model', modelData);
        this.showShareDialog(shareUrl, 'Poverty Model Results');
    }

    generateShareUrl(type, data) {
        // In production, this would generate a unique shareable link via backend
        // For now, create a shareable state URL
        const baseUrl = window.location.origin + window.location.pathname;
        const encodedData = encodeURIComponent(JSON.stringify(data));
        
        // Store share data (in production, this would be in a database)
        const shareId = Date.now();
        this.shareLinks.set(shareId.toString(), {
            type: type,
            data: data,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

        // Save to localStorage as fallback
        try {
            localStorage.setItem(`share_${shareId}`, JSON.stringify({ type, data }));
        } catch (e) {
            console.warn('Could not save share link to localStorage');
        }

        return `${baseUrl}?share=${shareId}`;
    }

    showShareDialog(shareUrl, title) {
        // Create share modal
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: var(--panel-bg); color: var(--text-primary); padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: var(--panel-shadow);">
                <h3 style="margin: 0 0 20px 0; color: var(--primary-color);">🔗 Share ${title}</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Shareable Link:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="shareUrlInput" value="${shareUrl}" readonly 
                            style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${shareUrl}').then(() => alert('Link copied!'))" 
                            style="white-space: nowrap;">
                            📋 Copy
                        </button>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Or Share via Email:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="email" id="shareEmailInput" placeholder="Enter email address" 
                            style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <button class="btn btn-primary" id="sendShareEmail" style="white-space: nowrap;">
                            📧 Send
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" id="closeShareModal">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal handlers
        document.getElementById('closeShareModal').onclick = () => {
            document.body.removeChild(modal);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };

        // Email share handler
        document.getElementById('sendShareEmail').onclick = () => {
            const email = document.getElementById('shareEmailInput').value;
            if (email && this.validateEmail(email)) {
                this.sendShareEmail(email, shareUrl, title);
                document.body.removeChild(modal);
            } else {
                alert('Please enter a valid email address');
            }
        };

        // Auto-select URL input
        document.getElementById('shareUrlInput').select();
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async sendShareEmail(email, shareUrl, title) {
        console.log(`📧 Sending share link to ${email}`);

        if (window.API_CONFIG) {
            try {
                const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/v1/sharing/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        shareUrl: shareUrl,
                        title: title,
                        message: `You have been shared a ${title} from IPMAS`
                    })
                });

                if (response.ok) {
                    alert(`Share link sent successfully to ${email}!`);
                } else {
                    throw new Error('Email send failed');
                }
            } catch (error) {
                console.warn('Email API unavailable, showing fallback message');
                // Fallback: show mailto link
                const subject = encodeURIComponent(`IPMAS ${title} Share`);
                const body = encodeURIComponent(`View this ${title}: ${shareUrl}`);
                window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
            }
        } else {
            // Fallback to mailto
            const subject = encodeURIComponent(`IPMAS ${title} Share`);
            const body = encodeURIComponent(`View this ${title}: ${shareUrl}`);
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        }
    }

    // Handle incoming share links
    loadSharedView() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        
        if (shareId) {
            const shareData = this.shareLinks.get(shareId) || 
                            JSON.parse(localStorage.getItem(`share_${shareId}`) || 'null');
            
            if (shareData) {
                this.applySharedView(shareData);
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    applySharedView(shareData) {
        console.log('🔗 Loading shared view:', shareData);

        if (shareData.type === 'dashboard' && shareData.data.filters) {
            // Restore filters
            if (window.advancedFilters) {
                // Restore filter state
                setTimeout(() => {
                    Object.keys(shareData.data.filters).forEach(key => {
                        // Apply filters (implementation depends on filter structure)
                    });
                    window.advancedFilters.applyAllFilters();
                }, 1000);
            }
        } else if (shareData.type === 'poverty-model' && shareData.data.currentModel) {
            // Switch to specific model view
            if (window.showModel) {
                showModel(shareData.data.currentModel);
            }
        }

        // Show notification
        this.showNotification(`Shared ${shareData.type} loaded successfully`, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10001;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sharingSystem = new SharingSystem();
        window.sharingSystem.loadSharedView();
    });
} else {
    window.sharingSystem = new SharingSystem();
    window.sharingSystem.loadSharedView();
}

// Add CSS animations
if (!document.getElementById('sharingStyles')) {
    const style = document.createElement('style');
    style.id = 'sharingStyles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
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

