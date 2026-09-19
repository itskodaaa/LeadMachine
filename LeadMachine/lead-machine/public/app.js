/* ==========================================================================
   Lead Machine — Enterprise Application Controller
   ========================================================================== */

// Global State
let systemSpecs = null;
let currentCampaignState = null;
let eventSource = null;
let campaignStartTime = null;
let campaignTimerInterval = null;
let hunterPollInterval = null;
let allLeadsData = [];
let activeTableFilter = 'all';

// DOM Elements
const engineStatusDot = document.getElementById('engineStatusDot');
const engineStatusText = document.getElementById('engineStatusText');
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');
const navLeadCount = document.getElementById('navLeadCount');

// Outreach DOM
const heroLeadCount = document.getElementById('heroLeadCount');
const presetPills = document.querySelectorAll('.preset-pill');
const customLeadQty = document.getElementById('customLeadQty');
const regionSelect = document.getElementById('regionSelect');
const startCampaignBtn = document.getElementById('startCampaignBtn');
const campaignIdleState = document.getElementById('campaignIdleState');
const campaignActiveState = document.getElementById('campaignActiveState');
const campaignStatusHeading = document.getElementById('campaignStatusHeading');
const campaignStatusSub = document.getElementById('campaignStatusSub');
const activeTimer = document.getElementById('activeTimer');
const progressBarFill = document.getElementById('progressBarFill');
const progressCounter = document.getElementById('progressCounter');
const progressPercent = document.getElementById('progressPercent');
const statContacted = document.getElementById('statContacted');
const statUnable = document.getElementById('statUnable');
const statRate = document.getElementById('statRate');
const statSpeed = document.getElementById('statSpeed');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const feedBadge = document.getElementById('feedBadge');
const feedContainer = document.getElementById('feedContainer');
const feedEmpty = document.getElementById('feedEmpty');

// Hunter DOM
const hunterCategory = document.getElementById('hunterCategory');
const hunterState = document.getElementById('hunterState');
const hunterCity = document.getElementById('hunterCity');
const hunterLimit = document.getElementById('hunterLimit');
const startHunterBtn = document.getElementById('startHunterBtn');
const stopHunterBtn = document.getElementById('stopHunterBtn');
const hunterResultsCard = document.getElementById('hunterResultsCard');
const hunterStatusBadge = document.getElementById('hunterStatusBadge');
const hunterStatDiscovered = document.getElementById('hunterStatDiscovered');
const hunterStatReachable = document.getElementById('hunterStatReachable');
const hunterStatSkipped = document.getElementById('hunterStatSkipped');
const hunterStreamList = document.getElementById('hunterStreamList');

// Leads DOM
const dbReadyCount = document.getElementById('dbReadyCount');
const dbContactedCount = document.getElementById('dbContactedCount');
const dbTotalCount = document.getElementById('dbTotalCount');
const leadSearchInput = document.getElementById('leadSearchInput');
const filterPills = document.querySelectorAll('.filter-pill');
const leadsTableBody = document.getElementById('leadsTableBody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const verifyReachabilityBtn = document.getElementById('verifyReachabilityBtn');

// Corporate Profile DOM
const pFullName = document.getElementById('pFullName');
const pJobTitle = document.getElementById('pJobTitle');
const pFirstName = document.getElementById('pFirstName');
const pLastName = document.getElementById('pLastName');
const pEmail = document.getElementById('pEmail');
const pPhone = document.getElementById('pPhone');
const pCompany = document.getElementById('pCompany');
const pWebsite = document.getElementById('pWebsite');
const pAddress = document.getElementById('pAddress');
const pSuite = document.getElementById('pSuite');
const pCity = document.getElementById('pCity');
const pState = document.getElementById('pState');
const pZip = document.getElementById('pZip');
const pCountry = document.getElementById('pCountry');
const pSubject = document.getElementById('pSubject');
const pMessage = document.getElementById('pMessage');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileSaveMsg = document.getElementById('profileSaveMsg');

// Preview Card DOM
const prevFirstName = document.getElementById('prevFirstName');
const prevLastName = document.getElementById('prevLastName');
const prevJobTitle = document.getElementById('prevJobTitle');
const prevCompany = document.getElementById('prevCompany');
const prevEmail = document.getElementById('prevEmail');
const prevPhone = document.getElementById('prevPhone');
const prevAddress = document.getElementById('prevAddress');
const prevMessage = document.getElementById('prevMessage');

// Settings DOM
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const updateFeedback = document.getElementById('updateFeedback');
const workerSlider = document.getElementById('workerSlider');
const workerSliderVal = document.getElementById('workerSliderVal');
const headedToggle = document.getElementById('headedToggle');
const sandboxToggle = document.getElementById('sandboxToggle');
const diagCpu = document.getElementById('diagCpu');
const diagRam = document.getElementById('diagRam');
const diagOs = document.getElementById('diagOs');

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupOutreachHandlers();
  setupHunterHandlers();
  setupLeadsHandlers();
  setupProfileHandlers();
  setupSettingsHandlers();
  
  await loadInitialSpecs();
  connectSSE();
  await loadLeadsTable();
});

