// Global variables
let searchTimeout;
let currentSearchResults = [];
let debugMode = false;

// DOM elements
const searchInput = document.getElementById('searchInput');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const resultsSection = document.getElementById('resultsSection');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const noResultsElement = document.getElementById('noResults');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check for debug parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    debugMode = urlParams.get('debug') === 'true';
    
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            hideAutocomplete();
        }
    });
});

// Handle search input changes
function handleSearchInput() {
    const query = searchInput.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Hide results when new search starts
    hideResults();
    
    // Hide autocomplete if query is too short
    if (query.length < 3) {
        hideAutocomplete();
        return;
    }
    
    // Set timeout for search
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}

// Handle keyboard navigation in autocomplete
function handleSearchKeydown(e) {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            selectAutocompleteItem(nextIndex);
            break;
        case 'ArrowUp':
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            selectAutocompleteItem(prevIndex);
            break;
        case 'Enter':
            e.preventDefault();
            if (currentIndex >= 0 && currentIndex < items.length) {
                // Select from autocomplete
                const match = currentSearchResults[currentIndex];
                selectContract(match);
            } else {
                // Direct address entry - search for the entered address
                const address = searchInput.value.trim();
                if (address.length >= 10) {
                    searchForAddress(address);
                }
            }
            break;
        case 'Escape':
            hideAutocomplete();
            break;
    }
}

// Perform search for autocomplete
async function performSearch(query) {
    try {
        // Build URL with debug parameter if enabled
        const url = debugMode ? `/search/${query}?debug=true` : `/search/${query}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok && data.result && data.data && data.data.matches) {
            currentSearchResults = data.data.matches;
            showAutocomplete(data.data.matches);
        } else if (response.status === 404) {
            // No information found for this address
            hideAutocomplete();
            // Show error message to user
            showError('Cannot find information for this contract address');
        } else {
            hideAutocomplete();
            showError('Search failed. Please try again.');
        }
    } catch (error) {
        console.error('Search error:', error);
        hideAutocomplete();
        showError('Search failed. Please try again.');
    }
}

// Show autocomplete dropdown
function showAutocomplete(matches) {
    if (!matches || matches.length === 0) {
        hideAutocomplete();
        return;
    }
    
    autocompleteDropdown.innerHTML = '';
    
    matches.forEach((match, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = createContractInfoHTML(match);
        
        item.addEventListener('click', () => selectContract(match));
        item.addEventListener('mouseenter', () => selectAutocompleteItem(index));
        
        autocompleteDropdown.appendChild(item);
    });
    
    autocompleteDropdown.style.display = 'block';
}

// Select autocomplete item by index
function selectAutocompleteItem(index) {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
}

// Hide autocomplete dropdown
function hideAutocomplete() {
    autocompleteDropdown.style.display = 'none';
    autocompleteDropdown.innerHTML = '';
}

// Hide results section
function hideResults() {
    resultsSection.style.display = 'none';
    resultsSection.innerHTML = '';
}

// Create HTML for contract info in autocomplete
function createContractInfoHTML(match) {
    const name = match.name || 'Unknown Token';
    const symbol = match.symbol || '';
    const address = match.address || match.contractAddress || match.owner || '';
    const blockchain = match.blockchain || 'ethereum';
    
    // Extract price and liquidity from the match data
    let price = '';
    let liquidity = '';
    
    if (match.priceUsd) {
        price = `$${parseFloat(match.priceUsd).toFixed(6)}`;
    }
    if (match.liquidityUsd) {
        liquidity = `$${formatNumber(match.liquidityUsd)}`;
    }
    
    return `
        <div class="contract-info">
            <div class="contract-name">${name} ${symbol ? `(${symbol})` : ''}</div>
            <div class="contract-address">${address}</div>
            <div class="contract-details">
                <span class="blockchain-badge">${blockchain}</span>
                ${price ? `<span class="price">${price}</span>` : ''}
                ${liquidity ? `<span class="liquidity">${liquidity}</span>` : ''}
            </div>
        </div>
    `;
}

// Select a contract from autocomplete
async function selectContract(match) {
    const address = match.address || match.contractAddress || match.owner || '';
    const blockchain = match.blockchain || 'ethereum';
    
    if (!address || address.length < 10) {
        showError('Invalid contract address');
        return;
    }
    
    // Update search input
    searchInput.value = address;
    hideAutocomplete();
    
    // Show contract info immediately
    showContractInfo(match);
    
    // Show loading for risk assessment
    showLoading();
    
    try {
        // Build URL with debug parameter if enabled
        const url = debugMode ? `/risk/${blockchain}/${address}?debug=true` : `/risk/${blockchain}/${address}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.result && data.data) {
            showRiskResults(data.data, match);
        } else {
            showError('Failed to load risk assessment');
        }
    } catch (error) {
        console.error('Risk assessment error:', error);
        showError('Failed to load risk assessment');
    }
}

