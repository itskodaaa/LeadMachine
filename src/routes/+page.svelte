<script lang="ts">
  import { onMount } from 'svelte';
  import LeadTable from '$lib/components/LeadTable.svelte';
  import LeadForm from '$lib/components/LeadForm.svelte';
  import ImportCSV from '$lib/components/ImportCSV.svelte';
  import type { Lead } from '$lib/types';

  let leads = $state<Lead[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let search = $state('');
  let status = $state('all');
  let stateFilter = $state('all');
  let selected = $state<number[]>([]);
  let loading = $state(true);

  let showForm = $state(false);
  let showImport = $state(false);
  let editingLead = $state<Lead | null>(null);

  let stats = $state({ total: 0, byStatus: [] as any[], byState: [] as any[] });

  async function fetchLeads() {
    loading = true;
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status !== 'all') p.set('status', status);
    if (stateFilter !== 'all') p.set('state', stateFilter);
    p.set('page', String(page));
    p.set('limit', '25');
    try {
      const r = await fetch(`/api/leads?${p}`);
      const d = await r.json();
      leads = d.leads || []; total = d.total || 0; totalPages = d.totalPages || 1;
    } catch { console.error('fetch failed'); } finally { loading = false; }
  }

  async function fetchStats() {
    try { const r = await fetch('/api/leads?stats=true'); stats = await r.json(); } catch {}
  }

  onMount(() => { fetchLeads(); fetchStats(); });

  function doSearch() { page = 1; selected = []; fetchLeads(); }
  function doFilter() { page = 1; selected = []; fetchLeads(); }

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
    if (status !== 'all') p.set('status', status);
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
    { label: 'Sent', value: stats.byStatus.find((s:any)=>s.status==='contacted')?.count||0 },
    { label: 'Replied', value: stats.byStatus.find((s:any)=>s.status==='responded')?.count||0 }
  ]);

  let searchInput = $state('');
</script>

<svelte:head><title>LeadFlow</title></svelte:head>

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
  <select bind:value={status} onchange={() => doFilter()}>
    <option value="all">All Status</option>
    <option value="not_contacted">New</option>
    <option value="contacted">Sent</option>
    <option value="responded">Replied</option>
    <option value="closed">Closed</option>
  </select>
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
      <option value="contacted">Sent</option>
      <option value="responded">Replied</option>
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
  <LeadTable {leads} {selected} onSelect={(ids) => selected = ids} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={() => { fetchLeads(); fetchStats(); }} />
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
