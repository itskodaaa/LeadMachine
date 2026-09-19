#!/usr/bin/env node
import Api from 'botasaurus-desktop-api';

const api = new Api({ createResponseFiles: false });

const engineeringCategories = [
  'Civil engineer',
  'Structural engineer',
  'Mechanical engineer',
  'Electrical engineer',
  'Precision engineer',
  'Industrial engineer',
  'Engineering consultant',
  'Geotechnical engineer',
  'Environmental engineer'
];

const manufacturingCategories = [
  'Machine shop',
  'CNC machining',
  'Metal fabrication',
  'Tool and die maker',
  'Steel fabricator',
  'Sheet metal contractor'
];

const contractorCategories = [
  'General contractor',
  'Commercial builder',
  'Mechanical contractor',
  'Electrical contractor',
  'Demolition contractor'
];

const regions = [
  {
    name: 'Texas & Southwest Powerhouses',
    states: ['US__TEXAS', 'US__ARIZONA'],
    cities: [
      'US__TEXAS__HOUSTON',
      'US__TEXAS__DALLAS',
      'US__TEXAS__AUSTIN',
      'US__TEXAS__SAN_ANTONIO',
      'US__ARIZONA__PHOENIX'
    ]
  },
  {
    name: 'Midwest & Great Lakes Industrial Belt',
    states: ['US__ILLINOIS', 'US__OHIO', 'US__MICHIGAN', 'US__INDIANA', 'US__WISCONSIN'],
    cities: [
      'US__ILLINOIS__CHICAGO',
      'US__OHIO__COLUMBUS',
      'US__OHIO__CLEVELAND',
      'US__OHIO__CINCINNATI',
      'US__MICHIGAN__DETROIT',
      'US__MICHIGAN__GRAND_RAPIDS',
      'US__INDIANA__INDIANAPOLIS',
      'US__WISCONSIN__MILWAUKEE'
    ]
  },
  {
    name: 'West Coast & Pacific Hubs',
    states: ['US__CALIFORNIA', 'US__WASHINGTON', 'US__OREGON', 'US__COLORADO'],
    cities: [
      'US__CALIFORNIA__LOS_ANGELES',
      'US__CALIFORNIA__SAN_DIEGO',
      'US__CALIFORNIA__SAN_JOSE',
      'US__CALIFORNIA__SAN_FRANCISCO',
      'US__CALIFORNIA__SACRAMENTO',
      'US__WASHINGTON__SEATTLE',
      'US__OREGON__PORTLAND',
      'US__COLORADO__DENVER'
    ]
  },
  {
    name: 'Southeast High-Growth Corridor',
    states: ['US__FLORIDA', 'US__GEORGIA', 'US__NORTH_CAROLINA', 'US__TENNESSEE'],
    cities: [
      'US__FLORIDA__MIAMI',
      'US__FLORIDA__ORLANDO',
      'US__FLORIDA__TAMPA',
      'US__GEORGIA__ATLANTA',
      'US__NORTH_CAROLINA__CHARLOTTE',
      'US__NORTH_CAROLINA__RALEIGH',
      'US__TENNESSEE__NASHVILLE'
    ]
  }
];

async function dispatchMegaCampaign() {
  console.log('=== Launching 10K+ Lead Extraction Campaign ===\n');

  let totalBatches = 0;
  let totalSubtasksExpected = 0;

  for (const region of regions) {
    // 1. Engineering batch for this region
    console.log(`Submitting [${region.name} - Engineering Focus]...`);
    const engData = {
      business_types: engineeringCategories,
      search_method: 'city',
      countries: [],
      states: region.states,
      cities: region.cities,
      randomize_cities: true,
      include_places_outside_city: true,
      search_links: [],
      extraction_method: 'fast',
      geo_shape: 'polygons',
      point_coordinates: '',
      polygons: null,
      geo_zoom_level: '16',
      exclude_outside_shape: true,
      api_key: '',
      enable_website_contacts: false,
      product_description: '',
      enable_emails_social: false,
      recommended_emails_count: '1',
      verify_recommended_emails: false,
      email_verification_service: 'millionverifier',
      enable_sales_summary: false,
      enable_phone_info: false,
      enrichment_filters: ['not_permanently_closed'],
      filter_reviews_gt: null,
      filter_reviews_lt: null,
      filter_category_contains: '',
      enable_leads: false,
      leads_max_per_place: '3',
      leads_seniorities: ['c_suite', 'founder', 'owner', 'vp', 'director'],
      leads_person_titles: '',
      leads_contact_email_status: ['verified'],
      leads_person_locations: '',
      enable_reviews_extraction: false,
      max_reviews: 20,
      reviews_sort: 'newest',
      reviews_since_date: '',
      reviews_query: '',
      enable_photos_extraction: false,
      max_photos: 100,
      lang: null,
      max_results: 50,
    };

    try {
      const engTask = await api.createAsyncTask({ data: engData, scraperName: 'google_maps_scraper' });
      const engSubCount = Array.isArray(engTask) ? engTask.length : 1;
      const engId = Array.isArray(engTask) ? engTask[0]?.parent_task_id || engTask[0]?.id : engTask.id;
      console.log(`✓ Created batch task #${engId} (${engSubCount} subtasks)`);
      totalBatches++;
      totalSubtasksExpected += engSubCount;
    } catch (err) {
      console.error(`Failed ${region.name} (Engineering):`, err.message);
    }

    // 2. Manufacturing & Machining batch for this region
    console.log(`Submitting [${region.name} - Manufacturing & Machining]...`);
    const mfgData = {
      ...engData,
      business_types: manufacturingCategories,
    };

    try {
      const mfgTask = await api.createAsyncTask({ data: mfgData, scraperName: 'google_maps_scraper' });
      const mfgSubCount = Array.isArray(mfgTask) ? mfgTask.length : 1;
      const mfgId = Array.isArray(mfgTask) ? mfgTask[0]?.parent_task_id || mfgTask[0]?.id : mfgTask.id;
      console.log(`✓ Created batch task #${mfgId} (${mfgSubCount} subtasks)\n`);
      totalBatches++;
      totalSubtasksExpected += mfgSubCount;
    } catch (err) {
      console.error(`Failed ${region.name} (Manufacturing):`, err.message);
    }

    // 3. Commercial Contracting & Building batch for this region
    console.log(`Submitting [${region.name} - Commercial Contracting]...`);
    const conData = {
      ...engData,
      business_types: contractorCategories,
    };

    try {
      const conTask = await api.createAsyncTask({ data: conData, scraperName: 'google_maps_scraper' });
      const conSubCount = Array.isArray(conTask) ? conTask.length : 1;
      const conId = Array.isArray(conTask) ? conTask[0]?.parent_task_id || conTask[0]?.id : conTask.id;
      console.log(`✓ Created batch task #${conId} (${conSubCount} subtasks)\n`);
      totalBatches++;
      totalSubtasksExpected += conSubCount;
    } catch (err) {
      console.error(`Failed ${region.name} (Contractors):`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`All Mega-Campaign batches successfully queued!`);
  console.log(`Total Batch Jobs: ${totalBatches}`);
  console.log(`Total Subtasks Queued: ${totalSubtasksExpected}`);
  console.log(`Estimated Places Being Scraped: ~${totalSubtasksExpected * 45} businesses`);
  console.log(`======================================================`);
}

dispatchMegaCampaign();
