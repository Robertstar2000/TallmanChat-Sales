const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, 'tallman.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        role TEXT NOT NULL
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Insert default users
    db.run(`INSERT OR IGNORE INTO users (username, role) VALUES ('BobM', 'admin')`);
    db.run(`INSERT OR IGNORE INTO users (username, role) VALUES ('robertstar', 'admin')`);
});

// Production services
const createProductionServices = () => {
    const dbService = {
        getAllApprovedUsers: () => new Promise((resolve, reject) => {
            db.all("SELECT * FROM users ORDER BY username", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        
        addOrUpdateApprovedUser: (user) => new Promise((resolve, reject) => {
            db.run("INSERT OR REPLACE INTO users (username, role) VALUES (?, ?)", 
                [user.username, user.role], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }),
        
        deleteApprovedUser: (username) => new Promise((resolve, reject) => {
            db.run("DELETE FROM users WHERE username = ?", [username], (err) => {
                if (err) reject(err);
                else resolve();
            });
        })
    };
    
    const knowledgeService = {
        retrieveContext: (query) => new Promise((resolve, reject) => {
            db.all("SELECT content FROM knowledge WHERE content LIKE ? LIMIT 5", 
                [`%${query}%`], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.content));
            });
        }),
        
        getAllKnowledge: () => new Promise((resolve, reject) => {
            db.all("SELECT content FROM knowledge ORDER BY created_at DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.content));
            });
        }),
        
        addKnowledge: (content) => new Promise((resolve, reject) => {
            db.run("INSERT INTO knowledge (content) VALUES (?)", [content], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }),
        
        clearAllKnowledge: () => new Promise((resolve, reject) => {
            db.run("DELETE FROM knowledge", (err) => {
                if (err) reject(err);
                else resolve();
            });
        })
    };
    
    const chatService = {
        sendMessage: () => Promise.resolve('Production backend active')
    };
    
    return { dbService, knowledgeService, chatService };
};

module.exports = { createProductionServices };