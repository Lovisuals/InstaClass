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

document.getElementById('schedule-lecture').addEventListener('click', () => {
  const topic = document.getElementById('lecture-topic').value;
  const time = document.getElementById('lecture-time').value;
  if (topic && time) {
    Telegram.WebApp.sendData(JSON.stringify({ action: 'schedule_lecture', topic, time }));
    Telegram.WebApp.showAlert('Lecture scheduled successfully!');
    document.getElementById('schedule-status').innerText = 'Lecture scheduled!';
  } else {
    Telegram.WebApp.showAlert('Please enter topic and time.');
    document.getElementById('schedule-status').innerText = 'Missing topic or time.';
  }
});