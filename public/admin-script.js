// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentTab = 'risk-params';
        this.autoRefreshInterval = null;
        this.init();
    }

    init() {
        this.setupTabNavigation();
        this.loadInitialData();
        this.setupAutoRefresh();
    }

    setupTabNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'risk-params':
                this.loadRiskParams();
                break;
            case 'config':
                this.loadConfig();
                break;
            case 'providers':
                this.loadProviders();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    async loadInitialData() {
        await this.loadRiskParams();
        await this.loadConfig();
        await this.loadProviders();
    }

    setupAutoRefresh() {
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentTab === 'logs') {
                this.loadLogs();
            }
        }, 5000); // Refresh every 5 seconds
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    // Risk Parameters Management
    async loadRiskParams() {
        try {
            const response = await fetch('/admin/risk-params');
            if (response.ok) {
                const params = await response.json();
                this.populateRiskParams(params);
            } else {
                this.showNotification('Failed to load risk parameters', 'error');
            }
        } catch (error) {
            this.showNotification('Error loading risk parameters', 'error');
        }
    }

    populateRiskParams(params) {
        // Score thresholds
        document.getElementById('low-risk-threshold').value = params.thresholds?.low || 30;
        document.getElementById('medium-risk-threshold').value = params.thresholds?.medium || 70;

        // Provider weights
        document.getElementById('amlbot-weight').value = params.weights?.amlbot || 0.4;
        document.getElementById('coingecko-weight').value = params.weights?.coingecko || 0.3;
        document.getElementById('dexscreener-weight').value = params.weights?.dexscreener || 0.2;
        document.getElementById('bubblemap-weight').value = params.weights?.bubblemap || 0.1;

        // Risk factors
        document.getElementById('liquidity-threshold').value = params.factors?.liquidity || 10000;
        document.getElementById('volume-threshold').value = params.factors?.volume || 5000;
        document.getElementById('age-threshold').value = params.factors?.age || 30;
    }

    async saveRiskParams() {
        const params = {
            thresholds: {
                low: parseInt(document.getElementById('low-risk-threshold').value),
                medium: parseInt(document.getElementById('medium-risk-threshold').value)
            },
            weights: {
                amlbot: parseFloat(document.getElementById('amlbot-weight').value),
                coingecko: parseFloat(document.getElementById('coingecko-weight').value),
                dexscreener: parseFloat(document.getElementById('dexscreener-weight').value),
                bubblemap: parseFloat(document.getElementById('bubblemap-weight').value)
            },
            factors: {
                liquidity: parseInt(document.getElementById('liquidity-threshold').value),
                volume: parseInt(document.getElementById('volume-threshold').value),
                age: parseInt(document.getElementById('age-threshold').value)
            }
        };

        try {
            const response = await fetch('/admin/risk-params', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (response.ok) {
                this.showNotification('Risk parameters saved successfully', 'success');
            } else {
                this.showNotification('Failed to save risk parameters', 'error');
            }
        } catch (error) {
            this.showNotification('Error saving risk parameters', 'error');
        }
    }

    resetRiskParams() {
        if (confirm('Are you sure you want to reset risk parameters to defaults?')) {
            this.populateRiskParams({
                thresholds: { low: 30, medium: 70 },
                weights: { amlbot: 0.4, coingecko: 0.3, dexscreener: 0.2, bubblemap: 0.1 },
                factors: { liquidity: 10000, volume: 5000, age: 30 }
            });
            this.showNotification('Risk parameters reset to defaults', 'info');
        }
    }

    async testRiskCalculation() {
        try {
            const response = await fetch('/admin/test-risk-calculation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: '0xcda4e840411c00a614ad9205caec807c7458a0e3',
                    chain: 'ethereum'
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(`Test calculation completed. Risk score: ${result.riskScore}`, 'success');
            } else {
                this.showNotification('Test calculation failed', 'error');
            }
        } catch (error) {
            this.showNotification('Error running test calculation', 'error');
        }
    }

    // Configuration Management
    async loadConfig() {
        try {
            const response = await fetch('/admin/config');
            if (response.ok) {
                const config = await response.json();
                this.populateConfig(config);
            } else {
                this.showNotification('Failed to load configuration', 'error');
            }
        } catch (error) {
            this.showNotification('Error loading configuration', 'error');
        }
    }

    populateConfig(config) {
        document.getElementById('server-port').value = config.server?.port || 3000;
        document.getElementById('log-level').value = config.server?.logLevel || 'info';
        document.getElementById('timeout-ms').value = config.api?.timeout || 8000;
        document.getElementById('retry-attempts').value = config.api?.retryAttempts || 3;
    }

    async saveConfig() {
        const config = {
            server: {
                port: parseInt(document.getElementById('server-port').value),
                logLevel: document.getElementById('log-level').value
            },
            api: {
                timeout: parseInt(document.getElementById('timeout-ms').value),
                retryAttempts: parseInt(document.getElementById('retry-attempts').value)
            }
        };

        try {
            const response = await fetch('/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.showNotification('Configuration saved successfully', 'success');
            } else {
                this.showNotification('Failed to save configuration', 'error');
            }
        } catch (error) {
            this.showNotification('Error saving configuration', 'error');
        }
    }

    resetConfig() {
        if (confirm('Are you sure you want to reset configuration to defaults?')) {
            this.populateConfig({
                server: { port: 3000, logLevel: 'info' },
                api: { timeout: 8000, retryAttempts: 3 }
            });
            this.showNotification('Configuration reset to defaults', 'info');
        }
    }

    async restartServer() {
        if (confirm('Are you sure you want to restart the server? This will temporarily interrupt service.')) {
            try {
                const response = await fetch('/admin/restart', { method: 'POST' });
                if (response.ok) {
                    this.showNotification('Server restart initiated', 'info');
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                } else {
                    this.showNotification('Failed to restart server', 'error');
                }
            } catch (error) {
                this.showNotification('Error restarting server', 'error');
            }
        }
    }

    // Providers Management
    async loadProviders() {
        try {
            const response = await fetch('/admin/providers');
            if (response.ok) {
                const providers = await response.json();
                this.populateProviders(providers);
            } else {
                this.showNotification('Failed to load providers', 'error');
            }
        } catch (error) {
            this.showNotification('Error loading providers', 'error');
        }
    }

    populateProviders(providers) {
        const grid = document.getElementById('providers-grid');
        grid.innerHTML = '';

        providers.forEach(provider => {
            const card = document.createElement('div');
            card.className = 'provider-card';
            card.innerHTML = `
                <h3>${provider.name}</h3>
                <div class="provider-status ${provider.enabled ? 'enabled' : 'disabled'}">
                    ${provider.enabled ? 'Enabled' : 'Disabled'}
                </div>
                <div class="provider-toggle">
                    <label>
                        <input type="checkbox" ${provider.enabled ? 'checked' : ''} 
                               onchange="adminPanel.toggleProvider('${provider.name}', this.checked)">
                        Enable Provider
                    </label>
                </div>
                <p><strong>Status:</strong> ${provider.status}</p>
                <p><strong>Last Check:</strong> ${provider.lastCheck || 'Never'}</p>
            `;
            grid.appendChild(card);
        });
    }

    async toggleProvider(name, enabled) {
        try {
            const response = await fetch('/admin/providers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, enabled })
            });

            if (response.ok) {
                this.showNotification(`Provider ${name} ${enabled ? 'enabled' : 'disabled'}`, 'success');
                await this.loadProviders(); // Refresh the list
            } else {
                this.showNotification(`Failed to ${enabled ? 'enable' : 'disable'} provider ${name}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Error ${enabled ? 'enabling' : 'disabling'} provider ${name}`, 'error');
        }
    }

    async saveProviders() {
        // This would save any provider-specific settings
        this.showNotification('Provider settings saved', 'success');
    }

    async testProviders() {
        try {
            const response = await fetch('/admin/test-providers', { method: 'POST' });
            if (response.ok) {
                const results = await response.json();
                this.showNotification(`Provider test completed. ${results.successful} successful, ${results.failed} failed`, 'info');
                await this.loadProviders(); // Refresh with updated status
            } else {
                this.showNotification('Provider test failed', 'error');
            }
        } catch (error) {
            this.showNotification('Error testing providers', 'error');
        }
    }

    // Logs Management
    async loadLogs() {
        try {
            const response = await fetch('/admin/logs');
            if (response.ok) {
                const logs = await response.json();
                this.populateLogs(logs);
            } else {
                this.showNotification('Failed to load logs', 'error');
            }
        } catch (error) {
            this.showNotification('Error loading logs', 'error');
        }
    }

    populateLogs(logs) {
        const container = document.getElementById('logs-content');
        container.innerHTML = '';

        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${log.level}`;
            entry.innerHTML = `
                <strong>${new Date(log.timestamp).toLocaleString()}</strong> [${log.level.toUpperCase()}]
                <br>${log.message}
            `;
            container.appendChild(entry);
        });

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async refreshLogs() {
        await this.loadLogs();
        this.showNotification('Logs refreshed', 'info');
    }

    async clearLogs() {
        if (confirm('Are you sure you want to clear all logs?')) {
            try {
                const response = await fetch('/admin/logs', { method: 'DELETE' });
                if (response.ok) {
                    this.showNotification('Logs cleared', 'success');
                    await this.loadLogs();
                } else {
                    this.showNotification('Failed to clear logs', 'error');
                }
            } catch (error) {
                this.showNotification('Error clearing logs', 'error');
            }
        }
    }

    async downloadLogs() {
        try {
            const response = await fetch('/admin/logs/download');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showNotification('Logs downloaded', 'success');
            } else {
                this.showNotification('Failed to download logs', 'error');
            }
        } catch (error) {
            this.showNotification('Error downloading logs', 'error');
        }
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
let adminPanel;

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Global functions for HTML onclick handlers
function saveRiskParams() {
    adminPanel.saveRiskParams();
}

function resetRiskParams() {
    adminPanel.resetRiskParams();
}

function testRiskCalculation() {
    adminPanel.testRiskCalculation();
}

function saveConfig() {
    adminPanel.saveConfig();
}

function resetConfig() {
    adminPanel.resetConfig();
}

function restartServer() {
    adminPanel.restartServer();
}

function saveProviders() {
    adminPanel.saveProviders();
}

function testProviders() {
    adminPanel.testProviders();
}

function refreshLogs() {
    adminPanel.refreshLogs();
}

function clearLogs() {
    adminPanel.clearLogs();
}

function downloadLogs() {
    adminPanel.downloadLogs();
}

// Admin Settings Management
class AdminSettings {
    constructor() {
        this.config = null;
        this.initializeEventListeners();
        this.loadCurrentConfig();
    }

    initializeEventListeners() {
        // Action buttons
        document.getElementById('load-config').addEventListener('click', () => this.loadCurrentConfig());
        document.getElementById('save-config').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('reset-defaults').addEventListener('click', () => this.resetToDefaults());
        document.getElementById('back-to-main').addEventListener('click', () => window.location.href = '/');

        // Provider toggles will be added dynamically
    }

    async loadCurrentConfig() {
        try {
            this.showStatus('Loading current configuration...', 'info');
            
            const response = await fetch('/admin/config');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.config = await response.json();
            this.populateForm();
            this.showStatus('Configuration loaded successfully!', 'success');
        } catch (error) {
            console.error('Error loading config:', error);
            this.showStatus(`Error loading configuration: ${error.message}`, 'error');
        }
    }

    populateForm() {
        if (!this.config) return;

        // Risk Assessment Parameters
        const risk = this.config.riskAssessment || {};
        
        // 24h Volume
        if (risk.volume24h) {
            document.getElementById('volume-low').value = risk.volume24h.low || '';
            document.getElementById('volume-medium').value = risk.volume24h.medium || '';
            document.getElementById('volume-high').value = risk.volume24h.high || '';
        }

        // Holders Count
        if (risk.holdersCount) {
            document.getElementById('holders-low').value = risk.holdersCount.low || '';
            document.getElementById('holders-medium').value = risk.holdersCount.medium || '';
            document.getElementById('holders-high').value = risk.holdersCount.high || '';
        }

        // AMLBot Score
        if (risk.amlbotScore) {
            document.getElementById('amlbot-low').value = risk.amlbotScore.low || '';
            document.getElementById('amlbot-medium').value = risk.amlbotScore.medium || '';
            document.getElementById('amlbot-high').value = risk.amlbotScore.high || '';
        }

        // Top 3 Clusters
        if (risk.top3ClustersPercentage) {
            document.getElementById('clusters-low').value = risk.top3ClustersPercentage.low || '';
            document.getElementById('clusters-medium').value = risk.top3ClustersPercentage.medium || '';
            document.getElementById('clusters-high').value = risk.top3ClustersPercentage.high || '';
            document.getElementById('clusters-critical').value = risk.top3ClustersPercentage.critical || '';
        }

        // Connected Wallets
        document.getElementById('connected-wallets').value = risk.connectedWalletsThreshold || '';

        // Token Age
        if (risk.tokenAge) {
            document.getElementById('age-low').value = risk.tokenAge.low || '';
            document.getElementById('age-medium').value = risk.tokenAge.medium || '';
            document.getElementById('age-high').value = risk.tokenAge.high || '';
        }

        // Market Cap
        if (risk.marketCap) {
            document.getElementById('marketcap-low').value = risk.marketCap.low || '';
            document.getElementById('marketcap-medium').value = risk.marketCap.medium || '';
            document.getElementById('marketcap-high').value = risk.marketCap.high || '';
            document.getElementById('marketcap-critical').value = risk.marketCap.critical || '';
        }

        // Fully Diluted Valuation
        if (risk.fullyDilutedValuation) {
            document.getElementById('fdv-low').value = risk.fullyDilutedValuation.low || '';
            document.getElementById('fdv-medium').value = risk.fullyDilutedValuation.medium || '';
            document.getElementById('fdv-high').value = risk.fullyDilutedValuation.high || '';
        }

        // System Configuration
        const server = this.config.server || {};
        document.getElementById('server-port').value = server.port || '';
        document.getElementById('log-level').value = this.config.logLevel || 'info';

        // API Settings
        const providers = this.config.providers || [];
        const defaultTimeout = providers.length > 0 ? providers[0].timeout : 8000;
        const defaultRetries = providers.length > 0 ? providers[0].retries : 3;
        
        document.getElementById('api-timeout').value = defaultTimeout;
        document.getElementById('api-retries').value = defaultRetries;

        // Populate providers
        this.populateProviders(providers);
    }

    populateProviders(providers) {
        const providerList = document.getElementById('provider-list');
        providerList.innerHTML = '';

        providers.forEach(provider => {
            const providerItem = document.createElement('div');
            providerItem.className = `provider-item ${provider.enabled ? 'enabled' : 'disabled'}`;
            
            providerItem.innerHTML = `
                <div class="provider-toggle ${provider.enabled ? 'active' : ''}" data-provider="${provider.name}"></div>
                <div class="provider-info">
                    <div class="provider-name">${provider.name}</div>
                    <div class="provider-status">${provider.enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
            `;

            // Add toggle event listener
            const toggle = providerItem.querySelector('.provider-toggle');
            toggle.addEventListener('click', () => this.toggleProvider(provider.name, !provider.enabled));

            providerList.appendChild(providerItem);
        });
    }

    async toggleProvider(providerName, enabled) {
        try {
            const response = await fetch('/admin/provider', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: providerName,
                    enabled: enabled
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Update UI
            const toggle = document.querySelector(`[data-provider="${providerName}"]`);
            const providerItem = toggle.closest('.provider-item');
            
            if (enabled) {
                toggle.classList.add('active');
                providerItem.classList.remove('disabled');
                providerItem.classList.add('enabled');
                providerItem.querySelector('.provider-status').textContent = 'Enabled';
            } else {
                toggle.classList.remove('active');
                providerItem.classList.remove('enabled');
                providerItem.classList.add('disabled');
                providerItem.querySelector('.provider-status').textContent = 'Disabled';
            }

            this.showStatus(`Provider ${providerName} ${enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
        } catch (error) {
            console.error('Error toggling provider:', error);
            this.showStatus(`Error updating provider: ${error.message}`, 'error');
        }
    }

    collectFormData() {
        // Get the default timeout from the form
        const defaultTimeout = parseInt(document.getElementById('api-timeout').value) || 8000;
        const defaultRetries = parseInt(document.getElementById('api-retries').value) || 3;
        
        // Get current providers and update their timeouts
        const currentProviders = this.config?.providers || [];
        const updatedProviders = currentProviders.map(provider => ({
            ...provider,
            timeout: defaultTimeout,
            retries: defaultRetries
        }));

        const formData = {
            riskAssessment: {
                volume24h: {
                    low: parseInt(document.getElementById('volume-low').value) || 1000000,
                    medium: parseInt(document.getElementById('volume-medium').value) || 100000,
                    high: parseInt(document.getElementById('volume-high').value) || 100000
                },
                holdersCount: {
                    low: parseInt(document.getElementById('holders-low').value) || 2000,
                    medium: parseInt(document.getElementById('holders-medium').value) || 300,
                    high: parseInt(document.getElementById('holders-high').value) || 300
                },
                amlbotScore: {
                    low: parseInt(document.getElementById('amlbot-low').value) || 30,
                    medium: parseInt(document.getElementById('amlbot-medium').value) || 70,
                    high: parseInt(document.getElementById('amlbot-high').value) || 70
                },
                top3ClustersPercentage: {
                    low: parseInt(document.getElementById('clusters-low').value) || 20,
                    medium: parseInt(document.getElementById('clusters-medium').value) || 50,
                    high: parseInt(document.getElementById('clusters-high').value) || 80,
                    critical: parseInt(document.getElementById('clusters-critical').value) || 80
                },
                connectedWalletsThreshold: parseInt(document.getElementById('connected-wallets').value) || 50,
                tokenAge: {
                    low: parseInt(document.getElementById('age-low').value) || 30,
                    medium: parseInt(document.getElementById('age-medium').value) || 7,
                    high: parseInt(document.getElementById('age-high').value) || 7
                },
                marketCap: {
                    low: parseInt(document.getElementById('marketcap-low').value) || 100000000,
                    medium: parseInt(document.getElementById('marketcap-medium').value) || 10000000,
                    high: parseInt(document.getElementById('marketcap-high').value) || 1000000,
                    critical: parseInt(document.getElementById('marketcap-critical').value) || 1000000
                },
                fullyDilutedValuation: {
                    low: parseInt(document.getElementById('fdv-low').value) || 3,
                    medium: parseInt(document.getElementById('fdv-medium').value) || 10,
                    high: parseInt(document.getElementById('fdv-high').value) || 10
                }
            },
            server: {
                port: parseInt(document.getElementById('server-port').value) || 3000,
                host: this.config?.server?.host || 'localhost',
                cors: this.config?.server?.cors || {
                    origin: ["http://localhost:3000", "http://localhost:3001"],
                    credentials: false
                }
            },
            logLevel: document.getElementById('log-level').value || 'info',
            database: this.config?.database || {},
            blockchains: this.config?.blockchains || [],
            providers: updatedProviders,
            processors: this.config?.processors || [],
            features: this.config?.features || {},
            limits: this.config?.limits || {}
        };

        return formData;
    }

    async saveConfiguration() {
        try {
            this.showStatus('Saving configuration...', 'info');
            
            const configData = this.collectFormData();
            
            const response = await fetch('/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            this.showStatus('Configuration saved successfully! Server restart may be required.', 'success');
            
            // Update local config
            this.config = configData;
        } catch (error) {
            console.error('Error saving config:', error);
            this.showStatus(`Error saving configuration: ${error.message}`, 'error');
        }
    }

    async resetToDefaults() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            return;
        }

        try {
            this.showStatus('Resetting to defaults...', 'info');
            
            const response = await fetch('/admin/config/reset', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await this.loadCurrentConfig();
            this.showStatus('Configuration reset to defaults successfully!', 'success');
        } catch (error) {
            console.error('Error resetting config:', error);
            this.showStatus(`Error resetting configuration: ${error.message}`, 'error');
        }
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize admin settings when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminSettings();
}); 