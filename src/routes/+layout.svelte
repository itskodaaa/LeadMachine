<script>
  import '../app.css';
  let { children } = $props();
</script>

<div class="shell">
  <nav class="topbar">
    <div class="topbar-inner">
      <div class="topbar-left">
        <div class="topbar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <span class="topbar-title">LeadFlow</span>
      </div>
      <div class="topbar-right">
        <span style="font-size:10px;color:var(--muted)">localhost</span>
      </div>
    </div>
  </nav>
  <main class="main">
    {@render children()}
  </main>
</div>
