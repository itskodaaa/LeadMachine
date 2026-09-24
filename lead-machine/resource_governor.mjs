import os from 'os';
import EventEmitter from 'events';

/**
 * Autonomous System Resource Governor
 * Continuously monitors physical RAM, CPU load, and system contention.
 * Dynamically computes safe browser worker capacity on the fly to guarantee
 * that low-RAM (4GB) and multi-user machines remain completely responsive.
 */
export class SystemResourceGovernor extends EventEmitter {
  constructor() {
    super();
    this.RAM_PER_WORKER_MB = 260; // Average Chromium headless footprint
    this.lastEvaluation = null;
    this.history = [];
  }

  /**
   * Samples current system telemetry in megabytes.
   */
  getSnapshot() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const totalMb = Math.round(totalBytes / (1024 * 1024));
    const freeMb = Math.round(freeBytes / (1024 * 1024));
    const usedMb = totalMb - freeMb;
    const usagePct = Math.round((usedMb / totalMb) * 100);

    const cpus = os.cpus() || [];
    const cpuCount = Math.max(1, cpus.length);
    const load1m = os.loadavg()[0] || 0;
    const loadPerCore = Number((load1m / cpuCount).toFixed(2));

    // Dynamic safety buffer: reserved exclusively for the OS, other user profiles, and desktop apps
    let safetyBufferMb = 1200;
    let criticalFloorMb = 600;

    if (totalMb <= 4500) {
      // 4GB machines: prioritize keeping 750MB free for Windows/macOS + apps
      safetyBufferMb = 750;
      criticalFloorMb = 380;
    } else if (totalMb <= 8500) {
      // 8GB machines: reserve 1.2GB
      safetyBufferMb = 1200;
      criticalFloorMb = 600;
    } else {
      // 16GB+ machines: reserve 1.8GB
      safetyBufferMb = 1800;
      criticalFloorMb = 900;
    }

    const availableForWorkersMb = Math.max(0, freeMb - safetyBufferMb);

    return {
      totalMb,
      freeMb,
      usedMb,
      usagePct,
      cpuCount,
      load1m,
      loadPerCore,
      safetyBufferMb,
      criticalFloorMb,
      availableForWorkersMb,
      timestamp: Date.now()
    };
  }

  /**
   * Computes the optimal number of browser workers that can safely run right now.
   * @param {number} maxConfiguredWorkers - Ceiling requested by user or tier limits
   * @returns {object} Evaluation result with targetWorkers, pressureLevel, and reason
   */
  evaluateConcurrency(maxConfiguredWorkers = 6) {
    const snap = this.getSnapshot();
    const maxAllowed = Math.max(1, Math.min(16, maxConfiguredWorkers));

    let targetWorkers = 1;
    let pressureLevel = 'optimal'; // 'optimal' | 'moderate' | 'high' | 'critical'
    let reason = 'Optimal system resources available.';

    if (snap.freeMb < snap.criticalFloorMb) {
      targetWorkers = 1;
      pressureLevel = 'critical';
      reason = `Critical RAM constraint (${snap.freeMb}MB free): throttled to 1 browser to avoid system freeze.`;
    } else if (snap.availableForWorkersMb <= 0) {
      targetWorkers = 1;
      pressureLevel = 'high';
      reason = `System RAM tightly allocated (${snap.freeMb}MB free): holding 1 browser to preserve desktop responsiveness.`;
    } else {
      // Calculate how many ~260MB workers can fit in available headroom
      let calculatedSlots = Math.max(1, Math.floor(snap.availableForWorkersMb / this.RAM_PER_WORKER_MB));

      // If CPU is heavily saturated by other user tasks, step down concurrency by 1
      if (snap.loadPerCore > 0.85 && calculatedSlots > 1) {
        calculatedSlots = Math.max(1, calculatedSlots - 1);
        pressureLevel = 'moderate';
        reason = `CPU load elevated (${Math.round(snap.loadPerCore * 100)}%): scaled to ${calculatedSlots} browsers.`;
      } else if (calculatedSlots < maxAllowed) {
        pressureLevel = 'moderate';
        reason = `Adaptive RAM protection: running ${calculatedSlots} browsers to preserve ${snap.safetyBufferMb}MB system buffer.`;
      } else {
        pressureLevel = 'optimal';
        reason = `Optimal system resources (${snap.freeMb}MB free): operating at requested capacity (${maxAllowed} browsers).`;
      }

      targetWorkers = Math.max(1, Math.min(maxAllowed, calculatedSlots));
    }

    const evaluation = {
      targetWorkers,
      maxConfiguredWorkers: maxAllowed,
      pressureLevel,
      reason,
      freeMb: snap.freeMb,
      totalMb: snap.totalMb,
      usagePct: snap.usagePct,
      loadPerCore: snap.loadPerCore,
      safetyBufferMb: snap.safetyBufferMb,
      timestamp: snap.timestamp
    };

    if (!this.lastEvaluation || this.lastEvaluation.targetWorkers !== targetWorkers || this.lastEvaluation.pressureLevel !== pressureLevel) {
      this.emit('concurrency_change', evaluation);
    }

    this.lastEvaluation = evaluation;
    return evaluation;
  }
}

// Export singleton instance
export const resourceGovernor = new SystemResourceGovernor();
