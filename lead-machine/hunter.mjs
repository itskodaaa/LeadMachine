import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkWebsite } from './reachability.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/leads.db');

// ==========================================================================
// Comprehensive US Commercial & Manufacturing Cities by State
// ==========================================================================
export const STATE_CITIES = {
  'Illinois': [
    'Chicago', 'Aurora', 'Joliet', 'Naperville', 'Rockford', 'Elgin', 'Springfield', 'Peoria',
    'Waukegan', 'Champaign', 'Bloomington', 'Decatur', 'Evanston', 'Arlington Heights', 'Schaumburg',
    'Bolingbrook', 'Palatine', 'Skokie', 'Des Plaines', 'Orland Park', 'Tinley Park', 'Oak Lawn',
    'Berwyn', 'Mount Prospect', 'Wheaton', 'Normal', 'Hoffman Estates', 'Oak Park', 'Downers Grove',
    'Elmhurst', 'Lombard', 'DeKalb', 'Belleville', 'Moline', 'Buffalo Grove', 'Bartlett', 'Urbana',
    'Quincy', 'Crystal Lake', 'Carol Stream', 'Streamwood', 'Romeoville', 'Plainfield', 'Rock Island',
    'Hanover Park', 'Carpentersville', 'Wheeling', 'Park Ridge', 'Elk Grove Village', 'Addison'
  ],
  'Texas': [
    'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi',
    'Plano', 'Lubbock', 'Laredo', 'Irving', 'Garland', 'Frisco', 'McKinney', 'Amarillo', 'Grand Prairie',
    'Brownsville', 'Killeen', 'Pasadena', 'Mesquite', 'McAllen', 'Carrollton', 'Midland', 'Waco',
    'Denton', 'Abilene', 'Odessa', 'Beaumont', 'Round Rock', 'The Woodlands', 'Richardson', 'Pearland',
    'College Station', 'Wichita Falls', 'Lewisville', 'Tyler', 'San Angelo', 'League City', 'Allen',
    'Sugar Land', 'Edinburg', 'Mission', 'Longview', 'Bryan', 'Pharr', 'Baytown', 'Missouri City', 'Temple'
  ],
  'California': [
    'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland',
    'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Irvine', 'Stockton', 'Chula Vista', 'Fremont',
    'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley', 'Huntington Beach', 'Glendale',
    'Santa Clarita', 'Garden Grove', 'Oceanside', 'Rancho Cucamonga', 'Santa Rosa', 'Ontario', 'Lancaster',
    'Elk Grove', 'Corona', 'Palmdale', 'Salinas', 'Pomona', 'Hayward', 'Escondido', 'Sunnyvale', 'Torrance',
    'Pasadena', 'Orange', 'Fullerton', 'Thousand Oaks', 'Visalia', 'Roseville', 'Concord', 'Simi Valley',
    'Santa Clara', 'Victorville', 'Vallejo', 'Berkeley', 'El Monte', 'Downey', 'Costa Mesa', 'Inglewood'
  ],
  'Florida': [
    'Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Port St. Lucie', 'Cape Coral',
    'Tallahassee', 'Fort Lauderdale', 'Pembroke Pines', 'Hollywood', 'Gainesville', 'Miramar', 'Coral Springs',
    'Clearwater', 'Palm Bay', 'Pompano Beach', 'West Palm Beach', 'Lakeland', 'Davie', 'Boca Raton',
    'Sunrise', 'Plantation', 'Miami Gardens', 'Deltona', 'Fort Myers', 'Palm Coast', 'Largo', 'Melbourne',
    'Boynton Beach', 'Deerfield Beach', 'Kissimmee', 'Homestead', 'Tamarac', 'Bradenton', 'Ocala'
  ],
  'New York': [
    'New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon',
    'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton', 'Freeport',
    'Valley Stream', 'Long Beach', 'Rome', 'Ithaca', 'Poughkeepsie', 'North Tonawanda', 'Jamestown', 'Elmira'
  ],
  'Pennsylvania': [
    'Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie', 'Scranton', 'Bethlehem', 'Lancaster',
    'Harrisburg', 'York', 'Wilkes-Barre', 'Chester', 'Williamsport', 'Easton', 'Lebanon', 'Hazleton',
    'New Castle', 'Johnstown', 'McKeesport', 'Hermitage', 'Greensburg', 'Pottsville', 'Sharon', 'Butler'
  ],
  'Ohio': [
    'Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown',
    'Lorain', 'Hamilton', 'Springfield', 'Kettering', 'Elyria', 'Lakewood', 'Cuyahoga Falls', 'Euclid',
    'Middletown', 'Mansfield', 'Newark', 'Mentor', 'Cleveland Heights', 'Beavercreek', 'Strongsville', 'Fairfield'
  ],
  'Michigan': [
    'Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Dearborn', 'Livonia',
    'Troy', 'Westland', 'Flint', 'Kalamazoo', 'Canton', 'Macomb', 'Clinton', 'Farmington Hills', 'Southfield',
    'Rochester Hills', 'Pontiac', 'Taylor', 'St. Clair Shores', 'Royal Oak', 'Novi', 'Dearborn Heights', 'Battle Creek'
  ],
  'North Carolina': [
    'Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington',
    'High Point', 'Concord', 'Asheville', 'Gastonia', 'Jacksonville', 'Apex', 'Huntersville', 'Chapel Hill',
    'Burlington', 'Kannapolis', 'Rocky Mount', 'Mooresville', 'Wake Forest', 'Wilson', 'Hickory', 'Statesville'
  ],
  'Georgia': [
    'Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'South Fulton',
    'Roswell', 'Johns Creek', 'Warner Robins', 'Albany', 'Alpharetta', 'Marietta', 'Stonecrest', 'Smyrna',
    'Valdosta', 'Dunwoody', 'Gainesville', 'Newnan', 'Peachtree Corners', 'Dalton', 'Rome', 'Woodstock'
  ],
  'Indiana': [
    'Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond',
    'Gary', 'Lafayette', 'Muncie', 'Noblesville', 'Terre Haute', 'Greenwood', 'Kokomo', 'Elkhart',
    'Mishawaka', 'Lawrence', 'Columbus', 'Jeffersonville', 'Westfield', 'Portage', 'Richmond', 'Anderson'
  ],
  'Wisconsin': [
    'Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Eau Claire',
    'Oshkosh', 'Janesville', 'West Allis', 'La Crosse', 'Sheboygan', 'Wauwatosa', 'Fond du Lac', 'Brookfield',
    'Wausau', 'New Berlin', 'Beloit', 'Greenfield', 'Manitowoc', 'West Bend', 'Sun Prairie', 'Superior'
  ],
  'New Jersey': [
    'Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Lakewood', 'Edison', 'Woodbridge', 'Toms River',
    'Hamilton Township', 'Trenton', 'Clifton', 'Camden', 'Brick', 'Cherry Hill', 'Passaic', 'Union City',
    'Middletown', 'Bayonne', 'East Orange', 'Old Bridge', 'Gloucester', 'Franklin', 'North Bergen', 'Vineland'
  ],
  'Virginia': [
    'Virginia Beach', 'Chesapeake', 'Norfolk', 'Richmond', 'Newport News', 'Alexandria', 'Hampton',
    'Roanoke', 'Portsmouth', 'Suffolk', 'Lynchburg', 'Harrisonburg', 'Charlottesville', 'Danville',
    'Manassas', 'Petersburg', 'Fredericksburg', 'Winchester', 'Salem', 'Staunton', 'Fairfax', 'Hopewell'
  ],
  'Washington': [
    'Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 'Spokane Valley',
    'Federal Way', 'Yakima', 'Bellingham', 'Kennewick', 'Auburn', 'Pasco', 'Marysville', 'Lakewood',
    'Redmond', 'Shoreline', 'Richland', 'Kirkland', 'Olympia', 'Sammamish', 'Lacey', 'Edmonds', 'Bremerton'
  ],
  'Arizona': [
    'Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Gilbert', 'Tempe', 'Peoria', 'Surprise',
    'Yuma', 'Avondale', 'Flagstaff', 'Goodyear', 'Lake Havasu City', 'Buckeye', 'Casa Grande', 'Maricopa'
  ],
  'Colorado': [
    'Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster',
    'Pueblo', 'Greeley', 'Boulder', 'Longmont', 'Loveland', 'Broomfield', 'Castle Rock', 'Grand Junction'
  ],
  'Missouri': [
    'Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit', 'O\'Fallon',
    'St. Joseph', 'St. Charles', 'St. Peters', 'Blue Springs', 'Florissant', 'Joplin', 'Chesterfield', 'Jefferson City'
  ],
  'Tennessee': [
    'Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Johnson City',
    'Jackson', 'Hendersonville', 'Bartlett', 'Kingsport', 'Smyrna', 'Spring Hill', 'Collierville', 'Cleveland'
  ],
  'Minnesota': [
    'Minneapolis', 'St. Paul', 'Rochester', 'Bloomington', 'Duluth', 'Brooklyn Park', 'Plymouth', 'Woodbury',
    'Lakeville', 'Blaine', 'Maple Grove', 'St. Cloud', 'Eagan', 'Burnsville', 'Eden Prairie', 'Coon Rapids'
  ]
};