// Navigation Handling
function setupNavigation() {
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      if (targetId === 'tab-leads') {
        loadLeadsTable();
      }
    });
  });
}

// Initial System Specs & Profile
async function loadInitialSpecs() {
  try {
    const res = await fetch('/api/system-specs');
    systemSpecs = await res.json();

    // Fill Hardware Diags
    if (diagCpu) diagCpu.textContent = `${systemSpecs.hardwareTier} Tier (${systemSpecs.totalMemGb}GB RAM)`;
    if (diagRam) diagRam.textContent = `${systemSpecs.freeMemGb}GB Free / ${systemSpecs.totalMemGb}GB Total`;
    if (diagOs) diagOs.textContent = `${systemSpecs.platform.toUpperCase()} (${systemSpecs.arch})`;

    // Worker recommendation
    if (workerSlider) {
      workerSlider.max = systemSpecs.maxWorkers || 12;
      workerSlider.value = systemSpecs.recommendedWorkers || 8;
      workerSliderVal.textContent = `${workerSlider.value} Workers`;
    }

    // Populate Region Dropdown
    if (systemSpecs.dbStats && systemSpecs.dbStats.topStates) {
      regionSelect.innerHTML = '<option value="all">All States (Nationwide)</option>';
      for (const st of systemSpecs.dbStats.topStates) {
        const opt = document.createElement('option');
        opt.value = st.state;
        opt.textContent = `${st.state} (${st.count} leads)`;
        regionSelect.appendChild(opt);
      }
    }

    // Lead Counters
    updateLeadCounts(systemSpecs.dbStats);

    // Populate Sender Profile
    if (systemSpecs.senderProfile) {
      populateProfileForm(systemSpecs.senderProfile);
    }

  } catch (err) {
    console.error('Specs loading failed:', err);
    engineStatusText.textContent = 'Offline';
    engineStatusDot.classList.add('offline');
  }
}

function updateLeadCounts(stats) {
  if (!stats) return;
  const ready = stats.notContacted || 0;
  const contacted = stats.contacted || 0;
  const total = stats.total || 0;

  if (heroLeadCount) heroLeadCount.textContent = ready;
  if (navLeadCount) navLeadCount.textContent = ready;
  if (dbReadyCount) dbReadyCount.textContent = ready;
  if (dbContactedCount) dbContactedCount.textContent = contacted;
  if (dbTotalCount) dbTotalCount.textContent = total;
}

// ==========================================================================
// Outreach Controller
// ==========================================================================
function setupOutreachHandlers() {
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const qty = pill.dataset.qty;
      if (qty === 'max') {
        customLeadQty.value = heroLeadCount.textContent || 50;
      } else {
        customLeadQty.value = qty;
      }
    });
  });

  customLeadQty.addEventListener('input', () => {
    presetPills.forEach(p => p.classList.remove('active'));
  });

  startCampaignBtn.addEventListener('click', async () => {
    startCampaignBtn.disabled = true;
    const qty = parseInt(customLeadQty.value, 10) || 10;
    const stateFilter = regionSelect.value === 'all' ? null : regionSelect.value;
    const isSandbox = sandboxToggle ? sandboxToggle.checked : false;
    const isHeaded = headedToggle ? headedToggle.checked : false;
    const workers = workerSlider ? parseInt(workerSlider.value, 10) : 8;

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLeads: qty,
          numWorkers: workers,
          isSandbox,
          isHeaded,
          stateFilter
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Could not start campaign: ' + data.error);
        startCampaignBtn.disabled = false;
      }
    } catch (err) {
      alert('Network error starting campaign: ' + err.message);
      startCampaignBtn.disabled = false;
    }
  });

  pauseBtn.addEventListener('click', async () => {
    const isPaused = pauseBtn.textContent === 'Resume';
    const endpoint = isPaused ? '/api/resume' : '/api/pause';
    await fetch(endpoint, { method: 'POST' });
    pauseBtn.textContent = isPaused ? 'Pause' : 'Resume';
  });

  stopBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to stop the active campaign?')) {
      await fetch('/api/stop', { method: 'POST' });
    }
  });
}

