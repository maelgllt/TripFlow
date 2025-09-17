import * as SQLite from 'expo-sqlite';
import { User } from '@/types/database';

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
}

export { db };