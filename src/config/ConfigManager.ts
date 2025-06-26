import fs from 'fs';
import path from 'path';

export interface RiskParameters {
    thresholds: {
        low: number;
        medium: number;
    };
    weights: {
        amlbot: number;
        coingecko: number;
        dexscreener: number;
        bubblemap: number;
    };
    factors: {
        liquidity: number;
        volume: number;
        age: number;
    };
}

export interface AdminConfig {
    server: {
        port: number;
        logLevel: string;
    };
    api: {
        timeout: number;
        retryAttempts: number;
    };
}

export interface ProviderStatus {
    name: string;
    enabled: boolean;
    status: string;
    lastCheck: string | null;
}

export interface LogEntry {
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private configDir: string;
    private riskParamsFile: string;
    private adminConfigFile: string;
    private providersFile: string;
    private logsFile: string;

    private constructor() {
        this.configDir = path.join(process.cwd(), 'data');
        this.riskParamsFile = path.join(this.configDir, 'risk-params.json');
        this.adminConfigFile = path.join(this.configDir, 'admin-config.json');
        this.providersFile = path.join(this.configDir, 'providers.json');
        this.logsFile = path.join(this.configDir, 'logs.json');
        
        this.ensureConfigDir();
        this.initializeDefaultFiles();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private ensureConfigDir(): void {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    private initializeDefaultFiles(): void {
        // Initialize risk parameters
        if (!fs.existsSync(this.riskParamsFile)) {
            const defaultRiskParams: RiskParameters = {
                thresholds: {
                    low: 30,
                    medium: 70
                },
                weights: {
                    amlbot: 0.4,
                    coingecko: 0.3,
                    dexscreener: 0.2,
                    bubblemap: 0.1
                },
                factors: {
                    liquidity: 10000,
                    volume: 5000,
                    age: 30
                }
            };
            this.writeFile(this.riskParamsFile, defaultRiskParams);
        }

        // Initialize admin config
        if (!fs.existsSync(this.adminConfigFile)) {
            const defaultAdminConfig: AdminConfig = {
                server: {
                    port: 3000,
                    logLevel: 'info'
                },
                api: {
                    timeout: 8000,
                    retryAttempts: 3
                }
            };
            this.writeFile(this.adminConfigFile, defaultAdminConfig);
        }

        // Initialize providers
        if (!fs.existsSync(this.providersFile)) {
            const defaultProviders: ProviderStatus[] = [
                { name: 'amlbot', enabled: true, status: 'unknown', lastCheck: null },
                { name: 'coingecko', enabled: true, status: 'unknown', lastCheck: null },
                { name: 'dexscreener', enabled: true, status: 'unknown', lastCheck: null },
                { name: 'bubblemap', enabled: true, status: 'unknown', lastCheck: null }
            ];
            this.writeFile(this.providersFile, defaultProviders);
        }

        // Initialize logs
        if (!fs.existsSync(this.logsFile)) {
            this.writeFile(this.logsFile, []);
        }
    }

    private readFile<T>(filePath: string): T {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            throw error;
        }
    }

    private writeFile<T>(filePath: string, data: T): void {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            throw error;
        }
    }

    // Risk Parameters Management
    public getRiskParameters(): RiskParameters {
        return this.readFile<RiskParameters>(this.riskParamsFile);
    }

    public setRiskParameters(params: RiskParameters): void {
        this.writeFile(this.riskParamsFile, params);
    }

    // Admin Configuration Management
    public getAdminConfig(): AdminConfig {
        return this.readFile<AdminConfig>(this.adminConfigFile);
    }

    public setAdminConfig(config: AdminConfig): void {
        this.writeFile(this.adminConfigFile, config);
    }

    // Provider Management
    public getProviders(): ProviderStatus[] {
        return this.readFile<ProviderStatus[]>(this.providersFile);
    }

    public setProviders(providers: ProviderStatus[]): void {
        this.writeFile(this.providersFile, providers);
    }

    public updateProvider(name: string, enabled: boolean): void {
        const providers = this.getProviders();
        const provider = providers.find(p => p.name === name);
        if (provider) {
            provider.enabled = enabled;
            provider.lastCheck = new Date().toISOString();
            this.setProviders(providers);
        }
    }

    public updateProviderStatus(name: string, status: string): void {
        const providers = this.getProviders();
        const provider = providers.find(p => p.name === name);
        if (provider) {
            provider.status = status;
            provider.lastCheck = new Date().toISOString();
            this.setProviders(providers);
        }
    }

    // Log Management
    public getLogs(): LogEntry[] {
        return this.readFile<LogEntry[]>(this.logsFile);
    }

    public addLog(level: LogEntry['level'], message: string): void {
        const logs = this.getLogs();
        const newLog: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };
        logs.push(newLog);
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        this.writeFile(this.logsFile, logs);
    }

    public clearLogs(): void {
        this.writeFile(this.logsFile, []);
    }

    public getLogsAsText(): string {
        const logs = this.getLogs();
        return logs.map(log => 
            `${new Date(log.timestamp).toISOString()} [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');
    }

    // Utility methods
    public getConfigDir(): string {
        return this.configDir;
    }

    public backupConfig(): void {
        const backupDir = path.join(this.configDir, 'backup', new Date().toISOString().split('T')[0]);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const files = [this.riskParamsFile, this.adminConfigFile, this.providersFile, this.logsFile];
        files.forEach(file => {
            if (fs.existsSync(file)) {
                const fileName = path.basename(file);
                const backupPath = path.join(backupDir, fileName);
                fs.copyFileSync(file, backupPath);
            }
        });
    }

    public restoreConfig(backupDate: string): void {
        const backupDir = path.join(this.configDir, 'backup', backupDate);
        if (!fs.existsSync(backupDir)) {
            throw new Error(`Backup for date ${backupDate} not found`);
        }

        const files = ['risk-params.json', 'admin-config.json', 'providers.json', 'logs.json'];
        files.forEach(fileName => {
            const backupPath = path.join(backupDir, fileName);
            const targetPath = path.join(this.configDir, fileName);
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, targetPath);
            }
        });
    }

    public getAvailableBackups(): string[] {
        const backupDir = path.join(this.configDir, 'backup');
        if (!fs.existsSync(backupDir)) {
            return [];
        }

        return fs.readdirSync(backupDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .sort()
            .reverse();
    }
} 