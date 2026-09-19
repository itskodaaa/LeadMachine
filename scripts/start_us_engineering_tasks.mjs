#!/usr/bin/env node
import Api from 'botasaurus-desktop-api';

const api = new Api({ createResponseFiles: false });

const targetConfigs = [
  {
    name: 'US Engineering - Texas & Southeast',
    states: ['US__TEXAS', 'US__GEORGIA', 'US__NORTH_CAROLINA', 'US__FLORIDA'],
    cities: [
      'US__TEXAS__HOUSTON',
      'US__TEXAS__DALLAS',
      'US__TEXAS__AUSTIN',
      'US__GEORGIA__ATLANTA',
      'US__NORTH_CAROLINA__CHARLOTTE',
      'US__FLORIDA__MIAMI',
      'US__FLORIDA__TAMPA'
    ]
  },
  {
    name: 'US Engineering - Midwest & Industrial Hubs',
    states: ['US__ILLINOIS', 'US__OHIO', 'US__MICHIGAN', 'US__COLORADO', 'US__ARIZONA'],
    cities: [
      'US__ILLINOIS__CHICAGO',
      'US__COLORADO__DENVER',
      'US__ARIZONA__PHOENIX'
    ]
  },
  {
    name: 'US Engineering - West & Northeast',
    states: ['US__CALIFORNIA', 'US__NEW_YORK'],
    cities: [
      'US__CALIFORNIA__LOS_ANGELES',
      'US__NEW_YORK__NEW_YORK_CITY'
    ]
  }
];

const businessTypes = [
  'Civil engineer',
  'Structural engineer',
  'Mechanical engineer',
  'Precision engineer',
  'Industrial engineer',
  'Engineering consultant',
  'CNC machining'
];

async function startBatch() {
  console.log('=== Dispatching US Engineering Extraction Tasks ===\n');

  for (const cfg of targetConfigs) {
    console.log(`Submitting [${cfg.name}]...`);
    const data = {
      business_types: businessTypes,
      search_method: 'city',
      countries: [],
      states: cfg.states,
      cities: cfg.cities,
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
      console.log(`✓ Created batch task #${mainId} with ${Array.isArray(task) ? task.length : 1} subtasks.\n`);
    } catch (err) {
      console.error(`Error submitting ${cfg.name}:`, err.message);
    }
  }

  console.log('All batches submitted to Google Maps Extractor app!');
}

startBatch();
