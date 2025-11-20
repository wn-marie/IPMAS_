/**
 * IPMAS Theme Manager
 * Provides global theme application and persistence across all pages.
 */

class ThemeManager {
    constructor() {
        this.THEME_KEY = 'ipmas_user_data';
        this.LAYOUT_KEY = 'ipmas_dashboard_layout';
        this.defaultTheme = 'default';
        this.themes = {
            'default': {
                primary: '#2E8B57',
                primaryDark: '#1F5F3F',
                primaryLight: '#90EE90',
                secondary: '#4682B4',
                secondaryDark: '#3a6b8a',
                secondaryLight: '#6fa6d1'
            },
            'blue': {
                primary: '#4682B4',
                primaryDark: '#305a83',
                primaryLight: '#6fa6d1',
                secondary: '#2E8B57',
                secondaryDark: '#1F5F3F',
                secondaryLight: '#58c57d'
            },
            'purple': {
                primary: '#6f42c1',
                primaryDark: '#4b2f86',
                primaryLight: '#9c74e1',
                secondary: '#e83e8c',
                secondaryDark: '#b22d64',
                secondaryLight: '#f07fb7'
            },
            'orange': {
                primary: '#fd7e14',
                primaryDark: '#c75c0a',
                primaryLight: '#ff9f50',
                secondary: '#ffc107',
                secondaryDark: '#d39e00',
                secondaryLight: '#ffda6a'
            },
            'dark': {
                primary: '#20c997',
                primaryDark: '#159c74',
                primaryLight: '#4ae3b5',
                secondary: '#6c757d',
                secondaryDark: '#4b5257',
                secondaryLight: '#8d959a'
            }
        };

        this.currentTheme = this.getSavedTheme();
        this.applyTheme(this.currentTheme);
    }

    getSavedTheme() {
        try {
            const userData = JSON.parse(localStorage.getItem(this.THEME_KEY) || '{}');
            if (userData.preferences && userData.preferences.theme) {
                return userData.preferences.theme;
            }
        } catch (error) {
            console.warn('ThemeManager: unable to parse ipmas_user_data', error);
        }

        try {
            const layoutData = JSON.parse(localStorage.getItem(this.LAYOUT_KEY) || '{}');
            if (layoutData.theme) {
                return layoutData.theme;
            }
        } catch (error) {
            console.warn('ThemeManager: unable to parse ipmas_dashboard_layout', error);
        }

        return this.defaultTheme;
    }