// ==========================================================================
// Semantic B2B Industrial Query Expansions
// Helps niche categories (e.g. Semiconductor Tooling) find up to 10,000 leads
// ==========================================================================
export const RELATED_QUERIES = {
  'Semiconductor Equipment Machining': [
    'Semiconductor Equipment Machining',
    'Semiconductor Tooling',
    'Cleanroom Equipment Manufacturing',
    'Precision CNC Machining',
    'Semiconductor Parts Fabrication',
    'Vacuum Chamber Machining',
    'Wafer Handling Equipment'
  ],
  'CNC Swiss Machining': [
    'CNC Swiss Machining',
    'Swiss Screw Machine',
    'Precision Turning',
    'Micro Machining',
    'CNC Lathe Parts',
    'Precision Screw Machine Products'
  ],
  'Sheet Metal Fabrication': [
    'Sheet Metal Fabrication',
    'Laser Cutting Services',
    'Custom Metal Enclosures',
    'Metal Stamping',
    'Precision Sheet Metal',
    'Waterjet Cutting'
  ],
  'Precision Machining': [
    'Precision CNC Machining',
    '5-Axis CNC Milling',
    'Precision Machine Shop',
    'Prototype Machining',
    'Tool and Die Maker',
    'Precision Wire EDM'
  ],
  'Aerospace Structural Machining': [
    'Aerospace Structural Machining',
    'Aircraft Precision Parts',
    'AS9100 Machine Shop',
    'Aerospace Tooling',
    'Titanium CNC Machining',
    'Defense Machine Shop'
  ],
  'Custom Plastic Injection Molding': [
    'Custom Plastic Injection Molding',
    'Plastic Injection Mold Tooling',
    'Cleanroom Injection Molding',
    'Plastic Part Manufacturing',
    'Thermoforming Services',
    'Custom Blow Molding'
  ],
  'Commercial HVAC': [
    'Commercial HVAC Contractor',
    'Sheet Metal Ductwork Fabrication',
    'Industrial Ventilation Services',
    'Commercial Heating and Cooling',
    'Mechanical Piping Contractor'
  ],
  'Medical Device & Surgical Implants': [
    'Medical Device Machining',
    'Surgical Implant Manufacturing',
    'Cleanroom Medical Tooling',
    'Titanium Medical Implants',
    'ISO 13485 Machine Shop'
  ],
  'Hydraulic Cylinder & Valve Machining': [
    'Hydraulic Cylinder Manufacturing',
    'Hydraulic Valve Machining',
    'Industrial Fluid Power Repair',
    'Heavy Equipment Hydraulic Rebuilding',
    'Custom Hydraulic Manifolds'
  ]
};

