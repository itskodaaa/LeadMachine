<script lang="ts">
  import type { Lead } from '$lib/types';
  import StatusBadge from './StatusBadge.svelte';

  interface Props {
    leads: Lead[];
    selected: number[];
    onSelect: (ids: number[]) => void;
    onEdit: (lead: Lead) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, status: string) => void;
  }

  let { leads, selected, onSelect, onEdit, onDelete, onStatusChange }: Props = $props();

  function toggleSelect(id: number) {
    if (selected.includes(id)) {
      onSelect(selected.filter(i => i !== id));
    } else {
      onSelect([...selected, id]);
    }
  }

  function toggleAll() {
    if (selected.length === leads.length) {
      onSelect([]);
    } else {
      onSelect(leads.map(l => l.id));
    }
  }

  function getStatusActions(currentStatus: string) {
    const all = ['not_contacted', 'contacted', 'responded', 'closed'];
    return all.filter(s => s !== currentStatus);
  }
</script>

<div class="border border-border rounded-sm overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-bg-elevated border-b border-border">
          <th class="w-10 px-3 py-2.5">
            <input type="checkbox" checked={selected.length === leads.length && leads.length > 0} onchange={toggleAll} class="accent-accent w-3.5 h-3.5 cursor-pointer" />
          </th>
          <th class="text-left px-3 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">Company</th>
          <th class="text-left px-3 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">Website</th>
          <th class="text-left px-3 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">Location</th>
          <th class="text-left px-3 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">Contact</th>
          <th class="text-left px-3 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">Status</th>
          <th class="w-20 px-3 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if leads.length === 0}
          <tr>
            <td colspan="7" class="px-6 py-12 text-center text-text-muted">
              <div class="flex flex-col items-center gap-2">
                <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <span class="text-sm font-mono">No leads found</span>
              </div>
            </td>
          </tr>
        {:else}
          {#each leads as lead (lead.id)}
            <tr class="border-b border-border/50 hover:bg-bg-surface-hover transition-colors group" style="animation: fadeIn 0.15s ease-out">
              <td class="px-3 py-2">
                <input type="checkbox" checked={selected.includes(lead.id)} onchange={() => toggleSelect(lead.id)} class="accent-accent w-3.5 h-3.5 cursor-pointer" />
              </td>
              <td class="px-3 py-2">
                <div class="flex flex-col">
                  <span class="font-medium text-text-primary">{lead.company_name}</span>
                  {#if lead.contact_person}
                    <span class="text-xs text-text-muted">{lead.contact_person}</span>
                  {/if}
                </div>
              </td>
              <td class="px-3 py-2">
                <a href="https://{lead.website}" target="_blank" rel="noopener" class="font-mono text-xs text-accent/80 hover:text-accent transition-colors flex items-center gap-1">
                  {lead.website}
                  <svg class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                </a>
              </td>
              <td class="px-3 py-2">
                <span class="text-xs text-text-secondary">
                  {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                </span>
              </td>
              <td class="px-3 py-2">
                <div class="flex flex-col gap-0.5">
                  {#if lead.phone}
                    <span class="text-xs text-text-secondary font-mono">{lead.phone}</span>
                  {/if}
                  {#if lead.email}
                    <span class="text-xs text-text-muted">{lead.email}</span>
                  {/if}
                  {#if !lead.phone && !lead.email}
                    <span class="text-xs text-text-muted">—</span>
                  {/if}
                </div>
              </td>
              <td class="px-3 py-2">
                <div class="relative">
                  <StatusBadge status={lead.status} />
                  <div class="absolute top-full left-0 mt-1 hidden group-hover:block z-10">
                    <div class="bg-bg-elevated border border-border rounded-sm shadow-xl p-1 min-w-[100px]">
                      {#each getStatusActions(lead.status) as action}
                        <button
                          onclick={() => onStatusChange(lead.id, action)}
                          class="w-full text-left px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent transition-colors rounded-sm"
                        >
                          {action === 'not_contacted' ? 'Mark New' : action === 'contacted' ? 'Mark Sent' : action === 'responded' ? 'Mark Replied' : 'Mark Closed'}
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onclick={() => onEdit(lead)} class="p-1.5 hover:bg-bg-elevated rounded-sm transition-colors text-text-muted hover:text-text-primary" title="Edit">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button onclick={() => onDelete(lead.id)} class="p-1.5 hover:bg-danger/10 rounded-sm transition-colors text-text-muted hover:text-danger" title="Delete">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
