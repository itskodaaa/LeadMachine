import http from 'http';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body || '{}') });
        } catch (_) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runApiTest() {
  console.log('=== Step 1: Checking Lead Machine Server API Status ===');
  const statusRes = await request({
    hostname: 'localhost',
    port: 3333,
    path: '/api/status',
    method: 'GET'
  });
  console.log('Server status response:', statusRes.statusCode, statusRes.data);

  if (statusRes.statusCode !== 200) {
    throw new Error('Server not responding with 200 on /api/status');
  }

  console.log('\n=== Step 2: Listening to SSE Stream for Live Telemetry ===');
  const sseEvents = [];
  const sseReq = http.request({
    hostname: 'localhost',
    port: 3333,
    path: '/events',
    method: 'GET',
    headers: { 'Accept': 'text/event-stream' }
  }, (res) => {
    res.on('data', chunk => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.substring(6));
            sseEvents.push(event);
            if (event.type === 'lead_result') {
              console.log(`[API SSE] 🎯 Received lead_result: #${event.leadId} ${event.company} -> ${event.status} (${event.result})`);
            } else if (event.type === 'campaign_started' || event.type === 'campaign_stopped') {
              console.log(`[API SSE] 📢 ${event.type}`);
            }
          } catch (_) {}
        }
      }
    });
  });
  sseReq.end();

  // Wait 1s for SSE to establish
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n=== Step 3: Triggering Sandbox Campaign via API POST /api/start ===');
  const startRes = await request({
    hostname: 'localhost',
    port: 3333,
    path: '/api/start',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    target: 2,
    workers: 1,
    isSandbox: true
  });
  console.log('Start campaign response:', startRes.statusCode, startRes.data);

  // Poll until processed >= 2 or 40s timeout
  console.log('\n=== Step 4: Monitoring Campaign Progress via API ===');
  const startTime = Date.now();
  while (Date.now() - startTime < 45000) {
    await new Promise(r => setTimeout(r, 3000));
    const curStatus = await request({
      hostname: 'localhost',
      port: 3333,
      path: '/api/status',
      method: 'GET'
    });
    console.log(`Progress: ${curStatus.data.processedTotal}/${curStatus.data.targetTotal} (State: ${curStatus.data.state})`);
    if (curStatus.data.processedTotal >= 2 || curStatus.data.state === 'completed' || curStatus.data.state === 'stopped') {
      console.log('🎉 Target reached or campaign completed via API!');
      break;
    }
  }

  console.log('\n=== Step 5: Stopping Campaign via API POST /api/stop ===');
  await request({
    hostname: 'localhost',
    port: 3333,
    path: '/api/stop',
    method: 'POST'
  });

  sseReq.destroy();
  console.log('API Test successfully finished. Total SSE events received:', sseEvents.length);
  process.exit(0);
}

runApiTest().catch(err => {
  console.error('API Test Failed:', err);
  process.exit(1);
});
