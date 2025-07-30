// C:\Users\CLOUD9\Documents\AgentX\InstaClass-Project\server.js
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
app.use(express.json());

const TOKEN = 'YOUR_BOT_TOKEN'; // 8223812586:AAG1IK2rUnE_7cCBeCuNDORyHMdpjvwf-Dc
const bot = new TelegramBot(TOKEN, { polling: true });

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to InstaClass! Open the Web App to continue.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open Dashboard', web_app: { url: 'https://lovisuals.github.io/InstaClass/app.html' } }]]
    }
  });
});

// Handle Web App data
bot.on('web_app_data', (msg) => {
  const chatId = msg.chat.id;
  const data = JSON.parse(msg.web_app_data.data);
  console.log('Received Web App data:', data);

  if (data.action === 'start_livestream') {
    bot.sendMessage(chatId, 'Starting livestream... (feature coming soon)');
  } else if (data.action === 'view_chat_history') {
    bot.sendMessage(chatId, 'Fetching chat history... (feature coming soon)');
  } else if (data.action === 'open_whiteboard') {
    bot.sendMessage(chatId, 'Opening whiteboard... (feature coming soon)');
  } else if (data.action === 'set_whiteboard_color') {
    bot.sendMessage(chatId, `Whiteboard color set to ${data.color}`);
  } else if (data.action === 'clear_whiteboard') {
    bot.sendMessage(chatId, 'Whiteboard cleared!');
  }
});

// Webhook endpoint for testing
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Server running on port 3000'));