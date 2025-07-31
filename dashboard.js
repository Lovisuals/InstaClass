const Telegram = window.Telegram.WebApp;
Telegram.ready();
Telegram.expand();

const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;
let currentColor = 'black';
let ws;
let textInput = document.getElementById('text-input');
let frameSelect = document.getElementById('frame-size');
let textX, textY;

// Initialize canvas with selected frame size
function initCanvas() {
  const container = document.getElementById('whiteboard-container');
  const maxWidth = container.offsetWidth - 20; // Account for padding
  let width, height;

  switch (frameSelect.value) {
    case 'android':
    case 'iphone':
      width = Math.min(maxWidth, 360); // Typical mobile width
      height = width * (16 / 9); // 9:16 aspect ratio
      break;
    case 'pc':
    case 'youtube':
      width = Math.min(maxWidth, 800); // Typical widescreen
      height = width * (9 / 16); // 16:9 aspect ratio
      break;
    case 'instagram':
      width = Math.min(maxWidth, 600); // Square
      height = width; // 1:1 aspect ratio
      break;
    default: // responsive
      width = maxWidth;
      height = Math.min(window.innerHeight * 0.6, 600); // 60vh or max 600px
  }

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
initCanvas();

// Handle window resize
window.addEventListener('resize', () => {
  const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  initCanvas();
  ctx.putImageData(temp, 0, 0);
});

// Set frame size
function setFrameSize() {
  const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  initCanvas();
  ctx.putImageData(temp, 0, 0);
  Telegram.WebApp.showAlert(`Frame size set to ${frameSelect.value}!`);
}

// Initialize WebSocket
function connectWebSocket() {
  ws = new WebSocket('ws://localhost:8081');
  ws.onopen = () => {
    console.log('Connected to WebSocket server');
    Telegram.WebApp.showAlert('WebSocket connected!');
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'draw') {
      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (data.type === 'clear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (data.type === 'text') {
      ctx.font = '16px Poppins';
      ctx.fillStyle = data.color;
      ctx.fillText(data.text, data.x, data.y);
    }
  };
  ws.onerror = () => {
    console.log('WebSocket error, reconnecting...');
    setTimeout(connectWebSocket, 1000);
  };
  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting...');
    setTimeout(connectWebSocket, 1000);
  };
}

connectWebSocket();

// Mouse events
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  if (textInput.value.trim()) {
    textX = e.clientX - rect.left;
    textY = e.clientY - rect.top;
    placeText();
  } else {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (drawing) {
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const endX = startX + 1;
    const endY = startY + 1;
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'draw', startX, startY, endX, endY, color: currentColor }));
    }
  }
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
  ctx.closePath();
});

canvas.addEventListener('mouseout', () => {
  drawing = false;
  ctx.closePath();
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  if (textInput.value.trim()) {
    textX = touch.clientX - rect.left;
    textY = touch.clientY - rect.top;
    placeText();
  } else {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (drawing) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const startX = touch.clientX - rect.left;
    const startY = touch.clientY - rect.top;
    const endX = startX + 1;
    const endY = startY + 1;
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'draw', startX, startY, endX, endY, color: currentColor }));
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  drawing = false;
  ctx.closePath();
}, { passive: false });

// Place text on canvas with boundary check
function placeText() {
  const text = textInput.value.trim();
  if (text && textX && textY) {
    ctx.font = '16px Poppins';
    const textWidth = ctx.measureText(text).width;
    const maxX = canvas.width - textWidth - 10; // 10px padding
    const maxY = canvas.height - 10; // 10px padding
    const adjustedX = Math.min(textX, maxX); // Prevent overflow
    const adjustedY = Math.max(textY, 16); // Ensure text is not too high

    if (adjustedX < 0 || adjustedY > canvas.height) {
      Telegram.WebApp.showAlert('Text cannot be placed outside canvas boundaries.');
      return;
    }

    ctx.fillStyle = currentColor;
    ctx.fillText(text, adjustedX, adjustedY);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'text', text, x: adjustedX, y: adjustedY, color: currentColor }));
    }
    textInput.value = '';
    Telegram.WebApp.showAlert('Text added to whiteboard!');
  }
}

function toggleWhiteboard() {
  const container = document.getElementById('whiteboard-container');
  container.classList.toggle('whiteboard-hidden');
  initCanvas(); // Re-init canvas size when toggled
  Telegram.WebApp.sendData(JSON.stringify({ action: 'open_whiteboard' }));
  Telegram.WebApp.showAlert('Whiteboard toggled!');
}

function setColor(color) {
  currentColor = color;
  Telegram.WebApp.sendData(JSON.stringify({ action: 'set_whiteboard_color', color }));
  Telegram.WebApp.showAlert(`Color ${color} selected!`);
}

function clearWhiteboard() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'clear' }));
  }
  Telegram.WebApp.sendData(JSON.stringify({ action: 'clear_whiteboard' }));
  Telegram.WebApp.showAlert('Whiteboard cleared!');
}

function saveWhiteboard() {
  try {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'whiteboard.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Telegram.WebApp.showAlert('Whiteboard saved as image!');
  } catch (error) {
    console.error('Save error:', error);
    Telegram.WebApp.showAlert('Failed to save whiteboard. Please try again.');
  }
}

function startLivestream() {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'start_livestream' }));
  Telegram.WebApp.showAlert('Livestream request sent!');
}

function viewChatHistory() {
  Telegram.WebApp.sendData(JSON.stringify({ action: 'view_chat_history' }));
  Telegram.WebApp.showAlert('Chat history request sent!');
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