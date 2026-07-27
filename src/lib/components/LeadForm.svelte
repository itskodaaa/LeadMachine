<script lang="ts">
  import type { Lead } from '$lib/types';
  import { US_STATES } from '$lib/types';

  let { lead = null, open = $bindable(), onClose, onSave }: {
    lead?: Lead | null; open: boolean; onClose: () => void; onSave: (d: any) => void;
  } = $props();

  let form = $state({ company_name:'', website:'', city:'', state:'', phone:'', email:'', contact_person:'', notes:'' });
  let saving = $state(false);
  let error = $state('');

  $effect(() => {
    if (lead) {
      form = { company_name: lead.company_name, website: lead.website, city: lead.city||'', state: lead.state||'', phone: lead.phone||'', email: lead.email||'', contact_person: lead.contact_person||'', notes: lead.notes||'' };
    } else {
      form = { company_name:'', website:'', city:'', state:'', phone:'', email:'', contact_person:'', notes:'' };
    }
    error = '';
  });

  async function submit(e: Event) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.website.trim()) { error = 'Company name and website are required'; return; }
    saving = true; error = '';
    try { onSave(form); } catch (e: any) { error = e.message; } finally { saving = false; }
  }
</script>

{#if open}
  <div class="modal-overlay">
    <button class="modal-overlay" onclick={onClose} aria-label="Close" style="position:absolute;inset:0;border:none;background:transparent;cursor:default;z-index:-1"></button>
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">{lead ? 'Edit Lead' : 'Add New Lead'}</span>
        <button class="btn btn-icon btn-sm" onclick={onClose} aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <form onsubmit={submit}>
          {#if error}<div class="form-error">{error}</div>{/if}

          <div class="field">
            <label for="f-company">Company Name *</label>
            <input id="f-company" bind:value={form.company_name} required placeholder="ABC Construction" />
          </div>
          <div class="field">
            <label for="f-website">Website *</label>
            <input id="f-website" bind:value={form.website} required placeholder="abcconstruction.com" style="font-family:var(--mono);font-size:11px" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-city">City</label>
              <input id="f-city" bind:value={form.city} placeholder="Dallas" />
            </div>
            <div class="field">
              <label for="f-state">State</label>
              <select id="f-state" bind:value={form.state}>
                <option value="">Select</option>
                {#each US_STATES as s}<option value={s}>{s}</option>{/each}
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-phone">Phone</label>
              <input id="f-phone" bind:value={form.phone} placeholder="555-1234" />
            </div>
            <div class="field">
              <label for="f-email">Email</label>
              <input id="f-email" bind:value={form.email} type="email" placeholder="info@abc.com" />
            </div>
          </div>
          <div class="field">
            <label for="f-contact">Contact Person</label>
            <input id="f-contact" bind:value={form.contact_person} placeholder="John Smith" />
          </div>
          <div class="field">
            <label for="f-notes">Notes</label>
            <textarea id="f-notes" bind:value={form.notes} rows="2" placeholder="Any notes..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn" onclick={onClose}>Cancel</button>
            <button type="submit" class="btn btn-accent" disabled={saving}>{saving ? 'Saving...' : lead ? 'Update' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
