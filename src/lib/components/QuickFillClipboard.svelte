<script lang="ts">
  import { onMount } from 'svelte';

  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();
  let copiedField = $state<string | null>(null);

  let details = $state({
    name: 'Pamela Jameson',
    position: 'Purchase Director',
    company: 'Northeast Precision Machinery, Inc.',
    phone: '+1 708-568-3708',
    address: '1908 Mount Vernon Ave, Alexandria, VA 22301',
    website: 'https://northeastprecision.com/',
    country: 'United States.',
    email: 'pamela.jameson@nortiheastprecision.com',
    message: `Hello,

I am reaching out to express our interest in purchasing your products and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a sales representative to contact us at your earliest convenience to discuss product details, pricing, and possible collaboration.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely.

Pamela Jameson`
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

{#if isOpen}
  <button 
    class="clipboard-backdrop" 
    onclick={() => isOpen = false}
    aria-label="Close clipboard"
    type="button"
  ></button>
{/if}

<!-- Slide-out Clipboard Panel (Drops directly from topbar) -->
<div class="clipboard-drawer {isOpen ? 'open' : ''}">
  <div class="drawer-header">
    <div class="header-title-row">
      <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <span class="header-title">Quick Copy Clipboard</span>
    </div>
    <p class="header-subtitle">Click inside any field to view/edit in full. Click "Copy" to copy instantly.</p>
  </div>

  <div class="drawer-body">
    <!-- Row 1: Name & Position -->
    <div class="form-row">
      <div class="form-group half-width">
        <label for="clip-name">Name</label>
        <div class="input-wrapper">
          <input id="clip-name" type="text" bind:value={details.name} oninput={saveDetails} placeholder="Full Name" />
          <button class="btn-copy {copiedField === 'name' ? 'copied' : ''}" onclick={() => copyToClipboard(details.name, 'name')}>
            {copiedField === 'name' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>
      <div class="form-group half-width">
        <label for="clip-position">Position</label>
        <div class="input-wrapper">
          <input id="clip-position" type="text" bind:value={details.position} oninput={saveDetails} placeholder="Position" />
          <button class="btn-copy {copiedField === 'position' ? 'copied' : ''}" onclick={() => copyToClipboard(details.position, 'position')}>
            {copiedField === 'position' ? 'Copied ✓' : 'Copy'}
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

    <!-- Row 4: Address & Country -->
    <div class="form-row">
      <div class="form-group city-width">
        <label for="clip-address">Address</label>
        <div class="input-wrapper">
          <input id="clip-address" type="text" bind:value={details.address} oninput={saveDetails} placeholder="Address" />
          <button class="btn-copy {copiedField === 'address' ? 'copied' : ''}" onclick={() => copyToClipboard(details.address, 'address')}>
            {copiedField === 'address' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>
      <div class="form-group state-width">
        <label for="clip-country">Country</label>
        <div class="input-wrapper">
          <input id="clip-country" type="text" bind:value={details.country} oninput={saveDetails} placeholder="Country" />
          <button class="btn-copy {copiedField === 'country' ? 'copied' : ''}" onclick={() => copyToClipboard(details.country, 'country')}>
            {copiedField === 'country' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>
    </div>

    <!-- Row 5: Message -->
    <div class="form-row">
      <div class="form-group full-width">
        <label for="clip-message">Message Template</label>
        <div class="textarea-wrapper">
          <textarea id="clip-message" bind:value={details.message} oninput={saveDetails} placeholder="Message template..." rows="4"></textarea>
          <button class="btn-copy-textarea {copiedField === 'message' ? 'copied' : ''}" onclick={() => copyToClipboard(details.message, 'message')}>
            {copiedField === 'message' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Dropdown Panel (positioned absolute relative to the topbar container) */
  .clipboard-drawer {
    position: absolute;
    top: 42px; /* Positioned directly below the navigation bar border */
    right: 16px; /* Align with right margin of layout */
    width: 320px;
    max-height: calc(100vh - 120px); /* Keeps panel bounded on smaller screens */
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 40; /* Make sure it lays above main page but below overlays if any */
    padding: 16px;
    
    /* Animation: slide drop from nav */
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .clipboard-drawer.open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .drawer-header {
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }
  .header-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .header-icon {
    width: 14px;
    height: 14px;
    color: var(--accent);
  }
  .header-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }
  .header-subtitle {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
    text-align: left;
  }

  .drawer-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .form-row {
    display: flex;
    gap: 8px;
    width: 100%;
  }
  .form-group {
    height: 38px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }
  .form-group.full-width {
    height: auto;
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

  /* Input wrapper normal state */
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 26px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Clean UI Expansion on Focus (Only when the input itself is focused, not when copy button is focused/clicked) */
  .input-wrapper:has(input:focus) {
    position: absolute;
    left: 16px;
    right: 16px;
    width: auto;
    z-index: 50;
    height: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
  .input-wrapper:has(input:focus) input {
    height: 30px;
    font-size: 12px;
    border-color: var(--accent);
    background: var(--card); /* Solid background to overlay neighboring fields */
    box-shadow: 0 0 0 2px var(--accent-light);
  }
  .input-wrapper:has(input:focus) .btn-copy {
    height: 24px;
    font-size: 10px;
    right: 4px;
  }

  /* Textarea Wrapper - stays inline as it is already full-width */
  .textarea-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .textarea-wrapper textarea {
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
  .textarea-wrapper textarea:focus {
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
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .btn-copy:hover {
    background: var(--accent-hover);
  }
  .btn-copy.copied {
    background: var(--success);
    color: #fff;
  }

  .btn-copy-textarea {
    position: absolute;
    right: 4px;
    bottom: 4px;
    height: 22px;
    padding: 0 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .btn-copy-textarea:hover {
    background: var(--accent-hover);
  }
  .btn-copy-textarea.copied {
    background: var(--success);
    color: #fff;
  }

  /* Responsive styling */
  @media (max-width: 768px) {
    .clipboard-drawer {
      left: 16px;
      right: 16px;
      width: auto;
      max-height: calc(100vh - 100px);
    }
    .input-wrapper:has(input:focus) {
      left: 12px;
      right: 12px;
    }
  }

  /* Backdrop Overlay */
  .clipboard-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    border: none;
    padding: 0;
    cursor: default;
    z-index: 35;
    pointer-events: auto;
    
    /* Fade animation */
    animation: fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
