// src/app/api/db/init/route.js
// One-time route to initialize the database schema
// Hit this once after connecting Neon, then you can remove it
import sql from '@/lib/db';

export async function POST() {
  try {
    // Create leases table
    await sql`
      CREATE TABLE IF NOT EXISTS leases (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        store_number TEXT NOT NULL,
        location_name TEXT,
        salon_number TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        shopping_center TEXT,
        market TEXT,
        entity TEXT,
        landlord TEXT,
        landlord_contact TEXT,
        landlord_email TEXT,
        landlord_phone TEXT,
        lease_start DATE,
        lease_end DATE,
        monthly_rent NUMERIC(10,2),
        monthly_cam NUMERIC(10,2),
        sqft INTEGER,
        rent_per_sqft NUMERIC(8,2),
        latest_amendment TEXT,
        amendment_date DATE,
        renewal_options TEXT,
        led_date DATE,
        annual_sales_2024 NUMERIC(12,2),
        status TEXT DEFAULT 'active',
        key_terms TEXT,
        notes TEXT,
        dropbox_folder TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        original_path TEXT,
        organized_path TEXT,
        file_size INTEGER,
        doc_type TEXT,
        doc_date DATE,
        confidence INTEGER,
        ai_classification JSONB,
        ocr_text TEXT,
        ocr_processed BOOLEAN DEFAULT FALSE,
        dropbox_link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create scan_history table
    await sql`
      CREATE TABLE IF NOT EXISTS scan_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        total_files INTEGER DEFAULT 0,
        processed_files INTEGER DEFAULT 0,
        classified_files INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        status TEXT DEFAULT 'running',
        log JSONB
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_leases_store ON leases(store_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leases_entity ON leases(entity)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leases_market ON leases(market)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_lease ON documents(lease_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type)`;

    // Create auto-update trigger
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Drop trigger if exists, then recreate
    await sql`DROP TRIGGER IF EXISTS leases_updated_at ON leases`;
    await sql`
      CREATE TRIGGER leases_updated_at
        BEFORE UPDATE ON leases
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at()
    `;

    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    return Response.json({ 
      success: true, 
      message: 'Database initialized successfully',
      tables: tables.map(t => t.table_name)
    });
  } catch (error) {
    console.error('DB init error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
