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
    { label: 'Total Leads', value: stats.total, color: 'text-text-heading', icon: 'grid' },
    { label: 'New', value: stats.byStatus.find((s: any) => s.status === 'not_contacted')?.count || 0, color: 'text-text-heading', icon: 'inbox' },
    { label: 'Sent', value: stats.byStatus.find((s: any) => s.status === 'contacted')?.count || 0, color: 'text-accent', icon: 'send' },
    { label: 'Replied', value: stats.byStatus.find((s: any) => s.status === 'responded')?.count || 0, color: 'text-success', icon: 'check' }
  ]);
</script>

<svelte:head>
  <title>LeadFlow — Construction Lead Manager</title>
</svelte:head>

<div class="min-h-screen">
  <!-- Top bar -->
  <header class="sticky top-0 z-30 bg-bg-card/80 backdrop-blur-md border-b border-border">
    <div class="max-w-[1440px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-base font-bold text-text-heading tracking-tight leading-none">LeadFlow</h1>
          <p class="text-[11px] text-text-muted leading-none mt-0.5">Construction Leads</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        {#if selected.length > 0}
          <div class="flex items-center gap-2 px-3 py-1.5 bg-accent-light border border-accent/20 rounded-lg">
            <span class="text-xs font-medium text-accent">{selected.length} selected</span>
            <div class="w-px h-4 bg-accent/20"></div>
            <select onchange={(e) => handleBulkStatus((e.target as HTMLSelectElement).value)} class="bg-transparent text-xs font-medium text-accent focus:outline-none cursor-pointer">
              <option value="">Change status</option>
              <option value="not_contacted">New</option>
              <option value="contacted">Sent</option>
              <option value="responded">Replied</option>
              <option value="closed">Closed</option>
            </select>
            <button onclick={handleBulkDelete} class="text-xs font-medium text-danger hover:text-danger/80 transition-colors">Delete</button>
          </div>
        {/if}
        <button onclick={() => { editingLead = null; showForm = true; }} class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          Add Lead
        </button>
        <button onclick={() => showImport = true} class="inline-flex items-center gap-2 px-4 py-2 bg-bg-input hover:bg-border text-text-body text-sm font-medium rounded-lg transition-colors border border-border">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
          </svg>
          Import
        </button>
        <button onclick={handleExport} class="inline-flex items-center gap-2 px-4 py-2 bg-bg-input hover:bg-border text-text-body text-sm font-medium rounded-lg transition-colors border border-border">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          Export
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {#each statCards as card}
        <div class="bg-bg-card rounded-xl border border-border p-5">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{card.label}</p>
          <p class="text-3xl font-bold text-text-heading tracking-tight">{card.value.toLocaleString()}</p>
        </div>
      {/each}
    </div>

    <!-- Search & Filters -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
      <div class="relative flex-1">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
        </svg>
        <input
          type="text"
          bind:value={search}
          oninput={() => handleSearch(search)}
          placeholder="Search by name, website, city..."
          class="w-full bg-bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
        />
      </div>
      <select value={status} onchange={(e) => { status = (e.target as HTMLSelectElement).value; handleFilter({ status, state }); }} class="bg-bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 cursor-pointer transition-all">
        <option value="all">All Status</option>
        <option value="not_contacted">New</option>
        <option value="contacted">Sent</option>
        <option value="responded">Replied</option>
        <option value="closed">Closed</option>
      </select>
      <select value={state} onchange={(e) => { state = (e.target as HTMLSelectElement).value; handleFilter({ status, state }); }} class="bg-bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 cursor-pointer transition-all max-w-[160px]">
        <option value="all">All States</option>
        {#each ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'] as s}
          <option value={s}>{s}</option>
        {/each}
      </select>
    </div>

    <!-- Table -->
    {#if loading}
      <div class="bg-bg-card rounded-xl border border-border p-16 text-center">
        <div class="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-sm text-text-muted">Loading leads...</p>
      </div>
    {:else}
      <LeadTable {leads} {selected} onSelect={(ids) => selected = ids} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
    {/if}

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between mt-6">
        <p class="text-sm text-text-muted">
          Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()} leads
        </p>
        <div class="flex items-center gap-1.5">
          <button
            onclick={() => { page = 1; fetchLeads(); }}
            disabled={page === 1}
            class="px-3 py-1.5 text-sm font-medium bg-bg-card border border-border rounded-lg disabled:opacity-30 hover:bg-bg-hover transition-colors"
          >
            First
          </button>
          <button
            onclick={() => { page--; fetchLeads(); }}
            disabled={page === 1}
            class="px-3 py-1.5 text-sm font-medium bg-bg-card border border-border rounded-lg disabled:opacity-30 hover:bg-bg-hover transition-colors"
          >
            Prev
          </button>

          {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            return start + i;
          }).filter(p => p <= totalPages) as p}
            <button
              onclick={() => { page = p; fetchLeads(); }}
              class="w-9 h-9 text-sm font-medium rounded-lg transition-colors {p === page ? 'bg-accent text-white shadow-sm' : 'bg-bg-card border border-border hover:bg-bg-hover'}"
            >
              {p}
            </button>
          {/each}

          <button
            onclick={() => { page++; fetchLeads(); }}
            disabled={page === totalPages}
            class="px-3 py-1.5 text-sm font-medium bg-bg-card border border-border rounded-lg disabled:opacity-30 hover:bg-bg-hover transition-colors"
          >
            Next
          </button>
          <button
            onclick={() => { page = totalPages; fetchLeads(); }}
            disabled={page === totalPages}
            class="px-3 py-1.5 text-sm font-medium bg-bg-card border border-border rounded-lg disabled:opacity-30 hover:bg-bg-hover transition-colors"
          >
            Last
          </button>
        </div>
      </div>
    {/if}
  </main>
</div>

<!-- Modals -->
<LeadForm lead={editingLead} open={showForm} onClose={() => { showForm = false; editingLead = null; }} onSave={handleSave} />
<ImportCSV open={showImport} onClose={() => showImport = false} onImport={() => { fetchLeads(); fetchStats(); }} />
