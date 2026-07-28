<script lang="ts">
  import Papa from 'papaparse';

  let { open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (d: any[]) => void } = $props();

  let file: File | null = $state(null);
  let preview: any[] = $state([]);
  let headers: string[] = $state([]);
  let mapping = $state<Record<string, string>>({});
  let step = $state<'upload'|'map'|'done'>('upload');
  let importing = $state(false);
  let result = $state<{ imported: number; skipped: number } | null>(null);
  let isJson = $state(false);

  const FIELDS = ['company_name', 'website', 'city', 'state', 'phone', 'email', 'contact_person', 'notes', 'status'];

  const HINTS: Record<string, string[]> = {
    company_name: ['company', 'name', 'business', 'org', 'firm', 'builder', 'contractor'],
    website: ['website', 'url', 'site', 'domain', 'web', 'homepage', 'link'],
    city: ['city', 'town', 'municipality', 'metro'],
    state: ['state', 'region', 'province'],
    phone: ['phone', 'tel', 'mobile', 'cell', 'number'],
    email: ['email', 'mail', 'e-mail'],
    contact_person: ['contact', 'person', 'owner', 'manager', 'name'],
    notes: ['note', 'comment', 'description', 'info'],
    status: ['status', 'stage', 'lead'],
  };

  function guessField(header: string): string {
    const h = header.toLowerCase().replace(/[^a-z]/g, '');
    for (const [field, keywords] of Object.entries(HINTS)) {
      for (const kw of keywords) {
        if (h.includes(kw)) return field;
      }
    }
    return '';
  }

  function handleFile(e: Event) {
    file = (e.target as HTMLInputElement).files?.[0] || null;
    if (!file) return;

    if (file.name.endsWith('.json')) {
      isJson = true;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          let data = JSON.parse(reader.result as string);
          if (!Array.isArray(data)) {
            const firstArrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
            data = firstArrayKey ? data[firstArrayKey] : [data];
          }
          if (data.length === 0) { alert('Empty JSON array'); return; }
          headers = [...new Set(data.flatMap((r: any) => Object.keys(r)))];
          preview = data.slice(0, 5);
          mapping = {};
          for (const h of headers) { mapping[h] = guessField(h); }
          step = 'map';
        } catch { alert('Invalid JSON file'); }
      };
      reader.readAsText(file);
    } else {
      isJson = false;
      Papa.parse(file, { header: true, preview: 5, complete: (r) => {
        headers = r.meta.fields || [];
        preview = r.data;
        mapping = {};
        for (const h of headers) { mapping[h] = guessField(h); }
        step = 'map';
      }});
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    file = e.dataTransfer?.files[0] || null;
    if (file) handleFile({ target: { files: [file] } } as any);
  }

  async function doImport() {
    if (!file) return;
    importing = true;

    if (isJson) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          let data = JSON.parse(reader.result as string);
          if (!Array.isArray(data)) {
            const firstArrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
            data = firstArrayKey ? data[firstArrayKey] : [data];
          }
          const mapped = data.map((row: any) => {
            const lead: any = {};
            for (const [csv, field] of Object.entries(mapping)) {
              if (field && row[csv]) lead[field] = String(row[csv]).trim();
            }
            return lead;
          }).filter((l: any) => l.company_name || l.website);
          await sendImport(mapped);
        } catch { alert('Failed to parse JSON'); importing = false; }
      };
      reader.readAsText(file);
    } else {
      Papa.parse(file, { header: true, complete: async (r) => {
        const leads = r.data.map((row: any) => {
          const lead: any = {};
          for (const [csv, field] of Object.entries(mapping)) {
            if (field && row[csv]) lead[field] = row[csv].trim();
          }
          return lead;
        }).filter((l: any) => l.company_name || l.website);
        await sendImport(leads);
      }});
    }
  }

  async function sendImport(leads: any[]) {
    try {
      const res = await fetch('/api/import', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({leads}) });
      const data = await res.json();
      if (res.ok) { result = data; step = 'done'; onImport([]); } else { alert(data.error); }
    } catch { alert('Network error'); } finally { importing = false; }
  }

  function reset() { file = null; preview = []; headers = []; mapping = {}; step = 'upload'; result = null; isJson = false; }
  function close() { reset(); onClose(); }
</script>

{#if open}
  <div class="modal-overlay">
    <button class="modal-overlay" onclick={close} aria-label="Close" style="position:absolute;inset:0;border:none;background:transparent;cursor:default;z-index:-1"></button>
    <div class="modal modal-wide">
      <div class="modal-header">
        <span class="modal-title">Import Leads</span>
        <button class="btn btn-icon btn-sm" onclick={close} aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        {#if step === 'upload'}
          <button class="upload-zone" onclick={() => document.getElementById('csv-file')?.click()} ondragover={(e)=>e.preventDefault()} ondrop={handleDrop}>
            <div class="upload-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
            </div>
            <p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px">Drop your file here</p>
            <p style="font-size:12px;color:var(--muted)">or <span style="color:var(--accent);font-weight:500">browse</span> to upload</p>
            <p style="font-size:10px;color:var(--muted);margin-top:8px;font-family:var(--mono)">.csv or .json files</p>
            <input id="csv-file" type="file" accept=".csv,.json" onchange={handleFile} style="display:none" />
          </button>

        {:else if step === 'map'}
          <div>
            <div style="background:var(--input);border-radius:var(--radius);padding:10px;margin-bottom:12px">
              <p style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Preview (first 5 rows)</p>
              <div class="preview-table">
                <table>
                  <thead><tr>{#each headers as h}<th>{h}</th>{/each}</tr></thead>
                  <tbody>{#each preview as row}<tr>{#each headers as h}<td>{row[h] || '—'}</td>{/each}</tr>{/each}</tbody>
                </table>
              </div>
            </div>
            <p style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Map columns to fields <span style="color:var(--accent)">auto-detected</span></p>
            <div class="map-grid">
              {#each headers as h}
                <div class="map-row">
                  <span class="map-label" title={h}>{h}</span>
                  <svg class="map-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                  <select bind:value={mapping[h]}>
                    <option value="">Skip</option>
                    {#each FIELDS as f}<option value={f}>{f}{f === 'company_name' || f === 'website' ? ' *' : ''}</option>{/each}
                  </select>
                </div>
              {/each}
            </div>
            <div class="form-actions">
              <button class="btn" onclick={reset}>Back</button>
              <button class="btn btn-accent" onclick={doImport} disabled={importing}>
                {importing ? 'Importing...' : 'Import Leads'}
              </button>
            </div>
          </div>

        {:else if step === 'done' && result}
          <div class="import-result">
            <div class="import-result-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3>Import Complete</h3>
            <p>Your leads have been added to the database</p>
            <div class="import-stats">
              <div><div class="import-stat-val" style="color:var(--success)">{result.imported}</div><div class="import-stat-label">Imported</div></div>
              <div style="width:1px;background:var(--border)"></div>
              <div><div class="import-stat-val" style="color:var(--warning)">{result.skipped}</div><div class="import-stat-label">Skipped</div></div>
            </div>
            <div class="import-done"><button class="btn btn-accent" onclick={close}>Done</button></div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
