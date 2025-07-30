// C:\Users\CLOUD9\Documents\AgentX\InstaClass-Project\dashboard.js
const Telegram = window.Telegram.WebApp;
Telegram.expand();

function startLivestream() {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'start_livestream' }));
  Telegram.showAlert('Livestream request sent!');
}

function viewChatHistory() {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'view_chat_history' }));
  Telegram.showAlert('Chat history request sent!');
}

function openWhiteboard() {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'open_whiteboard' }));
  Telegram.showAlert('Whiteboard request sent!');
}

function setColor(color) {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'set_whiteboard_color', color }));
  Telegram.showAlert(`Color ${color} selected!`);
}

function clearWhiteboard() {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'clear_whiteboard' }));
  Telegram.showAlert('Whiteboard cleared!');
}