    setTheme(theme) {
        const selectedTheme = this.themes[theme] ? theme : this.defaultTheme;
        this.applyTheme(selectedTheme);
        this.persistTheme(selectedTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    applyTheme(theme) {
        const themeColors = this.themes[theme] || this.themes[this.defaultTheme];
        const rootStyle = document.documentElement.style;

        document.documentElement.setAttribute('data-theme', theme);

        rootStyle.setProperty('--primary-color', themeColors.primary);
        rootStyle.setProperty('--primary-dark', themeColors.primaryDark || themeColors.primary);
        rootStyle.setProperty('--primary-light', themeColors.primaryLight || themeColors.primary);
        rootStyle.setProperty('--secondary-color', themeColors.secondary);
        rootStyle.setProperty('--secondary-dark', themeColors.secondaryDark || themeColors.secondary);
        rootStyle.setProperty('--secondary-light', themeColors.secondaryLight || themeColors.secondary);
        rootStyle.setProperty('--panel-header-bg', `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`);

        if (theme === 'dark') {
            rootStyle.setProperty('--bg-primary', '#1a1a1a');
            rootStyle.setProperty('--bg-secondary', '#242424');
            rootStyle.setProperty('--text-primary', '#f8f9fa');
            rootStyle.setProperty('--text-secondary', '#ced4da');
            rootStyle.setProperty('--border-color', '#343a40');
            rootStyle.setProperty('--border-light', '#3f474f');
            rootStyle.setProperty('--border-dark', '#495057');
            rootStyle.setProperty('--panel-bg', 'rgba(36, 36, 36, 0.96)');
            rootStyle.setProperty('--panel-border', 'rgba(255, 255, 255, 0.08)');
            rootStyle.setProperty('--panel-shadow', '0 10px 28px rgba(0, 0, 0, 0.55)');
            rootStyle.setProperty('--panel-header-text', '#f8f9fa');
            rootStyle.setProperty('--panel-header-button-bg', 'rgba(0, 0, 0, 0.35)');
            rootStyle.setProperty('--panel-header-button-hover', 'rgba(0, 0, 0, 0.5)');
            rootStyle.setProperty('--panel-section-divider', 'rgba(255, 255, 255, 0.08)');
            rootStyle.setProperty('--control-bg', '#1f1f1f');
            rootStyle.setProperty('--control-bg-hover', '#262626');
            rootStyle.setProperty('--control-border', '#3a3f44');
            rootStyle.setProperty('--control-text', '#f8f9fa');
            rootStyle.setProperty('--legend-heading-color', '#f8f9fa');
            rootStyle.setProperty('--legend-muted-color', '#ced4da');
            rootStyle.setProperty('--gray-100', '#2a2d31');
            rootStyle.setProperty('--gray-200', '#32373c');
            rootStyle.setProperty('--gray-300', '#3a3f44');
            rootStyle.setProperty('--light-sky-blue', 'rgba(77, 171, 247, 0.18)');
            rootStyle.setProperty('--text-on-sky', '#e9f4ff');
            rootStyle.setProperty('--footer-bg', 'linear-gradient(135deg, #1b1f24 0%, #262c33 100%)');
            rootStyle.setProperty('--footer-text', '#f8f9fa');
            rootStyle.setProperty('--footer-text-muted', '#adb5bd');
            rootStyle.setProperty('--footer-link', '#dee2e6');
            rootStyle.setProperty('--footer-link-hover', themeColors.primary);
            rootStyle.setProperty('--footer-divider', 'rgba(255, 255, 255, 0.12)');
            this.updateBodyClass(true);
        } else {
            rootStyle.setProperty('--bg-primary', '#ffffff');
            rootStyle.setProperty('--bg-secondary', '#f8f9fa');
            rootStyle.setProperty('--text-primary', '#212529');
            rootStyle.setProperty('--text-secondary', '#6c757d');
            rootStyle.setProperty('--border-color', '#dee2e6');
            rootStyle.setProperty('--border-light', '#e9ecef');
            rootStyle.setProperty('--border-dark', '#adb5bd');
            rootStyle.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.98)');
            rootStyle.setProperty('--panel-border', 'rgba(0, 0, 0, 0.08)');
            rootStyle.setProperty('--panel-shadow', '0 6px 18px rgba(0, 0, 0, 0.12)');
            rootStyle.setProperty('--panel-header-text', '#ffffff');
            rootStyle.setProperty('--panel-header-button-bg', 'rgba(255, 255, 255, 0.25)');
            rootStyle.setProperty('--panel-header-button-hover', 'rgba(255, 255, 255, 0.4)');
            rootStyle.setProperty('--panel-section-divider', 'rgba(0, 0, 0, 0.08)');
            rootStyle.setProperty('--control-bg', 'rgba(255, 255, 255, 0.95)');
            rootStyle.setProperty('--control-bg-hover', '#ffffff');
            rootStyle.setProperty('--control-border', 'rgba(0, 0, 0, 0.08)');
            rootStyle.setProperty('--control-text', '#212529');
            rootStyle.setProperty('--legend-heading-color', '#212529');
            rootStyle.setProperty('--legend-muted-color', '#6c757d');
            rootStyle.setProperty('--gray-100', '#f1f3f5');
            rootStyle.setProperty('--gray-200', '#e9ecef');
            rootStyle.setProperty('--gray-300', '#dee2e6');
            rootStyle.setProperty('--light-sky-blue', 'rgba(77, 171, 247, 0.12)');
            rootStyle.setProperty('--text-on-sky', '#0b1a2c');
            rootStyle.setProperty('--footer-bg', 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)');
            rootStyle.setProperty('--footer-text', 'rgba(255,255,255,0.95)');
            rootStyle.setProperty('--footer-text-muted', 'rgba(255,255,255,0.7)');
            rootStyle.setProperty('--footer-link', 'rgba(255,255,255,0.85)');
            rootStyle.setProperty('--footer-link-hover', themeColors.primary);
            rootStyle.setProperty('--footer-divider', 'rgba(255, 255, 255, 0.15)');
            this.updateBodyClass(false);
        }

        this.currentTheme = theme;
    }

    updateBodyClass(enableDark) {
        const applyClassChange = () => {
            if (!document.body) return;
            document.body.classList.toggle('theme-dark', enableDark);
        };

        if (document.body) {
            applyClassChange();
        } else {
            document.addEventListener('DOMContentLoaded', applyClassChange, { once: true });
        }
    }

    persistTheme(theme) {
        try {
            const userData = JSON.parse(localStorage.getItem(this.THEME_KEY) || '{}');
            const updatedUserData = {
                ...userData,
                preferences: {
                    ...userData.preferences,
                    theme
                }
            };
            localStorage.setItem(this.THEME_KEY, JSON.stringify(updatedUserData));
        } catch (error) {
            console.warn('ThemeManager: unable to persist theme in ipmas_user_data', error);
        }

        try {
            const layoutData = JSON.parse(localStorage.getItem(this.LAYOUT_KEY) || '{}');
            const updatedLayoutData = {
                ...layoutData,
                theme
            };
            localStorage.setItem(this.LAYOUT_KEY, JSON.stringify(updatedLayoutData));
        } catch (error) {
            console.warn('ThemeManager: unable to persist theme in ipmas_dashboard_layout', error);
        }
    }
}

// Initialize immediately so theme is applied before other scripts run.
window.themeManager = new ThemeManager();

