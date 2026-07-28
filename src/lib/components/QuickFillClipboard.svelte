<script lang="ts">
  import { onMount } from 'svelte';

  let isOpen = $state(false);
  let copiedField = $state<string | null>(null);

  let details = $state({
    name: 'Pamela Jameson',
    email: 'pamela.jameson@nortiheastprecision.com',
    phone: '571-555-0142',
    company: 'Northeast Precision',
    website: 'northeastprecision.com',
    city: 'Alexandria',
    state: 'VA',
    zip: '22301',
    message: 'I am currently incurring a server and need to speak with a sales representative about your machining services.'
  });

  const fields = [
    { key: 'name', label: 'Name', placeholder: 'Full Name' },
    { key: 'email', label: 'Email', placeholder: 'Email Address' },
    { key: 'phone', label: 'Phone', placeholder: 'Phone Number' },
    { key: 'company', label: 'Company', placeholder: 'Company Name' },
    { key: 'website', label: 'Website', placeholder: 'Company Website' },
    { key: 'city', label: 'City', placeholder: 'City' },
    { key: 'state', label: 'State', placeholder: 'State (e.g. VA)' },
    { key: 'zip', label: 'Zip Code', placeholder: 'Zip Code' },
    { key: 'message', label: 'Message', placeholder: 'Message Template', isTextArea: true }
  ];

  onMount(() => {
    const saved = localStorage.getItem('leadflow_fill_details');
    if (saved) {
      try {
        details = { ...details, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load fill details', e);
      }
    }
  });

  function saveDetails() {
    localStorage.setItem('leadflow_fill_details', JSON.stringify(details));
  }

  async function copyToClipboard(text: string, fieldName: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedField = fieldName;
      setTimeout(() => {
        if (copiedField === fieldName) copiedField = null;
      }, 1500);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
</script>

<!-- Floating Toggle Button -->
<button 
  class="clipboard-toggle {isOpen ? 'open' : ''}" 
  onclick={() => isOpen = !isOpen}
  title="Form Filler Clipboard"
  aria-label="Toggle Clipboard"
>
  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
    {#if isOpen}
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
    {:else}
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
    {/if}
  </svg>
  {#if !isOpen}
    <span class="badge-count">Clipboard</span>
  {/if}
</button>

<!-- Slide-out Clipboard Panel -->
<div class="clipboard-drawer {isOpen ? 'open' : ''}">
  <div class="drawer-header">
    <div class="header-title-row">
      <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <span class="header-title">Quick Copy Clipboard</span>
    </div>
    <p class="header-subtitle">Edit details below. Click "Copy" next to any field to copy it instantly.</p>
  </div>

  <div class="drawer-body">
    {#each fields as field}
      <div class="field-box">
        <div class="field-label-row">
          <label for="clip-{field.key}">{field.label}</label>
          <button 
            type="button"
            class="btn-copy {copiedField === field.key ? 'copied' : ''}" 
            onclick={() => copyToClipboard((details as any)[field.key], field.key)}
          >
            {copiedField === field.key ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        
        {#if field.isTextArea}
          <textarea
            id="clip-{field.key}"
            bind:value={(details as any)[field.key]}
            oninput={saveDetails}
            placeholder={field.placeholder}
            rows="4"
          ></textarea>
        {:else}
          <input
            id="clip-{field.key}"
            type="text"
            bind:value={(details as any)[field.key]}
            oninput={saveDetails}
            placeholder={field.placeholder}
          />
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  /* Floating Button */
  .clipboard-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 45;
    height: 40px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(224, 90, 0, 0.25);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  .clipboard-toggle:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(224, 90, 0, 0.35);
  }
  .clipboard-toggle.open {
    background: var(--text);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .clipboard-toggle.open:hover {
    background: #000;
  }
  .clipboard-toggle .icon {
    width: 16px;
    height: 16px;
  }
  .badge-count {
    font-size: 11px;
    font-weight: 600;
  }

  /* Drawer Panel */
  .clipboard-drawer {
    position: fixed;
    top: 40px; /* Header aligned */
    right: -320px;
    bottom: 0;
    width: 320px;
    background: var(--card);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 24px rgba(0,0,0,0.05);
    z-index: 40;
    display: flex;
    flex-direction: column;
    transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .clipboard-drawer.open {
    right: 0;
  }

  .drawer-header {
    padding: 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .header-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .header-icon {
    width: 15px;
    height: 15px;
    color: var(--accent);
  }
  .header-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }
  .header-subtitle {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
    line-height: 1.4;
    text-align: left;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Fields styling */
  .field-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .field-label-row label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text2);
  }
  .btn-copy {
    background: none;
    border: none;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-copy:hover {
    background: var(--accent-light);
  }
  .btn-copy.copied {
    color: var(--success);
    background: var(--success-bg);
  }

  .field-box input, .field-box textarea {
    width: 100%;
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 8px;
    font-size: 11px;
    color: var(--text);
    outline: none;
  }
  .field-box input:focus, .field-box textarea:focus {
    border-color: var(--accent);
  }
  .field-box textarea {
    resize: none;
    font-family: inherit;
    line-height: 1.4;
  }

  /* Responsive styling */
  @media (max-width: 768px) {
    .clipboard-drawer {
      width: 100%;
      right: -100%;
      top: 40px;
    }
    .clipboard-drawer.open {
      right: 0;
    }
  }
</style>
