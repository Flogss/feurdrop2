const express = require('express');
const router = express.Router();
const TelegramBot = require('telegram-bot-api');
const path = require('path');
const fs = require('fs');
const db = require('../models');

// Initialize Telegram bot (will be initialized when token is available)
let bot = null;

// Initialize bot with token from database
function initializeBot() {
    db.get('SELECT telegram_bot_token FROM settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
        if (err) {
            console.error('Error getting bot token:', err.message);
            return;
        }
        if (row && row.telegram_bot_token) {
            try {
                bot = new TelegramBot({ token: row.telegram_bot_token });
                console.log('Telegram bot initialized');

                // Set up webhook or polling
                // For development, we'll use polling
                bot.on('message', async (msg) => {
                    try {
                        await handleTelegramMessage(msg);
                    } catch (error) {
                        console.error('Error handling telegram message:', error);
                    }
                });

                bot.on('error', (err) => {
                    console.error('Telegram bot error:', err);
                });
            } catch (error) {
                console.error('Error initializing Telegram bot:', error.message);
            }
        }
    });
}

// Initialize bot on module load
initializeBot();

// Handle incoming Telegram messages
async function handleTelegramMessage(msg) {
    const chatId = msg.chat.id;

    // Handle /start command
    if (msg.text === '/start') {
        await bot.sendMessage(chatId, `
Welcome to the Logistics Management Bot!

You can send shipping labels (images or PDFs) and I'll process them for you.

Commands:
/start - Show this help
/market this message
/help - Show help
/status - Check bot status
/stats - Get your statistics
        `);
        return;
    }

    // Handle /help command
    if (msg.text === '/help') {
        await bot.sendMessage(chatId, `
Available commands:
/start - Show welcome message
/help - Show this help
/status - Check bot connection status
/stats - Get your label statistics
        `);
        return;
    }

    // Handle /status command
    if (msg.text === '/status') {
        const statusMsg = bot ? 'Bot is connected and ready to receive labels!' : 'Bot is not connected. Please check the bot token in settings.';
        await bot.sendMessage(chatId, statusMsg);
        return;
    }

    // Handle /stats command
    if (msg.text === '/stats') {
        if (!msg.from.username) {
            await bot.sendMessage(chatId, 'Please set a username in your Telegram settings to use this feature.');
            return;
        }

        const userSql = 'SELECT id, price_per_label FROM users WHERE telegram_username = ?';
        db.get(userSql, [msg.from.username], (err, userRow) => {
            if (err) {
                bot.sendMessage(chatId, 'Error retrieving your statistics.');
                return;
            }

            if (!userRow) {
                bot.sendMessage(chatId, 'You are not registered yet. Send a label to get started!');
                return;
            }

            const statsSql = `
                SELECT
                    COUNT(l.id) as total_labels,
                    SUM(CASE WHEN l.file_type = 'pdf' THEN 1 ELSE 0 END) as pdf_labels,
                    SUM(CASE WHEN l.file_type = 'image' THEN 1 ELSE 0 END) as image_labels
                FROM labels l
                WHERE l.user_id = ?
            `;

            db.get(statsSql, [userRow.id], (err, statsRow) => {
                if (err) {
                    bot.sendMessage(chatId, 'Error retrieving your statistics.');
                    return;
                }

                const totalEarnings = (statsRow.total_labels || 0) * (userRow.price_per_label || 4.0);

                bot.sendMessage(chatId, `
Your Label Statistics:
• Total labels sent: ${statsRow.total_labels || 0}
• PDF labels: ${statsRow.pdf_labels || 0}
• Image labels: ${statsRow.image_labels || 0}
• Price per label: €${userRow.price_per_label || 4.0}
• Total earnings: €${totalEarnings.toFixed(2)}
                `);
            });
        });
        return;
    }

    // Handle photo messages
    if (msg.photo && msg.photo.length > 0) {
        await handlePhotoMessage(msg);
        return;
    }

    // Handle document messages (PDFs)
    if (msg.document && msg.document.mime_type === 'application/pdf') {
        await handleDocumentMessage(msg);
        return;
    }

    // Handle other message types
    await bot.sendMessage(chatId, 'Please send a photo (image) or PDF document for processing. Use /help for available commands.');
}

