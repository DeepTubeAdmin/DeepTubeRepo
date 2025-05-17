// Initialize default forum categories
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { eq } from 'drizzle-orm';
neonConfig.webSocketConstructor = ws;

// Default forum categories
const forumCategories = [
  { name: "AI Video Generation", slug: "ai-video-generation" },
  { name: "AI Image Creation", slug: "ai-image-creation" },
  { name: "Tutorials & Guides", slug: "tutorials-guides" },
  { name: "Show & Tell", slug: "show-tell" },
  { name: "Questions & Help", slug: "questions-help" },
  { name: "News & Updates", slug: "news-updates" },
];

async function initForumCategories() {
  // Make sure database URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Please set it and try again.');
    process.exit(1);
  }

  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Checking for existing forum categories...');
    
    // Check if categories table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'categories'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Categories table does not exist yet. Please run migrations first.');
      return;
    }

    // Check for existing categories
    const result = await pool.query('SELECT * FROM categories');
    console.log(`Found ${result.rows.length} existing categories.`);

    // If no categories exist, insert the defaults
    if (result.rows.length === 0) {
      console.log('No categories found. Adding default forum categories...');
      
      // Insert categories
      const insertPromises = forumCategories.map(category => {
        return pool.query(
          'INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
          [category.name, category.slug, '']
        );
      });
      
      await Promise.all(insertPromises);
      console.log('Default forum categories added successfully!');
    } else {
      console.log('Categories already exist. No action needed.');
    }
  } catch (err) {
    console.error('Error initializing forum categories:', err);
  } finally {
    // Close the connection
    await pool.end();
  }
}

// Run the initialization
initForumCategories().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});