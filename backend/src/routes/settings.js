const express = require('express');
const router = express.Router();
const db = require('../models');

// Get settings
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM settings ORDER BY id DESC LIMIT 1';
    db.get(sql, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            // Return default settings if none exist
            return res.json({
                telegram_bot_token: '8957997002:AAEzvJXgMZ9Qn7E4ERirZHTrTfseF8WDKm4',
                summary_user_id: null
            });
        }
        res.json(row);
    });
});

// Update settings
router.put('/', (req, res) => {
    const { telegram_bot_token, summary_user_id } = req.body;

    // Check if settings exist
    const checkSql = 'SELECT id FROM settings ORDER BY id DESC LIMIT 1';
    db.get(checkSql, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            // Update existing settings
            const updateSql = `
                UPDATE settings
                SET telegram_bot_token = ?, summary_user_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            db.run(updateSql, [telegram_bot_token, summary_user_id, row.id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Settings updated successfully', changes: this.changes });
            });
        } else {
            // Insert new settings
            const insertSql = `
                INSERT INTO settings (telegram_bot_token, summary_user_id)
                VALUES (?, ?)
            `;
            db.run(insertSql, [telegram_bot_token, summary_user_id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: 'Settings created successfully', id: this.lastID });
            });
        }
    });
});

module.exports = router;