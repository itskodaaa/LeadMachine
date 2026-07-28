<script lang="ts">
  import { onMount } from 'svelte';

  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();
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

<!-- Floating Container aligned with max-width -->
<div class="clipboard-container">
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
</div>

<style>
  /* Container Wrapper */
  .clipboard-container {
    position: fixed;
    top: 76px; /* Aligned below the topbar: topbar height 36px + margin-top 40px = 76px */
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 960px;
    pointer-events: none;
    z-index: 40;
  }
  
  /* Drawer Panel */
  .clipboard-drawer {
    position: absolute;
    top: 0;
    right: -320px;
    bottom: 0;
    width: 320px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: -4px 0 24px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.25s;
    pointer-events: auto;
    visibility: hidden;
  }
  .clipboard-drawer.open {
    right: 16px;
    visibility: visible;
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
