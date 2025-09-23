import * as SQLite from 'expo-sqlite';
import { Step, Trip, User } from '@/types/database';

const db = SQLite.openDatabaseSync('tripflow.db');

export const initDatabase = () => {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    
    -- Table utilisateurs
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Table voyages
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      start_date TEXT,
      end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
    
    -- Table étapes
    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      latitude REAL,
      longitude REAL,
      address TEXT,
      start_date TEXT,
      end_date TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );
    
    -- Table journal (un journal par étape)
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      images TEXT,
      file_path TEXT,
      entry_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (step_id) REFERENCES steps (id) ON DELETE CASCADE
    );
    
    -- Table checklists (une checklist par voyage, plusieurs checklists par voyage possible)
    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );
    
    -- Table checklist_items (si elle n'existe pas encore, on la crée correctement)
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_checked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_id) REFERENCES checklists (id) ON DELETE CASCADE
    );
  `);
};

export class DatabaseService {
  // Méthodes d'authentification
  static async createUser(email: string, password: string, name: string): Promise<number | null> {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = db.getFirstSync(
        'SELECT id FROM users WHERE email = ?',
        [email]
      ) as { id: number } | null;

      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const result = db.runSync(
        'INSERT INTO users (email, password, name, created_at) VALUES (?, ?, ?, datetime("now"))',
        [email, password, name]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async loginUser(email: string, password: string): Promise<User | null> {
    try {
      const user = db.getFirstSync(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        [email, password]
      ) as User | null;
      
      return user;
    } catch (error) {
      console.error('Error logging in user:', error);
      return null;
    }
  }

  static async getUserById(id: number): Promise<User | null> {
    try {
      const user = db.getFirstSync(
        'SELECT * FROM users WHERE id = ?',
        [id]
      ) as User | null;
      
      return user;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }

  static async createTrip(
    userId: number, 
    title: string, 
    description?: string, 
    startDate?: string, 
    endDate?: string, 
    coverImage?: string
  ): Promise<number | null> {
    try {
      const result = db.runSync(
        'INSERT INTO trips (user_id, title, description, start_date, end_date, cover_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
        [userId, title, description || null, startDate || null, endDate || null, coverImage || null]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  }

  static async getTripsByUserId(userId: number): Promise<Trip[]> {
    try {
      const trips = db.getAllSync(
        'SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as Trip[];
      return trips;
    } catch (error) {
      console.error('Error getting trips:', error);
      return [];
    }
  }

  static async getTripById(tripId: number): Promise<Trip | null> {
    try {
      const trip = db.getFirstSync(
        'SELECT * FROM trips WHERE id = ?',
        [tripId]
      ) as Trip | null;
      return trip;
    } catch (error) {
      console.error('Error getting trip by id:', error);
      return null;
    }
  }

  static async deleteTrip(tripId: number): Promise<boolean> {
    try {
      const result = db.runSync(
        'DELETE FROM trips WHERE id = ?',
        [tripId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting trip:', error);
      return false;
    }
  }

  static async createStep(stepData: {
    trip_id: number;
    title: string;
    description?: string | null;
    location: string;
    latitude: number;
    longitude: number;
    start_date: string;
    end_date: string;
    step_order: number;
  }): Promise<number | null> {
    try {
      const result = db.runSync(
        'INSERT INTO steps (trip_id, title, description, address, latitude, longitude, start_date, end_date, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [
          stepData.trip_id,
          stepData.title,
          stepData.description || null,
          stepData.location,
          stepData.latitude,
          stepData.longitude,
          stepData.start_date,
          stepData.end_date,
          stepData.step_order
        ]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating step:', error);
      throw error;
    }
  }

  static async updateStepOrder(stepId: number, newOrder: number): Promise<void> {
    try {
      db.runSync(
        'UPDATE steps SET order_index = ? WHERE id = ?',
        [newOrder, stepId]
      );
    } catch (error) {
      console.error('Error updating step order:', error);
      throw error;
    }
  }

  static async getStepsByTripId(tripId: number): Promise<Step[]> {
    try {
      const steps = db.getAllSync(
        'SELECT * FROM steps WHERE trip_id = ? ORDER BY start_date ASC, order_index ASC',
        [tripId]
      ) as Step[];
      return steps;
    } catch (error) {
      console.error('Error getting steps:', error);
      return [];
    }
  }

  static async checkDateConflicts(tripId: number, startDate: string, endDate: string, excludeStepId?: number): Promise<Step[]> {
    try {
      let query = `
        SELECT * FROM steps 
        WHERE trip_id = ? 
        AND (
          (start_date <= ? AND end_date >= ?) OR
          (start_date <= ? AND end_date >= ?) OR
          (start_date >= ? AND end_date <= ?)
        )
      `;
      let params = [tripId, startDate, startDate, endDate, endDate, startDate, endDate];
      
      if (excludeStepId) {
        query += ' AND id != ?';
        params.push(excludeStepId);
      }
      
      const conflictingSteps = db.getAllSync(query, params) as Step[];
      return conflictingSteps;
    } catch (error) {
      console.error('Error checking date conflicts:', error);
      return [];
    }
  }

  static async deleteStep(stepId: number): Promise<boolean> {
  try {
    const stepToDelete = await this.getStepById(stepId);
    if (!stepToDelete) {
      return false;
    }

    const deleteResult = db.runSync(
      'DELETE FROM steps WHERE id = ?',
      [stepId]
    );

    if (deleteResult.changes > 0) {
      await this.reorderStepsAfterDeletion(stepToDelete.trip_id, stepToDelete.order_index);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting step:', error);
    return false;
  }
}

  static async deleteUser(userId: number): Promise<boolean> {
    try {
      db.execSync('BEGIN TRANSACTION;');
      
      try {
        // on supprime d'abord tous les voyages de l'utilisateur
        // grâce à ON DELETE CASCADE, cela supprimera automatiquement :
        // - steps
        // - journal_entries  
        // - checklist_items
        db.runSync('DELETE FROM trips WHERE user_id = ?;', [userId]);
        
        const result = db.runSync('DELETE FROM users WHERE id = ?;', [userId]);
        
        db.execSync('COMMIT;');
        
        return result.changes > 0;
        
      } catch (error) {
        db.execSync('ROLLBACK;');
        throw error;
      }
      
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  static async getStepById(stepId: number): Promise<Step | null> {
    try {
      const step = db.getFirstSync(
        'SELECT * FROM steps WHERE id = ?',
        [stepId]
      ) as Step | null;
      return step;
    } catch (error) {
      console.error('Error getting step by id:', error);
      return null;
    }
  }

  static async reorderStepsAfterDeletion(tripId: number, deletedOrderIndex: number): Promise<boolean> {
    try {
      const result = db.runSync(
        'UPDATE steps SET order_index = order_index - 1 WHERE trip_id = ? AND order_index > ?',
        [tripId, deletedOrderIndex]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error reordering steps after deletion:', error);
      return false;
    }
  }

  static async updateStep(stepId: number, stepData: {
    title: string;
    description?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    start_date: string;
    end_date: string;
  }): Promise<boolean> {
    try {
      const result = db.runSync(
        `UPDATE steps SET 
          title = ?, 
          description = ?, 
          address = ?, 
          latitude = ?, 
          longitude = ?, 
          start_date = ?, 
          end_date = ?
        WHERE id = ?`,
        [
          stepData.title,
          stepData.description ?? null,
          stepData.address ?? null,
          stepData.latitude ?? null,
          stepData.longitude ?? null,
          stepData.start_date,
          stepData.end_date,
          stepId
        ]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating step:', error);
      return false;
    }
  }

  static async getJournalEntryByStepId(stepId: number) {
    const entry = db.getFirstSync(
      'SELECT * FROM journal_entries WHERE step_id = ?',
      [stepId]
    );
    return entry;
  }

  static async saveJournalEntryForStep(stepId: number, data: {
    type: 'text' | 'photo' | 'audio',
    content: string,
    images?: string[],
    file_path?: string,
    entry_date?: string
  }): Promise<number | boolean> {
    const existing = await this.getJournalEntryByStepId(stepId);
    const imagesJson = data.images ? JSON.stringify(data.images) : null;
    if (existing) {
      // Update
      const result = db.runSync(
        `UPDATE journal_entries SET 
          type = ?, content = ?, images = ?, file_path = ?, entry_date = ?, created_at = datetime("now")
        WHERE step_id = ?`,
        [
          data.type,
          data.content,
          imagesJson,
          data.file_path ?? null,
          data.entry_date ?? null,
          stepId
        ]
      );
      return result.changes > 0;
    } else {
      // Create
      const result = db.runSync(
        `INSERT INTO journal_entries (step_id, type, content, images, file_path, entry_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
        [
          stepId,
          data.type,
          data.content,
          imagesJson,
          data.file_path ?? null,
          data.entry_date ?? null
        ]
      );
      return result.lastInsertRowId;
    }
  }

  static async createChecklist(tripId: number, title: string): Promise<number | null> {
    try {
      const result = db.runSync(
        'INSERT INTO checklists (trip_id, title, created_at) VALUES (?, ?, datetime("now"))',
        [tripId, title]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating checklist:', error);
      throw error;
    }
  }

  static async getChecklistsByTripId(tripId: number) {
    try {
      const lists = db.getAllSync(
        'SELECT * FROM checklists WHERE trip_id = ? ORDER BY created_at DESC',
        [tripId]
      );
      return lists;
    } catch (error) {
      console.error('Error getting checklists:', error);
      return [];
    }
  }

  static async deleteChecklist(checklistId: number): Promise<boolean> {
    try {
      const result = db.runSync(
        'DELETE FROM checklists WHERE id = ?',
        [checklistId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting checklist:', error);
      return false;
    }
  }

  static async createChecklistItem(checklistId: number, title: string): Promise<number | null> {
    try {
      const result = db.runSync(
        'INSERT INTO checklist_items (checklist_id, title, is_checked, created_at) VALUES (?, ?, 0, datetime("now"))',
        [checklistId, title]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating checklist item:', error);
      throw error;
    }
  }

  static async getChecklistItems(checklistId: number) {
    try {
      const items = db.getAllSync(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY created_at ASC',
        [checklistId]
      );
      return items;
    } catch (error) {
      console.error('Error getting checklist items:', error);
      return [];
    }
  }

  static async setChecklistItemChecked(itemId: number, isChecked: boolean): Promise<boolean> {
    try {
      const result = db.runSync(
        'UPDATE checklist_items SET is_checked = ? WHERE id = ?',
        [isChecked ? 1 : 0, itemId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating checklist item:', error);
      return false;
    }
  }

  static async deleteChecklistItem(itemId: number): Promise<boolean> {
    try {
      const result = db.runSync(
        'DELETE FROM checklist_items WHERE id = ?',
        [itemId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      return false;
    }
  }
}

export { db };