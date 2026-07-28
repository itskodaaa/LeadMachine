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
      <p class="header-subtitle">Click "Copy" inside any field to copy instantly.</p>
    </div>

    <div class="drawer-body">
      <!-- Row 1: Name -->
      <div class="form-row">
        <div class="form-group full-width">
          <label for="clip-name">Name</label>
          <div class="input-wrapper">
            <input id="clip-name" type="text" bind:value={details.name} oninput={saveDetails} placeholder="Full Name" />
            <button class="btn-copy {copiedField === 'name' ? 'copied' : ''}" onclick={() => copyToClipboard(details.name, 'name')}>
              {copiedField === 'name' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: Company & Website -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="clip-company">Company</label>
          <div class="input-wrapper">
            <input id="clip-company" type="text" bind:value={details.company} oninput={saveDetails} placeholder="Company Name" />
            <button class="btn-copy {copiedField === 'company' ? 'copied' : ''}" onclick={() => copyToClipboard(details.company, 'company')}>
              {copiedField === 'company' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
        <div class="form-group half-width">
          <label for="clip-website">Website</label>
          <div class="input-wrapper">
            <input id="clip-website" type="text" bind:value={details.website} oninput={saveDetails} placeholder="Website" />
            <button class="btn-copy {copiedField === 'website' ? 'copied' : ''}" onclick={() => copyToClipboard(details.website, 'website')}>
              {copiedField === 'website' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <!-- Row 3: Email & Phone -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="clip-email">Email</label>
          <div class="input-wrapper">
            <input id="clip-email" type="text" bind:value={details.email} oninput={saveDetails} placeholder="Email Address" />
            <button class="btn-copy {copiedField === 'email' ? 'copied' : ''}" onclick={() => copyToClipboard(details.email, 'email')}>
              {copiedField === 'email' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
        <div class="form-group half-width">
          <label for="clip-phone">Phone</label>
          <div class="input-wrapper">
            <input id="clip-phone" type="text" bind:value={details.phone} oninput={saveDetails} placeholder="Phone Number" />
            <button class="btn-copy {copiedField === 'phone' ? 'copied' : ''}" onclick={() => copyToClipboard(details.phone, 'phone')}>
              {copiedField === 'phone' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <!-- Row 4: City, State, Zip -->
      <div class="form-row">
        <div class="form-group city-width">
          <label for="clip-city">City</label>
          <div class="input-wrapper">
            <input id="clip-city" type="text" bind:value={details.city} oninput={saveDetails} placeholder="City" />
            <button class="btn-copy {copiedField === 'city' ? 'copied' : ''}" onclick={() => copyToClipboard(details.city, 'city')}>
              {copiedField === 'city' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
        <div class="form-group state-width">
          <label for="clip-state">State</label>
          <div class="input-wrapper">
            <input id="clip-state" type="text" bind:value={details.state} oninput={saveDetails} placeholder="ST" />
            <button class="btn-copy {copiedField === 'state' ? 'copied' : ''}" onclick={() => copyToClipboard(details.state, 'state')}>
              {copiedField === 'state' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
        <div class="form-group zip-width">
          <label for="clip-zip">Zip</label>
          <div class="input-wrapper">
            <input id="clip-zip" type="text" bind:value={details.zip} oninput={saveDetails} placeholder="Zip" />
            <button class="btn-copy {copiedField === 'zip' ? 'copied' : ''}" onclick={() => copyToClipboard(details.zip, 'zip')}>
              {copiedField === 'zip' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <!-- Row 5: Message -->
      <div class="form-row">
        <div class="form-group full-width">
          <label for="clip-message">Message Template</label>
          <div class="input-wrapper">
            <textarea id="clip-message" bind:value={details.message} oninput={saveDetails} placeholder="Message template..." rows="3"></textarea>
            <button class="btn-copy btn-copy-textarea {copiedField === 'message' ? 'copied' : ''}" onclick={() => copyToClipboard(details.message, 'message')}>
              {copiedField === 'message' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
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

  /* Dropdown Panel (drops from navigation bar) */
  .clipboard-drawer {
    position: absolute;
    top: 8px; /* Positioned just below the top navigation bar */
    right: 16px; /* Right-aligned inside the max-width layout */
    width: 320px;
    max-height: calc(100vh - 120px); /* Keeps panel bounded on smaller screens */
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    
    /* Drop-down transition */
    opacity: 0;
    transform: translateY(-12px);
    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.2s;
    visibility: hidden;
  }
  .clipboard-drawer.open {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }

  .drawer-header {
    padding: 12px 16px;
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
    margin-top: 2px;
    line-height: 1.4;
    text-align: left;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Compact Form Grid styling */
  .form-row {
    display: flex;
    gap: 8px;
    width: 100%;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }
  .full-width {
    width: 100%;
  }
  .half-width {
    flex: 1;
    min-width: 0;
  }
  .city-width {
    flex: 2.2;
    min-width: 0;
  }
  .state-width {
    flex: 1;
    min-width: 0;
  }
  .zip-width {
    flex: 1.5;
    min-width: 0;
  }

  .form-group label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .input-wrapper input {
    width: 100%;
    height: 26px;
    padding: 0 52px 0 6px;
    font-size: 11px;
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    outline: none;
    text-overflow: ellipsis;
  }

  .input-wrapper textarea {
    width: 100%;
    padding: 6px 52px 6px 6px;
    font-size: 11px;
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    outline: none;
    resize: none;
    font-family: inherit;
    line-height: 1.4;
  }

  .input-wrapper input:focus, .input-wrapper textarea:focus {
    border-color: var(--accent);
  }

  .btn-copy {
    position: absolute;
    right: 3px;
    height: 20px;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }
  .btn-copy:hover {
    background: var(--accent-hover);
  }
  .btn-copy.copied {
    background: var(--success);
    color: #fff;
  }

  .btn-copy-textarea {
    top: 4px;
  }

  /* Responsive styling */
  @media (max-width: 768px) {
    .clipboard-drawer {
      left: 16px;
      right: 16px;
      width: auto;
      max-height: calc(100vh - 100px);
    }
  }
</style>