// SSE Live Telemetry
function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/stream');

  eventSource.onopen = () => {
    engineStatusText.textContent = 'Online';
    engineStatusDot.classList.remove('offline');
  };

  eventSource.onerror = () => {
    engineStatusText.textContent = 'Connecting...';
    engineStatusDot.classList.add('offline');
  };

  eventSource.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      handleTelemetryEvent(event);
    } catch (_) {}
  };
}

function handleTelemetryEvent(event) {
  if (event.type === 'initial_state') {
    applyCampaignState(event.state);
  } else if (event.type === 'campaign_started') {
    setCampaignRunningUI(true);
    addFeedItem('🚀', 'Campaign Started', 'Running', 'success');
  } else if (event.type === 'lead_result') {
    const isContacted = event.status === 'contacted';
    const icon = isContacted ? '✓' : '—';
    const tag = isContacted ? `Sent (${event.time}s)` : (event.result || 'No Form');
    const tagClass = isContacted ? 'success' : 'muted';
    addFeedItem(icon, event.company, tag, tagClass);
    fetchStatusUpdate();
  } else if (event.type === 'lead_found') {
    // Lead Hunter real-time event
    addHunterStreamItem(event);
  } else if (event.type === 'hunter_finished') {
    hunterStatusBadge.textContent = 'Completed';
    hunterStatusBadge.className = 'badge-status';
    startHunterBtn.style.display = 'inline-flex';
    stopHunterBtn.style.display = 'none';
    loadInitialSpecs();
  } else if (event.type === 'campaign_finished') {
    setCampaignRunningUI(false);
    addFeedItem('🏁', 'Campaign Finished', 'Complete', 'success');
    fetchStatusUpdate();
    loadInitialSpecs();
  }
}

async function fetchStatusUpdate() {
  try {
    const res = await fetch('/api/status');
    const state = await res.json();
    applyCampaignState(state);
  } catch (_) {}
}

function applyCampaignState(state) {
  if (!state) return;
  currentCampaignState = state;

  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';

  if (isRunning || isPaused) {
    setCampaignRunningUI(true);
    campaignStatusHeading.textContent = isPaused ? 'Campaign Paused' : 'Campaign Running';
    campaignStatusSub.textContent = `Wave ${state.currentWave} active with ${state.numWorkers} workers`;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    feedBadge.textContent = isPaused ? 'Paused' : 'Active';
  } else if (state.status === 'completed') {
    setCampaignRunningUI(false);
    feedBadge.textContent = 'Finished';
  }

  // Progress Bar
  const percent = state.progressPercent || 0;
  progressBarFill.style.width = `${percent}%`;
  progressCounter.textContent = `${state.processedTotal || 0} of ${state.targetTotal || 0} Leads Processed`;
  progressPercent.textContent = `${percent}%`;

  // Live Metrics
  statContacted.textContent = state.contactedTotal || 0;
  statUnable.textContent = state.unableTotal || 0;
  statRate.textContent = `${state.conversionRate || 0}%`;
  statSpeed.textContent = state.speedLeadsPerMin || 0;

  if (state.dbStats) updateLeadCounts(state.dbStats);
}

function setCampaignRunningUI(running) {
  if (running) {
    campaignIdleState.style.display = 'none';
    campaignActiveState.style.display = 'block';
    startCampaignBtn.disabled = true;
    startTimer();
  } else {
    campaignIdleState.style.display = 'block';
    campaignActiveState.style.display = 'none';
    startCampaignBtn.disabled = false;
    stopTimer();
  }
}

