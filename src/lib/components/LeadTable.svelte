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

<div class="bg-bg-card rounded-xl border border-border overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-border bg-bg-input/50">
          <th class="w-12 px-5 py-3.5">
            <input type="checkbox" checked={selected.length === leads.length && leads.length > 0} onchange={toggleAll} class="accent-accent w-4 h-4 rounded cursor-pointer" />
          </th>
          <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Company</th>
          <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Website</th>
          <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Location</th>
          <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Contact</th>
          <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
          <th class="w-24 px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if leads.length === 0}
          <tr>
            <td colspan="7" class="px-5 py-20 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="w-12 h-12 bg-bg-input rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
                  </svg>
                </div>
                <p class="text-sm font-medium text-text-heading">No leads found</p>
                <p class="text-sm text-text-muted">Try adjusting your search or filters</p>
              </div>
            </td>
          </tr>
        {:else}
          {#each leads as lead (lead.id)}
            <tr class="border-b border-border/60 last:border-0 hover:bg-bg-hover/50 transition-colors group" style="animation: fadeIn 0.15s ease-out">
              <td class="px-5 py-4">
                <input type="checkbox" checked={selected.includes(lead.id)} onchange={() => toggleSelect(lead.id)} class="accent-accent w-4 h-4 rounded cursor-pointer" />
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-text-heading">{lead.company_name}</span>
                  {#if lead.contact_person}
                    <span class="text-xs text-text-muted mt-0.5">{lead.contact_person}</span>
                  {/if}
                </div>
              </td>
              <td class="px-5 py-4">
                <a href="https://{lead.website}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors group/link">
                  <span class="truncate max-w-[200px]">{lead.website}</span>
                  <svg class="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                  </svg>
                </a>
              </td>
              <td class="px-5 py-4">
                <span class="text-sm text-text-body">
                  {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                </span>
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-col">
                  {#if lead.phone}
                    <span class="text-sm text-text-body font-mono text-xs">{lead.phone}</span>
                  {/if}
                  {#if lead.email}
                    <span class="text-xs text-text-muted mt-0.5">{lead.email}</span>
                  {/if}
                  {#if !lead.phone && !lead.email}
                    <span class="text-sm text-text-muted">—</span>
                  {/if}
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="relative">
                  <StatusBadge status={lead.status} />
                  <div class="absolute top-full left-0 mt-1 hidden group-hover:block z-20">
                    <div class="bg-bg-elevated border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                      {#each getStatusActions(lead.status) as action}
                        <button
                          onclick={() => onStatusChange(lead.id, action)}
                          class="w-full text-left px-4 py-2 text-sm hover:bg-bg-hover transition-colors"
                        >
                          {action === 'not_contacted' ? 'Mark New' : action === 'contacted' ? 'Mark Sent' : action === 'responded' ? 'Mark Replied' : 'Mark Closed'}
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onclick={() => onEdit(lead)} class="p-2 hover:bg-bg-input rounded-lg transition-colors text-text-muted hover:text-text-heading" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
                    </svg>
                  </button>
                  <button onclick={() => onDelete(lead.id)} class="p-2 hover:bg-danger-light rounded-lg transition-colors text-text-muted hover:text-danger" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
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
