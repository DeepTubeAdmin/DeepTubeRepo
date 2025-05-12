// Script to update Jenny.glass's username to Jennyglass
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function migrateUsername() {
  try {
    console.log('Starting username migration for Jenny.glass...');
    
    // Check if the user exists
    const [user] = await db.select().from(users).where(eq(users.username, 'Jenny.glass'));
    
    if (!user) {
      console.log('User Jenny.glass not found in the database.');
      return;
    }
    
    console.log(`Found user: ${user.username} (ID: ${user.id})`);
    
    // Update the username
    const [updatedUser] = await db.update(users)
      .set({ username: 'Jennyglass' })
      .where(eq(users.username, 'Jenny.glass'))
      .returning();
    
    if (updatedUser) {
      console.log(`Successfully updated username from Jenny.glass to Jennyglass (ID: ${updatedUser.id})`);
    } else {
      console.log('No user was updated.');
    }
  } catch (error) {
    console.error('Error migrating username:', error);
  } finally {
    process.exit(0);
  }
}

migrateUsername();