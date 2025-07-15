/**
 * Admin Portal for Dictionary Service
 * Provides a web interface for managing auto-seeding and dictionary operations
 */

import { Hono } from 'hono'
import { Env, Variables } from '../types/env'
import { auth } from '../middleware/auth'
import { adminEmailAuth } from '../middleware/admin-email'

export const adminPortal = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply authentication middleware
adminPortal.use('*', auth())
adminPortal.use('*', adminEmailAuth())

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
            <button class="tab" data-tab="process">Process Seeds</button>
            <button class="tab" data-tab="review">Review Queue</button>
        </div>

        <div id="alerts"></div>

        <div id="content">
            <!-- Content will be dynamically loaded here -->
        </div>
    </div>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        // Global variables
        const API_BASE = '${apiBaseUrl}/api/v1';
        let authToken = null;
        let currentTab = 'status';

        // Get auth token from localStorage
        function getAuthToken() {
            authToken = localStorage.getItem('auth-token');
            if (!authToken) {
                const alertHtml = \`
                    <div>
                        <strong>Authentication Required</strong><br>
                        <p style="margin-top: 8px;">The admin portal requires authentication. Since the dictionary service is on a different subdomain, you need to:</p>
                        <ol style="margin-top: 8px; margin-left: 20px;">
                            <li>Log in at <a href="${isProduction ? 'https://mirubato.com' : 'https://staging.mirubato.com'}" target="_blank" style="color: var(--morandi-sage-600); text-decoration: underline;">${isProduction ? 'mirubato.com' : 'staging.mirubato.com'}</a></li>
                            <li>Open the browser console (F12)</li>
                            <li>Run: <code style="background: var(--morandi-sand-100); padding: 2px 4px; border-radius: 3px;">localStorage.getItem('auth-token')</code></li>
                            <li>Copy the token (including quotes)</li>
                            <li>Come back here and run in console: <code style="background: var(--morandi-sand-100); padding: 2px 4px; border-radius: 3px;">localStorage.setItem('auth-token', YOUR_TOKEN)</code></li>
                            <li>Refresh this page</li>
                        </ol>
                        <p style="margin-top: 12px; font-size: 14px; color: var(--morandi-stone-600);">This is a temporary solution. We're working on a better cross-domain authentication system.</p>
                    </div>
                \`;
                showAlert('info', alertHtml);
                
                // Also show a simplified version in the content area
                document.getElementById('content').innerHTML = \`
                    <div class="card rose">
                        <h2 class="card-title">
                            <i data-lucide="alert-circle"></i>
                            Authentication Required
                        </h2>
                        <p>Please follow the instructions in the blue notification above to authenticate.</p>
                    </div>
                \`;
                lucide.createIcons();
                return false;
            }
            return true;
        }

        // API helper
        async function apiCall(endpoint, options = {}) {
            if (!authToken) {
                throw new Error('No auth token');
            }

            const response = await fetch(API_BASE + endpoint, {
                ...options,
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || error.message || 'API request failed');
            }

            return response.json();
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
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentTab = tab.dataset.tab;
                loadContent();
            });
        });

        // Load content based on current tab
        async function loadContent() {
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
                    case 'process':
                        await loadProcessSeeds();
                        break;
                    case 'review':
                        await loadReviewQueue();
                        break;
                }
                lucide.createIcons();
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
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Used / Available</div>
                            <div class="metric-value">\${data.token_usage.used_today} / \${data.token_usage.available_today}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Usage Percentage</div>
                            <div class="metric-value">\${data.token_usage.usage_percentage}%</div>
                            <div class="progress-bar" style="margin-top: 8px;">
                                <div class="progress-fill" style="width: \${data.token_usage.usage_percentage}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Avg per Term</div>
                            <div class="metric-value">\${data.token_usage.average_per_term}</div>
                        </div>
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
                            <div class="metric-value small">\${(data.configuration.seed_allocation_percent * 100).toFixed(0)}%</div>
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
                
                showAlert('success', 'Seed queue initialized with ' + result.data.added + ' terms');
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
                            <p>Would process \${result.data.queue_items.length} terms:</p>
                            <ul>
                                \${result.data.queue_items.map(item => 
                                    '<li>' + item.term + ' (Priority: ' + item.priority + ')</li>'
                                ).join('')}
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
                                    <div class="metric-value">\${result.data.results.processed}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Succeeded</div>
                                    <div class="metric-value">\${result.data.results.succeeded}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Failed</div>
                                    <div class="metric-value">\${result.data.results.failed}</div>
                                </div>
                            </div>
                            \${result.data.results.errors.length > 0 ? 
                                '<div class="alert error">Errors: ' + result.data.results.errors.join(', ') + '</div>' : 
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

        // Initialize on load
        window.addEventListener('DOMContentLoaded', () => {
            if (getAuthToken()) {
                // Show user info
                const userEmail = localStorage.getItem('user-email');
                if (userEmail) {
                    document.getElementById('userInfo').innerHTML = 'Logged in as: ' + userEmail;
                }
                
                // Load initial content
                loadContent();
            }
        });
    </script>
</body>
</html>
  `

  return c.html(html)
})

export default adminPortal
