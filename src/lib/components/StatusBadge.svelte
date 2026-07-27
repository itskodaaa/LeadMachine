<script lang="ts">
  import { STATUS_CONFIG, type LeadStatus } from '$lib/types';

  interface Props {
    status: LeadStatus;
  }

  let { status }: Props = $props();
  const config = $derived(STATUS_CONFIG[status]);
</script>

<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full {config.bg} {config.color}">
  <span class="w-1.5 h-1.5 rounded-full {status === 'contacted' ? 'animate-pulse-dot' : ''}" style="background: currentColor"></span>
  {config.label}
</span>
