<script lang="ts">
  import { STATUS_CONFIG, type LeadStatus } from '$lib/types';

  interface Props {
    status: LeadStatus;
    size?: 'sm' | 'md';
  }

  let { status, size = 'md' }: Props = $props();
  const config = $derived(STATUS_CONFIG[status]);
</script>

<span class="inline-flex items-center gap-1.5 {size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} font-mono font-medium tracking-wide uppercase rounded-sm {config.bg} {config.color}">
  <span class="w-1.5 h-1.5 rounded-full {status === 'contacted' ? 'animate-pulse-dot' : ''}" style="background: currentColor"></span>
  {config.label}
</span>
