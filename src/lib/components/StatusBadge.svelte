<script>
  import { STATUS_CONFIG } from '$lib/types.js';
  let { status, leadId, onStatusChange } = $props();

  const ORDER = ['not_contacted', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed'];

  function cycle() {
    const idx = ORDER.indexOf(status);
    const next = ORDER[(idx + 1) % ORDER.length];
    fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    }).then(r => r.json()).then(() => {
      if (onStatusChange) onStatusChange();
    });
  }
</script>

<button
  class="badge-btn {STATUS_CONFIG[status]?.cls || 'badge-new'}"
  onclick={cycle}
  title="Click to change status"
>
  <span class="badge-dot"></span>
  {STATUS_CONFIG[status]?.label || status}
</button>
