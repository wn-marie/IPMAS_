/**
 * IPMAS - Local Projects & Impact JavaScript
 * Handles project management, feedback, and impact tracking
 */

class ProjectsManager {
    constructor() {
        this.currentTab = 'ongoing';
        this.projects = {
            ongoing: [
                {
                    id: 'kibera-water',
                    title: 'Kibera Water Access Initiative',
                    location: 'Kibera, Nairobi County',
                    status: 'ongoing',
                    progress: 75,
                    description: 'Installing 15 new water points and improving existing infrastructure to provide clean water access to 5,000+ residents in Kibera informal settlement.',
                    metrics: {
                        progress: '75%',
                        waterPoints: '12/15',
                        peopleServed: '4,200',
                        budgetUsed: '₵2.1M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 12,
                        studentsSupported: 0,
                        jobsCreated: 25
                    }
                },
                {
                    id: 'mathare-education',
                    title: 'Mathare Education Enhancement',
                    location: 'Mathare, Nairobi County',
                    status: 'ongoing',
                    progress: 60,
                    description: 'Building 3 new classrooms and providing educational materials to improve learning outcomes for 500+ children in Mathare slum.',
                    metrics: {
                        progress: '60%',
                        classrooms: '2/3',
                        students: '320',
                        budgetUsed: '₵1.8M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 0,
                        studentsSupported: 320,
                        jobsCreated: 15
                    }
                },
                {
                    id: 'mombasa-health',
                    title: 'Mombasa Health Clinic',
                    location: 'Likoni, Mombasa County',
                    status: 'ongoing',
                    progress: 45,
                    description: 'Establishing a community health clinic with basic medical equipment and trained staff to serve 3,000+ residents in Likoni area.',
                    metrics: {
                        progress: '45%',
                        clinics: '1',
                        patients: '1,350',
                        budgetUsed: '₵3.2M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 0,
                        studentsSupported: 0,
                        jobsCreated: 12
                    }
                },
                {
                    id: 'kisumu-skills',
                    title: 'Kisumu Skills Training',
                    location: 'Kondele, Kisumu County',
                    status: 'ongoing',
                    progress: 80,
                    description: 'Providing vocational training in tailoring, carpentry, and computer skills to 200+ youth for better employment opportunities.',
                    metrics: {
                        progress: '80%',
                        trainees: '165',
                        graduates: '89',
                        budgetUsed: '₵1.5M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 0,
                        studentsSupported: 165,
                        jobsCreated: 89
                    }
                }
            ],
            planned: [
                {
                    id: 'nakuru-solar',
                    title: 'Nakuru Solar Power Initiative',
                    location: 'Nakuru Town, Nakuru County',
                    status: 'planned',
                    progress: 0,
                    description: 'Installing solar panels in 500 households to provide clean, affordable electricity and reduce energy poverty in Nakuru.',
                    metrics: {
                        progress: '0%',
                        households: '0/500',
                        expectedImpact: '2,500',
                        budget: '₵8.5M'
                    },
                    impact: {
                        housesImproved: 500,
                        waterPoints: 0,
                        studentsSupported: 0,
                        jobsCreated: 45
                    }
                },
                {
                    id: 'eldoret-market',
                    title: 'Eldoret Market Development',
                    location: 'Eldoret, Uasin Gishu County',
                    status: 'planned',
                    progress: 0,
                    description: 'Building a modern market facility with proper sanitation, storage, and security to support 300+ vendors and improve trade.',
                    metrics: {
                        progress: '0%',
                        vendorStalls: '0/300',
                        expectedImpact: '1,500',
                        budget: '₵12M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 0,
                        studentsSupported: 0,
                        jobsCreated: 300
                    }
                }
            ],
            completed: [
                {
                    id: 'thika-roads',
                    title: 'Thika Road Infrastructure',
                    location: 'Thika, Kiambu County',
                    status: 'completed',
                    progress: 100,
                    description: 'Successfully upgraded 5km of roads with proper drainage and lighting, improving transportation and safety for 10,000+ residents.',
                    metrics: {
                        progress: '100%',
                        roadsBuilt: '5km',
                        peopleServed: '10,000',
                        totalCost: '₵15M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 0,
                        studentsSupported: 0,
                        jobsCreated: 120
                    }
                },
                {
                    id: 'meru-water',
                    title: 'Meru Water Treatment Plant',
                    location: 'Meru, Meru County',
                    status: 'completed',
                    progress: 100,
                    description: 'Built a water treatment facility providing clean water to 8,000+ residents and reducing waterborne diseases by 60%.',
                    metrics: {
                        progress: '100%',
                        treatmentPlants: '1',
                        peopleServed: '8,000',
                        totalCost: '₵18M'
                    },
                    impact: {
                        housesImproved: 0,
                        waterPoints: 1,
                        studentsSupported: 0,
                        jobsCreated: 35
                    }
                }
            ]
        };
        
        this.totalImpact = {
            housesImproved: 2340,
            waterPoints: 89,
            studentsSupported: 1567,
            jobsCreated: 890
        };
        
        this.init();
    }

