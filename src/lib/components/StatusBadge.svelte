<script lang="ts">
  import { STATUS_CONFIG, type LeadStatus } from '$lib/types';
  let { status }: { status: LeadStatus } = $props();
  const cfg = STATUS_CONFIG[status];
</script>

<span class="badge {cfg.cls}">
  <span class="badge-dot {status === 'contacted' ? 'animate-pulse' : ''}"></span>
  {cfg.label}
</span>
