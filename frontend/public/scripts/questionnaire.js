/**
 * IPMAS - Smart Questionnaire System
 * Dynamic data collection for poverty index calculation
 */

class QuestionnaireSystem {
    constructor() {
        this.currentStep = 0;
        this.responses = {};
        this.isVisible = false;
        this.onComplete = null;
        this.onCancel = null;
        
        this.questions = {
            location_name: {
                type: 'text',
                label: 'Location Name',
                placeholder: 'Enter the name of the area or location',
                required: true,
                description: 'What is the name of the area or location you\'re reporting on?'
            },
            education_access: {
                type: 'group',
                label: 'Education Access',
                description: 'Please answer questions about education facilities and access in this area.',
                questions: [
                    {
                        id: 'school_distance',
                        type: 'select',
                        label: 'Distance to Nearest School',
                        options: [
                            { value: 'walking_distance', text: 'Within walking distance (less than 1km)' },
                            { value: 'moderate_distance', text: 'Moderate distance (2-5km)' },
                            { value: 'far_distance', text: 'Far distance (over 5km)' },
                            { value: 'very_far_distance', text: 'Very far (over 10km)' }
                        ],
                        required: true
                    },
                    {
                        id: 'school_condition',
                        type: 'select',
                        label: 'School Building Condition',
                        options: [
                            { value: 'excellent', text: 'Excellent - Modern, well-maintained' },
                            { value: 'good', text: 'Good - Adequate and functional' },
                            { value: 'poor', text: 'Poor - Needs repair' },
                            { value: 'very_poor', text: 'Very poor - Dangerous or collapsing' }
                        ],
                        required: true
                    },
                    {
                        id: 'classroom_availability',
                        type: 'select',
                        label: 'Classroom Availability',
                        options: [
                            { value: 'adequate', text: 'Enough classrooms for all students' },
                            { value: 'somewhat_adequate', text: 'Mostly adequate, some crowding' },
                            { value: 'insufficient', text: 'Not enough classrooms' },
                            { value: 'severely_insufficient', text: 'Severely overcrowded' }
                        ],
                        required: true
                    },
                    {
                        id: 'teacher_presence',
                        type: 'select',
                        label: 'Teacher Presence',
                        options: [
                            { value: 'regularly', text: 'Teachers regularly present and teaching' },
                            { value: 'mostly', text: 'Teachers mostly present' },
                            { value: 'sometimes', text: 'Teachers sometimes absent' },
                            { value: 'rarely', text: 'Teachers rarely present' }
                        ],
                        required: true
                    }
                ]
            },
            water_access: {
                type: 'group',
                label: 'Water Access',
                description: 'Please answer questions about water sources and availability.',
                questions: [
                    {
                        id: 'water_source',
                        type: 'select',
                        label: 'Main Water Source',
                        options: [
                            { value: 'piped_water', text: 'Piped water (tap water)' },
                            { value: 'borehole', text: 'Borehole or protected well' },
                            { value: 'unprotected_source', text: 'River, stream, or lake' },
                            { value: 'unsafe_source', text: 'Pond or unsafe source' }
                        ],
                        required: true
                    },
                    {
                        id: 'water_distance',
                        type: 'select',
                        label: 'Distance to Water Source',
                        options: [
                            { value: 'at_home', text: 'Water available at home' },
                            { value: 'walking_distance', text: 'Within walking distance' },
                            { value: 'moderate_distance', text: 'Some distance (2-5km)' },
                            { value: 'far_distance', text: 'Far distance (over 5km)' }
                        ],
                        required: true
                    },
                    {
                        id: 'water_consistency',
                        type: 'select',
                        label: 'Water Availability',
                        options: [
                            { value: 'always', text: 'Always available' },
                            { value: 'mostly', text: 'Mostly available' },
                            { value: 'sometimes', text: 'Sometimes available' },
                            { value: 'rarely', text: 'Rarely available' }
                        ],
                        required: true
                    }
                ]
            },
            health_vulnerability: {
                type: 'group',
                label: 'Health Vulnerability',
                description: 'Please answer questions about healthcare facilities and services.',
                questions: [
                    {
                        id: 'facility_distance',
                        type: 'select',
                        label: 'Distance to Health Facility',
                        options: [
                            { value: 'walking_distance', text: 'Within walking distance' },
                            { value: 'moderate_distance', text: 'Some distance (2-5km)' },
                            { value: 'far_distance', text: 'Far distance (over 5km)' },
                            { value: 'no_facility', text: 'No facility nearby (over 10km)' }
                        ],
                        required: true
                    },
                    {
                        id: 'facility_condition',
                        type: 'select',
                        label: 'Health Facility Condition',
                        options: [
                            { value: 'excellent', text: 'Excellent - Modern and well-equipped' },
                            { value: 'good', text: 'Good - Adequate and functional' },
                            { value: 'poor', text: 'Poor - Basic and limited equipment' },
                            { value: 'very_poor', text: 'Very poor - Inadequate equipment' }
                        ],
                        required: true
                    },
                    {
                        id: 'staff_availability',
                        type: 'select',
                        label: 'Medical Staff Availability',
                        options: [
                            { value: 'always', text: 'Always available' },
                            { value: 'mostly', text: 'Mostly available' },
                            { value: 'sometimes', text: 'Sometimes available' },
                            { value: 'rarely', text: 'Rarely available' }
                        ],
                        required: true
                    },
                    {
                        id: 'treatment_effectiveness',
                        type: 'select',
                        label: 'Treatment Effectiveness',
                        options: [
                            { value: 'very_effective', text: 'Very effective - Comprehensive care' },
                            { value: 'effective', text: 'Effective - Good care' },
                            { value: 'limited', text: 'Limited - Basic care only' },
                            { value: 'ineffective', text: 'Ineffective - Minimal care' }
                        ],
                        required: true
                    }
                ]
            },
            housing_quality: {
                type: 'group',
                label: 'Housing Quality Index',
                description: 'Please answer questions about housing and living conditions.',
                questions: [
                    {
                        id: 'housing_materials',
                        type: 'select',
                        label: 'Common Housing Materials',
                        options: [
                            { value: 'permanent', text: 'Concrete, brick, or stone (permanent)' },
                            { value: 'mixed', text: 'Mixed materials (partially permanent)' },
                            { value: 'temporary', text: 'Mud, wood, or temporary materials' },
                            { value: 'makeshift', text: 'Grass, plastic, or makeshift materials' }
                        ],
                        required: true
                    },
                    {
                        id: 'roofing_walls',
                        type: 'select',
                        label: 'Roofing and Walls Condition',
                        options: [
                            { value: 'proper', text: 'Proper and complete construction' },
                            { value: 'adequate', text: 'Mostly proper and functional' },
                            { value: 'partial', text: 'Partially proper with some gaps' },
                            { value: 'improper', text: 'Improper or incomplete construction' }
                        ],
                        required: true
                    },
                    {
                        id: 'overcrowding',
                        type: 'select',
                        label: 'Housing Overcrowding',
                        options: [
                            { value: 'spacious', text: 'Spacious - Adequate space for all' },
                            { value: 'reasonable', text: 'Reasonable - Mostly adequate space' },
                            { value: 'crowded', text: 'Somewhat crowded - Limited space' },
                            { value: 'overcrowded', text: 'Overcrowded - Very limited space' }
                        ],
                        required: true
                    },
                    {
                        id: 'sanitation',
                        type: 'select',
                        label: 'Sanitation Facilities',
                        options: [
                            { value: 'available', text: 'Available within the home' },
                            { value: 'shared', text: 'Shared facilities nearby' },
                            { value: 'limited', text: 'Limited or basic facilities' },
                            { value: 'unavailable', text: 'No facilities available' }
                        ],
                        required: true
                    }
                ]
            }
        };
        
        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'questionnaire-overlay';
        modalOverlay.id = 'questionnaireOverlay';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'questionnaire-modal';
        
        modalContent.innerHTML = `
            <div class="questionnaire-header">
                <h2>🌍 IPMAS Poverty Index Estimator</h2>
                <div class="questionnaire-header-actions">
                    <button class="theme-toggle-btn" id="questionnaireThemeToggle" title="Toggle theme">
                        <span class="theme-toggle-icon">🌙</span>
                    </button>
                    <button class="close-questionnaire" id="closeQuestionnaire">&times;</button>
                </div>
            </div>
            
            <div class="questionnaire-content">
                <div class="questionnaire-intro">
                    <p><strong>Welcome to the IPMAS Poverty Index Estimator.</strong></p>
                    <p>To generate insights for your selected location, please answer a few short questions. The system will use your responses to estimate key indicators through AI analysis — you do not need to provide percentages or scores directly.</p>
                    <p><em>The indicators used to calculate the Poverty Index are selected from the left sidebar dashboard controls. This form simply collects the raw data needed for AI to process and generate those indicators.</em></p>
                </div>
                
                <div class="questionnaire-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">Step 1 of 6</div>
                </div>
                
                <div class="questionnaire-body" id="questionnaireBody">
                    <!-- Questions will be rendered here -->
                </div>
                
                <div class="questionnaire-actions">
                    <button class="btn btn-secondary" id="prevQuestion" style="display: none;">Previous</button>
                    <button class="btn btn-primary" id="nextQuestion">Next</button>
                    <button class="btn btn-success" id="submitQuestionnaire" style="display: none;">Submit & Calculate</button>
                    <button class="btn btn-danger" id="cancelQuestionnaire">Cancel</button>
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        
        // Initially hidden
        modalOverlay.style.display = 'none';
    }

    setupEventListeners() {
        // Close button
        document.getElementById('closeQuestionnaire').addEventListener('click', () => this.hide());
        
        // Cancel button
        document.getElementById('cancelQuestionnaire').addEventListener('click', () => this.hide());
        
        // Navigation buttons
        document.getElementById('prevQuestion').addEventListener('click', () => this.previousStep());
        document.getElementById('nextQuestion').addEventListener('click', () => this.nextStep());
        document.getElementById('submitQuestionnaire').addEventListener('click', () => this.submit());
        
        // Theme toggle button
        const themeToggle = document.getElementById('questionnaireThemeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateThemeToggleIcon();
        }
        
        // Close on overlay click
        document.getElementById('questionnaireOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'questionnaireOverlay') {
                this.hide();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    toggleTheme() {
        // Toggle theme using themeManager if available
        if (window.themeManager) {
            const currentTheme = window.themeManager.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'default' : 'dark';
            window.themeManager.setTheme(newTheme);
            this.updateThemeToggleIcon();
        } else {
            // Fallback: toggle body class directly
            document.body.classList.toggle('theme-dark');
            this.updateThemeToggleIcon();
        }
    }

    updateThemeToggleIcon() {
        const themeToggle = document.getElementById('questionnaireThemeToggle');
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('.theme-toggle-icon');
        if (!icon) return;
        
        const isDark = document.body.classList.contains('theme-dark') || 
                      (window.themeManager && window.themeManager.getCurrentTheme() === 'dark');
        icon.textContent = isDark ? '☀️' : '🌙';
    }

    show(onComplete = null, onCancel = null) {
        this.onComplete = onComplete;
        this.onCancel = onCancel;
        this.currentStep = 0;
        this.responses = {};
        
        const overlay = document.getElementById('questionnaireOverlay');
        overlay.style.display = 'flex';
        this.isVisible = true;
        
        // Update theme toggle icon when showing
        this.updateThemeToggleIcon();
        
        this.renderCurrentStep();
        this.updateProgress();
        this.updateButtons();
    }

    hide() {
        const overlay = document.getElementById('questionnaireOverlay');
        overlay.style.display = 'none';
        this.isVisible = false;
        
        if (this.onCancel) {
            this.onCancel();
        }
    }

    renderCurrentStep() {
        const body = document.getElementById('questionnaireBody');
        const steps = this.getQuestionSteps();
        const currentStepData = steps[this.currentStep];
        
        if (!currentStepData) return;
        
        let html = '';
        
        if (currentStepData.type === 'intro') {
            html = this.renderIntroStep();
        } else if (currentStepData.type === 'group') {
            html = this.renderGroupStep(currentStepData);
        } else if (currentStepData.type === 'summary') {
            html = this.renderSummaryStep();
        }
        
        body.innerHTML = html;
        this.setupStepEventListeners();
    }

    renderIntroStep() {
        return `
            <div class="question-step intro-step">
                <div class="step-icon">📍</div>
                <h3>Location Information</h3>
                <p>Let's start by identifying the location you're reporting on.</p>
                
                <div class="form-group">
                    <label for="locationName">Location Name *</label>
                    <input type="text" id="locationName" placeholder="Enter the name of the area or location" required>
                    <small class="form-help">What is the name of the area or location you're reporting on?</small>
                </div>
            </div>
        `;
    }

    renderGroupStep(stepData) {
        const questions = stepData.questions;
        let html = `
            <div class="question-step group-step">
                <div class="step-icon">${this.getStepIcon(stepData.key)}</div>
                <h3>${stepData.label}</h3>
                <p>${stepData.description}</p>
                
                <div class="questions-container">
        `;
        
        questions.forEach((question, index) => {
            html += `
                <div class="form-group">
                    <label for="${question.id}">${question.label} *</label>
                    <select id="${question.id}" required>
                        <option value="">Select an option...</option>
                        ${question.options.map(option => 
                            `<option value="${option.value}">${option.text}</option>`
                        ).join('')}
                    </select>
                    ${question.help ? `<small class="form-help">${question.help}</small>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    renderSummaryStep() {
        const locationName = this.responses.location_name || 'Unknown Location';
        
        return `
            <div class="question-step summary-step">
                <div class="step-icon">📊</div>
                <h3>Review Your Responses</h3>
                <p>Please review your responses before submitting. The system will use this information to calculate the poverty index for <strong>${locationName}</strong>.</p>
                
                <div class="summary-content">
                    <div class="summary-section">
                        <h4>📍 Location</h4>
                        <p>${locationName}</p>
                    </div>
                    
                    ${this.renderSummarySection('🎓 Education Access', this.responses.education_access)}
                    ${this.renderSummarySection('🚰 Water Access', this.responses.water_access)}
                    ${this.renderSummarySection('🏥 Health Vulnerability', this.responses.health_vulnerability)}
                    ${this.renderSummarySection('🏠 Housing Quality', this.responses.housing_quality)}
                </div>
                
                <div class="summary-note">
                    <p><strong>Note:</strong> Once submitted, the system will use AI analysis to process your responses and calculate the poverty index based on the indicators selected in the dashboard controls.</p>
                </div>
            </div>
        `;
    }

    renderSummarySection(title, responses) {
        if (!responses) return '';
        
        let html = `
            <div class="summary-section">
                <h4>${title}</h4>
                <ul>
        `;
        
        Object.entries(responses).forEach(([key, value]) => {
            const question = this.getQuestionByKey(key);
            if (question) {
                const option = question.options.find(opt => opt.value === value);
                html += `<li><strong>${question.label}:</strong> ${option ? option.text : value}</li>`;
            }
        });
        
        html += `
                </ul>
            </div>
        `;
        
        return html;
    }

    getQuestionByKey(key) {
        for (const group of Object.values(this.questions)) {
            if (group.questions) {
                const question = group.questions.find(q => q.id === key);
                if (question) return question;
            }
        }
        return null;
    }

    getStepIcon(stepKey) {
        const icons = {
            location_name: '📍',
            education_access: '🎓',
            water_access: '🚰',
            health_vulnerability: '🏥',
            housing_quality: '🏠',
            summary: '📊'
        };
        return icons[stepKey] || '❓';
    }

    getQuestionSteps() {
        const steps = [
            { type: 'intro', key: 'location_name' }
        ];
        
        // Add group steps for each indicator
        ['education_access', 'water_access', 'health_vulnerability', 'housing_quality'].forEach(key => {
            const group = this.questions[key];
            if (group) {
                steps.push({ ...group, key });
            }
        });
        
        steps.push({ type: 'summary', key: 'summary' });
        return steps;
    }

    setupStepEventListeners() {
        // Location name input
        const locationInput = document.getElementById('locationName');
        if (locationInput) {
            locationInput.addEventListener('input', (e) => {
                this.responses.location_name = e.target.value;
            });
        }
        
        // Group question selects
        const selects = document.querySelectorAll('.questions-container select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const groupKey = this.getCurrentGroupKey();
                if (!this.responses[groupKey]) {
                    this.responses[groupKey] = {};
                }
                this.responses[groupKey][e.target.id] = e.target.value;
            });
        });
    }

    getCurrentGroupKey() {
        const steps = this.getQuestionSteps();
        const currentStep = steps[this.currentStep];
        return currentStep ? currentStep.key : null;
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.renderCurrentStep();
            this.updateProgress();
            this.updateButtons();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderCurrentStep();
            this.updateProgress();
            this.updateButtons();
        }
    }

    validateCurrentStep() {
        const steps = this.getQuestionSteps();
        const currentStep = steps[this.currentStep];
        
        if (currentStep.type === 'intro') {
            const locationName = document.getElementById('locationName');
            if (!locationName || !locationName.value.trim()) {
                this.showError('Please enter a location name.');
                return false;
            }
        } else if (currentStep.type === 'group') {
            const selects = document.querySelectorAll('.questions-container select');
            for (const select of selects) {
                if (!select.value) {
                    this.showError('Please answer all questions before proceeding.');
                    return false;
                }
            }
        }
        
        return true;
    }

    updateProgress() {
        const steps = this.getQuestionSteps();
        const progress = ((this.currentStep + 1) / steps.length) * 100;
        
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `Step ${this.currentStep + 1} of ${steps.length}`;
    }

    updateButtons() {
        const steps = this.getQuestionSteps();
        const isFirstStep = this.currentStep === 0;
        const isLastStep = this.currentStep === steps.length - 1;
        
        document.getElementById('prevQuestion').style.display = isFirstStep ? 'none' : 'inline-flex';
        document.getElementById('nextQuestion').style.display = isLastStep ? 'none' : 'inline-flex';
        document.getElementById('submitQuestionnaire').style.display = isLastStep ? 'inline-flex' : 'none';
    }

    async submit() {
        try {
            // Validate all responses
            if (!this.responses.location_name) {
                this.showError('Location name is required.');
                return;
            }
            
            // Check if at least one indicator group has responses
            const hasResponses = ['education_access', 'water_access', 'health_vulnerability', 'housing_quality']
                .some(key => this.responses[key] && Object.keys(this.responses[key]).length > 0);
            
            if (!hasResponses) {
                this.showError('Please provide responses for at least one indicator group.');
                return;
            }
            
            // Show loading state
            this.showLoading(true);
            
            // Process responses
            const result = await this.processResponses();
            
            this.showLoading(false);
            
            // Display results in the panel instead of closing
            this.displayResults(result);
            
            // Still call onComplete callback for main.js to handle
            if (this.onComplete) {
                this.onComplete(result);
            }
            
        } catch (error) {
            this.showLoading(false);
            this.showError('An error occurred while processing your responses. Please try again.');
            console.error('Questionnaire submission error:', error);
        }
    }

    async processResponses() {
        // Send responses to server for processing
        const apiUrl = window.API_CONFIG 
            ? window.API_CONFIG.getApiUrl('/api/v1/questionnaire/process')
            : '/api/v1/questionnaire/process';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location_name: this.responses.location_name,
                responses: this.responses
            })
        });
        
        if (!response.ok) {
            let errorData;
            try {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: 'Failed to process questionnaire responses' };
            }
            throw new Error(errorData.message || errorData.error || 'Failed to process questionnaire responses');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || result.error || 'Failed to process questionnaire responses');
        }
        
        return result;
    }

    displayResults(result) {
        const locationData = result.data || result;
        if (!locationData) {
            this.showError('No results data available');
            return;
        }
        
        // Get poverty level text
        let povertyLevelText = 'Unknown';
        let povertyLevelCategory = 'unknown';
        if (locationData.poverty_level) {
            if (typeof locationData.poverty_level === 'string') {
                povertyLevelText = locationData.poverty_level;
                povertyLevelCategory = locationData.poverty_level.toLowerCase().replace(/\s+/g, '-');
            } else if (locationData.poverty_level.level) {
                povertyLevelText = locationData.poverty_level.level;
                povertyLevelCategory = locationData.poverty_level.category || locationData.poverty_level.level.toLowerCase().replace(/\s+/g, '-');
            }
        }
        
        const povertyIndex = locationData.poverty_index || locationData.povertyIndex || 'N/A';
        const confidenceScore = locationData.confidence_score || locationData.confidenceScore || 'N/A';
        
        // Hide progress bar and navigation buttons
        const progressBar = document.querySelector('.questionnaire-progress');
        if (progressBar) progressBar.style.display = 'none';
        
        const actions = document.querySelector('.questionnaire-actions');
        if (actions) {
            // Hide all buttons except cancel/close
            const buttons = actions.querySelectorAll('button');
            buttons.forEach(btn => {
                if (btn.id === 'cancelQuestionnaire' || btn.id === 'closeQuestionnaire') {
                    btn.style.display = 'inline-block';
                    // Change cancel button text to "Close" when showing results
                    if (btn.id === 'cancelQuestionnaire') {
                        btn.textContent = 'Close';
                        btn.className = 'btn btn-secondary';
                    }
                } else {
                    btn.style.display = 'none';
                }
            });
        }
        
        // Replace questionnaire body with results
        const body = document.getElementById('questionnaireBody');
        if (body) {
            body.innerHTML = `
                <div class="questionnaire-results">
                    <div class="results-header">
                        <h3>✅ Results for ${locationData.location_name}</h3>
                    </div>
                    
                    <div class="results-summary">
                        <div class="result-card main-result">
                            <div class="result-label">Poverty Index</div>
                            <div class="result-value poverty-index">${povertyIndex}%</div>
                            <div class="result-level ${povertyLevelCategory}">${povertyLevelText}</div>
                        </div>
                        
                        <div class="result-card">
                            <div class="result-label">Confidence Score</div>
                            <div class="result-value">${confidenceScore}%</div>
                        </div>
                    </div>
                    
                    ${locationData.indicators ? `
                    <div class="results-indicators">
                        <h4>Indicator Values</h4>
                        <div class="indicators-grid">
                            ${Object.entries(locationData.indicators).map(([indicator, value]) => `
                                <div class="indicator-item">
                                    <span class="indicator-name">${indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    <span class="indicator-value">${value}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${locationData.breakdown ? `
                    <div class="results-breakdown">
                        <h4>Breakdown by Indicator</h4>
                        <div class="breakdown-list">
                            ${Object.entries(locationData.breakdown).map(([indicator, info]) => `
                                <div class="breakdown-item">
                                    <div class="breakdown-header">
                                        <span class="breakdown-name">${indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                        <span class="breakdown-value">${info.adjusted_value ? info.adjusted_value.toFixed(1) : 'N/A'}%</span>
                                    </div>
                                    ${info.weight ? `<div class="breakdown-weight">Weight: ${(info.weight * 100).toFixed(1)}%</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${locationData.recommendations && locationData.recommendations.length > 0 ? `
                    <div class="results-recommendations">
                        <h4>Recommendations</h4>
                        <ul class="recommendations-list">
                            ${locationData.recommendations.map(rec => {
                                // Handle both string and object formats
                                if (typeof rec === 'string') {
                                    return `<li>${rec}</li>`;
                                } else if (rec && typeof rec === 'object') {
                                    // Extract recommendation text
                                    const recText = rec.recommendation || rec.text || rec.message || JSON.stringify(rec);
                                    const priority = rec.priority ? `<span class="priority-badge ${rec.priority}">${rec.priority}</span>` : '';
                                    const impact = rec.impact ? `<div class="rec-impact">${rec.impact}</div>` : '';
                                    return `<li>${priority}${recText}${impact}</li>`;
                                } else {
                                    return `<li>${String(rec)}</li>`;
                                }
                            }).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <div class="results-footer">
                        <p class="results-note">You can close this panel when you're done reviewing the results.</p>
                    </div>
                </div>
            `;
        }
    }

    showError(message) {
        // Remove existing error messages
        const existingError = document.querySelector('.questionnaire-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'questionnaire-error';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
        `;
        
        // Insert after progress bar
        const progressBar = document.querySelector('.questionnaire-progress');
        progressBar.insertAdjacentElement('afterend', errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showLoading(show) {
        const actions = document.querySelector('.questionnaire-actions');
        const buttons = actions.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.disabled = show;
        });
        
        if (show) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'questionnaire-loading';
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Processing your responses...</div>
            `;
            actions.appendChild(loadingDiv);
        } else {
            const loadingDiv = actions.querySelector('.questionnaire-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }
}

// Global instance
window.questionnaireSystem = new QuestionnaireSystem();

