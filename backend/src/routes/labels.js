const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const db = require('../models');

// Get all labels with optional filtering
router.get('/', (req, res) => {
    const { user_id, limit, offset } = req.query;
    let query = `
        SELECT l.*, u.telegram_username as user_name
        FROM labels l
        JOIN users u ON l.user_id = u.id
    `;
    const params = [];

    if (user_id) {
        query += ' WHERE l.user_id = ?';
        params.push(user_id);
    }

    query += ' ORDER BY l.uploaded_at DESC';

    if (limit !== undefined && offset !== undefined) {
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
    } else if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get label by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT l.*, u.telegram_username as user_name
        FROM labels l
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ?
    `;
    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Label not found' });
        }
        res.json(row);
    });
});

// Create new label (for manual entry)
router.post('/', (req, res) => {
    const { user_id, file_name, file_path, file_type, description } = req.body;

    if (!user_id || !file_name || !file_path || !file_type) {
        return res.status(400).json({ error: 'user_id, file_name, file_path, and file_type are required' });
    }

    if (!['image', 'pdf'].includes(file_type)) {
        return res.status(400).json({ error: 'file_type must be either "image" or "pdf"' });
    }

    const sql = `
        INSERT INTO labels (user_id, file_name, file_path, file_type, description)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.run(sql, [user_id, file_name, file_path, file_type, description || null], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Label created successfully' });
    });
});

// Update label
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { file_name, file_path, file_type, description } = req.body;

    // Check if label exists
    const checkSql = 'SELECT id FROM labels WHERE id = ?';
    db.get(checkSql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Label not found' });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (file_name !== undefined) {
            updates.push('file_name = ?');
            params.push(file_name);
        }
        if (file_path !== undefined) {
            updates.push('file_path = ?');
            params.push(file_path);
        }
        if (file_type !== undefined) {
            if (!['image', 'pdf'].includes(file_type)) {
                return res.status(400).json({ error: 'file_type must be either "image" or "pdf"' });
            }
            updates.push('file_type = ?');
            params.push(file_type);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update provided' });
        }

        params.push(id);
        const sql = `UPDATE labels SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, params, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Label not found' });
            }
            res.json({ message: 'Label updated successfully', changes: this.changes });
        });
    });
});

// Delete label
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM labels WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Label not found' });
        }
        res.json({ message: 'Label deleted successfully', changes: this.changes });
    });
});

// Get labels by user
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = `
        SELECT l.*, u.telegram_username as user_name
        FROM labels l
        JOIN users u ON l.user_id = u.id
        WHERE l.user_id = ?
        ORDER BY l.uploaded_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Merge PDFs for printing
router.get('/print/merge', async (req, res) => {
    try {
        const { user_id } = req.query;

        // Get labels to merge
        let query = `
            SELECT l.file_path
            FROM labels l
            WHERE l.file_type = 'pdf'
        `;
        const params = [];

        if (user_id) {
            query += ' AND l.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY l.uploaded_at ASC';

        db.all(query, params, async (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (rows.length === 0) {
                return res.status(404).json({ error: 'No PDF labels found to merge' });
            }

            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();

            // Add each PDF to the merged document
            for (const row of rows) {
                try {
                    const filePath = path.join(__dirname, '..', '..', row.file_path);
                    if (!fs.existsSync(filePath)) {
                        console.warn(`File not found: ${filePath}`);
                        continue;
                    }

                    const pdfBytes = fs.readFileSync(filePath);
                    const pdf = await PDFDocument.load(pdfBytes);
                    const copiedPages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach(page => pdfDoc.addPage(page));
                } catch (error) {
                    console.error(`Error processing PDF ${row.file_path}:`, error.message);
                    continue;
                }
            }

            // Save the merged PDF
            const mergedPdfBytes = await pdfDoc.save();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const mergedFileName = `merged_labels_${timestamp}.pdf`;
            const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
            const mergedFilePath = path.join(uploadsDir, mergedFileName);

            fs.writeFileSync(mergedFilePath, mergedPdfBytes);

            // Return the merged file
            res.download(mergedFilePath, mergedFileName, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
                // Optionally delete the file after sending
                // fs.unlinkSync(mergedFilePath);
            });
        });
    } catch (error) {
        console.error('Error merging PDFs:', error.message);
        res.status(500).json({ error: 'Failed to merge PDFs' });
    }
});

// Get label statistics
router.get('/stats/summary', (req, res) => {
    const sql = `
        SELECT
            COUNT(l.id) as total_labels,
            SUM(CASE WHEN l.file_type = 'pdf' THEN 1 ELSE 0 END) as pdf_labels,
            SUM(CASE WHEN l.file_type = 'image' THEN 1 ELSE 0 END) as image_labels,
            COUNT(DISTINCT l.user_id) as total_users,
            AVG(u.price_per_label) as avg_price_per_label
        FROM labels l
        JOIN users u ON l.user_id = u.id
    `;
    db.get(sql, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row || {
            total_labels: 0,
            pdf_labels: 0,
            image_labels: 0,
            total_users: 0,
            avg_price_per_label: 0
        });
    });
});

module.exports = router;