#!/usr/bin/env node
import Api from 'botasaurus-desktop-api';

const api = new Api({ createResponseFiles: false });

const businessTypes = [
  'Civil engineer',
  'Structural engineer',
  'Mechanical engineer',
  'Precision engineer',
  'Industrial engineer',
  'Electrical engineer',
  'Engineering consultant',
  'CNC machining',
  'Metal fabrication',
  'Tool and die maker'
];

const targetBatches = [
  {
    name: 'Midwest & Great Lakes Engineering Hubs',
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
    states: ['US__CALIFORNIA', 'US__WASHINGTON', 'US__OREGON'],
    cities: [
      'US__CALIFORNIA__LOS_ANGELES',
      'US__CALIFORNIA__SAN_DIEGO',
      'US__CALIFORNIA__SAN_JOSE',
      'US__CALIFORNIA__SAN_FRANCISCO',
      'US__CALIFORNIA__SACRAMENTO',
      'US__WASHINGTON__SEATTLE',
      'US__OREGON__PORTLAND'
    ]
  },
  {
    name: 'South & Southwest Engineering Belt',
    states: ['US__TEXAS', 'US__FLORIDA', 'US__GEORGIA', 'US__NORTH_CAROLINA', 'US__TENNESSEE', 'US__ARIZONA'],
    cities: [
      'US__TEXAS__HOUSTON',
      'US__TEXAS__DALLAS',
      'US__TEXAS__AUSTIN',
      'US__TEXAS__SAN_ANTONIO',
      'US__FLORIDA__MIAMI',
      'US__FLORIDA__TAMPA',
      'US__FLORIDA__ORLANDO',
      'US__GEORGIA__ATLANTA',
      'US__NORTH_CAROLINA__CHARLOTTE',
      'US__NORTH_CAROLINA__RALEIGH',
      'US__TENNESSEE__NASHVILLE',
      'US__ARIZONA__PHOENIX'
    ]
  },
  {
    name: 'Northeast & Mid-Atlantic Commercial Hubs',
    states: ['US__NEW_YORK', 'US__PENNSYLVANIA', 'US__MASSACHUSETTS', 'US__VIRGINIA', 'US__NEW_JERSEY'],
    cities: [
      'US__NEW_YORK__NEW_YORK_CITY',
      'US__NEW_YORK__BUFFALO',
      'US__PENNSYLVANIA__PHILADELPHIA',
      'US__PENNSYLVANIA__PITTSBURGH',
      'US__MASSACHUSETTS__BOSTON',
      'US__VIRGINIA__RICHMOND',
      'US__NEW_JERSEY__NEWARK'
    ]
  }
];

async function dispatchScale() {
  console.log('=== Dispatching High-Scale US Engineering Extraction Tasks ===\n');

  let batchCount = 0;
  for (const batch of targetBatches) {
    console.log(`Dispatching [${batch.name}] (${batch.cities.length} cities × ${businessTypes.length} business types)...`);
    const data = {
      business_types: businessTypes,
      search_method: 'city',
      countries: [],
      states: batch.states,
      cities: batch.cities,
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
      const task = await api.createAsyncTask({ data, scraperName: 'google_maps_scraper' });
      const mainId = Array.isArray(task) ? task[0]?.parent_task_id || task[0]?.id : task.id;
      const subtaskCount = Array.isArray(task) ? task.length : 1;
      console.log(`✓ Created batch task #${mainId} with ${subtaskCount} subtasks.\n`);
      batchCount++;
    } catch (err) {
      console.error(`Error submitting ${batch.name}:`, err.message);
    }
  }

  console.log(`=== Successfully dispatched ${batchCount} major extraction batches to Google Maps Extractor! ===`);
}

dispatchScale();
