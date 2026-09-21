/* ==========================================================================
   Lead Machine - Application Controller
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
const campaignCategory = document.getElementById('campaignCategory');
const autoHuntBanner = document.getElementById('autoHuntBanner');
const autoHuntDot = document.getElementById('autoHuntDot');
const autoHuntTitle = document.getElementById('autoHuntTitle');
const autoHuntDesc = document.getElementById('autoHuntDesc');
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
const hunterCustomQtyWrap = document.getElementById('hunterCustomQtyWrap');
const hunterCustomQty = document.getElementById('hunterCustomQty');
const startHunterBtn = document.getElementById('startHunterBtn');
const stopHunterBtn = document.getElementById('stopHunterBtn');
const hunterResultsCard = document.getElementById('hunterResultsCard');
const hunterStatusBadge = document.getElementById('hunterStatusBadge');
const hunterStatDiscovered = document.getElementById('hunterStatDiscovered');
const hunterStatReachable = document.getElementById('hunterStatReachable');
const hunterStatSkipped = document.getElementById('hunterStatSkipped');
const hunterStreamList = document.getElementById('hunterStreamList');

// Auth Gate DOM & State
const authGateOverlay = document.getElementById('authGateOverlay');
const authGateForm = document.getElementById('authGateForm');
const licenseKeyInput = document.getElementById('licenseKeyInput');
const authFeedback = document.getElementById('authFeedback');
const activateLicenseBtn = document.getElementById('activateLicenseBtn');
const licenseStatusBadge = document.getElementById('licenseStatusBadge');
const licenseStatusText = document.getElementById('licenseStatusText');

let currentAuthData = {
  authenticated: false,
  clientName: null,
  keyMask: null,
  tier: null,
  expires: null,
  status: 'unactivated',
  error: null,
  limits: null
};
let isAppInitialized = false;

// Leads DOM
const dbReadyCount = document.getElementById('dbReadyCount');
const dbContactedCount = document.getElementById('dbContactedCount');
const dbTotalCount = document.getElementById('dbTotalCount');
const leadSearchInput = document.getElementById('leadSearchInput');
const filterPills = document.querySelectorAll('.filter-pill');
const leadsTableBody = document.getElementById('leadsTableBody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const verifyReachabilityBtn = document.getElementById('verifyReachabilityBtn');
const importWebsitesBtn = document.getElementById('importWebsitesBtn');

// Bulk Importer Modal DOM
const importWebsitesOverlay = document.getElementById('importWebsitesOverlay');
const closeImportModalBtn = document.getElementById('closeImportModalBtn');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const importWebsitesTextarea = document.getElementById('importWebsitesTextarea');
const importDetectedBadge = document.getElementById('importDetectedBadge');
const importDropzone = document.getElementById('importDropzone');
const importFileInput = document.getElementById('importFileInput');
const browseFileBtn = document.getElementById('browseFileBtn');
const importPreviewBox = document.getElementById('importPreviewBox');
const importPreviewChips = document.getElementById('importPreviewChips');
const importFeedback = document.getElementById('importFeedback');
const submitImportBtn = document.getElementById('submitImportBtn');
const submitImportBtnText = document.getElementById('submitImportBtnText');

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
const forceSyncBtn = document.getElementById('forceSyncBtn');
const installUpdateBtn = document.getElementById('installUpdateBtn');
const updateFeedback = document.getElementById('updateFeedback');
const updateStatusPill = document.getElementById('updateStatusPill');
const versionTitle = document.getElementById('versionTitle');
const updateRepoLabel = document.getElementById('updateRepoLabel');
const updateCommitLabel = document.getElementById('updateCommitLabel');
const updateLastChecked = document.getElementById('updateLastChecked');
const workerSlider = document.getElementById('workerSlider');
const workerSliderVal = document.getElementById('workerSliderVal');
const headedToggle = document.getElementById('headedToggle');
const sandboxToggle = document.getElementById('sandboxToggle');
const diagCpu = document.getElementById('diagCpu');
const diagRam = document.getElementById('diagRam');
const diagOs = document.getElementById('diagOs');

// Force Update DOM & State
const forceUpdateOverlay = document.getElementById('forceUpdateOverlay');
const forceUpdateCloseX = document.getElementById('forceUpdateCloseX');
const forceUpdateCurrentVer = document.getElementById('forceUpdateCurrentVer');
const forceUpdateLatestVer = document.getElementById('forceUpdateLatestVer');
const forceUpdateNotes = document.getElementById('forceUpdateNotes');
const forceUpdateProgressWrap = document.getElementById('forceUpdateProgressWrap');
const forceUpdateProgressBarFill = document.getElementById('forceUpdateProgressBarFill');
const forceUpdateProgressStatus = document.getElementById('forceUpdateProgressStatus');
const forceUpdateFeedback = document.getElementById('forceUpdateFeedback');
const forceUpdateNowBtn = document.getElementById('forceUpdateNowBtn');
const forceUpdateLaterBtn = document.getElementById('forceUpdateLaterBtn');
const updateReminderDock = document.getElementById('updateReminderDock');
const dockVerLabel = document.getElementById('dockVerLabel');
const dockUpdateBtn = document.getElementById('dockUpdateBtn');
const dockOpenModalBtn = document.getElementById('dockOpenModalBtn');

let latestUpdateData = null;
let isUpdateModalDismissed = false;
let updateSnoozeTimer = null;
let updateIntervalId = null;

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupAuthHandlers();
  setupOutreachHandlers();
  setupHunterHandlers();
  setupLeadsHandlers();
  setupProfileHandlers();
  setupSettingsHandlers();
  setupForceUpdateHandlers();
  initDomTamperGuard();
  
  await checkAuthStatus();
});

async function initializeAuthenticatedSession() {
  if (isAppInitialized) return;
  isAppInitialized = true;
  await loadInitialSpecs();
  connectSSE();
  await loadLeadsTable();
}

function initDomTamperGuard() {
  const overlay = document.getElementById('authGateOverlay');
  const appContainer = document.getElementById('appContainer');
  if (!overlay) return;

  const observer = new MutationObserver(() => {
    // If client is unauthenticated, tampering with the modal locks everything down
    if (!currentAuthData.authenticated) {
      const isDetached = !document.body.contains(overlay);
      let isHidden = isDetached;
      if (!isHidden) {
        try {
          const computed = window.getComputedStyle(overlay);
          isHidden = overlay.style.display === 'none' ||
                     computed.display === 'none' ||
                     computed.visibility === 'hidden' ||
                     parseFloat(computed.opacity || '1') < 0.1 ||
                     overlay.hidden;
        } catch (_) {
          isHidden = true;
        }
      }

      if (isHidden) {
        console.error('[Security] Tamper violation detected on license gate overlay.');
        if (appContainer) appContainer.innerHTML = '';
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#06080d;color:#f87171;font-family:system-ui,sans-serif;text-align:center;padding:24px;">
            <div style="font-size:48px;margin-bottom:16px;">🛡️</div>
            <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:#fff;">Security Violation Detected</h1>
            <p style="color:#94a3b8;max-width:480px;line-height:1.6;margin-bottom:24px;">
              Direct modification or removal of the licensing layer is strictly prohibited. An official active license key is required to access Lead Machine.
            </p>
            <button onclick="window.location.reload()" style="background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">
              Reload & Enter License Key
            </button>
          </div>
        `;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden']
  });
}

function applyTierLimitsToHunter(limits) {
  const hunterLimitSelect = document.getElementById('hunterLimit');
  if (!hunterLimitSelect || !limits) return;

  if (limits.maxHunterLeads < 1000) {
    // Trial tier: add 100 leads option and disable larger presets
    let trialOpt = hunterLimitSelect.querySelector('option[value="100"]');
    if (!trialOpt) {
      trialOpt = document.createElement('option');
      trialOpt.value = '100';
      trialOpt.textContent = '100 Leads (Trial Maximum)';
      hunterLimitSelect.insertBefore(trialOpt, hunterLimitSelect.firstChild);
    }
    hunterLimitSelect.value = '100';

    Array.from(hunterLimitSelect.options).forEach(opt => {
      if (Number(opt.value) > limits.maxHunterLeads || opt.value === 'custom') {
        opt.disabled = true;
        if (!opt.textContent.includes('Requires Pro')) {
          opt.textContent += ' — (Requires Pro/Enterprise)';
        }
      }
    });
  }
}

// ==========================================================================
// License Authentication Gate Controller
// ==========================================================================
function setupAuthHandlers() {
  if (!authGateForm) return;

  const changeLicenseBtn = document.getElementById('changeLicenseBtn');
  const deactivateLicenseBtn = document.getElementById('deactivateLicenseBtn');

  if (changeLicenseBtn) {
    changeLicenseBtn.addEventListener('click', () => {
      showAuthGate(currentAuthData.keyMask);
      if (licenseKeyInput) licenseKeyInput.focus();
    });
  }

  if (deactivateLicenseBtn) {
    deactivateLicenseBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to deactivate your license on this machine?')) {
        try {
          await fetch('/api/auth/deactivate', { method: 'POST' });
          currentAuthData.authenticated = false;
          await checkAuthStatus();
        } catch (_) {}
      }
    });
  }

  authGateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = (licenseKeyInput?.value || '').trim().toUpperCase();
    if (!key) return;

    if (activateLicenseBtn) {
      activateLicenseBtn.disabled = true;
      activateLicenseBtn.innerHTML = '<span class="spin">⟳</span><span>Verifying...</span>';
    }
    if (authFeedback) authFeedback.style.display = 'none';

    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (data.success) {
        if (authFeedback) {
          authFeedback.className = 'auth-feedback success';
          authFeedback.textContent = `✓ License activated for ${data.clientName || 'Enterprise User'} (${data.tier || 'Enterprise'})! Unlocking cockpit...`;
          authFeedback.style.display = 'block';
        }

        setTimeout(async () => {
          await checkAuthStatus();
        }, 500);
      } else {
        if (authFeedback) {
          authFeedback.className = 'auth-feedback error';
          authFeedback.textContent = data.error || 'Invalid or revoked license key.';
          authFeedback.style.display = 'block';
        }
      }
    } catch (err) {
      if (authFeedback) {
        authFeedback.className = 'auth-feedback error';
        authFeedback.textContent = 'Connection error: ' + err.message;
        authFeedback.style.display = 'block';
      }
    } finally {
      if (activateLicenseBtn) {
        activateLicenseBtn.disabled = false;
        activateLicenseBtn.innerHTML = '<span>Activate License</span>';
      }
    }
  });
}

async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    currentAuthData = data;

    const settingsLicenseBadge = document.getElementById('settingsLicenseBadge');
    const settingsLicensedClient = document.getElementById('settingsLicensedClient');
    const settingsKeyMask = document.getElementById('settingsKeyMask');
    const settingsTierBadge = document.getElementById('settingsTierBadge');
    const settingsExpiryVal = document.getElementById('settingsExpiryVal');
    const settingsQuotasVal = document.getElementById('settingsQuotasVal');

    if (data.authenticated) {
      hideAuthGate();
      if (licenseStatusBadge) {
        licenseStatusBadge.style.display = 'inline-flex';
        if (licenseStatusText) {
          licenseStatusText.textContent = `${data.clientName || 'Licensed'} • ${data.tier || 'Enterprise'}`;
        }
      }
      if (settingsLicenseBadge) {
        settingsLicenseBadge.textContent = `Active (${data.tier || 'Enterprise'})`;
        settingsLicenseBadge.className = 'badge-status active';
      }
      if (settingsLicensedClient) settingsLicensedClient.textContent = data.clientName || 'Enterprise User';
      if (settingsKeyMask) settingsKeyMask.textContent = data.keyMask || '—';
      if (settingsTierBadge) {
        settingsTierBadge.textContent = data.tier || 'Enterprise';
        settingsTierBadge.className = data.tier === 'Trial' ? 'badge-status warning' : 'badge-status active';
      }
      if (settingsExpiryVal) {
        settingsExpiryVal.textContent = data.expires ? new Date(data.expires).toLocaleDateString() : 'Continuous / Lifetime';
      }
      if (settingsQuotasVal) {
        const lim = data.limits;
        settingsQuotasVal.textContent = lim ? `${lim.maxHunterLeads.toLocaleString()} leads/search • ${lim.maxWorkers} workers` : '100k leads/search • 6 workers';
      }

      applyTierLimitsToHunter(data.limits);
      await initializeAuthenticatedSession();
    } else {
      showAuthGate(data.keyMask, data.error, data.status);
      if (licenseStatusBadge) licenseStatusBadge.style.display = 'none';
      if (settingsLicenseBadge) {
        settingsLicenseBadge.textContent = data.status === 'expired' ? 'Expired' : (data.status === 'clock_tampered' ? 'Tamper Alert' : (data.status === 'lease_expired' ? 'Lease Expired' : 'Unactivated'));
        settingsLicenseBadge.className = 'badge-status revoked';
      }
      if (settingsLicensedClient) settingsLicensedClient.textContent = 'No Active License';
      if (settingsKeyMask) settingsKeyMask.textContent = data.keyMask || 'Not Configured';
      if (settingsTierBadge) settingsTierBadge.textContent = data.tier || 'Locked';
      if (settingsExpiryVal) settingsExpiryVal.textContent = data.status === 'expired' ? (data.error || 'Expired') : 'Locked';
    }
  } catch (err) {
    console.warn('[Auth] Status check error:', err);
  }
}

function showAuthGate(keyMask, error = null, status = 'unactivated') {
  if (!authGateOverlay) return;
  authGateOverlay.style.display = 'flex';
  const appContainer = document.getElementById('appContainer');
  if (appContainer) {
    appContainer.style.filter = 'blur(10px)';
    appContainer.style.pointerEvents = 'none';
  }
  if (licenseStatusBadge) licenseStatusBadge.style.display = 'none';
  if (keyMask && licenseKeyInput && !licenseKeyInput.value) {
    licenseKeyInput.placeholder = keyMask;
  }

  const authGateTitle = document.getElementById('authGateTitle');
  const authGateSubtitle = document.getElementById('authGateSubtitle');

  if (status === 'expired') {
    if (authGateTitle) authGateTitle.textContent = 'License Expired';
    if (authGateSubtitle) authGateSubtitle.textContent = error || 'Your license period has ended. Enter a renewed key to continue.';
    if (authFeedback) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = error || 'This license key has expired.';
      authFeedback.style.display = 'block';
    }
  } else if (status === 'clock_tampered') {
    if (authGateTitle) authGateTitle.textContent = 'System Clock Alert';
    if (authGateSubtitle) authGateSubtitle.textContent = 'System clock rollback detected. Correct your computer date & time.';
    if (authFeedback) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = error || 'System clock tampering detected.';
      authFeedback.style.display = 'block';
    }
  } else if (status === 'lease_expired') {
    if (authGateTitle) authGateTitle.textContent = 'Offline Lease Expired';
    if (authGateSubtitle) authGateSubtitle.textContent = '48-hour offline limit reached. Connect to the internet to re-verify your license.';
    if (authFeedback) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = error || 'Offline validation lease expired.';
      authFeedback.style.display = 'block';
    }
  } else {
    if (authGateTitle) authGateTitle.textContent = 'Lead Machine Enterprise';
    if (authGateSubtitle) authGateSubtitle.textContent = 'Official license key required. Enter your key to activate your outbound cockpit on this machine.';
  }
}

function hideAuthGate() {
  if (!authGateOverlay) return;
  authGateOverlay.style.display = 'none';
  const appContainer = document.getElementById('appContainer');
  if (appContainer) {
    appContainer.style.filter = 'none';
    appContainer.style.pointerEvents = 'auto';
  }
  if (authFeedback) authFeedback.style.display = 'none';
}

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
      } else if (targetId === 'tab-settings') {
        checkAuthStatus();
      }
    });
  });

  // Support URL hash routing (e.g. #settings, #hunter, #leads)
  const initialHash = window.location.hash ? window.location.hash.replace('#', '') : '';
  if (initialHash) {
    const targetTab = Array.from(navTabs).find(t => t.dataset.tab === `tab-${initialHash}` || t.dataset.tab === initialHash);
    if (targetTab) targetTab.click();
  }
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

  updateAutoHuntEstimate();
}

function updateAutoHuntEstimate() {
  if (!autoHuntBanner) return;
  const qty = parseInt(customLeadQty?.value, 10) || 10;
  const state = regionSelect?.value || 'all';
  const category = campaignCategory?.value?.trim() || 'Manufacturing';

  let available = 0;
  if (state === 'all') {
    available = systemSpecs?.dbStats?.notContacted || 0;
  } else {
    const stObj = systemSpecs?.dbStats?.topStates?.find(s => s.state === state);
    available = stObj?.count || 0;
  }

  const deficit = qty - available;
  if (deficit > 0) {
    autoHuntBanner.classList.add('has-deficit');
    if (autoHuntTitle) autoHuntTitle.textContent = `⚡ Auto-Harvest Engaged (${deficit} Lead Deficit)`;
    if (autoHuntDesc) {
      const regionName = state === 'all' ? 'nationwide' : state;
      autoHuntDesc.textContent = `Campaign target is ${qty} leads, but only ${available} are ready in ${regionName}. Lead Machine will autonomously scrape and verify ${deficit} fresh "${category}" leads in the background during outreach.`;
    }
  } else {
    autoHuntBanner.classList.remove('has-deficit');
    if (autoHuntTitle) autoHuntTitle.textContent = `✓ Database Coverage Verified (${available} Ready)`;
    if (autoHuntDesc) {
      const regionName = state === 'all' ? 'nationwide' : state;
      autoHuntDesc.textContent = `${available} verified leads are immediately ready in ${regionName}. Outreach will proceed instantly without background scraper delay.`;
    }
  }
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
      updateAutoHuntEstimate();
    });
  });

  if (customLeadQty) {
    customLeadQty.addEventListener('input', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      updateAutoHuntEstimate();
    });
  }

  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      updateAutoHuntEstimate();
    });
  }

  if (campaignCategory) {
    campaignCategory.addEventListener('input', () => {
      updateAutoHuntEstimate();
    });
  }

  startCampaignBtn.addEventListener('click', async () => {
    startCampaignBtn.disabled = true;
    const qty = parseInt(customLeadQty.value, 10) || 10;
    const stateFilter = regionSelect.value === 'all' ? null : regionSelect.value;
    const isSandbox = sandboxToggle ? sandboxToggle.checked : false;
    const isHeaded = headedToggle ? headedToggle.checked : false;
    const workers = workerSlider ? parseInt(workerSlider.value, 10) : 8;
    const category = campaignCategory ? campaignCategory.value.trim() : 'Manufacturing';

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLeads: qty,
          numWorkers: workers,
          isSandbox,
          isHeaded,
          stateFilter,
          category,
          autoScrape: true
        })
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error && data.error.toLowerCase().includes('license')) {
          showAuthGate();
        }
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
  if (event.type === 'auth_revoked') {
    showAuthGate();
    if (authFeedback) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = event.reason || 'License suspended or revoked by administrator.';
      authFeedback.style.display = 'block';
    }
  } else if (event.type === 'auth_activated') {
    hideAuthGate();
    if (licenseStatusBadge) {
      licenseStatusBadge.style.display = 'inline-flex';
      if (licenseStatusText) {
        licenseStatusText.textContent = event.clientName || 'Licensed';
      }
    }
  } else if (event.type === 'initial_state') {
    applyCampaignState(event.state);
  } else if (event.type === 'campaign_started') {
    setCampaignRunningUI(true);
    addFeedItem('INIT', 'Campaign Started', 'Running', 'success');
  } else if (event.type === 'lead_result') {
    const isContacted = event.status === 'contacted';
    const icon = isContacted ? 'SENT' : 'FAIL';
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
    addFeedItem('DONE', 'Campaign Finished', 'Complete', 'success');
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

  const now = new Date();
  const timeStr = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join(':');

  const row = document.createElement('div');
  row.className = 'feed-row';
  row.innerHTML = `
    <span class="feed-time tabular">[${timeStr}]</span>
    <span class="badge-tag ${tagClass}">${icon}</span>
    <span class="feed-company">${company}</span>
    <span class="feed-tag ${tagClass}" style="margin-left: auto;">${tag}</span>
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

  // Dynamic Custom Quantity Toggle
  if (hunterLimit && hunterCustomQtyWrap) {
    hunterLimit.addEventListener('change', () => {
      if (hunterLimit.value === 'custom') {
        hunterCustomQtyWrap.style.display = 'flex';
        if (hunterCustomQty) hunterCustomQty.focus();
      } else {
        hunterCustomQtyWrap.style.display = 'none';
      }
    });
  }

  startHunterBtn.addEventListener('click', async () => {
    const query = hunterCategory.value.trim();
    if (!query) {
      alert('Please enter an industry or business category.');
      hunterCategory.focus();
      return;
    }

    const state = hunterState.value;
    const city = hunterCity.value.trim();
    
    let limit = 1000;
    if (hunterLimit && hunterLimit.value === 'custom') {
      limit = parseInt(hunterCustomQty?.value, 10) || 1000;
      if (limit < 1) limit = 1;
      if (limit > 100000) limit = 100000;
    } else if (hunterLimit) {
      limit = parseInt(hunterLimit.value, 10) || 1000;
    }

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
        if (data.error && data.error.toLowerCase().includes('license')) {
          showAuthGate();
        }
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

  // ------------------------------------------------------------------------
  // Bulk Website Importer Modal Handlers
  // ------------------------------------------------------------------------
  if (importWebsitesBtn && importWebsitesOverlay) {
    importWebsitesBtn.addEventListener('click', () => {
      importWebsitesOverlay.style.display = 'flex';
      if (importWebsitesTextarea) {
        setTimeout(() => importWebsitesTextarea.focus(), 50);
      }
    });
  }

  const closeImporter = () => {
    if (importWebsitesOverlay) importWebsitesOverlay.style.display = 'none';
    if (importFeedback) {
      importFeedback.style.display = 'none';
      importFeedback.className = 'import-feedback';
    }
  };

  if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', closeImporter);
  if (cancelImportBtn) cancelImportBtn.addEventListener('click', closeImporter);

  function clientParseWebsites(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    const sanitized = rawText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ');
    const tokenRegex = /(https?:\/\/[^\s,"'<>()]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s,"'<>()]*)?)/gi;
    const matches = sanitized.match(tokenRegex) || [];
    const seen = new Set();
    const results = [];
    const ignored = new Set(['google.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'github.com', 'example.com', 'wix.com', 'wordpress.org']);

    for (const m of matches) {
      let s = m.trim().replace(/^["'<(\[]+|["'>)\];,]+$/g, '');
      if (!s || s.includes('@')) continue;
      if (!s.startsWith('http://') && !s.startsWith('https://')) s = 'https://' + s;
      try {
        const u = new URL(s);
        let h = u.hostname.toLowerCase().replace(/^www\./, '');
        if (!h.includes('.') || ignored.has(h) || h === 'localhost') continue;
        const parts = h.split('.');
        if (parts[parts.length - 1].length < 2) continue;
        if (!seen.has(h)) {
          seen.add(h);
          let name = parts[0].replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
          name = name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          results.push({ cleanUrl: `https://${h}`, domain: h, companyName: name });
        }
      } catch (_) {}
    }
    return results;
  }

  function updateImporterPreview() {
    if (!importWebsitesTextarea) return;
    const raw = importWebsitesTextarea.value;
    const parsed = clientParseWebsites(raw);
    const count = parsed.length;

    if (importDetectedBadge) {
      importDetectedBadge.textContent = `${count} ${count === 1 ? 'website' : 'websites'} detected`;
    }

    if (count > 0) {
      if (importDetectedBadge) importDetectedBadge.classList.add('active');
      if (submitImportBtn) submitImportBtn.disabled = false;
      if (submitImportBtnText) submitImportBtnText.textContent = `Import ${count} ${count === 1 ? 'Website' : 'Websites'}`;

      if (importPreviewBox && importPreviewChips) {
        importPreviewBox.style.display = 'flex';
        importPreviewChips.innerHTML = '';
        parsed.slice(0, 4).forEach(item => {
          const chip = document.createElement('div');
          chip.className = 'import-chip';
          chip.innerHTML = `<span class="import-chip-name">${item.companyName}</span><span class="import-chip-domain">${item.domain}</span>`;
          importPreviewChips.appendChild(chip);
        });
        if (count > 4) {
          const moreChip = document.createElement('div');
          moreChip.className = 'import-chip';
          moreChip.innerHTML = `<span class="import-chip-domain">+${count - 4} more</span>`;
          importPreviewChips.appendChild(moreChip);
        }
      }
    } else {
      if (importDetectedBadge) importDetectedBadge.classList.remove('active');
      if (submitImportBtn) submitImportBtn.disabled = true;
      if (submitImportBtnText) submitImportBtnText.textContent = 'Import 0 Websites';
      if (importPreviewBox) importPreviewBox.style.display = 'none';
      if (importPreviewChips) importPreviewChips.innerHTML = '';
    }
  }

  if (importWebsitesTextarea) {
    importWebsitesTextarea.addEventListener('input', updateImporterPreview);
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (text && typeof text === 'string') {
        const existing = importWebsitesTextarea ? importWebsitesTextarea.value : '';
        if (importWebsitesTextarea) {
          importWebsitesTextarea.value = (existing ? existing + '\n' : '') + text.trim();
        }
        updateImporterPreview();
      }
    };
    reader.readAsText(file);
  }

  if (browseFileBtn && importFileInput) {
    browseFileBtn.addEventListener('click', () => importFileInput.click());
  }

  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      handleImportFile(file);
      importFileInput.value = '';
    });
  }

  if (importDropzone) {
    importDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importDropzone.classList.add('dragover');
    });
    importDropzone.addEventListener('dragleave', () => {
      importDropzone.classList.remove('dragover');
    });
    importDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      importDropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      handleImportFile(file);
    });
  }

  if (submitImportBtn) {
    submitImportBtn.addEventListener('click', async () => {
      const rawText = (importWebsitesTextarea?.value || '').trim();
      if (!rawText) return;

      submitImportBtn.disabled = true;
      if (submitImportBtnText) submitImportBtnText.textContent = 'Importing...';
      if (importFeedback) importFeedback.style.display = 'none';

      try {
        const res = await fetch('/api/leads/import-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to import websites.');
        }

        if (importFeedback) {
          importFeedback.className = 'import-feedback success';
          importFeedback.textContent = `✓ Successfully imported ${data.added} new ${data.added === 1 ? 'website' : 'websites'}! (${data.duplicatesSkipped} duplicates skipped)`;
          importFeedback.style.display = 'block';
        }

        // Refresh database stats and table
        await loadLeadsTable();
        await loadInitialSpecs();

        setTimeout(() => {
          closeImporter();
          if (importWebsitesTextarea) importWebsitesTextarea.value = '';
          updateImporterPreview();
          if (submitImportBtnText) submitImportBtnText.textContent = 'Import 0 Websites';
        }, 1800);

      } catch (err) {
        if (importFeedback) {
          importFeedback.className = 'import-feedback error';
          importFeedback.textContent = 'Error: ' + err.message;
          importFeedback.style.display = 'block';
        }
        submitImportBtn.disabled = false;
        updateImporterPreview();
      }
    });
  }
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
      <td style="font-weight: 500; color: var(--text-primary);">${lead.company_name}</td>
      <td><a href="${web}" target="_blank" rel="noopener noreferrer">${lead.website || '-'}</a></td>
      <td class="tabular">${lead.phone || '-'}</td>
      <td><span class="badge-tag ${statusClass}">${statusText}</span></td>
      <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-muted);">${lead.notes || '-'}</td>
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
  if (prevFirstName) prevFirstName.textContent = pFirstName.value || 'Pamela';
  if (prevLastName) prevLastName.textContent = pLastName.value || 'Jameson';
  if (prevJobTitle) prevJobTitle.textContent = pJobTitle.value || 'Purchase Director';
  if (prevCompany) prevCompany.textContent = pCompany.value || 'Northeast Precision Machinery, Inc.';
  if (prevEmail) prevEmail.textContent = pEmail.value || 'pamela.jameson@nortiheastprecision.com';
  if (prevPhone) prevPhone.textContent = pPhone.value || '(708) 568-3708';

  const fullAddr = [pAddress.value, pSuite.value, pCity.value, pState.value, pZip.value].filter(Boolean).join(', ');
  if (prevAddress) prevAddress.textContent = fullAddr || '1908 Mount Vernon Ave, Alexandria, VA 22301';

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
  let latestDetectedCommit = '';

  // Populate active version and commit on load
  fetch('/api/system/version')
    .then(r => r.json())
    .then(data => {
      if (versionTitle && data.version) versionTitle.textContent = `Lead Machine v${data.version}`;
      if (updateStatusPill && data.version) updateStatusPill.textContent = `v${data.version}`;
      if (updateCommitLabel && (data.commit || data.latestCommit)) {
        updateCommitLabel.textContent = `Build: ${data.commit || data.latestCommit}`;
      }
    })
    .catch(() => {});

  if (workerSlider) {
    workerSlider.addEventListener('input', () => {
      workerSliderVal.textContent = `${workerSlider.value} Workers`;
    });
  }

  const ICON_REFRESH = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
  const ICON_SPIN = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
  const ICON_DOWNLOAD = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const ICON_WRENCH = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      checkUpdateBtn.disabled = true;
      checkUpdateBtn.innerHTML = `${ICON_SPIN}<span>Checking...</span>`;
      if (installUpdateBtn) installUpdateBtn.style.display = 'none';
      updateFeedback.style.display = 'block';
      updateFeedback.className = 'feedback-banner';
      updateFeedback.textContent = 'Contacting GitHub release server...';

      try {
        const res = await fetch('/api/system/version');
        const data = await res.json();
        latestDetectedCommit = data.latestCommit || '';

        if (versionTitle && data.version) {
          versionTitle.textContent = `Lead Machine v${data.version}`;
        }
        if (updateCommitLabel && (data.commit || data.latestCommit)) {
          updateCommitLabel.textContent = `Build: ${data.commit || data.latestCommit}`;
        }
        if (updateLastChecked) {
          const now = new Date();
          updateLastChecked.textContent = `Checked: ${now.toLocaleTimeString()}`;
        }

        if (data.offline) {
          updateFeedback.textContent = `Offline Mode: Operating with local build (v${data.version} · ${data.commit || 'current'}). No internet connection detected.`;
          if (updateStatusPill) updateStatusPill.textContent = `v${data.version} · Offline`;
        } else if (data.updateAvailable) {
          if (updateStatusPill) updateStatusPill.textContent = 'Update Available';
          updateFeedback.innerHTML = `<strong>Update Available:</strong> Remote master build <code>${data.latestCommit}</code> is ready (${data.commitMessage}).`;
          if (installUpdateBtn) {
            installUpdateBtn.style.display = 'inline-flex';
            installUpdateBtn.innerHTML = `${ICON_DOWNLOAD}<span>Install Latest Release (${data.latestCommit})</span>`;
          }
          checkForSystemUpdates(true);
        } else {
          if (updateStatusPill) updateStatusPill.textContent = `v${data.version} · Latest`;
          updateFeedback.innerHTML = `✓ System is running the latest enterprise build (<strong>v${data.version} · ${data.commit || data.latestCommit}</strong>). Verified with GitHub master.`;
        }
      } catch (err) {
        updateFeedback.textContent = 'Could not reach update server. Operating in offline enterprise mode.';
      } finally {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.innerHTML = `${ICON_REFRESH}<span>Check for Updates</span>`;
      }
    });
  }

  if (installUpdateBtn) {
    installUpdateBtn.addEventListener('click', async () => {
      installUpdateBtn.disabled = true;
      if (checkUpdateBtn) checkUpdateBtn.disabled = true;
      if (forceSyncBtn) forceSyncBtn.disabled = true;
      installUpdateBtn.innerHTML = `${ICON_SPIN}<span>Installing Latest...</span>`;
      updateFeedback.style.display = 'block';
      updateFeedback.className = 'feedback-banner';
      updateFeedback.textContent = 'Updating directly to latest master release from GitHub...';

      try {
        const res = await fetch('/api/system/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceLatest: true })
        });
        const data = await res.json();
        if (data.success) {
          updateFeedback.innerHTML = `✓ <strong>Update complete!</strong> ${data.message} Reloading cockpit in 2 seconds...`;
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          updateFeedback.innerHTML = `✗ Update failed: ${data.error || 'Unknown error'}`;
          installUpdateBtn.disabled = false;
          installUpdateBtn.innerHTML = `${ICON_DOWNLOAD}<span>Install Latest Release (${latestDetectedCommit || 'master'})</span>`;
          if (checkUpdateBtn) checkUpdateBtn.disabled = false;
          if (forceSyncBtn) forceSyncBtn.disabled = false;
        }
      } catch (err) {
        updateFeedback.innerHTML = `✗ Update failed: ${err.message}`;
        installUpdateBtn.disabled = false;
        installUpdateBtn.innerHTML = `${ICON_DOWNLOAD}<span>Install Latest Release (${latestDetectedCommit || 'master'})</span>`;
        if (checkUpdateBtn) checkUpdateBtn.disabled = false;
        if (forceSyncBtn) forceSyncBtn.disabled = false;
      }
    });
  }

  if (forceSyncBtn) {
    forceSyncBtn.addEventListener('click', async () => {
      forceSyncBtn.disabled = true;
      forceSyncBtn.innerHTML = `${ICON_SPIN}<span>Repairing...</span>`;
      updateFeedback.style.display = 'block';
      updateFeedback.className = 'feedback-banner';
      updateFeedback.textContent = 'Re-downloading and repairing core engine files from GitHub master...';

      try {
        const res = await fetch('/api/system/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true, forceLatest: true })
        });
        const data = await res.json();
        if (data.success) {
          updateFeedback.innerHTML = `✓ <strong>Repair complete!</strong> ${data.message} Reloading in 2 seconds...`;
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          updateFeedback.textContent = `Repair failed: ${data.error || 'Server error'}`;
        }
      } catch (err) {
        updateFeedback.textContent = 'Repair failed. Server unreachable.';
      } finally {
        forceSyncBtn.disabled = false;
        forceSyncBtn.innerHTML = `${ICON_WRENCH}<span>Repair / Re-sync</span>`;
      }
    });
  }
}

/* ==========================================================================
   Force Update Controller & Persistent Reminder System
   ========================================================================== */