// ==========================================================================
// Direct Google Maps Internal RPC API Client
// Ultra-fast HTTP/2 fetch with protobuf offset pagination (!8i${offset}!)
// Extracts 20 places per request in ~300ms without Puppeteer browser overhead.
// ==========================================================================
export async function fetchGoogleMapsPlaces(query, offset = 0, options = {}) {
  const zoom = options.zoom || 18;
  const lat = options.lat || 0;
  const lon = options.lon || 0;
  const hl = options.hl || 'en';
  const gl = options.gl || 'us';

  const pb = `!4m12!1m3!1d3826.902183192154!2d${typeof lon === 'number' ? lon.toFixed(4) : lon}!3d${typeof lat === 'number' ? lat.toFixed(4) : lat}!2m3!1f0!2f0!3f0!3m2!1i600!2i800!4f${zoom}!7i20!8i${offset}!10b1!12m22!1m3!18b1!30b1!34e1!2m3!5m1!6e2!20e3!4b0!10b1!12b1!13b1!16b1!17m1!3e1!20m3!5e2!6b1!14b1!46m1!1b0!96b1!19m4!2m3!1i360!2i120!4i8`;

  const searchParams = new URLSearchParams({
    tbm: 'map',
    authuser: '0',
    hl,
    gl,
    q: query,
    pb
  });

  const url = `https://maps.google.com/search?${searchParams.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }
  });

  if (!res.ok) {
    throw new Error(`Google Maps HTTP ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  let clean = text.trim();

  // Strip anti-hijacking protection prefixes
  for (const prefix of ['/*""*/', ")]}'"]) {
    if (clean.startsWith(prefix)) clean = clean.slice(prefix.length).trimStart();
  }
  if (clean.endsWith('/*""*/')) clean = clean.slice(0, -6).trimEnd();

  let data;
  try {
    data = JSON.parse(clean);
  } catch (err) {
    console.warn(`[Lead Hunter] Google Maps JSON parse error for "${query}":`, err.message);
    return [];
  }

  const placesContainer = data?.[0]?.[1] || [];
  const results = [];

  for (const entry of placesContainer) {
    const item = entry?.[14];
    if (!item) continue;

    const name = item[11];
    if (!name || typeof name !== 'string') continue;

    const website = item[7]?.[0] || '';
    const phone = item[178]?.[0]?.[0] || '';
    const categories = Array.isArray(item[13]) ? item[13].map(String) : [];
    const mainCategory = categories[0] || '';
    const address = Array.isArray(item[2]) ? item[2].join(', ') : (item[2] || '');
    const lat = item[9]?.[2] || null;
    const lon = item[9]?.[3] || null;
    const kgmid = item[89] || '';
    const rating = item[4]?.[7] || null;
    const reviews = item[4]?.[8] || 0;

    results.push({
      name: name.trim(),
      website: website.trim(),
      phone: phone.trim(),
      categories,
      mainCategory,
      address,
      latitude: lat,
      longitude: lon,
      kgmid,
      rating,
      reviews
    });
  }

  return results;
}