// Handle photo messages
async function handlePhotoMessage(msg) {
    try {
        const chatId = msg.chat.id;
        const username = msg.from.username || `user_${msg.from.id}`;

        // Send processing message
        const processingMsg = await bot.sendMessage(chatId, '📥 Received your photo! Processing...');

        // Get the largest photo size
        const photo = msg.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        );

        // Get file info
        const fileInfo = await bot.getFile(photo.file_id);

        // Download file
        const filePath = `photos/${photo.file_id}${path.extname(fileInfo.file_path)}`;
        const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;

        // Download the file
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();

        // Save file locally
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `photo_${Date.now()}${path.extname(fileInfo.file_path)}`;
        const filePathLocal = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePathLocal, Buffer.from(buffer));

        // Save to database
        const userSql = 'SELECT id FROM users WHERE telegram_username = ?';
        db.get(userSql, [username], (err, userRow) => {
            if (err) {
                bot.editMessageText('❌ Error saving your photo: Database error', { chat_id: chatId, message_id: processingMsg.message_id });
                return;
            }

            let userId;
            if (userRow) {
                userId = userRow.id;
            } else {
                // Create new user
                const insertUserSql = 'INSERT INTO users (telegram_username) VALUES (?)';
                db.run(insertUserSql, [username], function(err) {
                    if (err) {
                        bot.editMessageText('❌ Error saving your photo: Database error', { chat_id: chatId, message_id: processingMsg.message_id });
                        return;
                    }
                    userId = this.lastID;

                    // Save label record
                    saveLabelRecord(userId, fileName, 'image', chatId, processingMsg.message_id);
                });
                return;
            }

            // Save label record for existing user
            saveLabelRecord(userId, fileName, 'image', chatId, processingMsg.message_id);
        });

    } catch (error) {
        console.error('Error handling photo message:', error);
        bot.sendMessage(msg.chat.id, '❌ Sorry, there was an error processing your photo. Please try again.');
    }
}

// Handle document messages (PDFs)
async function handleDocumentMessage(msg) {
    try {
        const chatId = msg.chat.id;
        const username = msg.from.username || `user_${msg.from.id}`;
        const document = msg.document;

        // Validate file type
        if (document.mime_type !== 'application/pdf') {
            await bot.sendMessage(chatId, '❌ Only PDF documents are supported for label processing.');
            return;
        }

        // Send processing message
        const processingMsg = await bot.sendMessage(chatId, '📥 Received your PDF! Processing...');

        // Get file info
        const fileInfo = await bot.getFile(document.file_id);

        // Download file
        const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();

        // Save file locally
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `document_${Date.now()}.pdf`;
        const filePathLocal = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePathLocal, Buffer.from(buffer));

        // Save to database
        const userSql = 'SELECT id FROM users WHERE telegram_username = ?';
        db.get(userSql, [username], (err, userRow) => {
            if (err) {
                bot.editMessageText('❌ Error saving your PDF: Database error', { chat_id: chatId, message_id: processingMsg.message_id });
                return;
            }

            let userId;
            if (userRow) {
                userId = userRow.id;
            } else {
                // Create new user
                const insertUserSql = 'INSERT INTO users (telegram_username) VALUES (?)';
                db.run(insertUserSql, [username], function(err) {
                    if (err) {
                        bot.editMessageText('❌ Error saving your PDF: Database error', { chat_id: chatId, message_id: processingMsg.message_id });
                        return;
                    }
                    userId = this.lastID;

                    // Save label record
                    saveLabelRecord(userId, fileName, 'pdf', chatId, processingMsg.message_id);
                });
                return;
            }

            // Save label record for existing user
            saveLabelRecord(userId, fileName, 'pdf', chatId, processingMsg.message_id);
        });

    } catch (error) {
        console.error('Error handling document message:', error);
        bot.sendMessage(msg.chat.id, '❌ Sorry, there was an error processing your PDF. Please try again.');
    }
}

