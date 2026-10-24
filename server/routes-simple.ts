import type { Express, Request, Response } from 'express';
import pkg from 'pg';
const { Pool } = pkg;

// Sales API endpoint to save detail data
export function addSalesRoute(app: Express) {
  app.post('/api/sales/save', async (req: Request, res: Response) => {
    try {
      const { salesData, entryType } = req.body;
      
      if (!salesData || !Array.isArray(salesData)) {
        return res.status(400).json({ error: 'Invalid sales data' });
      }

      // Create database connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Save each sales record to details table with your specified column mappings
      const results = [];
      
      for (const item of salesData) {
        if (!item.customer_name && !item.vehicle_no && !item.item_description && !item.dc_no && !item.do_no) {
          continue; // Skip empty rows
        }
        
        // Generate auto-incremented DO ID as maximum number
        const maxDoIdResult = await pool.query(
          'SELECT COALESCE(MAX(do_id), 0) as max_do_id FROM wb_weighbridge_items_purchase WHERE do_id IS NOT NULL'
        );
        const maxDoId = maxDoIdResult.rows[0]?.max_do_id || 0;
        
        // Save to wb_weighbridge_items_purchase table with proper column mappings
        const insertQuery = `
          INSERT INTO wb_weighbridge_items_purchase (
            wb_id, do_id, customer_name, vehicle_no, do_date, 
            item_desc, do_qty, dc_qty, do_no, dc_no, branch
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        
        const values = [
          item.wb_id,
          maxDoId + 1, // Auto-generated maximum number
          item.customer_name || null,
          item.vehicle_no || null,
          item.do_date || null, // As requested - null for now
          item.item_description || null,
          item.do_qty ? parseFloat(item.do_qty) : null,
          item.dc_qty ? parseFloat(item.dc_qty) : null,
          item.do_no || null,
          item.dc_no || null,
          item.branch || null
        ];
        
        const insertResult = await pool.query(insertQuery, values);
        results.push(insertResult.rows[0]);
      }
      
      await pool.end();
      
      console.log('Sales detail data saved to database:', results.length, 'records');
      
      res.json({ 
        success: true, 
        message: `${results.length} sales detail records saved successfully to database`,
        records: results.length 
      });
      
    } catch (error) {
      console.error('Sales save error:', error);
      res.status(500).json({ error: 'Failed to save sales data' });
    }
  });
}