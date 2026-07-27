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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={handleClose} aria-label="Close"></button>
    <div class="relative bg-bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border" style="animation: slideUp 0.25s ease-out">
      <div class="flex items-center justify-between px-6 py-5 border-b border-border">
        <h2 class="text-lg font-bold text-text-heading">Import Leads from CSV</h2>
        <button onclick={handleClose} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-input transition-colors text-text-muted hover:text-text-heading" aria-label="Close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="p-6">
        {#if step === 'upload'}
          <button
            class="w-full border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-accent/40 hover:bg-accent-light/30 transition-all cursor-pointer"
            onclick={() => document.getElementById('csv-input')?.click()}
            ondragover={(e) => e.preventDefault()}
            ondrop={handleDrop}
          >
            <div class="w-14 h-14 bg-bg-input rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-text-heading mb-1">Drop your CSV file here</p>
            <p class="text-sm text-text-muted">or <span class="text-accent font-medium">browse</span> to upload</p>
            <p class="text-xs text-text-muted mt-3 font-mono">.csv files up to 10MB</p>
            <input id="csv-input" type="file" accept=".csv" onchange={handleFileSelect} class="hidden" />
          </button>

        {:else if step === 'map'}
          <div class="space-y-6">
            <div class="bg-bg-input rounded-xl p-4">
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Preview (first 5 rows)</p>
              <div class="overflow-x-auto rounded-lg">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-border">
                      {#each headers as h}
                        <th class="px-3 py-2.5 text-left text-text-muted font-semibold">{h}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each preview as row}
                      <tr class="border-b border-border/50 last:border-0">
                        {#each headers as h}
                          <td class="px-3 py-2.5 text-text-body">{row[h] || '—'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Map CSV columns to fields</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each headers as h}
                  <div class="flex items-center gap-3 bg-bg-input rounded-xl px-4 py-3">
                    <span class="text-sm text-text-body truncate flex-1" title={h}>{h}</span>
                    <svg class="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                    </svg>
                    <select
                      bind:value={mapping[h]}
                      class="flex-1 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
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
              <button onclick={reset} class="px-5 py-2.5 text-sm font-medium text-text-body hover:bg-bg-input rounded-xl transition-colors">Back</button>
              <button onclick={doImport} disabled={importing || !mapping[Object.keys(mapping).find(k => mapping[k] === 'website') || '']} class="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm">
                {importing ? 'Importing...' : 'Import Leads'}
              </button>
            </div>
          </div>

        {:else if step === 'done' && result}
          <div class="text-center py-8">
            <div class="w-16 h-16 bg-success-light rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-text-heading mb-2">Import Complete</h3>
            <p class="text-sm text-text-muted mb-6">Your leads have been added to the database</p>
            <div class="flex justify-center gap-8">
              <div class="text-center">
                <p class="text-3xl font-bold text-success">{result.imported}</p>
                <p class="text-xs text-text-muted mt-1 font-medium">Imported</p>
              </div>
              <div class="w-px bg-border"></div>
              <div class="text-center">
                <p class="text-3xl font-bold text-warning">{result.skipped}</p>
                <p class="text-xs text-text-muted mt-1 font-medium">Skipped</p>
              </div>
            </div>
            <button onclick={handleClose} class="mt-8 px-8 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              Done
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