// Save label record to database
function saveLabelRecord(userId, fileName, fileType, chatId, processingMsgId) {
    const insertLabelSql = `
        INSERT INTO labels (user_id, file_name, file_path, file_type)
        VALUES (?, ?, ?, ?)
    `;

    db.run(insertLabelSql, [userId, fileName, `uploads/${fileName}`, fileType], function(err) {
        if (err) {
            const botInstance = bot; // Capture bot reference
            botInstance.editMessageText('❌ Error saving your label: Database error', {
                chat_id: chatId,
                message_id: processingMsgId
            });
            return;
        }

        // Get updated stats for summary
        const stats message
        const statsSql = `
            SELECT
                COUNT(l.id) as total_labels,
                u.price_per_label
            FROM labels l
            JOIN users u ON l.user_id = u.id
            WHERE u.id = ?
        `;

        db.get(statsSql, [userId], (err, statsRow) => {
            if (err) {
                const botInstance = bot;
                botInstance.editMessageText('✅ Label saved successfully!', {
                    chat_id: chatId,
                    message_id: processingMsgId
                });
                return;
            }

            const totalLabels = statsRow.total_labels || 0;
            const pricePerLabel = statsRow.price_per_label || 4.0;
            const totalEarnings = totalLabels * pricePerLabel;

            const successMessage = `
✅ Label saved successfully!

Your Statistics:
• Total labels: ${totalLabels}
• Price per label: €${pricePerLabel}
• Total earnings: €${totalEarnings.toFixed(2)}

Send more labels to increase your earnings!
            `;

            bot.editMessageText(successMessage.trim(), {
                chat_id: chatId,
                message_id: processingMsgId
            });

            // Send summary to configured user if notifications are enabled
            sendSummaryNotification();
        });
    });
}

// Send summary notification to configured user
async function sendSummaryNotification() {
    try {
        // Get summary user ID from settings
        const settingsSql = 'SELECT summary_user_id FROM settings ORDER BY id DESC LIMIT 1';
        db.get(settingsSql, [], async (err, settingsRow) => {
            if (err || !settingsRow || !settingsRow.summary_user_id) {
                return; // No summary user configured
            }

            const summaryUserId = settingsRow.summary_user_id;

            // Get summary data
            const summarySql = `
                SELECT
                    COUNT(l.id) as total_labels,
                    SUM(CASE WHEN l.file_type = 'pdf' THEN 1 ELSE 0 END) as pdf_labels,
                    SUM(CASE WHEN l.file_type = 'image' THEN 1 ELSE 0 END) as image_labels,
                    u.telegram_username,
                    u.price_per_label
                FROM labels l
                JOIN users u ON l.user_id = u.id
                GROUP BY u.id
                ORDER BY total_labels DESC
                LIMIT 10
            `;

            db.all(summarySql, [], (err, rows) => {
                if (err) {
                    console.error('Error getting summary data:', err.message);
                    return;
                }

                if (rows.length === 0) {
                    return;
                }

                let summaryMessage = '📊 *Label Statistics Summary* 📊\n\n';

                let grandTotalLabels = 0;
                let grandTotalEarnings = 0;

                rows.forEach((row, index) => {
                    const userEarnings = row.total_labels * (row.price_per_label || 4.0);
                    grandTotalLabels += row.total_labels;
                    grandTotalEarnings += userEarnings;

                    summaryMessage += `${index + 1}. @${row.telegram_username || 'unknown'}\n`;
                    summaryMessage += `   • Labels: ${row.total_labels} (PDF: ${row.pdf_labels}, Images: ${row.image_labels})\n`;
                    summaryMessage += `   • Earnings: €${userEarnings.toFixed(2)}\n\n`;
                });

                summaryMessage += `📈 *Grand Totals:*\n`;
                summaryMessage += `• Total Labels: ${grandTotalLabels}\n`;
                summaryMessage += `• Total Earnings: €${grandTotalEarnings.toFixed(2)}\n`;

                // Try to send message to summary user
                try {
                    await bot.sendMessage(summaryUserId, summaryMessage, { parse_mode: 'Markdown' });
                } catch (sendError) {
                    console.error('Failed to send summary notification:', sendError.message);
                }
            });
        });
    } catch (error) {
        console.error('Error sending summary notification:', error.message);
    }
}

// Webhook endpoint for Telegram (if using webhooks instead of polling)
router.post('/webhook', (req, res) => {
    if (!bot) {
        return res.status(500).send('Bot not initialized');
    }

    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Get bot status
router.get('/status', (req, res) => {
    db.get('SELECT telegram_bot_token FROM settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const isConnected = !!bot;
        res.json({
            botInitialized: isConnected,
            tokenConfigured: !!row?.telegram_bot_token,
            timestamp: new Date().toISOString()
        });
    });
});

// Test endpoint to send a message (for development)
router.post('/test-message', (req, res) => {
    const { chatId, message } = req.body;

    if (!bot) {
        return res.status(500).json({ error: 'Bot not initialized' });
    }

    if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId and message are required' });
    }

    bot.sendMessage(chatId, message)
        .then(() => res.json({ success: true, message: 'Message sent' }))
        .catch(error => res.status(500).json({ error: error.message }));
});

module.exports = router;