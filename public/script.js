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
    
    switch(e.key) {
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
            if (currentIndex >= 0 && items[currentIndex]) {
                const match = currentSearchResults[currentIndex];
                selectContract(match);
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
        
        if (data.result && data.data && data.data.matches) {
            currentSearchResults = data.data.matches;
            showAutocomplete(data.data.matches);
        } else {
            hideAutocomplete();
        }
    } catch (error) {
        console.error('Search error:', error);
        hideAutocomplete();
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
    
    resultsSection.innerHTML = `
        <div class="contract-header">
            <h2>${name} ${symbol ? `(${symbol})` : ''}</h2>
            <div class="contract-meta">
                <span class="address">${address}</span>
                <span class="blockchain-badge">${blockchain}</span>
            </div>
        </div>
        
        <div class="risk-summary">
            <div class="risk-score ${getRiskClass(riskScore)}">
                <span class="score">${riskScore}</span>
                <span class="label">Risk Score</span>
            </div>
            
            ${contractDetails.priceUsd ? `
                <div class="contract-details">
                    <div class="detail-item">
                        <span class="label">Price:</span>
                        <span class="value">$${parseFloat(contractDetails.priceUsd).toFixed(6)}</span>
                    </div>
                    ${contractDetails.liquidityUsd ? `
                        <div class="detail-item">
                            <span class="label">Liquidity:</span>
                            <span class="value">$${formatNumber(contractDetails.liquidityUsd)}</span>
                        </div>
                    ` : ''}
                    ${contractDetails.volume24h ? `
                        <div class="detail-item">
                            <span class="label">24h Volume:</span>
                            <span class="value">$${formatNumber(contractDetails.volume24h)}</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
        
        ${description ? `
            <!-- <div class="risk-description">
                <h3>Risk Assessment</h3>
                <p>${description}</p>
            </div> -->
        ` : ''}
        
        ${explanations.length > 0 ? `
            <div class="risk-explanations">
                <h3>Risk Factors</h3>
                ${groupExplanationsByType(explanations)}
            </div>
        ` : ''}
        
        ${debugMode && riskData.providerData ? `
            <div class="debug-data">
                <h3>Debug Data</h3>
                <pre>${JSON.stringify(riskData.providerData, null, 2)}</pre>
            </div>
        ` : ''}
    `;
    
    resultsSection.style.display = 'block';
}

// Get CSS class for risk score
function getRiskClass(score) {
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
    
    resultsSection.innerHTML = `
        <div class="contract-header">
            <h2>${name} ${symbol ? `(${symbol})` : ''}</h2>
            <div class="contract-meta">
                <span class="address">${address}</span>
                <span class="blockchain-badge">${blockchain}</span>
            </div>
        </div>
        
        <div class="contract-summary">
            <div class="contract-details">
                ${price ? `
                    <div class="detail-item">
                        <span class="label">Price:</span>
                        <span class="value">${price}</span>
                    </div>
                ` : ''}
                ${marketCap ? `
                    <div class="detail-item">
                        <span class="label">Market Cap:</span>
                        <span class="value">${marketCap}</span>
                    </div>
                ` : ''}
                ${liquidity ? `
                    <div class="detail-item">
                        <span class="label">Liquidity:</span>
                        <span class="value">${liquidity}</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="loading-message">
            <p>Analyzing risk factors...</p>
        </div>
    `;
    
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