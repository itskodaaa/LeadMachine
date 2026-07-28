<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { Settings, Home } from '@lucide/svelte';
  import QuickFillClipboard from '$lib/components/QuickFillClipboard.svelte';
  
  let { children } = $props();
  let isClipboardOpen = $state(false);
</script>

<div class="shell">
  <nav class="topbar">
    <div class="topbar-inner">
      <div class="topbar-left">
        <span class="topbar-title">LeadFlow</span>
      </div>
      <div class="topbar-right">
        <button
          type="button"
          title="Toggle Clipboard"
          aria-label="Toggle Clipboard"
          onclick={() => isClipboardOpen = !isClipboardOpen}
          style="font-size:10px;cursor:pointer;background:none;border:none;padding:0;display:inline-flex;align-items:center;justify-content:center;margin-right:12px;"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;color: {isClipboardOpen ? 'var(--accent)' : 'var(--muted)'};">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
        </button>

        <button
          type="button"
          title={$page.url.pathname.endsWith('/settings') ? 'Home' : 'Settings'}
          aria-label={$page.url.pathname.endsWith('/settings') ? 'Home' : 'Settings'}
          onclick={() => {
            $page.url.pathname.endsWith('/settings') ? window.location.href = '/' : window.location.href = '/settings';
          }}
          style="font-size:10px;color:var(--muted);cursor:pointer;background:none;border:none;padding:0;display:inline-flex;align-items:center;justify-content:center;"
        >
          {#if $page.url.pathname.endsWith('/settings')}
            <Home size={15} />
          {:else}
            <Settings size={15} />
          {/if}
        </button>
      </div>
    </div>
    <QuickFillClipboard bind:isOpen={isClipboardOpen} />
  </nav>
  <main class="main">
    {@render children()}
  </main>
</div>