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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={onClose} aria-label="Close"></button>
    <div class="relative bg-bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border" style="animation: slideUp 0.25s ease-out">
      <div class="flex items-center justify-between px-6 py-5 border-b border-border">
        <h2 class="text-lg font-bold text-text-heading">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
        <button onclick={onClose} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-input transition-colors text-text-muted hover:text-text-heading" aria-label="Close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <form onsubmit={handleSubmit} class="p-6 space-y-5">
        {#if error}
          <div class="bg-danger-light border border-danger/20 text-danger text-sm px-4 py-3 rounded-xl font-medium">{error}</div>
        {/if}

        <div class="space-y-4">
          <div>
            <label for="company_name" class="block text-sm font-semibold text-text-heading mb-1.5">Company Name <span class="text-danger">*</span></label>
            <input id="company_name" bind:value={form.company_name} type="text" required class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" placeholder="ABC Construction" />
          </div>

          <div>
            <label for="website" class="block text-sm font-semibold text-text-heading mb-1.5">Website <span class="text-danger">*</span></label>
            <input id="website" bind:value={form.website} type="text" required class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" placeholder="abcconstruction.com" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="city" class="block text-sm font-semibold text-text-heading mb-1.5">City</label>
              <input id="city" bind:value={form.city} type="text" class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" placeholder="Dallas" />
            </div>
            <div>
              <label for="state" class="block text-sm font-semibold text-text-heading mb-1.5">State</label>
              <select id="state" bind:value={form.state} class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 cursor-pointer transition-all">
                <option value="">Select state</option>
                {#each US_STATES as s}
                  <option value={s}>{s}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="phone" class="block text-sm font-semibold text-text-heading mb-1.5">Phone</label>
              <input id="phone" bind:value={form.phone} type="tel" class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" placeholder="555-1234" />
            </div>
            <div>
              <label for="email" class="block text-sm font-semibold text-text-heading mb-1.5">Email</label>
              <input id="email" bind:value={form.email} type="email" class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" placeholder="info@abc.com" />
            </div>
          </div>

          <div>
            <label for="contact_person" class="block text-sm font-semibold text-text-heading mb-1.5">Contact Person</label>
            <input id="contact_person" bind:value={form.contact_person} type="text" class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" placeholder="John Smith" />
          </div>

          <div>
            <label for="notes" class="block text-sm font-semibold text-text-heading mb-1.5">Notes</label>
            <textarea id="notes" bind:value={form.notes} rows="3" class="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all resize-none" placeholder="Any additional notes..."></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" onclick={onClose} class="px-5 py-2.5 text-sm font-medium text-text-body hover:text-text-heading hover:bg-bg-input rounded-xl transition-colors">Cancel</button>
          <button type="submit" disabled={saving} class="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm">
            {saving ? 'Saving...' : (lead ? 'Update Lead' : 'Add Lead')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
