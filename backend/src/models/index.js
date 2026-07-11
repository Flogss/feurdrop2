const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/logistics.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_username TEXT UNIQUE NOT NULL,
                name TEXT,
                description TEXT,
                price_per_label REAL DEFAULT 4.0,
                summary_notifications BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Labels table
        db.run(`
            CREATE TABLE IF NOT EXISTS labels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
                description TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        // Settings table
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_bot_token TEXT DEFAULT '8957997002:AAEzvJXgMZ9Qn7E4ERirZHTrTfseF8WDKm4',
                summary_user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default settings if not exists
        db.get('SELECT COUNT(*) as count FROM settings', [], (err, row) => {
            if (err) {
                console.error('Error checking settings:', err.message);
            } else if (row.count === 0) {
                db.run(`
                    INSERT INTO settings (telegram_bot_token, summary_user_id)
                    VALUES ('8957997002:AAEzvJXgMZ9Qn7E4ERirZHTrTfseF8WDKm4', NULL)
                `, function(err) {
                    if (err) {
                        console.error('Error inserting default settings:', err.message);
                    } else {
                        console.log('Default settings inserted');
                    }
                });
            }
        });

        // Create uploads directory if it doesn't exist
        const fs = require('fs');
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('Uploads directory created');
        }
    });
}

module.exports = db;