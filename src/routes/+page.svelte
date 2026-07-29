<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import LeadTable from '$lib/components/LeadTable.svelte';
  import LeadForm from '$lib/components/LeadForm.svelte';
  import ImportCSV from '$lib/components/ImportCSV.svelte';
  import type { Lead } from '$lib/types';
  import { STATUS_CONFIG } from '$lib/types';

  let leads = $state<Lead[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let search = $state('');
  
  // Custom multi-select status state
  let selectedStatuses = $state<string[]>(['not_contacted', 'pending', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed']);
  let isFilterDropdownOpen = $state(false);

  let stateFilter = $state('all');
  let selected = $state<number[]>([]);
  let loading = $state(true);

  let showForm = $state(false);
  let showImport = $state(false);
  let editingLead = $state<Lead | null>(null);

  let stats = $state({ total: 0, byStatus: [] as any[], byState: [] as any[] });
  let duplicateWarnings = $state<any[]>([]);

  // Temporary leads in status-change grace period (60 seconds)
  let temporaryLeads = $state<Record<number, { lead: Lead; expiresAt: number }>>({});

  async function fetchLeads(silent = false) {
    if (!silent) loading = true;
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    
    if (selectedStatuses.length === 7) {
      p.set('status', 'all');
    } else if (selectedStatuses.length === 0) {
      p.set('status', 'none');
    } else {
      p.set('status', selectedStatuses.join(','));
    }

    if (stateFilter !== 'all') p.set('state', stateFilter);
    p.set('page', String(page));
    p.set('limit', '25');
    try {
      const r = await fetch(`/api/leads?${p}`);
      const d = await r.json();
      const serverLeads = d.leads || [];
      
      // Merge the new server list with active temporary leads to preserve index order and status
      const mergedLeads = [...serverLeads];
      const now = Date.now();
      const activeTemps = Object.values(temporaryLeads).filter(t => t.expiresAt > now);
      
      for (const t of activeTemps) {
        const idxInMerged = mergedLeads.findIndex(l => l.id === t.lead.id);
        if (idxInMerged === -1) {
          const prevIdx = leads.findIndex(l => l.id === t.lead.id);
          if (prevIdx !== -1) {
            mergedLeads.splice(prevIdx, 0, t.lead);
          } else {
            mergedLeads.push(t.lead);
          }
        } else {
          mergedLeads[idxInMerged] = t.lead;
        }
      }
      
      leads = mergedLeads;
      total = d.total || 0;
      totalPages = d.totalPages || 1;
    } catch { console.error('fetch failed'); } finally { loading = false; }
  }

  async function fetchStats() {
    try { const r = await fetch('/api/leads?stats=true'); stats = await r.json(); } catch {}
  }

  async function fetchWarnings() {
    try {
      const res = await fetch('/api/duplicate-warnings');
      const data = await res.json();
      duplicateWarnings = data.warnings || [];
    } catch (e) {
      console.error('Failed to fetch warnings', e);
    }
  }

  async function dismissWarning(id: number) {
    try {
      await fetch('/api/duplicate-warnings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      duplicateWarnings = duplicateWarnings.filter(w => w.id !== id);
    } catch (e) {
      console.error('Failed to dismiss warning', e);
    }
  }

  async function clearAllWarnings() {
    try {
      await fetch('/api/duplicate-warnings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      duplicateWarnings = [];
    } catch (e) {
      console.error('Failed to clear warnings', e);
    }
  }

  let warningTimer: any;

  onMount(() => {
    fetchLeads();
    fetchStats();
    fetchWarnings();
    warningTimer = setInterval(fetchWarnings, 10000);
  });

  onDestroy(() => {
    clearInterval(warningTimer);
  });

  function doSearch() { page = 1; selected = []; fetchLeads(); }
  function doFilter() { page = 1; selected = []; fetchLeads(); }

  // Advanced Filter UI toggles
  function toggleStatusFilter(statusKey: string) {
    if (selectedStatuses.includes(statusKey)) {
      selectedStatuses = selectedStatuses.filter(s => s !== statusKey);
    } else {
      selectedStatuses = [...selectedStatuses, statusKey];
    }
    doFilter();
  }

  function toggleAllStatusFilter() {
    if (selectedStatuses.length === 7) {
      selectedStatuses = [];
    } else {
      selectedStatuses = ['not_contacted', 'pending', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed'];
    }
    doFilter();
  }

  function getFilterLabel() {
    if (selectedStatuses.length === 7) return 'All';
    if (selectedStatuses.length === 0) return 'None';
    if (selectedStatuses.length === 6) {
      const missing = ['not_contacted', 'pending', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed'].find(s => !selectedStatuses.includes(s));
      if (missing) return `All except ${STATUS_CONFIG[missing as any]?.label}`;
    }
    return selectedStatuses.map(s => STATUS_CONFIG[s as any]?.label).join(', ');
  }

  // Grace Period Handler for lead status changes
  function handleStatusChange(leadId: number, nextStatus: string) {
    const leadIdx = leads.findIndex(l => l.id === leadId);
    if (leadIdx !== -1) {
      const updatedLead = { ...leads[leadIdx], status: nextStatus as any };
      
      // Update locally immediately to change status badge instantly
      leads[leadIdx] = updatedLead;

      // Add to temporary grace period map (60 seconds)
      temporaryLeads[leadId] = {
        lead: updatedLead,
        expiresAt: Date.now() + 60000
      };
      
      // Clean up from grace period after 60s and fetch silently to apply filters
      setTimeout(() => {
        const updatedTemps = { ...temporaryLeads };
        delete updatedTemps[leadId];
        temporaryLeads = updatedTemps;
        fetchLeads(true);
      }, 60000);
    }

    // Call SvelteKit API in background
    fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    }).then(r => {
      if (r.ok) {
        fetchLeads(true);
        fetchStats();
      }
    });
  }

  async function handleSave(data: any) {
    const method = editingLead ? 'PUT' : 'POST';
    const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) { showForm = false; editingLead = null; fetchLeads(); fetchStats(); }
    else { const e = await r.json(); throw new Error(e.error); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    selected = selected.filter(i => i !== id); fetchLeads(); fetchStats();
  }

  function handleEdit(l: Lead) { editingLead = l; showForm = true; }

  function handleBulkStatus(s: string) {
    if (!selected.length) return;
    if (!confirm(`Change ${selected.length} leads?`)) return;
    Promise.all(selected.map(id => fetch(`/api/leads/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:s}) })))
      .then(() => { selected = []; fetchLeads(); fetchStats(); });
  }

  function handleBulkDelete() {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} leads?`)) return;
    Promise.all(selected.map(id => fetch(`/api/leads/${id}`, { method:'DELETE' })))
      .then(() => { selected = []; fetchLeads(); fetchStats(); });
  }

  function handleExport() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    
    if (selectedStatuses.length === 7) {
      p.set('status', 'all');
    } else if (selectedStatuses.length === 0) {
      p.set('status', 'none');
    } else {
      p.set('status', selectedStatuses.join(','));
    }

    if (stateFilter !== 'all') p.set('state', stateFilter);
    p.set('limit', '9999');
    fetch(`/api/leads?${p}`).then(r=>r.json()).then(d => {
      const csv = [
        ['company_name','website','city','state','phone','email','contact_person','status','notes'].join(','),
        ...d.leads.map((l: Lead) => [l.company_name,l.website,l.city||'',l.state||'',l.phone||'',l.email||'',l.contact_person||'',l.status,l.notes||''].map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    });
  }

  const statCards = $derived([
    { label: 'Total', value: stats.total },
    { label: 'New', value: stats.byStatus.find((s:any)=>s.status==='not_contacted')?.count||0 },
    { label: 'Pending', value: stats.byStatus.find((s:any)=>s.status==='pending')?.count||0 },
    { label: 'Sent', value: stats.byStatus.find((s:any)=>s.status==='contacted')?.count||0 },
    { label: 'Replied', value: stats.byStatus.find((s:any)=>s.status==='responded')?.count||0 },
    { label: 'Unreachable', value: stats.byStatus.find((s:any)=>s.status==='unable_to_reach')?.count||0 },
    { label: 'Won', value: stats.byStatus.find((s:any)=>s.status==='won')?.count||0 }
  ]);

  let searchInput = $state('');
</script>

<svelte:head><title>LeadFlow</title></svelte:head>

{#if duplicateWarnings.length > 0}
  <div class="duplicate-banner">
    <div class="banner-header">
      <svg class="banner-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <span class="banner-title">{duplicateWarnings.length} Duplicate Lead Alert{duplicateWarnings.length > 1 ? 's' : ''} (from AI Agent)</span>
      <button class="btn-clear-all" onclick={clearAllWarnings}>Dismiss All</button>
    </div>
    <div class="banner-body">
      {#each duplicateWarnings as w}
        <div class="warning-item">
          <span class="warning-text">
            <strong>{w.company_name}</strong> ({w.website}) was skipped: {w.reason}
          </span>
          <button class="btn-dismiss-warning" onclick={() => dismissWarning(w.id)} aria-label="Dismiss warning">✕</button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<div class="stats">
  {#each statCards as c}
    <div class="stat-card">
      <div class="stat-label">{c.label}</div>
      <div class="stat-value">{c.value.toLocaleString()}</div>
    </div>
  {/each}
</div>

<div class="toolbar">
  <div class="search-wrap">
    <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
    <input class="search-input" type="text" bind:value={search} oninput={() => doSearch()} placeholder="Search name, website, city..." />
  </div>
  <div class="dropdown-container">
    <button class="btn btn-dropdown" onclick={() => isFilterDropdownOpen = !isFilterDropdownOpen} type="button">
      <span>Status: {getFilterLabel()}</span>
      <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
    </button>
    {#if isFilterDropdownOpen}
      <button class="dropdown-backdrop" onclick={() => isFilterDropdownOpen = false} aria-label="Close status dropdown" type="button"></button>
      <div class="dropdown-list">
        <label class="dropdown-item select-all">
          <input type="checkbox" checked={selectedStatuses.length === 7} onchange={toggleAllStatusFilter} />
          <span style="font-weight:600">Select All</span>
        </label>
        <div class="dropdown-divider"></div>
        {#each Object.entries(STATUS_CONFIG) as [key, value]}
          <label class="dropdown-item">
            <input type="checkbox" checked={selectedStatuses.includes(key)} onchange={() => toggleStatusFilter(key)} />
            <span class="badge {value.cls}" style="margin-left: 6px;">
              <span class="badge-dot"></span>
              {value.label}
            </span>
          </label>
        {/each}
      </div>
    {/if}
  </div>
  <select bind:value={stateFilter} onchange={() => doFilter()} style="max-width:90px">
    <option value="all">State</option>
    {#each ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'] as s}
      <option value={s}>{s}</option>
    {/each}
  </select>
</div>

{#if selected.length > 0}
  <div class="bulk-bar">
    {selected.length} selected
    <span class="bulk-divider"></span>
    <select onchange={(e) => handleBulkStatus((e.target as HTMLSelectElement).value)} style="background:transparent;border:none;color:var(--accent);font-size:11px;font-weight:600;font-family:var(--font);cursor:pointer;height:auto;padding:0">
      <option value="">Status</option>
      <option value="not_contacted">New</option>
      <option value="pending">Pending</option>
      <option value="contacted">Sent</option>
      <option value="responded">Replied</option>
      <option value="unable_to_reach">Unreachable</option>
      <option value="won">Won</option>
      <option value="closed">Closed</option>
    </select>
    <button class="btn btn-sm btn-danger" onclick={handleBulkDelete}>Delete</button>
  </div>
{/if}

{#if loading}
  <div class="table-wrap" style="text-align:center;padding:40px">
    <div class="spinner"></div>
    <div style="font-size:11px;color:var(--muted)">Loading...</div>
  </div>
{:else}
  <LeadTable {leads} {selected} onSelect={(ids) => selected = ids} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
{/if}

{#if totalPages > 1}
  <div class="pagination">
    <span class="page-info">Showing {((page-1)*25)+1}–{Math.min(page*25,total)} of {total.toLocaleString()}</span>
    <div class="page-btns">
      <button class="page-btn" onclick={() => { page=1; fetchLeads(); }} disabled={page===1}>«</button>
      <button class="page-btn" onclick={() => { page--; fetchLeads(); }} disabled={page===1}>‹</button>
      {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => Math.max(1, Math.min(page-2, totalPages-4)) + i).filter(p => p <= totalPages) as p}
        <button class="page-btn {p===page?'active':''}" onclick={() => { page=p; fetchLeads(); }}>{p}</button>
      {/each}
      <button class="page-btn" onclick={() => { page++; fetchLeads(); }} disabled={page===totalPages}>›</button>
      <button class="page-btn" onclick={() => { page=totalPages; fetchLeads(); }} disabled={page===totalPages}>»</button>
    </div>
  </div>
{/if}

<LeadForm bind:open={showForm} lead={editingLead} onClose={() => { showForm = false; editingLead = null; }} onSave={handleSave} />
<ImportCSV open={showImport} onClose={() => showImport = false} onImport={() => { fetchLeads(); fetchStats(); }} />

<div style="text-align:center;margin-top:16px;padding:12px">
  <button class="btn btn-accent" onclick={() => { editingLead = null; showForm = true; }}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
    <span>Add Lead</span>
  </button>
  <button class="btn" onclick={() => showImport = true}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
    <span>Import CSV</span>
  </button>
  <button class="btn" onclick={handleExport}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
    <span>Export</span>
  </button>
</div>

<style>
  .duplicate-banner {
    background: var(--warning-bg);
    border: 1px solid rgba(199, 122, 0, 0.25);
    border-radius: var(--radius);
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: fadeIn 0.2s ease-out;
  }
  .banner-header {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px dashed rgba(199, 122, 0, 0.15);
    padding-bottom: 8px;
  }
  .banner-icon {
    width: 16px;
    height: 16px;
    color: var(--warning);
  }
  .banner-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--warning);
    flex: 1;
    text-align: left;
  }
  .btn-clear-all {
    background: none;
    border: none;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
  }
  .btn-clear-all:hover {
    text-decoration: underline;
  }
  .banner-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 150px;
    overflow-y: auto;
  }
  .warning-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--text2);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 10px;
  }
  .warning-text {
    flex: 1;
    text-align: left;
  }
  .btn-dismiss-warning {
    background: none;
    border: none;
    font-size: 10px;
    color: var(--muted);
    cursor: pointer;
    padding: 2px 6px;
    transition: color 0.1s;
  }
  .btn-dismiss-warning:hover {
    color: var(--danger);
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Custom Multiselect Status Dropdown */
  .dropdown-container {
    position: relative;
    display: inline-block;
  }
  .btn-dropdown {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.15s;
    min-width: 140px;
    max-width: 240px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn-dropdown:hover {
    border-color: var(--accent);
  }
  .btn-dropdown .chevron {
    width: 10px;
    height: 10px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .dropdown-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    background: transparent;
    border: none;
    cursor: default;
  }
  .dropdown-list {
    position: absolute;
    top: 34px;
    left: 0;
    z-index: 50;
    min-width: 160px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    padding: 6px 0;
    animation: fadeIn 0.15s ease-out;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text2);
    cursor: pointer;
    user-select: none;
    transition: background 0.1s;
  }
  .dropdown-item:hover {
    background: var(--hover);
  }
  .dropdown-item input[type="checkbox"] {
    width: 12px;
    height: 12px;
    margin: 0;
  }
  .dropdown-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }
</style>