function setupForceUpdateHandlers() {
  if (forceUpdateCloseX) {
    forceUpdateCloseX.addEventListener('click', () => {
      dismissUpdateModal();
    });
  }

  if (forceUpdateLaterBtn) {
    forceUpdateLaterBtn.addEventListener('click', () => {
      dismissUpdateModal();
    });
  }

  if (forceUpdateNowBtn) {
    forceUpdateNowBtn.addEventListener('click', () => {
      executeSystemUpdate();
    });
  }

  if (dockUpdateBtn) {
    dockUpdateBtn.addEventListener('click', () => {
      showUpdateModal();
      executeSystemUpdate();
    });
  }

  if (dockOpenModalBtn) {
    dockOpenModalBtn.addEventListener('click', () => {
      showUpdateModal();
    });
  }

  // Check for updates on startup
  checkForSystemUpdates(false);

  // Background interval check every 10 minutes
  if (updateIntervalId) clearInterval(updateIntervalId);
  updateIntervalId = setInterval(() => {
    checkForSystemUpdates(false);
  }, 10 * 60 * 1000);
}

function showUpdateModal() {
  isUpdateModalDismissed = false;
  if (forceUpdateOverlay) {
    forceUpdateOverlay.style.display = 'flex';
  }
  if (updateReminderDock) {
    updateReminderDock.style.display = 'none';
  }
}

