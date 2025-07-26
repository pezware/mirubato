/**
 * Admin Portal for Dictionary Service
 * Provides a web interface for managing auto-seeding and dictionary operations
 */

import { Hono } from 'hono'
import { Env, Variables } from '../types/env'

export const adminPortal = new Hono<{ Bindings: Env; Variables: Variables }>()

// Serve admin portal HTML
adminPortal.get('/', c => {
  const environment = c.env.ENVIRONMENT || 'production'
  const isProduction = environment === 'production'
  const apiBaseUrl = isProduction
    ? 'https://dictionary.mirubato.com'
    : 'https://dictionary-staging.mirubato.com'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dictionary Admin Portal - Mirubato</title>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.7/dist/axios.min.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            /* Morandi color palette */
            --morandi-sage-50: #f5f7f4;
            --morandi-sage-100: #e8ebe6;
            --morandi-sage-300: #b8c2b0;
            --morandi-sage-500: #7a8a6f;
            --morandi-sage-600: #687a5c;
            --morandi-rose-50: #fdf5f5;
            --morandi-rose-100: #fbe8e8;
            --morandi-rose-300: #f4c1c1;
            --morandi-rose-500: #e89595;
            --morandi-peach-50: #fef7f3;
            --morandi-peach-100: #fdeee4;
            --morandi-peach-300: #f9d3bd;
            --morandi-peach-500: #f3b08a;
            --morandi-sky-50: #f3f7fb;
            --morandi-sky-100: #e4eef6;
            --morandi-sky-300: #bdd7ec;
            --morandi-sky-500: #8cb9dc;
            --morandi-sand-50: #faf9f7;
            --morandi-sand-100: #f3f0eb;
            --morandi-sand-300: #e0d8cb;
            --morandi-sand-500: #c5b8a1;
            --morandi-stone-50: #f7f7f6;
            --morandi-stone-600: #6b6b66;
            --morandi-stone-800: #3d3d3a;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: var(--morandi-sage-50);
            color: var(--morandi-stone-800);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: white;
            padding: 24px 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 32px;
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 600;
            color: var(--morandi-stone-800);
        }
        
        .environment-badge {
            display: inline-block;
            background: ${isProduction ? 'var(--morandi-sage-500)' : 'var(--morandi-peach-500)'};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            margin-left: 16px;
        }
        
        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 32px;
            border-bottom: 2px solid var(--morandi-stone-100);
            padding-bottom: 8px;
        }
        
        .tab {
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: var(--morandi-stone-600);
            border-radius: 8px 8px 0 0;
            transition: all 0.2s;
        }
        
        .tab:hover {
            background: var(--morandi-sage-100);
        }
        
        .tab.active {
            background: var(--morandi-sage-300);
            color: white;
            font-weight: 500;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .card.sage {
            border-left: 4px solid var(--morandi-sage-300);
        }
        
        .card.rose {
            border-left: 4px solid var(--morandi-rose-300);
        }
        
        .card.peach {
            border-left: 4px solid var(--morandi-peach-300);
        }
        
        .card.sky {
            border-left: 4px solid var(--morandi-sky-300);
        }
        
        .card.sand {
            border-left: 4px solid var(--morandi-sand-300);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .card-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--morandi-stone-800);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .card-title i {
            width: 20px;
            height: 20px;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        
        .metric {
            padding: 16px;
            background: var(--morandi-sage-50);
            border-radius: 8px;
        }
        
        .metric-label {
            font-size: 14px;
            color: var(--morandi-stone-600);
            margin-bottom: 4px;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 600;
            color: var(--morandi-stone-800);
        }
        
        .metric-value.small {
            font-size: 18px;
        }
        
        .button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .button i {
            width: 18px;
            height: 18px;
        }
        
        .button.primary {
            background: var(--morandi-sage-500);
            color: white;
        }
        
        .button.primary:hover {
            background: var(--morandi-sage-600);
        }
        
        .button.secondary {
            background: var(--morandi-sky-300);
            color: white;
        }
        
        .button.secondary:hover {
            background: var(--morandi-sky-500);
        }
        
        .button.danger {
            background: var(--morandi-rose-300);
            color: white;
        }
        
        .button.danger:hover {
            background: var(--morandi-rose-500);
        }
        
        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-radius: 50%;
            border-top-color: currentColor;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .alert {
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        
        .alert.success {
            background: var(--morandi-sage-100);
            color: var(--morandi-sage-600);
            border-left: 4px solid var(--morandi-sage-500);
        }
        
        .alert.error {
            background: var(--morandi-rose-100);
            color: var(--morandi-rose-600);
            border-left: 4px solid var(--morandi-rose-500);
        }
        
        .alert.info {
            background: var(--morandi-sky-100);
            color: var(--morandi-sky-600);
            border-left: 4px solid var(--morandi-sky-500);
        }
        
        .queue-item {
            padding: 12px;
            background: var(--morandi-sand-50);
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .queue-item-info {
            flex: 1;
        }
        
        .queue-item-term {
            font-weight: 500;
            color: var(--morandi-stone-800);
        }
        
        .queue-item-meta {
            font-size: 14px;
            color: var(--morandi-stone-600);
            margin-top: 4px;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-badge.pending {
            background: var(--morandi-sand-300);
            color: var(--morandi-stone-800);
        }
        
        .status-badge.processing {
            background: var(--morandi-sky-300);
            color: white;
        }
        
        .status-badge.completed {
            background: var(--morandi-sage-300);
            color: white;
        }
        
        .status-badge.failed {
            background: var(--morandi-rose-300);
            color: white;
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--morandi-stone-600);
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--morandi-stone-300);
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.2s;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--morandi-sage-500);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .metric-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .empty-state {
            text-align: center;
            padding: 48px;
            color: var(--morandi-stone-600);
        }
        
        .empty-state i {
            width: 48px;
            height: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--morandi-stone-100);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--morandi-sage-500);
            transition: width 0.3s;
        }
        
        .progress-fill.bg-rose {
            background: var(--morandi-rose-500);
        }
        
        .progress-fill.bg-peach {
            background: var(--morandi-peach-500);
        }
        
        .text-rose {
            color: var(--morandi-rose-500);
        }
        
        .alert-warning {
            background: var(--morandi-peach-100);
            color: var(--morandi-peach-600);
            border-left: 4px solid var(--morandi-peach-500);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <h1>
                Dictionary Admin Portal
                <span class="environment-badge">${environment}</span>
            </h1>
            <div id="userInfo"></div>
        </div>
    </header>

    <div class="container">
        <div class="tabs">
            <button class="tab active" data-tab="status">System Status</button>
            <button class="tab" data-tab="queue">Seed Queue</button>
            <button class="tab" data-tab="bulk">Bulk Import</button>
            <button class="tab" data-tab="process">Process Seeds</button>
            <button class="tab" data-tab="review">Review Queue</button>
            <button class="tab" data-tab="recovery">Error Recovery</button>
            <button class="tab" data-tab="wikipedia">Wikipedia URLs</button>
        </div>

        <div id="alerts"></div>

        <div id="content">
            <div class="card">
                <p>Initializing...</p>
            </div>
        </div>
    </div>

    <script>
        // Global variables
        const API_BASE = '${apiBaseUrl}/api/v1';
        let authToken = null;
        let currentTab = 'status';
        
        // Initialize Lucide icons when ready
        function initializeLucide() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        // Get auth token from localStorage
        function getAuthToken() {
            try {
                authToken = localStorage.getItem('auth-token');
                if (!authToken) {
                    // Show magic link login form
                    const contentEl = document.getElementById('content');
                    if (contentEl) {
                        contentEl.innerHTML = \`
                            <div class="card rose">
                                <h2 class="card-title">
                                    Admin Authentication Required
                                </h2>
                                <p style="margin-bottom: 24px;">Please enter your @mirubato.com email address to receive a magic link.</p>
                                
                                <form onsubmit="requestMagicLink(event)">
                                    <div class="form-group">
                                        <label class="form-label">Email Address</label>
                                        <input 
                                            type="email" 
                                            class="form-input" 
                                            id="adminEmail" 
                                            placeholder="admin@mirubato.com"
                                            pattern="[^@]+@mirubato\\.com"
                                            title="Must be a @mirubato.com email address"
                                            required
                                        >
                                    </div>
                                    <button type="submit" class="button primary" id="magicLinkBtn">
                                        Send Magic Link
                                    </button>
                                </form>
                                
                                <div id="magicLinkMessage" style="margin-top: 24px;"></div>
                            </div>
                        \`;
                        // Icons are optional - don't fail if they don't load
                        setTimeout(() => {
                            try {
                                initializeLucide();
                            } catch (e) {
                                console.log('Lucide icons not available');
                            }
                        }, 100);
                    }
                    return false;
                }
                return true;
            } catch (error) {
                console.error('Error in getAuthToken:', error);
                return false;
            }
        }

        // Request magic link
        window.requestMagicLink = async function requestMagicLink(event) {
            event.preventDefault();
            
            const emailInput = document.getElementById('adminEmail');
            const email = emailInput.value;
            const button = document.getElementById('magicLinkBtn');
            const messageDiv = document.getElementById('magicLinkMessage');
            
            // Disable form
            emailInput.disabled = true;
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Sending...';
            
            try {
                const response = await fetch('${apiBaseUrl}/fredericchopin/auth/magic-link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error?.message || 'Failed to send magic link');
                }
                
                // Show success message
                messageDiv.innerHTML = \`
                    <div class="alert success">
                        <strong>Magic link sent!</strong><br>
                        <p style="margin-top: 8px;">Please check your email for the sign-in link.</p>
                    </div>
                \`;
            } catch (error) {
                messageDiv.innerHTML = \`
                    <div class="alert error">
                        <strong>Error:</strong> \${error.message}
                    </div>
                \`;
            } finally {
                // Re-enable form
                emailInput.disabled = false;
                button.disabled = false;
                button.innerHTML = '<i data-lucide="mail"></i> Send Magic Link';
                initializeLucide();
            }
        }
        
        // Make bulk import functions globally accessible
        window.submitBulkImport = submitBulkImport;
        window.clearBulkImportForm = clearBulkImportForm;
        window.scanWikipediaUrls = scanWikipediaUrls;
        window.fixSingleWikipediaUrl = fixSingleWikipediaUrl;
        window.fixAllWikipediaUrls = fixAllWikipediaUrls;

        // API helper
        async function apiCall(endpoint, options = {}) {
            if (!authToken) {
                throw new Error('No auth token');
            }
            
            try {
                const response = await axios({
                    method: options.method || 'GET',
                    url: API_BASE + endpoint,
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    data: options.body,
                    timeout: 30000, // 30 second timeout
                });
                
                // Unwrap the response if it has the standard format
                if (response.data && response.data.status === 'success' && response.data.data) {
                    return response.data.data;
                }
                
                // Otherwise return as-is
                return response.data;
            } catch (error) {
                if (error.response) {
                    // Server responded with error
                    const errorData = error.response.data;
                    throw new Error(errorData.error?.message || errorData.message || 'API request failed');
                } else if (error.request) {
                    // Request made but no response
                    throw new Error('No response from server');
                } else {
                    // Request setup error
                    throw new Error(error.message || 'Request failed');
                }
            }
        }

        // Show alert
        function showAlert(type, message, duration = 5000) {
            const alertsDiv = document.getElementById('alerts');
            const alert = document.createElement('div');
            alert.className = 'alert ' + type;
            alert.innerHTML = message;
            alertsDiv.appendChild(alert);

            // Don't auto-remove auth instructions
            if (message.includes('Authentication Required') || duration === 0) {
                return;
            }

            setTimeout(() => {
                alert.remove();
            }, duration);
        }

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (!authToken) {
                    showAlert('error', 'Please authenticate first');
                    return;
                }
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentTab = tab.dataset.tab;
                loadContent();
            });
        });

        // Load content based on current tab
        async function loadContent() {
            if (!authToken) {
                // Don't try to load content if not authenticated
                return;
            }
            
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = '<div class="loading"></div>';

            try {
                switch (currentTab) {
                    case 'status':
                        await loadSystemStatus();
                        break;
                    case 'queue':
                        await loadSeedQueue();
                        break;
                    case 'bulk':
                        await loadBulkImport();
                        break;
                    case 'process':
                        await loadProcessSeeds();
                        break;
                    case 'review':
                        await loadReviewQueue();
                        break;
                    case 'recovery':
                        await loadErrorRecovery();
                        break;
                    case 'wikipedia':
                        await loadWikipediaCleanup();
                        break;
                }
                initializeLucide();
            } catch (error) {
                contentDiv.innerHTML = '<div class="alert error">Error loading content: ' + error.message + '</div>';
            }
        }

        // Load system status
        async function loadSystemStatus() {
            const data = await apiCall('/admin/seed/system-status');
            const contentDiv = document.getElementById('content');

            contentDiv.innerHTML = \`
                <div class="card sage">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="activity"></i>
                            System Overview
                        </h2>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Auto-Seeding</div>
                            <div class="metric-value">\${data.enabled ? 'Enabled' : 'Disabled'}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Environment</div>
                            <div class="metric-value small">\${data.environment}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Schedule</div>
                            <div class="metric-value small">\${data.schedule[data.environment] || 'Not set'}</div>
                        </div>
                    </div>
                </div>

                <div class="card sky">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="zap"></i>
                            Token Usage Today
                        </h2>
                        <div id="refreshTime" style="font-size: 12px; color: var(--morandi-stone-600);">
                            Last updated: ${new Date().toLocaleTimeString()}
                        </div>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Used / Budget</div>
                            <div class="metric-value">\${data.token_usage.used_today} / \${data.configuration.daily_seed_budget}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Available Now</div>
                            <div class="metric-value \${data.token_usage.available_today < 100 ? 'text-rose' : ''}">\${data.token_usage.available_today}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Avg per Term</div>
                            <div class="metric-value">\${data.token_usage.average_per_term || 0}</div>
                        </div>
                    </div>
                    <div style="margin-top: 16px;">
                        <div class="metric-label">Daily Progress</div>
                        <div class="progress-bar" style="margin-top: 8px; height: 20px; position: relative;">
                            <div class="progress-fill \${data.token_usage.usage_percentage > 90 ? 'bg-rose' : data.token_usage.usage_percentage > 75 ? 'bg-peach' : ''}" 
                                 style="width: \${Math.min(100, data.token_usage.usage_percentage)}%">
                            </div>
                            <div style="position: absolute; width: 100%; text-align: center; line-height: 20px; font-size: 12px; font-weight: 600;">
                                \${data.token_usage.usage_percentage}% Used
                            </div>
                        </div>
                        \${data.token_usage.usage_percentage > 90 ? 
                            '<div class="alert alert-warning" style="margin-top: 8px;">⚠️ Token budget nearly exhausted</div>' : 
                            ''}
                    </div>
                </div>

                <div class="card peach">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="trending-up"></i>
                            Processing Statistics (7 days)
                        </h2>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Terms Processed</div>
                            <div class="metric-value">\${data.processing.terms_processed_week}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Average Quality</div>
                            <div class="metric-value">\${data.processing.average_quality_score}%</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Success Rate</div>
                            <div class="metric-value">\${data.processing.success_rate}%</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Pending Review</div>
                            <div class="metric-value">\${data.processing.manual_review_pending}</div>
                        </div>
                    </div>
                </div>

                <div class="card sand">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="settings"></i>
                            Configuration
                        </h2>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Daily Limit</div>
                            <div class="metric-value small">\${data.configuration.daily_seed_limit || 'N/A'}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Token Budget</div>
                            <div class="metric-value small">\${data.configuration.daily_seed_budget || 'N/A'}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Allocation %</div>
                            <div class="metric-value small">\${data.configuration.seed_allocation_percent ? (data.configuration.seed_allocation_percent * 100).toFixed(0) + '%' : 'N/A'}</div>
                        </div>
                    </div>
                </div>
            \`;
        }

        // Load seed queue
        async function loadSeedQueue() {
            const data = await apiCall('/admin/seed/status');
            const contentDiv = document.getElementById('content');

            contentDiv.innerHTML = \`
                <div class="card sage">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="list"></i>
                            Seed Queue Status
                        </h2>
                        <button class="button primary" onclick="initializeSeedQueue()">
                            <i data-lucide="plus"></i>
                            Initialize Queue
                        </button>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Pending</div>
                            <div class="metric-value">\${data.stats.pending}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Processing</div>
                            <div class="metric-value">\${data.stats.processing}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Completed</div>
                            <div class="metric-value">\${data.stats.completed}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Failed</div>
                            <div class="metric-value">\${data.stats.failed}</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 class="card-title">
                        <i data-lucide="clock"></i>
                        Recent Queue Items
                    </h3>
                    <div id="queueItems">
                        \${data.recent_items.length === 0 ? 
                            '<div class="empty-state"><i data-lucide="inbox"></i><p>No items in queue</p></div>' :
                            data.recent_items.map(item => \`
                                <div class="queue-item">
                                    <div class="queue-item-info">
                                        <div class="queue-item-term">\${item.term}</div>
                                        <div class="queue-item-meta">
                                            Priority: \${item.priority} | Languages: \${item.languages.join(', ')}
                                            \${item.error_message ? '<br>Error: ' + item.error_message : ''}
                                        </div>
                                    </div>
                                    <span class="status-badge \${item.status}">\${item.status}</span>
                                </div>
                            \`).join('')
                        }
                    </div>
                </div>

                <div class="card rose">
                    <h3 class="card-title">
                        <i data-lucide="trash-2"></i>
                        Queue Management
                    </h3>
                    <button class="button danger" onclick="clearQueue('failed')">
                        Clear Failed Items
                    </button>
                    <button class="button danger" onclick="clearQueue('completed')">
                        Clear Completed Items
                    </button>
                </div>
            \`;
        }

        // Load bulk import interface
        async function loadBulkImport() {
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = \`
                <div class="card sage">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="upload"></i>
                            Bulk Import Terms
                        </h2>
                    </div>
                    <p style="margin-bottom: 24px;">Import multiple terms at once by pasting them below (one term per line).</p>
                    
                    <form onsubmit="submitBulkImport(event)">
                        <div class="form-group">
                            <label class="form-label">Terms to Import</label>
                            <textarea 
                                class="form-input" 
                                id="bulkTerms" 
                                rows="10" 
                                placeholder="Allegro\nAndante\nAdagio\nPresto\nLargo"
                                required
                            ></textarea>
                            <small class="form-helper">Enter one term per line. Maximum 500 terms per import.</small>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select class="form-input" id="bulkPriority">
                                    <option value="10">10 - Highest</option>
                                    <option value="9">9</option>
                                    <option value="8">8</option>
                                    <option value="7">7</option>
                                    <option value="6">6</option>
                                    <option value="5" selected>5 - Medium</option>
                                    <option value="4">4</option>
                                    <option value="3">3</option>
                                    <option value="2">2</option>
                                    <option value="1">1 - Lowest</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Term Type (Optional)</label>
                                <select class="form-input" id="bulkType">
                                    <option value="">Auto-detect</option>
                                    <option value="tempo">Tempo</option>
                                    <option value="dynamics">Dynamics</option>
                                    <option value="articulation">Articulation</option>
                                    <option value="theory">Theory</option>
                                    <option value="notation">Notation</option>
                                    <option value="form">Form</option>
                                    <option value="technique">Technique</option>
                                    <option value="instrument">Instrument</option>
                                    <option value="genre">Genre</option>
                                    <option value="period">Period</option>
                                    <option value="composer">Composer</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Languages to Generate</label>
                            <div class="checkbox-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                <label class="checkbox">
                                    <input type="checkbox" value="en" checked> English
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" value="es" checked> Spanish
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" value="fr" checked> French
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" value="de" checked> German
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" value="zh-CN" checked> Chinese (Simplified)
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" value="zh-TW" checked> Chinese (Traditional)
                                </label>
                            </div>
                        </div>
                        
                        <button type="submit" class="button primary" id="bulkImportBtn">
                            <i data-lucide="upload"></i>
                            Import to Queue
                        </button>
                    </form>
                </div>
                
                <div id="bulkImportResults"></div>
            \`;
        }
        
        // Submit bulk import
        async function submitBulkImport(event) {
            event.preventDefault();
            
            const termsTextarea = document.getElementById('bulkTerms');
            const terms = termsTextarea.value;
            const priority = parseInt(document.getElementById('bulkPriority').value);
            const type = document.getElementById('bulkType').value || undefined;
            
            // Get selected languages
            const languageCheckboxes = document.querySelectorAll('.checkbox-grid input[type="checkbox"]:checked');
            const languages = Array.from(languageCheckboxes).map(cb => cb.value);
            
            if (languages.length === 0) {
                showAlert('error', 'Please select at least one language');
                return;
            }
            
            const button = document.getElementById('bulkImportBtn');
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Importing...';
            
            try {
                const result = await apiCall('/admin/seed/bulk-import', {
                    method: 'POST',
                    body: JSON.stringify({
                        terms,
                        priority,
                        languages,
                        type
                    })
                });
                
                // Display results
                const resultsDiv = document.getElementById('bulkImportResults');
                
                const duplicatesList = result.details.duplicates.length > 0 
                    ? \`<div class="card peach" style="margin-top: 16px;">
                        <h3 class="card-title">
                            <i data-lucide="alert-circle"></i>
                            Skipped Duplicates (\${result.details.duplicates.length})
                        </h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            \${result.details.duplicates.map(d => 
                                '<li><strong>' + d.term + '</strong>: ' + d.reason + '</li>'
                            ).join('')}
                        </ul>
                    </div>\`
                    : '';
                
                const errorsList = result.details.errors && result.details.errors.length > 0
                    ? \`<div class="card rose" style="margin-top: 16px;">
                        <h3 class="card-title">
                            <i data-lucide="x-circle"></i>
                            Errors (\${result.details.errors.length})
                        </h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            \${result.details.errors.map(e => 
                                '<li><strong>' + e.term + '</strong>: ' + e.error + '</li>'
                            ).join('')}
                        </ul>
                    </div>\`
                    : '';
                
                resultsDiv.innerHTML = \`
                    <div class="card sage" style="margin-top: 16px;">
                        <h3 class="card-title">
                            <i data-lucide="check-circle"></i>
                            Import Results
                        </h3>
                        <div class="metric-grid">
                            <div class="metric">
                                <div class="metric-label">Total Submitted</div>
                                <div class="metric-value">\${result.summary.total_submitted}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Successfully Queued</div>
                                <div class="metric-value text-sage">\${result.summary.successfully_queued}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Skipped (Duplicates)</div>
                                <div class="metric-value text-peach">\${result.summary.skipped_duplicates}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Errors</div>
                                <div class="metric-value text-rose">\${result.summary.errors}</div>
                            </div>
                        </div>
                        
                        \${result.details.queued.length > 0 
                            ? '<div style="margin-top: 16px;"><strong>Successfully queued terms:</strong> ' + 
                              result.details.queued.join(', ') + '</div>'
                            : ''
                        }
                    </div>
                    
                    \${duplicatesList}
                    \${errorsList}
                    
                    <div style="margin-top: 16px;">
                        <button class="button secondary" onclick="loadSeedQueue()">
                            <i data-lucide="list"></i>
                            View Queue Status
                        </button>
                        <button class="button primary" onclick="clearBulkImportForm()">
                            <i data-lucide="plus"></i>
                            Import More Terms
                        </button>
                    </div>
                \`;
                
                showAlert('success', result.message || 'Import completed successfully');
                
                // Clear form if all successful
                if (result.summary.successfully_queued > 0 && result.summary.errors === 0) {
                    termsTextarea.value = '';
                }
                
            } catch (error) {
                showAlert('error', 'Failed to import terms: ' + error.message);
            } finally {
                button.disabled = false;
                button.innerHTML = '<i data-lucide="upload"></i> Import to Queue';
                initializeLucide();
            }
        }
        
        // Clear bulk import form
        function clearBulkImportForm() {
            document.getElementById('bulkTerms').value = '';
            document.getElementById('bulkImportResults').innerHTML = '';
            document.getElementById('bulkPriority').value = '5';
            document.getElementById('bulkType').value = '';
            // Reset all checkboxes to checked
            document.querySelectorAll('.checkbox-grid input[type="checkbox"]').forEach(cb => cb.checked = true);
        }
        
        // Load process seeds interface
        async function loadProcessSeeds() {
            const contentDiv = document.getElementById('content');

            contentDiv.innerHTML = \`
                <div class="card sage">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="play"></i>
                            Manual Seed Processing
                        </h2>
                    </div>
                    <form onsubmit="processSeedQueue(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Batch Size</label>
                                <input type="number" class="form-input" id="batchSize" value="2" min="1" max="10">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mode</label>
                                <select class="form-input" id="dryRun">
                                    <option value="false">Process (Real)</option>
                                    <option value="true">Dry Run (Test)</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="button primary">
                            <i data-lucide="play"></i>
                            Process Seeds
                        </button>
                    </form>
                </div>

                <div id="processResults"></div>
            \`;
        }

        // Load review queue
        async function loadReviewQueue() {
            const data = await apiCall('/admin/seed/review-queue?status=pending');
            const contentDiv = document.getElementById('content');

            contentDiv.innerHTML = \`
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="eye"></i>
                            Manual Review Queue
                        </h2>
                    </div>
                    <div id="reviewItems">
                        \${data.items.length === 0 ? 
                            '<div class="empty-state"><i data-lucide="check-circle"></i><p>No items pending review</p></div>' :
                            data.items.map(item => \`
                                <div class="queue-item">
                                    <div class="queue-item-info">
                                        <div class="queue-item-term">\${item.term}</div>
                                        <div class="queue-item-meta">
                                            Quality Score: \${item.quality_score}% | Reason: \${item.reason}
                                        </div>
                                    </div>
                                    <div>
                                        <button class="button secondary" onclick="reviewItem('\${item.id}', 'approve')">
                                            <i data-lucide="check"></i>
                                            Approve
                                        </button>
                                        <button class="button danger" onclick="reviewItem('\${item.id}', 'reject')">
                                            <i data-lucide="x"></i>
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            \`).join('')
                        }
                    </div>
                </div>
            \`;
        }

        // Initialize seed queue
        async function initializeSeedQueue() {
            try {
                const result = await apiCall('/admin/seed/initialize', {
                    method: 'POST',
                    body: JSON.stringify({
                        priority_threshold: 10,
                        clear_existing: false
                    })
                });
                
                showAlert('success', 'Seed queue initialized with ' + (result.added || 0) + ' terms');
                loadSeedQueue();
            } catch (error) {
                showAlert('error', 'Failed to initialize queue: ' + error.message);
            }
        }

        // Process seed queue
        async function processSeedQueue(event) {
            event.preventDefault();
            
            const batchSize = parseInt(document.getElementById('batchSize').value);
            const dryRun = document.getElementById('dryRun').value === 'true';
            
            try {
                const result = await apiCall('/admin/seed/process', {
                    method: 'POST',
                    body: JSON.stringify({
                        batch_size: batchSize,
                        dry_run: dryRun
                    })
                });
                
                const resultsDiv = document.getElementById('processResults');
                if (dryRun) {
                    resultsDiv.innerHTML = \`
                        <div class="card sky">
                            <h3 class="card-title">Dry Run Results</h3>
                            <p>Would process \${result.queue_items ? result.queue_items.length : 0} terms:</p>
                            <ul>
                                \${result.queue_items ? result.queue_items.map(item => 
                                    '<li>' + item.term + ' (Priority: ' + item.priority + ')</li>'
                                ).join('') : ''}
                            </ul>
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML = \`
                        <div class="card sage">
                            <h3 class="card-title">Processing Results</h3>
                            <div class="metric-grid">
                                <div class="metric">
                                    <div class="metric-label">Processed</div>
                                    <div class="metric-value">\${result.results ? result.results.processed : 0}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Succeeded</div>
                                    <div class="metric-value">\${result.results ? result.results.succeeded : 0}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Failed</div>
                                    <div class="metric-value">\${result.results ? result.results.failed : 0}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Average Quality</div>
                                    <div class="metric-value">\${result.results ? Math.round(result.results.average_quality || 0) : 0}%</div>
                                </div>
                            </div>
                            \${result.token_status ? 
                                \`<div class="card sky" style="margin-top: 16px;">
                                    <h4 class="card-title">Token Usage Update</h4>
                                    <div class="metric-grid">
                                        <div class="metric">
                                            <div class="metric-label">Used This Batch</div>
                                            <div class="metric-value">\${result.token_status.usage_this_batch || 0}</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Total Used Today</div>
                                            <div class="metric-value">\${result.token_status.used_today}</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Available</div>
                                            <div class="metric-value \${result.token_status.available < 100 ? 'text-rose' : ''}">\${result.token_status.available}</div>
                                        </div>
                                    </div>
                                    <div style="margin-top: 8px;">
                                        <div class="progress-bar" style="height: 16px; position: relative;">
                                            <div class="progress-fill \${(result.token_status.used_today / result.token_status.budget * 100) > 90 ? 'bg-rose' : ''}" 
                                                 style="width: \${Math.min(100, (result.token_status.used_today / result.token_status.budget * 100))}%">
                                            </div>
                                            <div style="position: absolute; width: 100%; text-align: center; line-height: 16px; font-size: 11px;">
                                                \${Math.round(result.token_status.used_today / result.token_status.budget * 100)}% of daily budget
                                            </div>
                                        </div>
                                    </div>
                                </div>\` : ''}
                            \${result.results && result.results.errors && result.results.errors.length > 0 ? 
                                '<div class="alert error" style="margin-top: 16px;">Errors: ' + result.results.errors.join(', ') + '</div>' : 
                                ''
                            }
                        </div>
                    \`;
                    showAlert('success', 'Processing completed');
                }
            } catch (error) {
                showAlert('error', 'Failed to process seeds: ' + error.message);
            }
        }

        // Clear queue
        async function clearQueue(status) {
            if (!confirm('Are you sure you want to clear all ' + status + ' items?')) {
                return;
            }
            
            try {
                const result = await apiCall('/admin/seed/clear', {
                    method: 'DELETE',
                    body: JSON.stringify({ status })
                });
                
                showAlert('success', 'Cleared ' + result.data.deleted + ' items');
                loadSeedQueue();
            } catch (error) {
                showAlert('error', 'Failed to clear queue: ' + error.message);
            }
        }

        // Load error recovery interface
        async function loadErrorRecovery() {
            const [stats, dlq] = await Promise.all([
                apiCall('/admin/seed/recovery-stats'),
                apiCall('/admin/seed/dlq')
            ]);
            const contentDiv = document.getElementById('content');

            contentDiv.innerHTML = \`
                <div class="card rose">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="alert-triangle"></i>
                            Error Recovery Statistics
                        </h2>
                        <button class="button primary" onclick="runRecovery()">
                            <i data-lucide="refresh-cw"></i>
                            Run Recovery
                        </button>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Failed Items</div>
                            <div class="metric-value">\${stats.stats.failed_items}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Dead Letter Queue</div>
                            <div class="metric-value">\${stats.stats.dlq_items}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Recovery Rate</div>
                            <div class="metric-value">\${stats.stats.recovery_rate}%</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 class="card-title">
                        <i data-lucide="x-circle"></i>
                        Common Failure Types
                    </h3>
                    <div id="failureTypes">
                        \${stats.stats.common_failures.length === 0 ? 
                            '<div class="empty-state"><p>No failure patterns identified</p></div>' :
                            stats.stats.common_failures.map(failure => \`
                                <div class="queue-item">
                                    <div class="queue-item-info">
                                        <div class="queue-item-term">\${failure.error_type}</div>
                                        <div class="queue-item-meta">Count: \${failure.count}</div>
                                    </div>
                                </div>
                            \`).join('')
                        }
                    </div>
                </div>

                <div class="card peach">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="archive"></i>
                            Dead Letter Queue
                        </h2>
                    </div>
                    <div id="dlqItems">
                        \${dlq.items.length === 0 ? 
                            '<div class="empty-state"><i data-lucide="check-circle"></i><p>No items in dead letter queue</p></div>' :
                            dlq.items.map(item => \`
                                <div class="queue-item">
                                    <div class="queue-item-info">
                                        <div class="queue-item-term">\${item.term}</div>
                                        <div class="queue-item-meta">
                                            Languages: \${item.languages.join(', ')} | 
                                            Attempts: \${item.attempts} |
                                            Failure: \${item.failure_analysis.error_type}
                                            <br>Reason: \${item.failure_reason}
                                        </div>
                                    </div>
                                    <button class="button secondary" onclick="retryDlqItem('\${item.id}')">
                                        <i data-lucide="refresh-cw"></i>
                                        Retry
                                    </button>
                                </div>
                            \`).join('')
                        }
                    </div>
                    \${dlq.pagination && dlq.pagination.total > dlq.items.length ? 
                        \`<div style="text-align: center; margin-top: 16px;">
                            <p>Showing \${dlq.items.length} of \${dlq.pagination.total} items</p>
                        </div>\` : ''
                    }
                </div>
            \`;
        }

        // Run recovery process
        async function runRecovery() {
            try {
                const result = await apiCall('/admin/seed/recover', {
                    method: 'POST',
                    body: JSON.stringify({ limit: 50 })
                });
                
                showAlert('success', \`Recovery completed: \${result.result.retry_scheduled} scheduled for retry, \${result.result.moved_to_dlq} moved to DLQ\`);
                loadErrorRecovery();
            } catch (error) {
                showAlert('error', 'Failed to run recovery: ' + error.message);
            }
        }

        // Retry item from DLQ
        async function retryDlqItem(dlqId) {
            try {
                const result = await apiCall('/admin/seed/dlq/retry', {
                    method: 'POST',
                    body: JSON.stringify({ dlq_ids: [dlqId] })
                });
                
                showAlert('success', result.message || 'Item requeued for processing');
                loadErrorRecovery();
            } catch (error) {
                showAlert('error', 'Failed to retry item: ' + error.message);
            }
        }

        // Review item
        async function reviewItem(id, action) {
            try {
                await apiCall('/admin/seed/review/' + id, {
                    method: 'PUT',
                    body: JSON.stringify({
                        action,
                        notes: action === 'approve' ? 'Approved via admin portal' : 'Rejected via admin portal'
                    })
                });
                
                showAlert('success', 'Item ' + action + 'd successfully');
                loadReviewQueue();
            } catch (error) {
                showAlert('error', 'Failed to review item: ' + error.message);
            }
        }

        // Wikipedia URL cleanup functionality
        async function loadWikipediaCleanup() {
            const contentDiv = document.getElementById('content');
            
            // Initial load with scan button
            contentDiv.innerHTML = \`
                <div class="card sky">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="globe"></i>
                            Wikipedia URL Cleanup
                        </h2>
                    </div>
                    <div class="card-content">
                        <p style="margin-bottom: 16px;">
                            This tool scans dictionary entries for potentially incorrect Wikipedia URLs 
                            (e.g., "The_Magic_Flute_Mozart" instead of "The_Magic_Flute") and fixes them automatically.
                        </p>
                        <button class="button primary" onclick="scanWikipediaUrls()">
                            <i data-lucide="search"></i>
                            Scan for Issues
                        </button>
                    </div>
                </div>
                <div id="wikipediaResults"></div>
            \`;
        }

        async function scanWikipediaUrls() {
            const resultsDiv = document.getElementById('wikipediaResults');
            resultsDiv.innerHTML = '<div class="card"><div class="loading"></div> Scanning entries...</div>';
            
            try {
                const result = await apiCall('/admin/wikipedia/scan');
                
                if (result.entries.length === 0) {
                    resultsDiv.innerHTML = \`
                        <div class="card sage">
                            <div class="empty-state">
                                <i data-lucide="check-circle"></i>
                                <p>All Wikipedia URLs look correct!</p>
                            </div>
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML = \`
                        <div class="card peach">
                            <div class="card-header">
                                <h3 class="card-title">
                                    <i data-lucide="alert-circle"></i>
                                    Found \${result.entries.length} entries with potential URL issues
                                </h3>
                                <button class="button danger" onclick="fixAllWikipediaUrls()">
                                    <i data-lucide="wrench"></i>
                                    Fix All
                                </button>
                            </div>
                            <div id="urlFixList">
                                \${result.entries.map(entry => \`
                                    <div class="queue-item">
                                        <div class="queue-item-info" style="flex: 1;">
                                            <div class="queue-item-term">\${entry.term} (\${entry.type})</div>
                                            <div class="queue-item-meta">
                                                Current: <code>\${entry.current_url}</code><br>
                                                Suggested: <code>\${entry.suggested_url}</code><br>
                                                Reason: <span class="text-rose">\${entry.reason || 'URL mismatch'}</span>
                                                \${entry.suggestions && entry.suggestions.length > 1 ? 
                                                    '<br>Other suggestions: ' + entry.suggestions.slice(1, 3).map(s => 
                                                        '<code>' + s.title + '</code>'
                                                    ).join(', ') : ''
                                                }
                                            </div>
                                        </div>
                                        <button class="button secondary" onclick="fixSingleWikipediaUrl('\${entry.id}')">
                                            <i data-lucide="wrench"></i>
                                            Fix
                                        </button>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`;
                }
            } catch (error) {
                resultsDiv.innerHTML = \`
                    <div class="alert error">
                        Failed to scan entries: \${error.message}
                    </div>
                \`;
            }
        }

        async function fixSingleWikipediaUrl(entryId) {
            try {
                const result = await apiCall('/admin/wikipedia/fix', {
                    method: 'POST',
                    body: JSON.stringify({ entry_ids: [entryId] })
                });
                
                showAlert('success', result.message || 'URL fixed successfully');
                scanWikipediaUrls(); // Refresh the list
            } catch (error) {
                showAlert('error', 'Failed to fix URL: ' + error.message);
            }
        }

        async function fixAllWikipediaUrls() {
            if (!confirm('This will update all entries with incorrect Wikipedia URLs. Continue?')) {
                return;
            }
            
            const resultsDiv = document.getElementById('wikipediaResults');
            const originalContent = resultsDiv.innerHTML;
            resultsDiv.innerHTML = '<div class="card"><div class="loading"></div> Fixing all URLs...</div>';
            
            try {
                const result = await apiCall('/admin/wikipedia/fix-all', {
                    method: 'POST'
                });
                
                showAlert('success', result.message || 'All URLs fixed successfully');
                loadWikipediaCleanup(); // Reload the entire tab
            } catch (error) {
                resultsDiv.innerHTML = originalContent;
                showAlert('error', 'Failed to fix URLs: ' + error.message);
            }
        }

        // Auto-refresh interval
        let autoRefreshInterval = null;
        
        // Enable auto-refresh for system status
        function enableAutoRefresh() {
            // Refresh every 30 seconds when on system status tab
            autoRefreshInterval = setInterval(() => {
                const activeTab = document.querySelector('.tab.active');
                if (activeTab && activeTab.dataset.tab === 'status') {
                    loadSystemStatus();
                }
            }, 30000);
        }
        
        // Disable auto-refresh
        function disableAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }

        // Initialize on load
        window.addEventListener('DOMContentLoaded', () => {
            try {
                // Initialize icons first
                initializeLucide();
                
                if (getAuthToken()) {
                    // Show user info
                    const userEmail = localStorage.getItem('user-email');
                    if (userEmail) {
                        document.getElementById('userInfo').innerHTML = 'Logged in as: ' + userEmail;
                    }
                    
                    // Load initial content
                    loadContent();
                    
                    // Enable auto-refresh
                    enableAutoRefresh();
                } else {
                    // Make sure the login form is shown
                    console.log('No auth token found, showing login form');
                }
            } catch (error) {
                console.error('Error during initialization:', error);
                document.getElementById('content').innerHTML = '<div class="alert error">Error initializing: ' + error.message + '</div>';
            }
        });
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            disableAutoRefresh();
        });
    </script>
</body>
</html>
  `

  return c.html(html)
})

export default adminPortal
