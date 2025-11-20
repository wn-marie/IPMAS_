/**
 * Data Migration Utility
 * Migrates localStorage data to database
 */

class DataMigration {
    constructor() {
        this.apiUrl = window.API_CONFIG ? window.API_CONFIG.getApiUrl('/api/v1/user-data') : '/api/v1/user-data';
    }

    async getSessionToken() {
        return localStorage.getItem('ipmas_session_token');
    }

    async collectLocalStorageData() {
        const data = {};
        const keys = [
            'ipmas_user_data',
            'ipmas_feedback',
            'ipmas_dashboard_layout',
            'ipmas_favorite_kpis',
            'ipmas_filter_presets',
            'ipmas_notification_settings',
            'ipmas_notifications',
            'downloadRequests',
            'areaReportData'
        ];

        keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                data[key] = value;
            }
        });

        // Collect shared data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('share_')) {
                data[key] = localStorage.getItem(key);
            }
        }

        return data;
    }

    async migrate() {
        try {
            const sessionToken = await this.getSessionToken();
            if (!sessionToken) {
                console.warn('No session token found. Please login first to migrate data.');
                return { success: false, error: 'Authentication required' };
            }

            const localStorageData = await this.collectLocalStorageData();
            
            if (Object.keys(localStorageData).length === 0) {
                return { success: true, message: 'No localStorage data to migrate' };
            }

            const response = await fetch(`${this.apiUrl}/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ localStorageData })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Data migration completed:', result.results);
                // Optionally clear localStorage after successful migration
                // this.clearLocalStorage();
                return result;
            } else {
                console.error('❌ Migration failed:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Error during migration:', error);
            return { success: false, error: error.message };
        }
    }

    clearLocalStorage() {
        const keys = [
            'ipmas_user_data',
            'ipmas_feedback',
            'ipmas_dashboard_layout',
            'ipmas_favorite_kpis',
            'ipmas_filter_presets',
            'ipmas_notification_settings',
            'ipmas_notifications',
            'downloadRequests',
            'areaReportData'
        ];

        keys.forEach(key => localStorage.removeItem(key));

        // Clear shared data
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('share_')) {
                localStorage.removeItem(key);
            }
        }

        console.log('✅ localStorage cleared after migration');
    }
}

// Auto-migrate on page load if user is logged in
document.addEventListener('DOMContentLoaded', async () => {
    const migration = new DataMigration();
    const sessionToken = await migration.getSessionToken();
    
    if (sessionToken) {
        // Check if migration has already been done
        const migrationDone = localStorage.getItem('ipmas_migration_done');
        if (!migrationDone) {
            console.log('🔄 Starting data migration...');
            const result = await migration.migrate();
            if (result.success) {
                localStorage.setItem('ipmas_migration_done', 'true');
            }
        }
    }
});

window.DataMigration = DataMigration;

