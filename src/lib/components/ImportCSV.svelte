<script lang="ts">
  import Papa from 'papaparse';

  interface Props {
    open: boolean;
    onClose: () => void;
    onImport: (leads: any[]) => void;
  }

  let { open, onClose, onImport }: Props = $props();

  let file: File | null = $state(null);
  let preview: any[] = $state([]);
  let headers: string[] = $state([]);
  let mapping = $state<Record<string, string>>({});
  let step = $state<'upload' | 'map' | 'done'>('upload');
  let importing = $state(false);
  let result = $state<{ imported: number; skipped: number } | null>(null);

  const REQUIRED_FIELDS = ['company_name', 'website'];
  const OPTIONAL_FIELDS = ['city', 'state', 'phone', 'email', 'contact_person', 'notes'];

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    file = input.files?.[0] || null;
    if (!file) return;

    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        headers = results.meta.fields || [];
        preview = results.data;

        mapping = {};
        for (const h of headers) {
          const lower = h.toLowerCase().replace(/[^a-z]/g, '');
          if (lower.includes('company') || lower.includes('name')) mapping[h] = 'company_name';
          else if (lower.includes('website') || lower.includes('url') || lower.includes('site')) mapping[h] = 'website';
          else if (lower.includes('city') || lower.includes('town')) mapping[h] = 'city';
          else if (lower.includes('state') || lower.includes('region')) mapping[h] = 'state';
          else if (lower.includes('phone') || lower.includes('tel')) mapping[h] = 'phone';
          else if (lower.includes('email') || lower.includes('mail')) mapping[h] = 'email';
          else if (lower.includes('contact') || lower.includes('person')) mapping[h] = 'contact_person';
          else if (lower.includes('note')) mapping[h] = 'notes';
        }
        step = 'map';
      },
      error: () => {
        alert('Failed to parse CSV file');
      }
    });
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    file = e.dataTransfer?.files[0] || null;
    if (file) {
      handleFileSelect({ target: { files: [file] } } as any);
    }
  }

  async function doImport() {
    if (!file) return;
    importing = true;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const leads = results.data
          .filter((row: any) => {
            const hasCompany = Object.entries(mapping).find(([_, v]) => v === 'company_name');
            const hasWebsite = Object.entries(mapping).find(([_, v]) => v === 'website');
            return hasCompany && hasWebsite && row[hasCompany[0]] && row[hasWebsite[0]];
          })
          .map((row: any) => {
            const lead: any = {};
            for (const [csvHeader, field] of Object.entries(mapping)) {
              if (field && row[csvHeader]) {
                lead[field] = row[csvHeader].trim();
              }
            }
            return lead;
          });

        try {
          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads })
          });
          const data = await res.json();
          if (res.ok) {
            result = data;
            step = 'done';
            onImport([]);
          } else {
            alert(data.error || 'Import failed');
          }
        } catch (e) {
          alert('Network error');
        } finally {
          importing = false;
        }
      }
    });
  }

  function reset() {
    file = null;
    preview = [];
    headers = [];
    mapping = {};
    step = 'upload';
    result = null;
  }

  function handleClose() {
    reset();
    onClose();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={handleClose} aria-label="Close"></button>
    <div class="relative bg-bg-surface border border-border rounded-sm w-full max-w-2xl mx-4 shadow-2xl" style="animation: slideUp 0.2s ease-out">
      <div class="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 class="text-lg font-semibold tracking-tight">Import Leads</h2>
        <button onclick={handleClose} class="text-text-muted hover:text-text-primary transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="p-6">
        {#if step === 'upload'}
          <div
            class="border-2 border-dashed border-border rounded-sm p-8 text-center hover:border-accent/30 transition-colors cursor-pointer"
            ondragover={(e) => e.preventDefault()}
            ondrop={handleDrop}
            onclick={() => document.getElementById('csv-input')?.click()}
            role="button"
            tabindex="0"
          >
            <svg class="w-10 h-10 mx-auto mb-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p class="text-sm text-text-secondary mb-1">Drop CSV file here or <span class="text-accent">browse</span></p>
            <p class="text-xs text-text-muted font-mono">.csv files only</p>
            <input id="csv-input" type="file" accept=".csv" onchange={handleFileSelect} class="hidden" />
          </div>

        {:else if step === 'map'}
          <div class="space-y-4">
            <div class="bg-bg-primary border border-border rounded-sm p-3">
              <p class="text-xs text-text-muted mb-2 font-mono uppercase tracking-wider">Preview (first 5 rows)</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr>
                      {#each headers as h}
                        <th class="px-2 py-1 text-left text-text-muted font-mono">{h}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each preview as row}
                      <tr class="border-t border-border/50">
                        {#each headers as h}
                          <td class="px-2 py-1 text-text-secondary">{row[h] || '—'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p class="text-xs text-text-muted mb-3 font-mono uppercase tracking-wider">Map CSV columns to fields</p>
              <div class="grid grid-cols-2 gap-3">
                {#each headers as h}
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-text-secondary truncate w-24" title={h}>{h}</span>
                    <svg class="w-3 h-3 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                    <select
                      bind:value={mapping[h]}
                      class="flex-1 bg-bg-primary border border-border rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-accent/50 cursor-pointer"
                    >
                      <option value="">Skip</option>
                      {#each REQUIRED_FIELDS as f}
                        <option value={f}>{f} *</option>
                      {/each}
                      {#each OPTIONAL_FIELDS as f}
                        <option value={f}>{f}</option>
                      {/each}
                    </select>
                  </div>
                {/each}
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button onclick={reset} class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Back</button>
              <button onclick={doImport} disabled={importing || !mapping[Object.keys(mapping).find(k => mapping[k] === 'website') || '']} class="px-5 py-2 bg-accent hover:bg-accent-hover text-black text-sm font-semibold rounded-sm transition-colors disabled:opacity-50">
                {importing ? 'Importing...' : 'Import Leads'}
              </button>
            </div>
          </div>

        {:else if step === 'done' && result}
          <div class="text-center py-6">
            <div class="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Import Complete</h3>
            <div class="flex justify-center gap-6 text-sm">
              <div>
                <span class="text-success font-mono text-2xl font-bold">{result.imported}</span>
                <p class="text-text-muted text-xs mt-1">Imported</p>
              </div>
              <div>
                <span class="text-warning font-mono text-2xl font-bold">{result.skipped}</span>
                <p class="text-text-muted text-xs mt-1">Skipped</p>
              </div>
            </div>
            <button onclick={handleClose} class="mt-6 px-6 py-2 bg-accent hover:bg-accent-hover text-black text-sm font-semibold rounded-sm transition-colors">
              Done
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