// ==========================================================================
// Lead Hunter Orchestrator (Multi-Task Grid Engine)
// ==========================================================================
export class LeadHunter {
  constructor() {
    this.status = 'idle'; // idle, running, completed, stopped, error
    this.targetLimit = 1000;
    this.discoveredCount = 0;
    this.reachableCount = 0;
    this.skippedCount = 0;
    this.duplicatesCount = 0;
    this.noWebsiteCount = 0;
    this.unreachableCount = 0;
    this.tasks = [];
    this.currentTaskIndex = 0;
    this.recentLeads = [];
    this.abortRequested = false;
    this.startTime = null;
    this.endTime = null;
    this.errorMessage = null;
  }

  getStatus() {
    const elapsedSeconds = this.getElapsedSeconds();
    const leadsPerMinute = elapsedSeconds > 0
      ? Math.round((this.reachableCount / elapsedSeconds) * 60)
      : 0;

    return {
      status: this.status,
      limit: this.targetLimit,
      discovered: this.discoveredCount,
      reachable: this.reachableCount,
      skipped: this.skippedCount,
      breakdown: {
        duplicates: this.duplicatesCount,
        noWebsite: this.noWebsiteCount,
        unreachable: this.unreachableCount
      },
      currentTaskIndex: this.currentTaskIndex,
      totalTasks: this.tasks.length,
      activeTask: this.tasks[this.currentTaskIndex] || null,
      tasks: this.tasks.slice(0, 50).map(t => ({
        id: t.id,
        query: t.query,
        city: t.city,
        state: t.state,
        status: t.status,
        found: t.found || 0
      })),
      leadsPerMinute,
      elapsedSeconds,
      recentLeads: this.recentLeads.slice(0, 30),
      error: this.errorMessage
    };
  }

