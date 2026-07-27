<script lang="ts">
  import type { Lead } from '$lib/types';
  import { US_STATES } from '$lib/types';

  interface Props {
    lead?: Lead | null;
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
  }

  let { lead = null, open, onClose, onSave }: Props = $props();

  let form = $state({
    company_name: '',
    website: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    contact_person: '',
    notes: ''
  });

  let saving = $state(false);
  let error = $state('');

  $effect(() => {
    if (lead) {
      form = {
        company_name: lead.company_name,
        website: lead.website,
        city: lead.city || '',
        state: lead.state || '',
        phone: lead.phone || '',
        email: lead.email || '',
        contact_person: lead.contact_person || '',
        notes: lead.notes || ''
      };
    } else {
      form = { company_name: '', website: '', city: '', state: '', phone: '', email: '', contact_person: '', notes: '' };
    }
    error = '';
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.website.trim()) {
      error = 'Company name and website are required';
      return;
    }
    saving = true;
    error = '';
    try {
      onSave(form);
    } catch (e: any) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={onClose} aria-label="Close"></button>
    <div class="relative bg-bg-surface border border-border rounded-sm w-full max-w-lg mx-4 p-0 shadow-2xl" style="animation: slideUp 0.2s ease-out">
      <div class="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 class="text-lg font-semibold tracking-tight">{lead ? 'Edit Lead' : 'Add Lead'}</h2>
        <button onclick={onClose} class="text-text-muted hover:text-text-primary transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <form onsubmit={handleSubmit} class="p-6 space-y-4">
        {#if error}
          <div class="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-2 rounded-sm">{error}</div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Company Name *</label>
            <input bind:value={form.company_name} type="text" required class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors" placeholder="ABC Construction" />
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Website *</label>
            <input bind:value={form.website} type="text" required class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors" placeholder="abcconstruction.com" />
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">City</label>
            <input bind:value={form.city} type="text" class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors" placeholder="Dallas" />
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">State</label>
            <select bind:value={form.state} class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors cursor-pointer">
              <option value="">--</option>
              {#each US_STATES as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Phone</label>
            <input bind:value={form.phone} type="tel" class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors" placeholder="555-1234" />
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Email</label>
            <input bind:value={form.email} type="email" class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors" placeholder="info@abc.com" />
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Contact Person</label>
            <input bind:value={form.contact_person} type="text" class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors" placeholder="John Smith" />
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea bind:value={form.notes} rows="2" class="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none" placeholder="Any notes..."></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" onclick={onClose} class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button type="submit" disabled={saving} class="px-5 py-2 bg-accent hover:bg-accent-hover text-black text-sm font-semibold rounded-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : (lead ? 'Update' : 'Add Lead')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