function dismissUpdateModal() {
  console.log('[Update] dismissUpdateModal triggered');
  isUpdateModalDismissed = true;
  if (forceUpdateOverlay) {
    forceUpdateOverlay.style.display = 'none';
  }
  if (updateReminderDock && latestUpdateData && latestUpdateData.updateAvailable) {
    updateReminderDock.style.display = 'block';
  }

  // Snooze timer: automatically prompt again in 5 minutes
  clearTimeout(updateSnoozeTimer);
  updateSnoozeTimer = setTimeout(() => {
    if (latestUpdateData && latestUpdateData.updateAvailable) {
      isUpdateModalDismissed = false;
      showUpdateModal();
    }
  }, 5 * 60 * 1000);
}

async function checkForSystemUpdates(isManual = false) {
  try {
    const res = await fetch('/api/system/version?_t=' + Date.now());
    if (!res.ok) return;
    const data = await res.json();
    latestUpdateData = data;

    if (versionTitle && data.version) versionTitle.textContent = `Lead Machine v${data.version}`;
    if (updateStatusPill && data.version) {
      updateStatusPill.textContent = data.updateAvailable ? 'Update Available' : `v${data.version}`;
    }
    if (updateCommitLabel && (data.commit || data.latestCommit)) {
      updateCommitLabel.textContent = `Build: ${data.commit || data.latestCommit}`;
    }

    if (data.updateAvailable) {
      if (forceUpdateCurrentVer) {
        forceUpdateCurrentVer.textContent = `v${data.version} (${data.commit ? data.commit.slice(0, 7) : 'current'})`;
      }
      if (forceUpdateLatestVer) {
        forceUpdateLatestVer.textContent = `v${data.latestVersion || data.version} (${data.latestCommit ? data.latestCommit.slice(0, 7) : 'latest'})`;
      }
      if (forceUpdateNotes) {
        forceUpdateNotes.textContent = data.commitMessage || 'Official enterprise build verified with GitHub master.';
      }
      if (dockVerLabel) {
        dockVerLabel.textContent = data.latestCommit ? `Build ${data.latestCommit.slice(0, 7)}` : `v${data.latestVersion || data.version}`;
      }

      if (!isUpdateModalDismissed || isManual) {
        showUpdateModal();
      } else {
        if (updateReminderDock) updateReminderDock.style.display = 'block';
      }
    } else {
      if (forceUpdateOverlay) forceUpdateOverlay.style.display = 'none';
      if (updateReminderDock) updateReminderDock.style.display = 'none';
    }
  } catch (_) {}
}