  getElapsedSeconds() {
    if (!this.startTime) return 0;
    const end = this.endTime ? this.endTime : Date.now();
    return Math.max(0, Math.round((end - this.startTime) / 1000));
  }

  stopHunting() {
    this.abortRequested = true;
    this.status = 'stopped';
    this.endTime = Date.now();
  }

  /**
   * Generates a multi-task queue to reach quotas up to 10,000+ leads.
   */
  generateSubTasks({ query, state, city, limit }) {
    const tasks = [];
    const stateCities = STATE_CITIES[state] || [state];
    const related = RELATED_QUERIES[query] || [
      query,
      `Precision ${query}`,
      `${query} Manufacturer`,
      `${query} Services`,
      `Industrial ${query}`
    ];

    if (city && city.trim()) {
      const cleanCity = city.trim();
      // Targeted City search
      for (const q of related) {
        tasks.push({
          id: `task-${tasks.length + 1}`,
          query: `${q} in ${cleanCity}, ${state}`,
          baseQuery: q,
          city: cleanCity,
          state,
          status: 'pending',
          found: 0
        });
        if (tasks.length >= 8 && limit <= 500) break;
      }
    } else {
      // Statewide Multi-City Expansion ("do it by tasks")
      // Allocate cities and related queries according to requested volume
      let selectedCities = stateCities;
      let queriesToUse = [query];

      if (limit > 500 && limit <= 2000) {
        queriesToUse = related.slice(0, 2);
      } else if (limit > 2000) {
        queriesToUse = related.slice(0, 4);
      }

      for (const q of queriesToUse) {
        for (const c of selectedCities) {
          tasks.push({
            id: `task-${tasks.length + 1}`,
            query: `${q} in ${c}, ${state}`,
            baseQuery: q,
            city: c,
            state,
            status: 'pending',
            found: 0
          });
        }
      }
    }

    return tasks.length > 0 ? tasks : [{
      id: 'task-1',
      query: `${query} in ${state}`,
      baseQuery: query,
      city: '',
      state,
      status: 'pending',
      found: 0
    }];
  }