    init() {
        console.log('🏗️ Projects Manager Initializing...');
        this.updateStatistics();
        this.setupEventListeners();
        this.showTab('ongoing');
        console.log('✅ Projects Manager initialized successfully');
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.textContent.toLowerCase().replace(' projects', '');
                this.showTab(tabName);
            });
        });

        // Feedback form
        const feedbackForm = document.querySelector('.feedback-form');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', (e) => {
                this.submitFeedback(e);
            });
        }
    }

    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
            if (button.textContent.toLowerCase().includes(tabName)) {
                button.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.currentTab = tabName;
        this.renderProjects(tabName);
    }

    renderProjects(tabName) {
        const projectsGrid = document.querySelector(`#${tabName} .projects-grid`);
        if (!projectsGrid) return;

        const projects = this.projects[tabName] || [];
        
        if (projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="no-projects">
                    <div class="no-projects-icon">📋</div>
                    <h3>No ${tabName} projects</h3>
                    <p>Check back later for new projects in this category.</p>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = projects.map(project => this.createProjectCard(project)).join('');
    }

    createProjectCard(project) {
        const statusClass = `status-${project.status}`;
        const statusText = project.status === 'ongoing' ? '🔄 Ongoing' : 
                          project.status === 'planned' ? '📅 Planned' : '✅ Completed';
        
        const actionButtons = project.status === 'completed' ? 
            `<button class="btn btn-primary" onclick="viewProjectDetails('${project.id}')">View Details</button>
             <button class="btn btn-secondary" onclick="viewImpact('${project.id}')">View Impact</button>` :
            `<button class="btn btn-primary" onclick="viewProjectDetails('${project.id}')">View Details</button>
             <button class="btn btn-secondary" onclick="provideFeedback('${project.id}')">${project.status === 'ongoing' ? 'Give Feedback' : 'Support Project'}</button>`;

        return `
            <div class="project-card">
                <div class="project-header">
                    <div class="project-title">${project.title}</div>
                    <div class="project-location">📍 ${project.location}</div>
                </div>
                <div class="project-body">
                    <div class="project-status ${statusClass}">${statusText}</div>
                    <div class="project-description">
                        ${project.description}
                    </div>
                    <div class="project-metrics">
                        ${Object.entries(project.metrics).map(([key, value]) => `
                            <div class="metric">
                                <div class="metric-value">${value}</div>
                                <div class="metric-label">${this.formatMetricLabel(key)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="project-actions">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }

    formatMetricLabel(key) {
        const labels = {
            progress: 'Progress',
            waterPoints: 'Water Points',
            peopleServed: 'People Served',
            budgetUsed: 'Budget Used',
            classrooms: 'Classrooms',
            students: 'Students',
            budget: 'Budget',
            trainees: 'Trainees',
            graduates: 'Graduates',
            clinics: 'Clinics',
            patients: 'Patients',
            households: 'Households',
            expectedImpact: 'Expected Impact',
            vendorStalls: 'Vendor Stalls',
            roadsBuilt: 'Roads Built',
            totalCost: 'Total Cost',
            treatmentPlants: 'Treatment Plants'
        };
        return labels[key] || key;
    }

    updateStatistics() {
        // Update project counts
        document.getElementById('totalOngoing').textContent = this.projects.ongoing.length;
        document.getElementById('totalPlanned').textContent = this.projects.planned.length;
        document.getElementById('totalCompleted').textContent = this.projects.completed.length;
        
        // Calculate total lives impacted
        const totalLivesImpacted = this.projects.ongoing.reduce((sum, project) => {
            return sum + (parseInt(project.metrics.peopleServed?.replace(/,/g, '') || 0));
        }, 0) + this.projects.completed.reduce((sum, project) => {
            return sum + (parseInt(project.metrics.peopleServed?.replace(/,/g, '') || 0));
        }, 0);
        
        document.getElementById('totalImpact').textContent = totalLivesImpacted.toLocaleString();
        
        // Update impact indicators
        document.querySelector('.impact-indicator:nth-child(1) .impact-value').textContent = this.totalImpact.housesImproved.toLocaleString();
        document.querySelector('.impact-indicator:nth-child(2) .impact-value').textContent = this.totalImpact.waterPoints;
        document.querySelector('.impact-indicator:nth-child(3) .impact-value').textContent = this.totalImpact.studentsSupported.toLocaleString();
        document.querySelector('.impact-indicator:nth-child(4) .impact-value').textContent = this.totalImpact.jobsCreated.toLocaleString();
    }

    submitFeedback(event) {
        event.preventDefault();
        
        const projectSelect = document.getElementById('projectSelect');
        const feedbackType = document.getElementById('feedbackType');
        const feedbackMessage = document.getElementById('feedbackMessage');
        const contactInfo = document.getElementById('contactInfo');
        
        if (!projectSelect.value || !feedbackType.value || !feedbackMessage.value.trim()) {
            alert('Please fill in all required fields.');
            return;
        }
        
        const feedback = {
            project: projectSelect.value,
            type: feedbackType.value,
            message: feedbackMessage.value.trim(),
            contact: contactInfo.value.trim(),
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        // Save feedback to localStorage
        const savedFeedback = JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
        savedFeedback.push(feedback);
        localStorage.setItem('ipmas_feedback', JSON.stringify(savedFeedback));
        
        // Show success message
        alert('✅ Thank you for your feedback!\n\nYour feedback has been submitted successfully. We will review it and take appropriate action.');
        
        // Reset form
        event.target.reset();
    }
}

// Global functions for project actions
function showTab(tabName) {
    if (window.projectsManager) {
        window.projectsManager.showTab(tabName);
    }
}

function viewProjectDetails(projectId) {
    const project = findProjectById(projectId);
    if (!project) {
        alert('Project not found.');
        return;
    }
    
    const details = `
🏗️ ${project.title}
📍 Location: ${project.location}
📊 Status: ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}
📈 Progress: ${project.metrics.progress}

📝 Description:
${project.description}

📊 Metrics:
${Object.entries(project.metrics).map(([key, value]) => 
    `• ${window.projectsManager?.formatMetricLabel(key) || key}: ${value}`
).join('\n')}

🎯 Expected Impact:
• Houses Improved: ${project.impact.housesImproved}
• Water Points: ${project.impact.waterPoints}
• Students Supported: ${project.impact.studentsSupported}
• Jobs Created: ${project.impact.jobsCreated}
    `;
    
    alert(details);
}

function viewImpact(projectId) {
    const project = findProjectById(projectId);
    if (!project) {
        alert('Project not found.');
        return;
    }
    
    const impact = `
🎯 Impact Report: ${project.title}

📊 Direct Impact:
• Houses Improved: ${project.impact.housesImproved}
• Water Points: ${project.impact.waterPoints}
• Students Supported: ${project.impact.studentsSupported}
• Jobs Created: ${project.impact.jobsCreated}

📈 Long-term Benefits:
• Economic Development: ${project.impact.jobsCreated} new employment opportunities
• Social Impact: ${project.impact.studentsSupported} students supported
• Infrastructure: ${project.impact.housesImproved} houses improved
• Health & Sanitation: ${project.impact.waterPoints} water points added

💰 Investment Efficiency:
• Cost per person served: ₵${Math.round(parseInt(project.metrics.totalCost?.replace(/[₵,]/g, '') || project.metrics.budgetUsed?.replace(/[₵,]/g, '') || '0') / parseInt(project.metrics.peopleServed?.replace(/,/g, '') || '1'))}
• ROI: High (Community development multiplier effect)
    `;
    
    alert(impact);
}

function provideFeedback(projectId) {
    const project = findProjectById(projectId);
    if (!project) {
        alert('Project not found.');
        return;
    }
    
    // Pre-fill the feedback form with the selected project
    const projectSelect = document.getElementById('projectSelect');
    if (projectSelect) {
        projectSelect.value = projectId;
    }
    
    // Scroll to feedback section
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) {
        feedbackSection.scrollIntoView({ behavior: 'smooth' });
        feedbackSection.style.border = '2px solid var(--primary-color)';
        setTimeout(() => {
            feedbackSection.style.border = 'none';
        }, 3000);
    }
}

function supportProject(projectId) {
    const project = findProjectById(projectId);
    if (!project) {
        alert('Project not found.');
        return;
    }
    
    const support = confirm(`
🤝 Support Project: ${project.title}

Would you like to support this project?

Support options:
• Volunteer your time
• Donate resources
• Share with your network
• Provide technical expertise

Click OK to proceed with support options.
    `);
    
    if (support) {
        alert(`
✅ Thank you for your interest in supporting "${project.title}"!

📧 Contact Information:
• Email: projects@ipmas.go.ke
• Phone: +254 718 731 762
• Address: IPMAS Headquarters, Nairobi

We will contact you within 24 hours with support opportunities.
        `);
    }
}

function goToSettings() {
    window.location.href = '/settings.html';
}

function findProjectById(projectId) {
    if (!window.projectsManager) return null;
    
    for (const category of Object.values(window.projectsManager.projects)) {
        const project = category.find(p => p.id === projectId);
        if (project) return project;
    }
    return null;
}

// Initialize the projects manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectsManager = new ProjectsManager();
});
