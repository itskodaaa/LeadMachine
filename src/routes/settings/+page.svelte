<script lang="ts">
  import { onMount } from 'svelte';

  let stats = $state({ total: 0, byStatus: [] as any[] });
  let loading = $state(true);
  let mcpRegistered = $state(false);
  let mcpDetails = $state<any>(null);

  async function fetchSettingsInfo() {
    try {
      const res = await fetch('/api/leads?stats=true');
      stats = await res.json();
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      loading = false;
    }
  }

  async function checkMcpStatus() {
    try {
      // We will create a local API endpoint /api/mcp-status to verify openclaw registration.
      const res = await fetch('/api/mcp-status');
      const data = await res.json();
      mcpRegistered = data.registered;
      mcpDetails = data.details;
    } catch (e) {
      console.error('Failed to check MCP status:', e);
    }
  }

  onMount(() => {
    fetchSettingsInfo();
    checkMcpStatus();
  });
</script>

<svelte:head>
  <title>LeadFlow — Settings</title>
</svelte:head>

<div class="settings-container">
  <div class="settings-header">
    <h2 class="settings-title">Settings & Integrations</h2>
    <p class="settings-subtitle">Manage database settings, system configs, and AI agent connections.</p>
  </div>

  <div class="settings-grid">
    <!-- Database Settings -->
    <div class="settings-card">
      <div class="card-header">
        <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16M4 7h16"/>
        </svg>
        <span class="card-title">Database Status</span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">Engine:</span>
          <span class="info-value">SQLite ( WAL Mode )</span>
        </div>
        <div class="info-row">
          <span class="info-label">File Path:</span>
          <span class="info-value font-mono">data/leads.db</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Leads:</span>
          <span class="info-value">{loading ? '...' : stats.total}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value status-active">Online</span>
        </div>
      </div>
    </div>

    <!-- Model Context Protocol (MCP) Configuration -->
    <div class="settings-card card-wide">
      <div class="card-header">
        <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        <span class="card-title">Model Context Protocol (MCP)</span>
        <span class="mcp-badge {mcpRegistered ? 'active' : 'inactive'}">
          {mcpRegistered ? 'Active in OpenClaw' : 'Not Connected'}
        </span>
      </div>
      <div class="card-body">
        <p class="description-text">
          Expose your local LeadFlow database directly to your OpenClaw agent. This allows the agent to interactively fetch and insert new leads during chat turns.
        </p>

        <div class="mcp-rules">
          <div class="rule-item">
            <span class="rule-check">✓</span>
            <span class="rule-text"><strong>Allowed Actions:</strong> Add leads directly to the database.</span>
          </div>
          <div class="rule-item">
            <span class="rule-check">✓</span>
            <span class="rule-text"><strong>Duplicate Warning:</strong> Performs safety checks on company names and websites, skipping duplicates with explicit warning logs.</span>
          </div>
          <div class="rule-item rule-blocked">
            <span class="rule-cross">✗</span>
            <span class="rule-text"><strong>Blocked Actions:</strong> Lead deletion is blocked and not exposed to the agent.</span>
          </div>
        </div>

        <div class="code-box-header">
          <span>MCP Server Configuration (openclaw.json)</span>
        </div>
        <div class="code-box">
          <pre>{`"mcp": {
  "servers": {
    "leadflow": {
      "command": "node",
      "args": [
        "${mcpDetails?.serverPath || '/Users/macbookair/Documents/GitHub/leadflow/mcp-server.js'}"
      ]
    }
  }
}`}</pre>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px 0;
  }
  .settings-header {
    margin-bottom: 24px;
    text-align: left;
  }
  .settings-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .settings-subtitle {
    font-size: 12px;
    color: var(--muted);
    margin-top: 4px;
  }
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .settings-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
  .card-wide {
    grid-column: span 2;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .card-icon {
    width: 16px;
    height: 16px;
    color: var(--accent);
  }
  .card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    flex: 1;
    text-align: left;
  }
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    border-bottom: 1px dashed var(--border);
    padding-bottom: 6px;
  }
  .info-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .info-label {
    color: var(--text2);
    font-weight: 500;
  }
  .info-value {
    color: var(--text);
    font-weight: 600;
  }
  .font-mono {
    font-family: var(--mono);
    font-size: 11px;
  }
  .status-active {
    color: var(--success);
  }
  .mcp-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
  }
  .mcp-badge.active {
    background: var(--success-bg);
    color: var(--success);
  }
  .mcp-badge.inactive {
    background: var(--danger-bg);
    color: var(--danger);
  }
  .description-text {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.6;
    margin-bottom: 8px;
    text-align: left;
  }
  .mcp-rules {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }
  .rule-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text);
    text-align: left;
  }
  .rule-check {
    color: var(--success);
    font-weight: 700;
  }
  .rule-cross {
    color: var(--danger);
    font-weight: 700;
  }
  .rule-blocked {
    color: var(--text2);
    opacity: 0.8;
  }
  .code-box-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 12px;
    text-align: left;
  }
  .code-box {
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
    font-family: var(--mono);
    font-size: 11px;
    overflow-x: auto;
    text-align: left;
  }
  .code-box pre {
    margin: 0;
    white-space: pre;
  }
  @media (max-width: 768px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }
    .card-wide {
      grid-column: span 1;
    }
  }
</style>