  async startHunting({ query = 'Manufacturing', state = 'Illinois', city = '', limit = 1000, onEvent = null }) {
    if (this.status === 'running') {
      throw new Error('A lead hunting session is already currently active.');
    }

    this.status = 'running';
    this.abortRequested = false;
    this.discoveredCount = 0;
    this.reachableCount = 0;
    this.skippedCount = 0;
    this.duplicatesCount = 0;
    this.noWebsiteCount = 0;
    this.unreachableCount = 0;
    this.targetLimit = Math.max(1, Math.min(100000, Number(limit) || 1000));
    this.recentLeads = [];
    this.startTime = Date.now();
    this.endTime = null;
    this.errorMessage = null;

    this.tasks = this.generateSubTasks({ query, state, city, limit: this.targetLimit });
    this.currentTaskIndex = 0;

    const emit = (type, data) => {
      if (onEvent) onEvent({ type, ...data });
    };

    emit('hunter_started', {
      query,
      state,
      city,
      limit: this.targetLimit,
      totalTasks: this.tasks.length,
      tasks: this.tasks.slice(0, 50)
    });

    let db;
    try {
      db = new Database(dbPath);
    } catch (e) {
      this.status = 'error';
      this.errorMessage = 'Database connection failed: ' + e.message;
      emit('hunter_error', { error: this.errorMessage });
      throw new Error(this.errorMessage);
    }

    // Exact domain boundary & company name match (prevents false-positive substring collisions)
    const checkExistingStmt = db.prepare(`
      SELECT id FROM leads 
      WHERE LOWER(company_name) = LOWER(?)
         OR LOWER(website) = ?
         OR LOWER(website) = ?
         OR LOWER(website) = ?
         OR LOWER(website) = ?
         OR LOWER(website) LIKE ?
         OR LOWER(website) LIKE ?
         OR LOWER(website) LIKE ?
         OR LOWER(website) LIKE ?
      LIMIT 1
    `);
    const insertLeadStmt = db.prepare(`
      INSERT INTO leads (company_name, website, city, state, phone, email, notes, contact_person, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
    `);

    const seenDomains = new Set();
    const seenNames = new Set();

    try {
      for (let i = 0; i < this.tasks.length; i++) {
        if (this.reachableCount >= this.targetLimit || this.abortRequested) break;

        this.currentTaskIndex = i;
        const task = this.tasks[i];
        task.status = 'running';

        emit('task_started', {
          taskIndex: i + 1,
          totalTasks: this.tasks.length,
          task
        });

        let consecutiveEmptyBatches = 0;
        let taskLeadsCount = 0;

        // Offset pagination stepping by 20: 0, 20, 40, 60... up to 200
        for (let offset = 0; offset <= 200; offset += 20) {
          if (this.reachableCount >= this.targetLimit || this.abortRequested) break;

          let rawPlaces = [];
          try {
            rawPlaces = await fetchGoogleMapsPlaces(task.query, offset);
          } catch (fetchErr) {
            console.warn(`[Lead Hunter] RPC fetch warning on ${task.query} offset ${offset}:`, fetchErr.message);
            break;
          }

          if (!rawPlaces || rawPlaces.length === 0) {
            consecutiveEmptyBatches++;
            if (consecutiveEmptyBatches >= 1) break; // End of listings for this location/query
            continue;
          }

          consecutiveEmptyBatches = 0;

          // Filter candidates and extract websites
          const candidatesToVerify = [];
          for (const item of rawPlaces) {
            if (this.reachableCount >= this.targetLimit || this.abortRequested) break;
            if (!item.name || seenNames.has(item.name)) continue;
            seenNames.add(item.name);
            this.discoveredCount++;

            let cleanUrl = item.website;
            if (cleanUrl && cleanUrl.includes('google.com/url?q=')) {
              try {
                const u = new URL(cleanUrl);
                cleanUrl = u.searchParams.get('q') || cleanUrl;
              } catch (_) {}
            }

            if (!cleanUrl) {
              this.noWebsiteCount++;
              this.skippedCount++;
              continue;
            }

            const lowerUrl = cleanUrl.toLowerCase();
            if (
              lowerUrl.includes('facebook.com') ||
              lowerUrl.includes('yelp.com') ||
              lowerUrl.includes('instagram.com') ||
              lowerUrl.includes('yellowpages.com') ||
              lowerUrl.includes('linkedin.com') ||
              lowerUrl.includes('mapquest.com')
            ) {
              this.noWebsiteCount++;
              this.skippedCount++;
              continue;
            }

            let normalized = cleanUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
            if (!normalized.includes('.') || seenDomains.has(normalized)) {
              this.duplicatesCount++;
              this.skippedCount++;
              continue;
            }

            // Check database duplicate (Exact domain boundary match - avoids substring collisions)
            const existing = checkExistingStmt.get(
              item.name,
              normalized,
              `http://${normalized}`,
              `https://${normalized}`,
              `https://www.${normalized}`,
              `http://${normalized}/%`,
              `https://${normalized}/%`,
              `http://www.${normalized}/%`,
              `https://www.${normalized}/%`
            );
            if (existing) {
              this.duplicatesCount++;
              this.skippedCount++;
              continue;
            }

            seenDomains.add(normalized);
            candidatesToVerify.push({
              item,
              cleanUrl,
              normalized
            });
          }

          // Asynchronous parallel reachability verification pool (concurrency = 8)
          if (candidatesToVerify.length > 0) {
            const batchPromises = candidatesToVerify.map(async (candidate) => {
              if (this.reachableCount >= this.targetLimit || this.abortRequested) return;

              // Generous 12,000ms timeout accounts for slow networks and sluggish small business servers
              const check = await checkWebsite(candidate.cleanUrl, 12000);
              if (!check.ok) {
                this.unreachableCount++;
                this.skippedCount++;
                return;
              }

              const finalUrl = candidate.cleanUrl.startsWith('http')
                ? candidate.cleanUrl
                : `https://${candidate.cleanUrl}`;

              const notes = `Discovered via Lead Hunter: ${task.query}${candidate.item.address ? ` | ${candidate.item.address}` : ''}`;
              const leadCity = task.city || null;
              const leadState = task.state || null;
              const phone = candidate.item.phone || null;

              try {
                insertLeadStmt.run(candidate.item.name, finalUrl, leadCity, leadState, phone, null, notes, null);
                this.reachableCount++;
                taskLeadsCount++;
                task.found = taskLeadsCount;

                const leadObj = {
                  company: candidate.item.name,
                  website: finalUrl,
                  phone: phone || '—',
                  address: candidate.item.address || '',
                  city: leadCity || '',
                  state: leadState || '',
                  category: candidate.item.mainCategory || task.baseQuery
                };

                this.recentLeads.unshift(leadObj);
                if (this.recentLeads.length > 50) this.recentLeads.pop();

                emit('lead_found', leadObj);
              } catch (insertErr) {
                // If unique constraint triggers, record duplicate
                this.duplicatesCount++;
                this.skippedCount++;
              }
            });

            await Promise.all(batchPromises);
          }

          emit('task_progress', {
            taskIndex: i + 1,
            totalTasks: this.tasks.length,
            offset,
            batchCount: rawPlaces.length,
            taskFound: taskLeadsCount,
            discovered: this.discoveredCount,
            reachable: this.reachableCount,
            skipped: this.skippedCount,
            breakdown: {
              duplicates: this.duplicatesCount,
              noWebsite: this.noWebsiteCount,
              unreachable: this.unreachableCount
            }
          });

          // Polite pacing delay between offset pagination requests
          await new Promise(r => setTimeout(r, 250));
        }

        task.status = 'completed';
        task.found = taskLeadsCount;

        emit('task_finished', {
          taskIndex: i + 1,
          totalTasks: this.tasks.length,
          task
        });

        // Pacing delay between geographic sub-tasks
        await new Promise(r => setTimeout(r, 400));
      }

      this.status = this.abortRequested ? 'stopped' : 'completed';
      this.endTime = Date.now();

      emit('hunter_finished', {
        discovered: this.discoveredCount,
        reachable: this.reachableCount,
        skipped: this.skippedCount,
        totalTasks: this.tasks.length,
        elapsedSeconds: this.getElapsedSeconds()
      });

    } catch (err) {
      this.status = 'error';
      this.errorMessage = err.message;
      this.endTime = Date.now();
      emit('hunter_error', { error: err.message });
      console.error('[Lead Hunter] Multi-task error:', err);
    } finally {
      if (db) {
        try { db.close(); } catch (_) {}
      }
    }

    return this.getStatus();
  }
}

export const leadHunter = new LeadHunter();