async function executeSystemUpdate() {
  const iconSpin = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
  
  if (forceUpdateNowBtn) {
    forceUpdateNowBtn.disabled = true;
    forceUpdateNowBtn.innerHTML = `${iconSpin}<span>Installing Update...</span>`;
  }
  if (forceUpdateLaterBtn) forceUpdateLaterBtn.style.display = 'none';
  if (forceUpdateCloseX) forceUpdateCloseX.style.display = 'none';
  if (forceUpdateProgressWrap) forceUpdateProgressWrap.style.display = 'flex';
  if (forceUpdateFeedback) forceUpdateFeedback.style.display = 'none';

  if (forceUpdateProgressStatus) {
    forceUpdateProgressStatus.textContent = 'Contacting GitHub release server...';
  }

  try {
    setTimeout(() => {
      if (forceUpdateProgressStatus) {
        forceUpdateProgressStatus.textContent = 'Downloading latest enterprise runtime assets...';
      }
    }, 700);

    const res = await fetch('/api/system/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceLatest: true })
    });

    const data = await res.json();
    if (data.success) {
      if (forceUpdateProgressStatus) {
        forceUpdateProgressStatus.textContent = 'Verifying checksums & reloading server...';
      }
      if (forceUpdateFeedback) {
        forceUpdateFeedback.className = 'auth-feedback success';
        forceUpdateFeedback.style.display = 'block';
        forceUpdateFeedback.textContent = `✓ Update complete! ${data.message || 'Cockpit will reload in 2 seconds.'}`;
      }
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      throw new Error(data.error || 'Update failed');
    }
  } catch (err) {
    if (forceUpdateProgressWrap) forceUpdateProgressWrap.style.display = 'none';
    if (forceUpdateNowBtn) {
      forceUpdateNowBtn.disabled = false;
      forceUpdateNowBtn.innerHTML = `<span>Retry Update</span>`;
    }
    if (forceUpdateLaterBtn) forceUpdateLaterBtn.style.display = 'block';
    if (forceUpdateCloseX) forceUpdateCloseX.style.display = 'flex';
    if (forceUpdateFeedback) {
      forceUpdateFeedback.className = 'auth-feedback error';
      forceUpdateFeedback.style.display = 'block';
      forceUpdateFeedback.textContent = `Update failed: ${err.message}`;
    }
  }
}
