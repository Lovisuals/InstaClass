const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs').promises;
const app = express();
app.use(express.json());

const TOKEN = '8223812586:AAG1IK2rUnE_7cCBeCuNDORyHMdpjvwf-Dc'; // @InstaClassEduBot token
const ASSISTANT_TOKEN = '8262302981:AAErNeli9h62ktw4ADsHG_wDujbz7EGKpU8'; // @InstaClassAssistantBot token
const bot = new TelegramBot(TOKEN, { polling: true });
const assistantBot = new TelegramBot(ASSISTANT_TOKEN, { polling: true });
const GROUP_ID = '-1002775348142'; // InstaClassLive channel ID
const GROUP_LINK = 't.me/instaclasshq'; // InstaClassLive channel link

// Load lectures from JSON
async function loadLectures() {
  try {
    const data = await fs.readFile('lectures.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save lectures to JSON
async function saveLectures(lectures) {
  await fs.writeFile('lectures.json', JSON.stringify(lectures, null, 2));
}

// Schedule announcement
function scheduleAnnouncement(topic, time) {
  const now = new Date();
  const scheduledTime = new Date(time);
  const delay = scheduledTime - now;

  if (delay > 0) {
    setTimeout(() => {
      bot.sendMessage(GROUP_ID, `📚 Live lecture on "${topic}" starts now! Join: ${GROUP_LINK}`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Join Live', url: GROUP_LINK }]],
        },
      });
    }, delay);
  }
}

// Handle /start command for @InstaClassEduBot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to InstaClass! Open the Web App to continue.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open Dashboard', web_app: { url: 'http://127.0.0.1:8080/app.html' } }]]
    }
  });
});

// Handle Web App data
bot.on('web_app_data', (msg) => {
  const chatId = msg.chat.id;
  try {
    const data = JSON.parse(msg.web_app_data.data);
    console.log('Received Web App data:', data);

    if (data.action === 'start_livestream') {
      bot.sendMessage(chatId, 'Starting livestream... (feature coming soon)');
    } else if (data.action === 'view_chat_history') {
      bot.sendMessage(chatId, 'Fetching chat history... (feature coming soon)');
    } else if (data.action === 'open_whiteboard') {
      bot.sendMessage(chatId, 'Whiteboard opened! Draw and collaborate.');
    } else if (data.action === 'set_whiteboard_color') {
      bot.sendMessage(chatId, `Whiteboard color set to ${data.color}`);
    } else if (data.action === 'clear_whiteboard') {
      bot.sendMessage(chatId, 'Whiteboard cleared!');
    } else if (data.action === 'schedule_lecture') {
      const { topic, time } = data;
      if (topic && time) {
        scheduleAnnouncement(topic, time);
        bot.sendMessage(chatId, `Lecture "${topic}" scheduled for ${new Date(time).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`);
        loadLectures().then(lectures => {
          lectures.push({ topic, time });
          saveLectures(lectures);
        });
      } else {
        bot.sendMessage(chatId, 'Error: Please provide lecture topic and time.');
      }
    }
  } catch (error) {
    console.error('Web App data error:', error);
    bot.sendMessage(chatId, 'Error processing Web App data. Please try again.');
  }
});

// Assistant bot commands
assistantBot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  assistantBot.sendMessage(chatId, 'Hi! I’m the InstaClass Assistant, here to guide you. Ask me how to use the platform, e.g., "How do I schedule a lecture?" or "How to use the whiteboard?"');
});

assistantBot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.toLowerCase();
  if (text.includes('schedule a lecture') || text.includes('how to schedule')) {
    assistantBot.sendMessage(chatId, 'To schedule a lecture:\n1. Open @InstaClassEduBot, send /start.\n2. Click "Open Dashboard".\n3. Go to "Schedule a Live Lecture".\n4. Enter a topic (e.g., "English Grammar") and time (e.g., 2025-07-30T23:00).\n5. Click "Schedule Lecture".\nYou’ll get a confirmation, and the lecture will be announced in t.me/instaclasshq!');
  } else if (text.includes('start livestream') || text.includes('how to livestream')) {
    assistantBot.sendMessage(chatId, 'To start a livestream:\n1. Go to t.me/instaclasshq.\n2. Tap the channel name (mobile) or click the chat icon (desktop).\n3. Select "Start Live Stream".\nEnsure you’re an admin in the channel!');
  } else if (text.includes('whiteboard') || text.includes('how to use whiteboard')) {
    assistantBot.sendMessage(chatId, 'To use the whiteboard:\n1. Open @InstaClassEduBot, send /start.\n2. Click "Open Dashboard".\n3. Click "Open/Close Whiteboard".\n4. Draw with your mouse or touch, select colors (black, red, blue), clear, or save as an image.\nGreat for interactive teaching!');
  } else if (text !== '/start') {
    assistantBot.sendMessage(chatId, 'I’m here to help! Try asking something like "How do I schedule a lecture?" or "How to use the whiteboard?".');
  }
});

// API to schedule a lecture
app.post('/schedule', async (req, res) => {
  const { topic, time } = req.body;
  if (topic && time) {
    const lectures = await loadLectures();
    lectures.push({ topic, time });
    await saveLectures(lectures);
    scheduleAnnouncement(topic, time);
    res.status(200).send('Lecture scheduled');
  } else {
    res.status(400).send('Missing topic or time');
  }
});

// Webhook endpoint for testing
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Server running on port 3000'));