<script lang="ts">
  import { onMount } from 'svelte';
  import LeadTable from '$lib/components/LeadTable.svelte';
  import LeadForm from '$lib/components/LeadForm.svelte';
  import ImportCSV from '$lib/components/ImportCSV.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import type { Lead, LeadStatus } from '$lib/types';

  let leads = $state<Lead[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let search = $state('');
  let status = $state('all');
  let state = $state('all');
  let selected = $state<number[]>([]);
  let loading = $state(true);

  let showForm = $state(false);
  let showImport = $state(false);
  let editingLead = $state<Lead | null>(null);

  let stats = $state({ total: 0, byStatus: [] as any[], byState: [] as any[] });

  async function fetchLeads() {
    loading = true;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (state !== 'all') params.set('state', state);
    params.set('page', String(page));
    params.set('limit', '25');

    try {
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      leads = data.leads || [];
      total = data.total || 0;
      totalPages = data.totalPages || 1;
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    } finally {
      loading = false;
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/leads?stats=true');
      stats = await res.json();
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  }

  onMount(() => {
    fetchLeads();
    fetchStats();
  });

  function handleSearch(s: string) {
    search = s;
    page = 1;
    selected = [];
    fetchLeads();
  }

  function handleFilter(filters: { status: string; state: string }) {
    status = filters.status;
    state = filters.state;
    page = 1;
    selected = [];
    fetchLeads();
  }

  async function handleSave(data: any) {
    const method = editingLead ? 'PUT' : 'POST';
    const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      showForm = false;
      editingLead = null;
      fetchLeads();
      fetchStats();
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this lead?')) return;
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    if (res.ok) {
      selected = selected.filter(i => i !== id);
      fetchLeads();
      fetchStats();
    }
  }

  async function handleStatusChange(id: number, newStatus: string) {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      fetchLeads();
      fetchStats();
    }
  }

  function handleEdit(lead: Lead) {
    editingLead = lead;
    showForm = true;
  }

  function handleBulkStatus(newStatus: string) {
    if (selected.length === 0) return;
    if (!confirm(`Change ${selected.length} leads to "${newStatus}"?`)) return;

    Promise.all(
      selected.map(id =>
        fetch(`/api/leads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      )
    ).then(() => {
      selected = [];
      fetchLeads();
      fetchStats();
    });
  }

  function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} leads?`)) return;

    Promise.all(
      selected.map(id =>
        fetch(`/api/leads/${id}`, { method: 'DELETE' })
      )
    ).then(() => {
      selected = [];
      fetchLeads();
      fetchStats();
    });
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (state !== 'all') params.set('state', state);
    params.set('limit', '9999');

    fetch(`/api/leads?${params}`)
      .then(r => r.json())
      .then(data => {
        const csv = [
          ['company_name', 'website', 'city', 'state', 'phone', 'email', 'contact_person', 'status', 'notes'].join(','),
          ...data.leads.map((l: Lead) =>
            [l.company_name, l.website, l.city || '', l.state || '', l.phone || '', l.email || '', l.contact_person || '', l.status, l.notes || ''].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')
          )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const statCards = $derived([
    { label: 'Total', value: stats.total, color: 'text-text-primary' },
    { label: 'New', value: stats.byStatus.find((s: any) => s.status === 'not_contacted')?.count || 0, color: 'text-zinc-400' },
    { label: 'Sent', value: stats.byStatus.find((s: any) => s.status === 'contacted')?.count || 0, color: 'text-amber-400' },
    { label: 'Replied', value: stats.byStatus.find((s: any) => s.status === 'responded')?.count || 0, color: 'text-emerald-400' }
  ]);
</script>

<svelte:head>
  <title>LeadFlow — Construction Lead Manager</title>
</svelte:head>

<div class="min-h-screen p-4 md:p-6 max-w-[1600px] mx-auto">
  <!-- Header -->
  <header class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-accent/10 border border-accent/30 rounded-sm flex items-center justify-center">
        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-tight">LeadFlow</h1>
        <p class="text-xs text-text-muted font-mono">Construction Lead Manager</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if selected.length > 0}
        <div class="flex items-center gap-2 mr-2">
          <span class="text-xs text-text-muted font-mono">{selected.length} selected</span>
          <select onchange={(e) => handleBulkStatus((e.target as HTMLSelectElement).value)} class="bg-bg-surface border border-border rounded-sm px-2 py-1.5 text-xs focus:outline-none cursor-pointer">
            <option value="">Bulk status...</option>
            <option value="not_contacted">Mark New</option>
            <option value="contacted">Mark Sent</option>
            <option value="responded">Mark Replied</option>
            <option value="closed">Mark Closed</option>
          </select>
          <button onclick={handleBulkDelete} class="px-2 py-1.5 text-xs text-danger hover:bg-danger/10 rounded-sm transition-colors">Delete</button>
        </div>
      {/if}
      <button onclick={() => { editingLead = null; showForm = true; }} class="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-black text-sm font-semibold rounded-sm transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Add
      </button>
      <button onclick={() => showImport = true} class="flex items-center gap-1.5 px-3 py-2 bg-bg-surface border border-border hover:border-accent/30 text-text-primary text-sm rounded-sm transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
        Import CSV
      </button>
      <button onclick={handleExport} class="flex items-center gap-1.5 px-3 py-2 bg-bg-surface border border-border hover:border-accent/30 text-text-primary text-sm rounded-sm transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Export
      </button>
    </div>
  </header>

  <!-- Stats Row -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    {#each statCards as card}
      <div class="bg-bg-surface border border-border rounded-sm px-4 py-3">
        <p class="text-xs text-text-muted font-mono uppercase tracking-wider mb-1">{card.label}</p>
        <p class="text-2xl font-mono font-bold {card.color}">{card.value.toLocaleString()}</p>
      </div>
    {/each}
  </div>

  <!-- Search & Filters -->
  <div class="mb-4">
    {@render searchComponent()}
  </div>

  <!-- Table -->
  <div class="mb-4">
    {#if loading}
      <div class="border border-border rounded-sm p-12 text-center">
        <div class="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm text-text-muted font-mono">Loading leads...</p>
      </div>
    {:else}
      <LeadTable {leads} {selected} onSelect={(ids) => selected = ids} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex items-center justify-between">
      <p class="text-xs text-text-muted font-mono">
        Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
      </p>
      <div class="flex items-center gap-1">
        <button
          onclick={() => { page = 1; fetchLeads(); }}
          disabled={page === 1}
          class="px-2 py-1 text-xs font-mono bg-bg-surface border border-border rounded-sm disabled:opacity-30 hover:border-accent/30 transition-colors"
        >
          &laquo;
        </button>
        <button
          onclick={() => { page--; fetchLeads(); }}
          disabled={page === 1}
          class="px-2 py-1 text-xs font-mono bg-bg-surface border border-border rounded-sm disabled:opacity-30 hover:border-accent/30 transition-colors"
        >
          &lsaquo;
        </button>

        {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          return start + i;
        }).filter(p => p <= totalPages) as p}
          <button
            onclick={() => { page = p; fetchLeads(); }}
            class="px-2.5 py-1 text-xs font-mono rounded-sm transition-colors {p === page ? 'bg-accent text-black font-bold' : 'bg-bg-surface border border-border hover:border-accent/30'}"
          >
            {p}
          </button>
        {/each}

        <button
          onclick={() => { page++; fetchLeads(); }}
          disabled={page === totalPages}
          class="px-2 py-1 text-xs font-mono bg-bg-surface border border-border rounded-sm disabled:opacity-30 hover:border-accent/30 transition-colors"
        >
          &rsaquo;
        </button>
        <button
          onclick={() => { page = totalPages; fetchLeads(); }}
          disabled={page === totalPages}
          class="px-2 py-1 text-xs font-mono bg-bg-surface border border-border rounded-sm disabled:opacity-30 hover:border-accent/30 transition-colors"
        >
          &raquo;
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Modals -->
<LeadForm lead={editingLead} open={showForm} onClose={() => { showForm = false; editingLead = null; }} onSave={handleSave} />
<ImportCSV open={showImport} onClose={() => showImport = false} onImport={() => { fetchLeads(); fetchStats(); }} />

{#snippet searchComponent()}
  <div class="flex items-center gap-3">
    <div class="relative flex-1 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <input
        type="text"
        bind:value={search}
        oninput={() => handleSearch(search)}
        placeholder="Search leads..."
        class="w-full bg-bg-surface border border-border rounded-sm pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors font-mono"
      />
    </div>
    <select value={status} onchange={(e) => { status = (e.target as HTMLSelectElement).value; handleFilter({ status, state }); }} class="bg-bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 cursor-pointer">
      <option value="all">All Status</option>
      <option value="not_contacted">New</option>
      <option value="contacted">Sent</option>
      <option value="responded">Replied</option>
      <option value="closed">Closed</option>
    </select>
    <select value={state} onchange={(e) => { state = (e.target as HTMLSelectElement).value; handleFilter({ status, state }); }} class="bg-bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 cursor-pointer max-w-[120px]">
      <option value="all">All States</option>
      {#each ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'] as s}
        <option value={s}>{s}</option>
      {/each}
    </select>
  </div>
{/snippet}