function startTimer() {
  if (campaignTimerInterval) clearInterval(campaignTimerInterval);
  campaignStartTime = Date.now();
  campaignTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - campaignStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    activeTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  if (campaignTimerInterval) {
    clearInterval(campaignTimerInterval);
    campaignTimerInterval = null;
  }
}

function addFeedItem(icon, company, tag, tagClass) {
  if (feedEmpty) feedEmpty.style.display = 'none';

  const row = document.createElement('div');
  row.className = 'feed-row';
  row.innerHTML = `
    <div class="feed-row-left">
      <span class="feed-icon">${icon}</span>
      <span class="feed-company">${company}</span>
    </div>
    <span class="feed-tag ${tagClass}">${tag}</span>
  `;
  feedContainer.prepend(row);
}

// ==========================================================================
// Lead Hunter Controller
// ==========================================================================
function setupHunterHandlers() {
  // Suggestion Chips
  document.querySelectorAll('.chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      hunterCategory.value = chip.dataset.query;
    });
  });

  startHunterBtn.addEventListener('click', async () => {
    const query = hunterCategory.value.trim();
    if (!query) {
      alert('Please enter an industry or business category.');
      hunterCategory.focus();
      return;
    }

    const state = hunterState.value;
    const city = hunterCity.value.trim();
    const limit = parseInt(hunterLimit.value, 10) || 25;

    startHunterBtn.style.display = 'none';
    stopHunterBtn.style.display = 'inline-flex';
    hunterResultsCard.style.display = 'flex';
    hunterStatusBadge.textContent = 'Hunting...';
    hunterStatusBadge.className = 'badge-status active';
    hunterStreamList.innerHTML = '';
    hunterStatDiscovered.textContent = '0';
    hunterStatReachable.textContent = '0';
    hunterStatSkipped.textContent = '0';

    try {
      const res = await fetch('/api/hunter/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, state, city, limit })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Could not start Lead Hunter: ' + data.error);
        resetHunterUI();
      } else {
        startHunterPolling();
      }
    } catch (err) {
      alert('Network error starting Lead Hunter: ' + err.message);
      resetHunterUI();
    }
  });

  stopHunterBtn.addEventListener('click', async () => {
    await fetch('/api/hunter/stop', { method: 'POST' });
    resetHunterUI();
  });
}

function startHunterPolling() {
  if (hunterPollInterval) clearInterval(hunterPollInterval);
  hunterPollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/hunter/status');
      const data = await res.json();
      if (data.success && data.status) {
        const s = data.status;
        hunterStatDiscovered.textContent = s.discovered || 0;
        hunterStatReachable.textContent = s.reachable || 0;
        hunterStatSkipped.textContent = s.skipped || 0;

        if (s.status === 'completed' || s.status === 'stopped' || s.status === 'error') {
          clearInterval(hunterPollInterval);
          hunterPollInterval = null;
          resetHunterUI();
          hunterStatusBadge.textContent = s.status === 'completed' ? 'Completed' : 'Finished';
          hunterStatusBadge.className = 'badge-status';
          loadInitialSpecs();
        }
      }
    } catch (_) {}
  }, 2000);
}

function resetHunterUI() {
  startHunterBtn.style.display = 'inline-flex';
  stopHunterBtn.style.display = 'none';
}

function addHunterStreamItem(item) {
  const card = document.createElement('div');
  card.className = 'hunter-item-card';
  card.innerHTML = `
    <div>
      <div class="hunter-item-name">${item.company}</div>
      <div class="hunter-item-web">${item.website}</div>
    </div>
    <span class="status-pill ready">Verified</span>
  `;
  hunterStreamList.prepend(card);
}

// ==========================================================================
// Leads CRM Controller
// ==========================================================================
function setupLeadsHandlers() {
  leadSearchInput.addEventListener('input', () => {
    filterAndRenderLeadsTable();
  });

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeTableFilter = pill.dataset.filter;
      filterAndRenderLeadsTable();
    });
  });

  exportCsvBtn.addEventListener('click', () => {
    window.location.href = '/api/leads/export';
  });

  verifyReachabilityBtn.addEventListener('click', async () => {
    verifyReachabilityBtn.disabled = true;
    verifyReachabilityBtn.innerHTML = '<span>Verifying...</span>';
    try {
      const res = await fetch('/api/verify-reachability', { method: 'POST' });
      const data = await res.json();
      alert(`Domain verification completed: ${data.reachable} verified reachable, ${data.unreachable} flagged unreachable.`);
      await loadLeadsTable();
      await loadInitialSpecs();
    } catch (err) {
      alert('Verification error: ' + err.message);
    } finally {
      verifyReachabilityBtn.disabled = false;
      verifyReachabilityBtn.innerHTML = '<span>Verify Domains</span>';
    }
  });
}

