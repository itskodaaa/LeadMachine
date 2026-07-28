<script lang="ts">
  import { US_STATES } from '$lib/types';

  interface Props {
    search: string;
    status: string;
    state: string;
    onSearch: (search: string) => void;
    onFilter: (filters: { status: string; state: string }) => void;
  }

  let { search = $bindable(), status = $bindable(), state = $bindable(), onSearch, onFilter }: Props = $props();

  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    search = val;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => onSearch(val), 200);
  }

  function handleStatus(e: Event) {
    status = (e.target as HTMLSelectElement).value;
    onFilter({ status, state });
  }

  function handleState(e: Event) {
    state = (e.target as HTMLSelectElement).value;
    onFilter({ status, state });
  }
</script>

<div class="flex items-center gap-3">
  <div class="relative flex-1 max-w-md">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
    <input
      type="text"
      value={search}
      oninput={handleInput}
      placeholder="Search leads..."
      class="w-full bg-bg-surface border border-border rounded-sm pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors font-mono"
    />
  </div>

  <select
    value={status}
    onchange={handleStatus}
    class="bg-bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 cursor-pointer"
  >
    <option value="all">All Status</option>
    <option value="not_contacted">New</option>
    <option value="pending">Pending</option>
    <option value="contacted">Sent</option>
    <option value="responded">Replied</option>
    <option value="unable_to_reach">Unreachable</option>
    <option value="won">Won</option>
    <option value="closed">Closed</option>
  </select>

  <select
    value={state}
    onchange={handleState}
    class="bg-bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 cursor-pointer max-w-[120px]"
  >
    <option value="all">All States</option>
    {#each US_STATES as s}
      <option value={s}>{s}</option>
    {/each}
  </select>
</div>
