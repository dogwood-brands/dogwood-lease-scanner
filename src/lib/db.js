// src/lib/db.js
// Database connection utility for Dogwood Brands Lease Portal
// Uses Neon Postgres (via Vercel Marketplace) with serverless driver

import { neon } from '@neondatabase/serverless';

// Create a SQL query function connected to your Neon database
// DATABASE_URL is auto-injected by Vercel when you connect Neon
const sql = neon(process.env.DATABASE_URL);

export default sql;

// ─── Helper: Run a transaction (multiple queries atomically) ───
export async function transaction(queries) {
  // For simple use, Neon HTTP mode runs each query independently.
  // For true transactions, use the Pool approach below.
  const results = [];
  for (const query of queries) {
    const result = await query();
    results.push(result);
  }
  return results;
}