// Show loading state
function showLoading() {
    hideAllStates();
    loadingElement.style.display = 'block';
}

// Show error state
function showError(message) {
    hideAllStates();
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Show no results state
function showNoResults() {
    hideAllStates();
    noResultsElement.style.display = 'block';
}

// Hide all states
function hideAllStates() {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'none';
    noResultsElement.style.display = 'none';
}

// Show risk assessment results
function showRiskResults(riskData, contractInfo) {
    hideAllStates();
    
    const name = contractInfo.name || 'Unknown Token';
    const symbol = contractInfo.symbol || '';
    const address = contractInfo.address || contractInfo.contractAddress || contractInfo.owner || '';
    const blockchain = contractInfo.blockchain || 'ethereum';
    
    // Extract data from the actual response structure
    const riskScore = riskData.riskScore || riskData.overallRisk || 0;
    const description = riskData.description || '';
    const explanations = riskData.explanations || [];
    const contractDetails = riskData.contractInfo || {};
    const debugData = riskData.debug || null;
    
    // Create Telegram-like message
    const messageHTML = createTelegramMessage({
        name,
        symbol,
        address,
        blockchain,
        riskScore,
        contractDetails,
        explanations,
        debugData
    });
    
    resultsSection.innerHTML = messageHTML;
    resultsSection.style.display = 'block';
    
    // Add event listeners for debug blocks if debug data exists
    if (debugData) {
        addDebugBlockListeners();
    }
}

// Create Telegram-like message format
function createTelegramMessage(data) {
    const { name, symbol, address, blockchain, riskScore, contractDetails, explanations, debugData } = data;
    
    // Format contract address for display
    const shortAddress = address.length > 20 ? 
        address.substring(0, 20) + '...' : address;
    
    // Get risk level and color
    const riskLevel = getRiskLevel(riskScore);
    const riskColor = getRiskColor(riskScore);
    
    // Format metrics
    const price = contractDetails.priceUsd ? 
        `$${parseFloat(contractDetails.priceUsd).toFixed(6)}` : 'N/A';
    const liquidity = contractDetails.liquidityUsd ? 
        `$${formatNumber(contractDetails.liquidityUsd)}` : 'N/A';
    const volume = contractDetails.volume24h ? 
        `$${formatNumber(contractDetails.volume24h)}` : 'N/A';
    
    // Group explanations by type
    const increaseFactors = explanations.filter(exp => exp.type === 'increase');
    const decreaseFactors = explanations.filter(exp => exp.type === 'decrease');
    const neutralFactors = explanations.filter(exp => exp.type === 'neutral');
    
    // Create debug information block if debug data exists
    const debugBlock = debugData ? createDebugBlock(debugData) : '';
    
    return `
        <div class="risk-message">
            <div class="risk-message-header">
                <div class="risk-message-title">
                    🚨 Token Risk Update: ${name} ${symbol ? `(${symbol})` : ''}
                </div>
                <div class="risk-message-subtitle">
                    🔗 ${blockchain.toUpperCase()} | 🧾 Contract: ${shortAddress}
                </div>
            </div>
            
            <div class="risk-score-display ${riskLevel}">
                📊 Risk Score: ${riskScore}
            </div>
            
            <div class="risk-metrics">
                <div class="metric-item">
                    <div class="metric-label">💵 Price</div>
                    <div class="metric-value">${price}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">💧 Liquidity</div>
                    <div class="metric-value">${liquidity}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">📈 24h Volume</div>
                    <div class="metric-value">${volume}</div>
                </div>
            </div>
            
            ${(increaseFactors.length > 0 || decreaseFactors.length > 0) ? `
                <div class="risk-factors">
                    <div class="risk-factors-title">
                        ⚠️ Risk Factors
                        ${increaseFactors.length > 0 ? `<span class="risk-factor-increase">(⬆️ Increase)</span>` : ''}
                        ${decreaseFactors.length > 0 ? `<span class="risk-factor-decrease">(⬇️ Decrease)</span>` : ''}
                    </div>
                    <ul class="risk-factors-list">
                        ${increaseFactors.map(factor => `
                            <li class="risk-factor-item">
                                <span class="risk-factor-icon">🔺</span>
                                <span class="risk-factor-text risk-factor-increase">${factor.text}</span>
                            </li>
                        `).join('')}
                        ${decreaseFactors.map(factor => `
                            <li class="risk-factor-item">
                                <span class="risk-factor-icon">🔻</span>
                                <span class="risk-factor-text risk-factor-decrease">${factor.text}</span>
                            </li>
                        `).join('')}
                        ${neutralFactors.map(factor => `
                            <li class="risk-factor-item">
                                <span class="risk-factor-icon">⚪</span>
                                <span class="risk-factor-text risk-factor-neutral">${factor.text}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${debugBlock}
        </div>
    `;
}

// Create debug information block
function createDebugBlock(debugData) {
    const debugSections = [];
    
    // Add provider data section
    if (debugData.providerData && Object.keys(debugData.providerData).length > 0) {
        const providerSection = createProviderDebugSection(debugData.providerData);
        debugSections.push(providerSection);
    }
    
    // Add processing info section
    if (debugData.processingTime || debugData.processorCount || debugData.confidence) {
        const processingSection = createProcessingDebugSection(debugData);
        debugSections.push(processingSection);
    }
    
    // Add request params section
    if (debugData.requestParams) {
        const requestSection = createRequestDebugSection(debugData.requestParams);
        debugSections.push(requestSection);
    }
    
    if (debugSections.length === 0) {
        return '';
    }
    
    return `
        <div class="debug-section">
            <div class="debug-header">
                <span class="debug-icon">🔧</span>
                <span class="debug-title">Debug Information</span>
                <span class="debug-toggle">▼</span>
            </div>
            <div class="debug-content" style="display: none;">
                ${debugSections.join('')}
            </div>
        </div>
    `;
}

// Create provider debug section
function createProviderDebugSection(providerData) {
    const providerItems = Object.entries(providerData).map(([name, data]) => {
        // Skip commonData as it's handled separately
        if (name === 'commonData') return '';
        
        const status = data.status || 'unknown';
        const statusClass = status === 'success' ? 'success' : status === 'error' ? 'error' : 'pending';
        
        return `
            <div class="debug-provider-item">
                <div class="debug-provider-header">
                    <span class="debug-provider-name">${name}</span>
                    <span class="debug-provider-status ${statusClass}">${status}</span>
                    <span class="debug-provider-toggle">▼</span>
                </div>
                <div class="debug-provider-content" style="display: none;">
                    <div class="debug-provider-details">
                        <div class="debug-provider-detail">
                            <strong>Provider:</strong> ${data.provider || 'N/A'}
                        </div>
                        <div class="debug-provider-detail">
                            <strong>Timestamp:</strong> ${data.timestamp || 'N/A'}
                        </div>
                        ${data.rawData ? `
                            <div class="debug-provider-detail">
                                <strong>Raw Data:</strong>
                                <pre class="debug-provider-data">${JSON.stringify(data.rawData, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Create common data section if it exists
    let commonDataSection = '';
    if (providerData.commonData && Object.keys(providerData.commonData).length > 0) {
        const commonDataItems = Object.entries(providerData.commonData).map(([providerName, commonData]) => {
            const commonDataFields = Object.entries(commonData).map(([field, value]) => {
                if (value === undefined || value === null) return '';
                let displayValue = value;
                if (typeof value === 'number') {
                    if (field.includes('price') || field.includes('marketCap') || field.includes('volume') || field.includes('liquidity') || field.includes('valuation')) {
                        displayValue = `$${formatNumber(value)}`;
                    } else if (field.includes('percentage') || field.includes('ratio') || field.includes('score')) {
                        // Handle different types of scores
                        if (field === 'amlbotScore') {
                            // AMLBot score is 0-1, convert to percentage
                            displayValue = `${(value * 100).toFixed(2)}%`;
                        } else if (field === 'decentralizationScore') {
                            // Decentralization score is 0-100, show as percentage
                            displayValue = `${value.toFixed(1)}%`;
                        } else if (field === 'engagementRatio') {
                            // Engagement ratio is 0-1, convert to percentage
                            displayValue = `${(value * 100).toFixed(2)}%`;
                        } else if (field === 'topHoldersPercentage') {
                            // Top holders percentage is already 0-1, convert to percentage
                            displayValue = `${(value * 100).toFixed(2)}%`;
                        } else {
                            // Default percentage formatting
                            displayValue = `${(value * 100).toFixed(2)}%`;
                        }
                    } else if (field.includes('count') || field.includes('txCount') || field.includes('holders')) {
                        // Transaction counts and holder counts
                        displayValue = formatNumber(value);
                    } else {
                        // Other numeric values
                        displayValue = formatNumber(value);
                    }
                } else if (typeof value === 'string' && value.includes('T')) {
                    // Format timestamp
                    displayValue = new Date(value).toLocaleString();
                }
                return `<div class="common-data-field"><strong>${field}:</strong> ${displayValue}</div>`;
            }).filter(field => field !== '').join('');
            
            return `
                <div class="debug-provider-item">
                    <div class="debug-provider-header">
                        <span class="debug-provider-name">${providerName} (Common Data)</span>
                        <span class="debug-provider-status success">extracted</span>
                        <span class="debug-provider-toggle">▼</span>
                    </div>
                    <div class="debug-provider-content" style="display: none;">
                        <div class="debug-provider-details">
                            <div class="common-data-fields">
                                ${commonDataFields}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        commonDataSection = `
            <div class="debug-subsection">
                <h4 class="debug-subsection-title">📊 Common Data (Standardized)</h4>
                <div class="debug-provider-list">
                    ${commonDataItems}
                </div>
            </div>
        `;
    }
    
    return `
        <div class="debug-subsection">
            <h4 class="debug-subsection-title">📡 Provider Data</h4>
            <div class="debug-provider-list">
                ${providerItems}
            </div>
        </div>
        ${commonDataSection}
    `;
}

// Create processing info debug section
function createProcessingDebugSection(processingInfo) {
    const processingDetails = [];
    
    if (processingInfo.processingTime) {
        processingDetails.push(`<div class="debug-processing-detail"><strong>Processing Time:</strong> ${processingInfo.processingTime}ms</div>`);
    }
    
    if (processingInfo.processorCount) {
        processingDetails.push(`<div class="debug-processing-detail"><strong>Processor Count:</strong> ${processingInfo.processorCount}</div>`);
    }
    
    if (processingInfo.confidence) {
        processingDetails.push(`<div class="debug-processing-detail"><strong>Confidence:</strong> ${processingInfo.confidence}</div>`);
    }
    
    if (processingInfo.addressType) {
        processingDetails.push(`<div class="debug-processing-detail"><strong>Address Type:</strong> ${processingInfo.addressType}</div>`);
    }
    
    if (processingInfo.processorAssessments) {
        processingDetails.push(`
            <div class="debug-processing-detail">
                <strong>Processor Assessments:</strong>
                <pre class="debug-processing-data">${JSON.stringify(processingInfo.processorAssessments, null, 2)}</pre>
            </div>
        `);
    }
    
    return `
        <div class="debug-subsection">
            <h4 class="debug-subsection-title">⚙️ Processing Information</h4>
            <div class="debug-processing-details">
                ${processingDetails.join('')}
            </div>
        </div>
    `;
}

// Create request params debug section
function createRequestDebugSection(requestParams) {
    return `
        <div class="debug-subsection">
            <h4 class="debug-subsection-title">📋 Request Parameters</h4>
            <pre class="debug-processing-data">${JSON.stringify(requestParams, null, 2)}</pre>
        </div>
    `;
}

// Add event listeners for debug blocks
function addDebugBlockListeners() {
    // Main debug section toggle
    const debugHeader = document.querySelector('.debug-header');
    if (debugHeader) {
        debugHeader.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const toggle = this.querySelector('.debug-toggle');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.textContent = '▲';
            } else {
                content.style.display = 'none';
                toggle.textContent = '▼';
            }
        });
    }
    
    // Provider debug toggles
    const providerHeaders = document.querySelectorAll('.debug-provider-header');
    providerHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.stopPropagation();
            const content = this.nextElementSibling;
            const toggle = this.querySelector('.debug-provider-toggle');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.textContent = '▲';
            } else {
                content.style.display = 'none';
                toggle.textContent = '▼';
            }
        });
    });
}

// Get risk level (low, medium, high)
function getRiskLevel(score) {
    if (score <= 30) return 'low';
    if (score <= 70) return 'medium';
    return 'high';
}

// Get risk color class
function getRiskColor(score) {
    if (score <= 30) return 'low-risk';
    if (score <= 70) return 'medium-risk';
    return 'high-risk';
}

// Format number with K, M, B suffixes
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

// Show contract information immediately after selection
function showContractInfo(contractInfo) {
    const name = contractInfo.name || 'Unknown Token';
    const symbol = contractInfo.symbol || '';
    const address = contractInfo.address || contractInfo.contractAddress || contractInfo.owner || '';
    const blockchain = contractInfo.blockchain || 'ethereum';
    
    // Extract price and liquidity from the contract info
    let price = '';
    let liquidity = '';
    let marketCap = '';
    
    if (contractInfo.priceUsd) {
        price = `$${parseFloat(contractInfo.priceUsd).toFixed(6)}`;
    }
    if (contractInfo.liquidityUsd) {
        liquidity = `$${formatNumber(contractInfo.liquidityUsd)}`;
    }
    if (contractInfo.marketCap) {
        marketCap = `$${formatNumber(contractInfo.marketCap)}`;
    }
    
    // Create initial contract info message
    const messageHTML = `
        <div class="risk-message">
            <div class="risk-message-header">
                <div class="risk-message-title">
                    🔍 Found Contract: ${name} ${symbol ? `(${symbol})` : ''}
                </div>
                <div class="risk-message-subtitle">
                    🔗 ${blockchain.toUpperCase()} | 🧾 Contract: ${address.length > 20 ? address.substring(0, 20) + '...' : address}
                </div>
            </div>
            
            <div class="risk-metrics">
                ${price ? `
                    <div class="metric-item">
                        <div class="metric-label">💵 Price</div>
                        <div class="metric-value">${price}</div>
                    </div>
                ` : ''}
                ${marketCap ? `
                    <div class="metric-item">
                        <div class="metric-label">💰 Market Cap</div>
                        <div class="metric-value">${marketCap}</div>
                    </div>
                ` : ''}
                ${liquidity ? `
                    <div class="metric-item">
                        <div class="metric-label">💧 Liquidity</div>
                        <div class="metric-value">${liquidity}</div>
                    </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 15px; color: #666; font-size: 0.9rem;">
                ⏳ Analyzing risk factors...
            </div>
        </div>
    `;
    
    resultsSection.innerHTML = messageHTML;
    resultsSection.style.display = 'block';
}

// Group explanations by type
function groupExplanationsByType(explanations) {
    const groups = {};
    
    explanations.forEach(exp => {
        if (!groups[exp.type]) {
            groups[exp.type] = [];
        }
        groups[exp.type].push(exp);
    });
    
    let result = '';
    
    Object.entries(groups).forEach(([type, group]) => {
        result += `
            <div class="explanation-group">
                <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                <div class="explanations-list">
                    ${group.map(exp => `
                        <div class="explanation-item ${exp.type}">
                            <span class="explanation-text">${exp.text}</span>
                            <span class="explanation-type">${exp.type}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    return result;
}

// Search for a specific address directly
async function searchForAddress(address) {
    hideAutocomplete();
    showLoading();
    
    try {
        // First try to find the address across all chains
        const searchUrl = debugMode ? `/search/${address}?debug=true` : `/search/${address}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        if (searchResponse.status === 404) {
            showError('Cannot find information for this contract address');
            return;
        }
        
        if (searchData.result && searchData.data && searchData.data.matches && searchData.data.matches.length > 0) {
            // Use the first match found
            const match = searchData.data.matches[0];
            selectContract(match);
        } else {
            showError('Cannot find information for this contract address');
        }
    } catch (error) {
        console.error('Address search error:', error);
        showError('Failed to search for address');
    }
} 