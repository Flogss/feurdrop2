const express = require('express');
const router = express.Router();
const db = require('../models');

// Get all users
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM users ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get user by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(row);
    });
});

// Update user
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, price_per_label, summary_notifications } = req.body;

    const sql = `
        UPDATE users
        SET name = ?, description = ?, price_per_label = ?, summary_notifications = ?
        WHERE id = ?
    `;
    db.run(sql, [name, description, price_per_label, summary_notifications, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated successfully', changes: this.changes });
    });
});

// Get user statistics
router.get('/:id/stats', (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT
            COUNT(l.id) as total_labels,
            SUM(CASE WHEN l.file_type = 'pdf' THEN 1 ELSE 0 END) as pdf_labels,
            SUM(CASE WHEN l.file_type = 'image' THEN 1 ELSE 0 END) as image_labels,
            u.price_per_label,
            (COUNT(l.id) * u.price_per_label) as total_earnings
        FROM users u
        LEFT JOIN labels l ON u.id = l.user_id
        WHERE u.id = ?
        GROUP BY u.id
    `;
    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(row);
    });
});

module.exports = router;