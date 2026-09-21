import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSystemHardwareId, getAuthStatus, verifyRemoteKey, activateLicense, hashKey } from './auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, 'config.json');

console.log('🧪 RUNNING HARDWARE NODE-LOCKING TEST SUITE...');

// 1. Hardware ID Extraction
const hwId = getSystemHardwareId();
console.log('  1/5 Hardware ID generated:', hwId);
assert(typeof hwId === 'string' && hwId.startsWith('HW-'), 'Hardware ID must start with HW-');
assert(hwId.length === 35, 'Hardware ID must be 35 characters long');

// Backup existing config
const originalConfig = fs.readFileSync(configPath, 'utf8');

try {
  // 2. Active license with MATCHING hardware ID
  const testCfg = JSON.parse(originalConfig);
  testCfg.license = {
    key: 'LM-TEST-MATCHING-1',
    active: true,
    clientName: 'Test Machine Client',
    keyMask: 'LM-****-****-ING1',
    tier: 'Enterprise',
    lastVerified: new Date().toISOString(),
    boundHardwareId: hwId,
    created: '2026-09-19',
    expires: '2026-11-18'
  };
  fs.writeFileSync(configPath, JSON.stringify(testCfg, null, 2), 'utf8');

  const matchStatus = getAuthStatus();
  console.log('  2/5 Matching Hardware ID status:', matchStatus.status);
  assert(matchStatus.authenticated === true, 'Matching hardware ID must authenticate successfully');
  assert(matchStatus.status === 'active', 'Matching hardware ID status must be active');

  // 3. License with MISMATCHED hardware ID (another machine)
  testCfg.license.boundHardwareId = 'HW-ANOTHER-MACHINE-9999999999999999';
  fs.writeFileSync(configPath, JSON.stringify(testCfg, null, 2), 'utf8');

  const mismatchStatus = getAuthStatus();
  console.log('  3/5 Mismatched Hardware ID status:', mismatchStatus.status, `("${mismatchStatus.error}")`);
  assert(mismatchStatus.authenticated === false, 'Mismatched hardware ID must fail authentication');
  assert(mismatchStatus.status === 'hardware_mismatch', 'Mismatched status must be hardware_mismatch');
  assert(mismatchStatus.error.includes('License Key locked to another computer'), 'Error message must specify single-device restriction');

  // 4. Testing Local Vault Binding
  const dummyKey = 'LM-UNITTEST-NODE123';
  const dummyHash = hashKey(dummyKey);
  const localVaultDir = path.resolve(__dirname, '..', 'licenses');
  fs.mkdirSync(localVaultDir, { recursive: true });
  const dummyVaultFile = path.join(localVaultDir, `${dummyHash}.json`);

  // Create unbound dummy license in local vault
  fs.writeFileSync(dummyVaultFile, JSON.stringify({
    name: 'Unit Test Client',
    tier: 'Enterprise',
    active: true,
    created: '2026-09-21',
    boundHardwareId: null
  }, null, 2), 'utf8');

  const unboundRes = await verifyRemoteKey(dummyKey);
  console.log('  4/5 Unbound license verification:', unboundRes.valid ? 'Valid (Allowed)' : 'Failed');
  assert(unboundRes.valid === true, 'Unbound license must verify as valid on first system');

  // Activate license (should bind hardware ID)
  const actRes = await activateLicense(dummyKey);
  assert(actRes.success === true, 'Activation must succeed');
  assert(actRes.boundHardwareId === hwId, 'Activation must bind to current machine hardware ID');

  // Re-read local vault file to ensure it got bound
  const boundVaultData = JSON.parse(fs.readFileSync(dummyVaultFile, 'utf8'));
  assert(boundVaultData.boundHardwareId === hwId, 'Vault file must have boundHardwareId set');

  // 5. Simulate another computer trying to use this bound key
  boundVaultData.boundHardwareId = 'HW-DIFFERENT-COMPUTER-00000000000';
  fs.writeFileSync(dummyVaultFile, JSON.stringify(boundVaultData, null, 2), 'utf8');

  const foreignRes = await verifyRemoteKey(dummyKey);
  console.log('  5/5 Foreign machine attempt verification:', foreignRes.valid ? 'Allowed (Bug)' : `Blocked: "${foreignRes.error}"`);
  assert(foreignRes.valid === false, 'Key bound to a foreign computer must be rejected');
  assert(foreignRes.error.includes('already bound to another computer'), 'Must reject with single-device error');

  // Cleanup dummy vault file
  if (fs.existsSync(dummyVaultFile)) fs.unlinkSync(dummyVaultFile);

  console.log('✅ ALL HARDWARE NODE-LOCKING TESTS PASSED PERFECTLY!\n');
} finally {
  // Restore original config
  fs.writeFileSync(configPath, originalConfig, 'utf8');
}
