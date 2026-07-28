<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { Settings, Home } from '@lucide/svelte';
  import QuickFillClipboard from '$lib/components/QuickFillClipboard.svelte';
  let { children } = $props();
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
  </nav>
  <main class="main">
    {@render children()}
  </main>
  <QuickFillClipboard />
</div>