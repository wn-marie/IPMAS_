/**
 * IPMAS - Feedback & Support System
 * Handles feedback submissions, form interactions, and insights
 */

class FeedbackManager {
    constructor() {
        this.selectedType = null;
        this.selectedPriority = 'medium';
        this.init();
    }

    init() {
        console.log('💬 Feedback Manager Initializing...');
        this.setupEventListeners();
        this.loadFeedbackStats();
        console.log('✅ Feedback Manager initialized successfully');
    }

    setupEventListeners() {
        // Feedback type selection
        document.querySelectorAll('.feedback-type-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectFeedbackType(card);
            });
        });

        // Priority selection
        document.querySelectorAll('.priority-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                this.selectPriority(badge);
            });
        });

        // Form submission
        const form = document.getElementById('feedbackForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.submitFeedback(e);
            });
        }

        // Set default selections
        this.selectFeedbackType(document.querySelector('.feedback-type-card[data-type="general"]'));
        this.selectPriority(document.querySelector('.priority-badge[data-priority="medium"]'));
    }

    selectFeedbackType(card) {
        // Remove previous selection
        document.querySelectorAll('.feedback-type-card').forEach(c => {
            c.classList.remove('selected');
        });

        // Add selection to clicked card
        card.classList.add('selected');
        
        // Update hidden input
        const type = card.getAttribute('data-type');
        document.getElementById('feedbackType').value = type;
        this.selectedType = type;

        console.log('✅ Selected feedback type:', type);
    }

    selectPriority(badge) {
        // Remove previous selection
        document.querySelectorAll('.priority-badge').forEach(b => {
            b.classList.remove('selected');
        });

        // Add selection to clicked badge
        badge.classList.add('selected');
        
        // Update hidden input
        const priority = badge.getAttribute('data-priority');
        document.getElementById('priority').value = priority;
        this.selectedPriority = priority;

        console.log('✅ Selected priority:', priority);
    }

    async submitFeedback(event) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = document.getElementById('submitBtn');
        const successMessage = document.getElementById('successMessage');

        // Get form values
        const feedbackType = document.getElementById('feedbackType').value;
        const feedbackMessage = document.getElementById('feedbackMessage').value.trim();
        const priority = document.getElementById('priority').value;
        const contactEmail = document.getElementById('contactEmail').value.trim();

        // Validation
        if (!feedbackType) {
            this.showError('Please select a feedback type');
            return;
        }

        if (!feedbackMessage || feedbackMessage.length < 10) {
            this.showError('Please provide detailed feedback (at least 10 characters)');
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            // Prepare feedback data
            const feedbackData = {
                type: feedbackType,
                message: feedbackMessage,
                priority: priority,
                contact: contactEmail || null,
                timestamp: new Date().toISOString(),
                user: this.getUserInfo(),
                id: Date.now()
            };

            // Save to localStorage
            const savedFeedback = JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
            savedFeedback.push(feedbackData);
            localStorage.setItem('ipmas_feedback', JSON.stringify(savedFeedback));

            // Try to submit to backend if available
            try {
                const apiUrl = window.API_CONFIG 
                    ? window.API_CONFIG.getApiUrl('/api/v1/feedback/submit')
                    : 'http://localhost:3001/api/v1/feedback/submit';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        feedback_type: feedbackType,
                        content: feedbackMessage,
                        urgency_level: this.mapPriorityToUrgency(priority),
                        contact_info: contactEmail ? { email: contactEmail } : {}
                    })
                });

                if (response.ok) {
                    console.log('✅ Feedback submitted to backend successfully');
                }
            } catch (backendError) {
                console.warn('⚠️ Backend submission failed, saved locally:', backendError);
                // Continue with local storage fallback
            }

            // Show success message
            successMessage.classList.add('show');
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Reset form
            form.reset();
            
            // Reset selections
            document.querySelectorAll('.feedback-type-card').forEach(c => {
                c.classList.remove('selected');
            });
            document.querySelectorAll('.priority-badge').forEach(b => {
                b.classList.remove('selected');
            });

            // Restore default selections
            setTimeout(() => {
                this.selectFeedbackType(document.querySelector('.feedback-type-card[data-type="general"]'));
                this.selectPriority(document.querySelector('.priority-badge[data-priority="medium"]'));
            }, 100);

            // Update stats
            this.loadFeedbackStats();

            // Hide success message after 5 seconds
            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 5000);

        } catch (error) {
            console.error('Feedback submission error:', error);
            this.showError('Failed to submit feedback. Please try again.');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Feedback';
        }
    }

    mapPriorityToUrgency(priority) {
        const mapping = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'urgent': 'Critical'
        };
        return mapping[priority] || 'Medium';
    }

    getUserInfo() {
        // Try to get user info from settings
        try {
            const userData = JSON.parse(localStorage.getItem('ipmas_user_data') || '{}');
            return {
                name: userData.profile?.fullName || 'Anonymous',
                email: userData.profile?.email || null,
                organization: userData.profile?.organization || null
            };
        } catch (e) {
            return {
                name: 'Anonymous',
                email: null,
                organization: null
            };
        }
    }

    loadFeedbackStats() {
        try {
            const allFeedback = JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
            
            // Calculate stats
            const totalFeedback = allFeedback.length;
            const resolvedFeedback = allFeedback.filter(f => f.status === 'resolved').length;
            
            // Update UI
            document.getElementById('totalFeedback').textContent = totalFeedback;
            document.getElementById('resolvedFeedback').textContent = resolvedFeedback;
            
            // Calculate average rating (if available)
            const ratings = allFeedback.filter(f => f.rating).map(f => f.rating);
            const avgRating = ratings.length > 0 
                ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                : '4.8';
            
            document.getElementById('avgRating').textContent = avgRating;
        } catch (error) {
            console.error('Error loading feedback stats:', error);
        }
    }

    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideDown 0.5s ease;
        `;
        errorDiv.innerHTML = `
            <strong>❌ Error:</strong> ${message}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: white; cursor: pointer; margin-left: 10px; font-size: 1.2rem;">×</button>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Global functions
function goToSettings() {
    window.location.href = '/settings.html';
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function viewHistory() {
    alert('View History feature coming soon!');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.feedbackManager = new FeedbackManager();
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown && !e.target.closest('.user-panel')) {
        userDropdown.style.display = 'none';
    }
});

