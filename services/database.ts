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
    
    -- Table journal (un journal par voyage)
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      file_path TEXT,
      entry_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );
    
    -- Table checklist (sans catégorie)
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_checked BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );
  `);
};

// Classe DatabaseService pour les méthodes d'authentification
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
      const result = db.runSync(
        'DELETE FROM steps WHERE id = ?',
        [stepId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting step:', error);
      return false;
    }
  }
}

export { db };