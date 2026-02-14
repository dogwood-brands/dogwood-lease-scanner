// src/app/api/dashboard/route.js
// Returns portfolio summary stats for the dashboard
import sql from '@/lib/db';

export async function GET() {
  try {
    // Total counts
    const totals = await sql`
      SELECT 
        COUNT(*) AS total_leases,
        COUNT(*) FILTER (WHERE status = 'active') AS active_leases,
        COUNT(*) FILTER (WHERE status = 'expiring') AS expiring_leases,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired_leases,
        COALESCE(SUM(monthly_rent), 0) AS total_monthly_rent,
        COALESCE(SUM(monthly_cam), 0) AS total_monthly_cam,
        COALESCE(SUM(sqft), 0) AS total_sqft,
        COUNT(DISTINCT entity) AS total_entities,
        COUNT(DISTINCT market) AS total_markets
      FROM leases
    `;

    // Per-entity breakdown
    const byEntity = await sql`
      SELECT 
        entity,
        COUNT(*) AS lease_count,
        COALESCE(SUM(monthly_rent), 0) AS monthly_rent,
        COALESCE(SUM(sqft), 0) AS total_sqft,
        COALESCE(SUM(annual_sales_2024), 0) AS annual_sales
      FROM leases
      WHERE entity IS NOT NULL
      GROUP BY entity
      ORDER BY entity
    `;

    // Upcoming expirations (next 12 months)
    const expiring = await sql`
      SELECT store_number, location_name, entity, lease_end, landlord, address
      FROM leases
      WHERE lease_end BETWEEN NOW() AND NOW() + INTERVAL '12 months'
      ORDER BY lease_end ASC
      LIMIT 20
    `;

    // Document stats
    const docStats = await sql`
      SELECT 
        COUNT(*) AS total_documents,
        COUNT(*) FILTER (WHERE ocr_processed = true) AS ocr_processed,
        COUNT(*) FILTER (WHERE ocr_processed = false) AS pending_ocr,
        COUNT(DISTINCT doc_type) AS doc_types
      FROM documents
    `;

    // Recent activity
    const recentDocs = await sql`
      SELECT d.file_name, d.doc_type, d.confidence, d.created_at,
             l.store_number, l.entity
      FROM documents d
      LEFT JOIN leases l ON l.id = d.lease_id
      ORDER BY d.created_at DESC
      LIMIT 10
    `;

    return Response.json({
      summary: totals[0],
      byEntity,
      expiring,
      documents: docStats[0],
      recentActivity: recentDocs
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