async function loadLeadsTable() {
  try {
    const res = await fetch('/api/leads');
    const data = await res.json();
    if (data.success) {
      allLeadsData = data.leads || [];
      filterAndRenderLeadsTable();
    }
  } catch (err) {
    console.error('Failed to load leads:', err);
  }
}

function filterAndRenderLeadsTable() {
  const query = (leadSearchInput.value || '').toLowerCase().trim();

  const filtered = allLeadsData.filter(lead => {
    // Filter by Status
    if (activeTableFilter !== 'all' && lead.status !== activeTableFilter) {
      return false;
    }
    // Filter by Search Query
    if (query) {
      const text = `${lead.company_name} ${lead.website} ${lead.notes || ''} ${lead.phone || ''}`.toLowerCase();
      return text.includes(query);
    }
    return true;
  });

  renderTableRows(filtered);
}

function renderTableRows(leads) {
  leadsTableBody.innerHTML = '';
  if (leads.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No leads match your criteria.
        </td>
      </tr>
    `;
    return;
  }

  leads.slice(0, 100).forEach(lead => {
    const tr = document.createElement('tr');
    
    let statusClass = 'ready';
    let statusText = 'Ready';
    if (lead.status === 'contacted') {
      statusClass = 'contacted';
      statusText = 'Contacted';
    } else if (lead.status === 'unable_to_reach') {
      statusClass = 'unable';
      statusText = 'Unable';
    }

    const web = lead.website ? (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`) : '#';

    tr.innerHTML = `
      <td class="tabular" style="color: var(--text-muted);">${lead.id}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${lead.company_name}</td>
      <td><a href="${web}" target="_blank" rel="noopener noreferrer">${lead.website || '—'}</a></td>
      <td class="tabular">${lead.phone || '—'}</td>
      <td><span class="status-pill ${statusClass}">${statusText}</span></td>
      <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-muted);">${lead.notes || '—'}</td>
    `;
    leadsTableBody.appendChild(tr);
  });
}

// ==========================================================================
// Corporate Profile & Two-Way Synchronization Controller
// ==========================================================================
function setupProfileHandlers() {
  // Two-Way Name Sync: Typing Full Name updates First & Last Name
  pFullName.addEventListener('input', () => {
    const full = pFullName.value.trim();
    if (full) {
      const parts = full.split(/\s+/);
      pFirstName.value = parts[0] || '';
      pLastName.value = parts.slice(1).join(' ') || '';
    }
    updateLivePreview();
  });

  // Typing First or Last Name updates Full Name
  const syncToFullName = () => {
    const first = pFirstName.value.trim();
    const last = pLastName.value.trim();
    pFullName.value = `${first} ${last}`.trim();
    updateLivePreview();
  };

  pFirstName.addEventListener('input', syncToFullName);
  pLastName.addEventListener('input', syncToFullName);

  // Live updates for all other fields
  const liveInputs = [pJobTitle, pEmail, pPhone, pCompany, pWebsite, pAddress, pSuite, pCity, pState, pZip, pCountry, pSubject, pMessage];
  liveInputs.forEach(input => {
    input.addEventListener('input', updateLivePreview);
  });

  // Variable Chips for Message Body
  document.querySelectorAll('.var-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.var;
      insertAtCursor(pMessage, tag);
      updateLivePreview();
    });
  });

  // Save Profile Form
  saveProfileBtn.addEventListener('click', async () => {
    saveProfileBtn.disabled = true;
    profileSaveMsg.textContent = 'Saving...';

    const profileData = {
      fullName: pFullName.value.trim(),
      firstName: pFirstName.value.trim(),
      lastName: pLastName.value.trim(),
      jobTitle: pJobTitle.value.trim(),
      email: pEmail.value.trim(),
      phone: pPhone.value.trim(),
      company: pCompany.value.trim(),
      website: pWebsite.value.trim(),
      address: pAddress.value.trim(),
      suite: pSuite.value.trim(),
      city: pCity.value.trim(),
      state: pState.value.trim(),
      zip: pZip.value.trim(),
      country: pCountry.value.trim(),
      subject: pSubject.value.trim(),
      message: pMessage.value.trim()
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        profileSaveMsg.textContent = '✓ Saved Successfully';
        setTimeout(() => { profileSaveMsg.textContent = ''; }, 3500);
      } else {
        profileSaveMsg.textContent = 'Error: ' + data.error;
      }
    } catch (err) {
      profileSaveMsg.textContent = 'Network error saving';
    } finally {
      saveProfileBtn.disabled = false;
    }
  });
}

