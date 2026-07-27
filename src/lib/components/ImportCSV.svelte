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

  const REQUIRED = ['company_name', 'website'];
  const OPTIONAL = ['city', 'state', 'phone', 'email', 'contact_person', 'notes'];

  function handleFile(e: Event) {
    file = (e.target as HTMLInputElement).files?.[0] || null;
    if (!file) return;
    Papa.parse(file, { header: true, preview: 5, complete: (r) => {
      headers = r.meta.fields || []; preview = r.data;
      mapping = {};
      for (const h of headers) {
        const l = h.toLowerCase().replace(/[^a-z]/g, '');
        if (l.includes('company')||l.includes('name')) mapping[h]='company_name';
        else if (l.includes('website')||l.includes('url')||l.includes('site')) mapping[h]='website';
        else if (l.includes('city')||l.includes('town')) mapping[h]='city';
        else if (l.includes('state')||l.includes('region')) mapping[h]='state';
        else if (l.includes('phone')||l.includes('tel')) mapping[h]='phone';
        else if (l.includes('email')||l.includes('mail')) mapping[h]='email';
        else if (l.includes('contact')||l.includes('person')) mapping[h]='contact_person';
        else if (l.includes('note')) mapping[h]='notes';
      }
      step = 'map';
    }});
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    file = e.dataTransfer?.files[0] || null;
    if (file) handleFile({ target: { files: [file] } } as any);
  }

  async function doImport() {
    if (!file) return; importing = true;
    Papa.parse(file, { header: true, complete: async (r) => {
      const leads = r.data.filter((row: any) => {
        const hc = Object.entries(mapping).find(([_,v])=>v==='company_name');
        const hw = Object.entries(mapping).find(([_,v])=>v==='website');
        return hc && hw && row[hc[0]] && row[hw[0]];
      }).map((row: any) => {
        const lead: any = {};
        for (const [csv, field] of Object.entries(mapping)) { if (field && row[csv]) lead[field] = row[csv].trim(); }
        return lead;
      });
      try {
        const res = await fetch('/api/import', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({leads}) });
        const data = await res.json();
        if (res.ok) { result = data; step = 'done'; onImport([]); } else { alert(data.error); }
      } catch { alert('Network error'); } finally { importing = false; }
    }});
  }

  function reset() { file = null; preview = []; headers = []; mapping = {}; step = 'upload'; result = null; }
  function close() { reset(); onClose(); }
</script>

{#if open}
  <div class="modal-overlay">
    <button class="modal-overlay" onclick={close} aria-label="Close" style="position:absolute;inset:0;border:none;background:transparent;cursor:default;z-index:-1"></button>
    <div class="modal modal-wide">
      <div class="modal-header">
        <span class="modal-title">Import Leads from CSV</span>
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
            <p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px">Drop your CSV file here</p>
            <p style="font-size:12px;color:var(--muted)">or <span style="color:var(--accent);font-weight:500">browse</span> to upload</p>
            <p style="font-size:10px;color:var(--muted);margin-top:8px;font-family:var(--mono)">.csv files only</p>
            <input id="csv-file" type="file" accept=".csv" onchange={handleFile} style="display:none" />
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
            <p style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Map columns to fields</p>
            <div class="map-grid">
              {#each headers as h}
                <div class="map-row">
                  <span class="map-label" title={h}>{h}</span>
                  <svg class="map-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                  <select bind:value={mapping[h]}>
                    <option value="">Skip</option>
                    {#each REQUIRED as f}<option value={f}>{f} *</option>{/each}
                    {#each OPTIONAL as f}<option value={f}>{f}</option>{/each}
                  </select>
                </div>
              {/each}
            </div>
            <div class="form-actions">
              <button class="btn" onclick={reset}>Back</button>
              <button class="btn btn-accent" onclick={doImport} disabled={importing||!mapping[Object.keys(mapping).find(k=>mapping[k]==='website')||'']}>
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
