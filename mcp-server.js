import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'leads.db');

const tools = [
  {
    name: "add_lead",
    description: "Add a single new construction lead to LeadFlow. Performs duplicate checks on both website domain and company name, skipping the save and logging a warning to the database if it exists.",
    inputSchema: {
      type: "object",
      properties: {
        company_name: { type: "string", description: "The name of the construction company" },
        website: { type: "string", description: "Company website URL (e.g. abcconst.com or https://abcconst.com). Only the domain will be stored." },
        city: { type: "string", description: "City location" },
        state: { type: "string", description: "Two-letter US state code" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Contact email address" },
        contact_person: { type: "string", description: "Primary contact person's name" },
        notes: { type: "string", description: "Any notes or details about the company" }
      },
      required: ["company_name", "website"]
    }
  },
  {
    name: "add_leads_batch",
    description: "Add multiple construction leads to LeadFlow in a batch. Performs duplicate checks on each lead. Skips duplicates, logs warnings to the database, and returns a summary.",
    inputSchema: {
      type: "object",
      properties: {
        leads: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company_name: { type: "string", description: "The name of the construction company" },
              website: { type: "string", description: "Company website URL" },
              city: { type: "string", description: "City location" },
              state: { type: "string", description: "Two-letter US state code" },
              phone: { type: "string", description: "Phone number" },
              email: { type: "string", description: "Contact email address" },
              contact_person: { type: "string", description: "Primary contact person's name" },
              notes: { type: "string", description: "Any notes or details about the company" }
            },
            required: ["company_name", "website"]
          }
        }
      },
      required: ["leads"]
    }
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (err) {
    sendError(null, -32700, "Parse error");
  }
});

function sendResponse(id, result) {
  console.log(JSON.stringify({
    jsonrpc: "2.0",
    id,
    result
  }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  }));
}

function handleAddLead(args) {
  const { company_name, website, city, state, phone, email, contact_person, notes } = args;
  if (!company_name || !website) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: company_name and website are required." }]
    };
  }

  // Normalize website
  const normalizedWebsite = website.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split('/')[0];

  try {
    const db = new Database(dbPath);
    
    // Check for duplicate by website
    const existingWebsite = db.prepare('SELECT id, company_name FROM leads WHERE website = ?').get(normalizedWebsite);
    if (existingWebsite) {
      const reason = `Website '${normalizedWebsite}' already exists (Company: '${existingWebsite.company_name}').`;
      db.prepare(`
        INSERT INTO duplicate_warnings (company_name, website, reason, source)
        VALUES (?, ?, ?, 'mcp')
      `).run(company_name, normalizedWebsite, reason);

      return {
        content: [{
          type: "text",
          text: `Warning: A lead with website '${normalizedWebsite}' already exists in the database (Company: '${existingWebsite.company_name}'). Duplicate check triggered: skipped adding lead.`
        }]
      };
    }

    // Check for duplicate by company name
    const existingName = db.prepare('SELECT id, website FROM leads WHERE LOWER(company_name) = ?').get(company_name.toLowerCase());
    if (existingName) {
      const reason = `Company name '${company_name}' already exists (Website: '${existingName.website}').`;
      db.prepare(`
        INSERT INTO duplicate_warnings (company_name, website, reason, source)
        VALUES (?, ?, ?, 'mcp')
      `).run(company_name, normalizedWebsite, reason);

      return {
        content: [{
          type: "text",
          text: `Warning: A lead with company name '${company_name}' already exists in the database (Website: '${existingName.website}'). Duplicate check triggered: skipped adding lead.`
        }]
      };
    }

    // Insert lead
    const insert = db.prepare(`
      INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
    `);
    
    const result = insert.run(
      company_name,
      normalizedWebsite,
      city || null,
      state ? state.toUpperCase() : null,
      phone || null,
      email || null,
      contact_person || null,
      notes || null
    );

    return {
      content: [{
        type: "text",
        text: `Success: Lead '${company_name}' (website: ${normalizedWebsite}) was successfully added with ID ${result.lastInsertRowid}.`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error writing to database: ${err.message}`
      }]
    };
  }
}

function handleAddLeadsBatch(args) {
  const { leads } = args;
  if (!Array.isArray(leads) || leads.length === 0) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: leads array is required and must not be empty." }]
    };
  }

  try {
    const db = new Database(dbPath);
    let imported = 0;
    let skipped = 0;
    const results = [];

    const insert = db.prepare(`
      INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
    `);

    // Run in transaction for speed
    db.transaction(() => {
      for (const lead of leads) {
        const { company_name, website, city, state, phone, email, contact_person, notes } = lead;
        if (!company_name || !website) {
          skipped++;
          results.push({ company_name: company_name || "Unknown", website: website || "Unknown", status: "skipped", reason: "Missing required fields" });
          continue;
        }

        const normalizedWebsite = website.toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/+$/, '')
          .split('/')[0];

        // Check website duplicate
        const existingWebsite = db.prepare('SELECT id, company_name FROM leads WHERE website = ?').get(normalizedWebsite);
        if (existingWebsite) {
          skipped++;
          const reason = `Website '${normalizedWebsite}' already exists (Company: '${existingWebsite.company_name}').`;
          db.prepare(`
            INSERT INTO duplicate_warnings (company_name, website, reason, source)
            VALUES (?, ?, ?, 'mcp')
          `).run(company_name, normalizedWebsite, reason);
          results.push({ company_name, website: normalizedWebsite, status: "skipped", reason: "Duplicate website" });
          continue;
        }

        // Check company name duplicate
        const existingName = db.prepare('SELECT id, website FROM leads WHERE LOWER(company_name) = ?').get(company_name.toLowerCase());
        if (existingName) {
          skipped++;
          const reason = `Company name '${company_name}' already exists (Website: '${existingName.website}').`;
          db.prepare(`
            INSERT INTO duplicate_warnings (company_name, website, reason, source)
            VALUES (?, ?, ?, 'mcp')
          `).run(company_name, normalizedWebsite, reason);
          results.push({ company_name, website: normalizedWebsite, status: "skipped", reason: "Duplicate company name" });
          continue;
        }

        // Insert lead
        insert.run(
          company_name,
          normalizedWebsite,
          city || null,
          state ? state.toUpperCase() : null,
          phone || null,
          email || null,
          contact_person || null,
          notes || null
        );
        imported++;
        results.push({ company_name, website: normalizedWebsite, status: "imported" });
      }
    })();

    return {
      content: [{
        type: "text",
        text: `Batch completed: ${imported} leads successfully imported, ${skipped} skipped (duplicates/errors).`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error processing batch: ${err.message}`
      }]
    };
  }
}

function handleRequest(req) {
  const { id, method, params } = req;
  
  switch (method) {
    case 'initialize':
      return sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "leadflow-mcp",
          version: "1.0.0"
        }
      });

    case 'tools/list':
      return sendResponse(id, { tools });

    case 'tools/call': {
      if (!params || !params.name) {
        return sendError(id, -32602, "Invalid params");
      }
      if (params.name === 'add_lead') {
        const res = handleAddLead(params.arguments || {});
        return sendResponse(id, res);
      }
      if (params.name === 'add_leads_batch') {
        const res = handleAddLeadsBatch(params.arguments || {});
        return sendResponse(id, res);
      }
      return sendError(id, -32601, `Tool not found: ${params.name}`);
    }

    default:
      if (id !== undefined) {
        return sendError(id, -32601, `Method not found: ${method}`);
      }
  }
}
