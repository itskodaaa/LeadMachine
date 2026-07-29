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
    subject: 'Exploring Collaboration Opportunities',
    message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,

Pamela Jameson`
  });

  let bookmarkletLink = $derived.by(() => {
    const code = `(function(){
      const d = ${JSON.stringify(details)};
      function fill(sels, val) {
        if(!val) return;
        for(const s of sels) {
          const el = document.querySelector(s);
          if(el) {
            el.value = val;
            el.dispatchEvent(new Event('input', {bubbles:true}));
            el.dispatchEvent(new Event('change', {bubbles:true}));
            break;
          }
        }
      }
      fill(['input[name*="name" i]', 'input[id*="name" i]', 'input[placeholder*="name" i]'], d.name);
      fill(['input[name*="email" i]', 'input[type="email"]', 'input[id*="email" i]'], d.email);
      fill(['input[name*="phone" i]', 'input[name*="tel" i]', 'input[type="tel"]'], d.phone);
      fill(['input[name*="company" i]', 'input[name*="org" i]', 'input[id*="company" i]'], d.company);
      fill(['input[name*="web" i]', 'input[name*="url" i]'], d.website);
      fill(['input[name*="subject" i]', 'input[id*="subject" i]', 'input[placeholder*="subject" i]'], d.subject);
      fill(['textarea[name*="message" i]', 'textarea[name*="comment" i]', 'textarea[placeholder*="message" i]'], d.message);
    })()`;
    return 'javascript:' + encodeURIComponent(code.replace(/\s+/g, ' '));
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

  function submitAutofill() {
    const formEl = document.getElementById('autofill-form') as HTMLFormElement;
    if (formEl) {
      formEl.submit();
      alert('Autofill profile submitted! Click "Save" or "Update" in your browser popup to register these details for auto-filling external forms.');
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
    <p class="header-subtitle">Drag the button below to Bookmarks to autofill forms in 1-click on any website!</p>
    
    <div class="autofill-tools">
      <a class="btn-bookmarklet" href={bookmarkletLink} title="Drag this button to your Browser Bookmarks Bar. Click it on any website to auto-fill the form instantly!">
        <svg class="tool-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.17 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 9.42c-.77-.58-.371-1.81.588-1.81h4.906a1 1 0 00.951-.69l1.519-4.674z"/></svg>
        <span>Draggable Fill Button</span>
      </a>
      <button class="btn-save-autofill" onclick={submitAutofill} type="button" title="Saves this profile to your Browser's native AutoFill database">
        <svg class="tool-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
        <span>Trigger Browser Autofill</span>
      </button>
    </div>
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

    <!-- Row 5: Subject -->
    <div class="form-row">
      <div class="form-group full-width">
        <label for="clip-subject">Subject</label>
        <div class="input-wrapper">
          <input id="clip-subject" type="text" bind:value={details.subject} oninput={saveDetails} placeholder="Subject line" />
          <button class="btn-copy {copiedField === 'subject' ? 'copied' : ''}" onclick={() => copyToClipboard(details.subject, 'subject')}>
            {copiedField === 'subject' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>
    </div>

    <!-- Row 6: Message -->
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

<iframe name="hidden-iframe" id="hidden-iframe" style="display:none" title="hidden-iframe"></iframe>
<form id="autofill-form" action="about:blank" target="hidden-iframe" method="POST" style="display:none">
  <input type="text" name="name" autocomplete="name" value={details.name} />
  <input type="text" name="organization" autocomplete="organization" value={details.company} />
  <input type="tel" name="phone" autocomplete="tel" value={details.phone} />
  <input type="text" name="address" autocomplete="street-address" value={details.address} />
  <input type="text" name="country" autocomplete="country" value={details.country} />
  <input type="email" name="email" autocomplete="email" value={details.email} />
</form>

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

  .autofill-tools {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    padding-bottom: 4px;
  }
  .btn-bookmarklet, .btn-save-autofill {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 8px;
    font-size: 9px;
    font-weight: 700;
    text-decoration: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-bookmarklet {
    background: var(--accent-light);
    color: var(--accent);
    border: 1px solid rgba(224, 90, 0, 0.2);
  }
  .btn-bookmarklet:hover {
    background: var(--accent);
    color: #fff;
    cursor: grab;
  }
  .btn-save-autofill {
    background: var(--input);
    color: var(--text2);
    border: 1px solid var(--border);
  }
  .btn-save-autofill:hover {
    background: var(--hover);
    color: var(--text);
  }
  .tool-icon {
    width: 11px;
    height: 11px;
    flex-shrink: 0;
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