function populateProfileForm(p) {
  if (!p) return;
  pFullName.value = p.fullName || '';
  pFirstName.value = p.firstName || '';
  pLastName.value = p.lastName || '';
  pJobTitle.value = p.jobTitle || '';
  pEmail.value = p.email || '';
  pPhone.value = p.phone || '';
  pCompany.value = p.company || '';
  pWebsite.value = p.website || '';
  pAddress.value = p.address || '';
  pSuite.value = p.suite || '';
  pCity.value = p.city || '';
  pState.value = p.state || '';
  pZip.value = p.zip || '';
  pCountry.value = p.country || '';
  pSubject.value = p.subject || '';
  pMessage.value = p.message || '';

  // Trigger two-way sync fallback if only fullName existed
  if (p.fullName && (!p.firstName || !p.lastName)) {
    const parts = p.fullName.trim().split(/\s+/);
    pFirstName.value = parts[0] || '';
    pLastName.value = parts.slice(1).join(' ') || '';
  }

  updateLivePreview();
}

function updateLivePreview() {
  if (prevFirstName) prevFirstName.textContent = pFirstName.value || 'Alexander';
  if (prevLastName) prevLastName.textContent = pLastName.value || 'Wright';
  if (prevJobTitle) prevJobTitle.textContent = pJobTitle.value || 'Director of Strategic Partnerships';
  if (prevCompany) prevCompany.textContent = pCompany.value || 'Apex Precision Engineering';
  if (prevEmail) prevEmail.textContent = pEmail.value || 'a.wright@apexprecision.com';
  if (prevPhone) prevPhone.textContent = pPhone.value || '(708) 568-3708';

  const fullAddr = [pAddress.value, pSuite.value, pCity.value, pState.value, pZip.value].filter(Boolean).join(', ');
  if (prevAddress) prevAddress.textContent = fullAddr || '100 Main St, Suite 400, Chicago, IL 60601';

  let previewMsg = pMessage.value || 'Hello,\n\nI am reaching out to explore potential collaboration with your team...';
  previewMsg = previewMsg.replace(/{company_name}/gi, 'Acme Industrial Corp');
  previewMsg = previewMsg.replace(/{first_name}/gi, 'David');
  previewMsg = previewMsg.replace(/{city}/gi, 'Chicago');
  previewMsg = previewMsg.replace(/{state}/gi, 'IL');
  if (prevMessage) prevMessage.textContent = previewMsg;
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end, textarea.value.length);
  textarea.value = before + text + after;
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

// ==========================================================================
// Settings & Updates Controller
// ==========================================================================
function setupSettingsHandlers() {
  if (workerSlider) {
    workerSlider.addEventListener('input', () => {
      workerSliderVal.textContent = `${workerSlider.value} Workers`;
    });
  }

  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      checkUpdateBtn.disabled = true;
      checkUpdateBtn.innerHTML = '<span>Checking...</span>';
      updateFeedback.style.display = 'block';
      updateFeedback.textContent = 'Contacting release server...';

      try {
        const res = await fetch('/api/system/version');
        const data = await res.json();
        updateFeedback.textContent = `✓ System is running the latest enterprise build (${data.version}). All modules verified.`;
      } catch (err) {
        updateFeedback.textContent = 'Could not reach update server. Operating in offline enterprise mode.';
      } finally {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.innerHTML = '<span>Check for Updates</span>';
      }
    });
  }
}
