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
let templateSelect = document.getElementById('template-select');
let textX, textY;
let stickyNotes = [];

// Initialize canvas with adaptive sizing
function initCanvas() {
  const container = document.getElementById('whiteboard-container');
  const maxWidth = container.offsetWidth - 20; // Account for padding
  const maxHeight = Math.min(window.innerHeight * 0.6, 600); // 60vh or max 600px
  let width, height;

  switch (frameSelect.value) {
    case 'android':
    case 'iphone':
      width = Math.min(maxWidth, 360); // Mobile width
      height = width * (16 / 9); // 9:16
      break;
    case 'pc':
    case 'youtube':
      width = Math.min(maxWidth, 800); // Widescreen
      height = width * (9 / 16); // 16:9
      break;
    case 'instagram':
      width = Math.min(maxWidth, 600); // Square
      height = width; // 1:1
      break;
    default: // responsive
      width = maxWidth;
      height = maxHeight;
  }

  // Scale canvas to fit device screen
  if (height > maxHeight) {
    height = maxHeight;
    width = height * (width / height); // Maintain aspect ratio
  }
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  applyTemplate(); // Apply selected template
}
initCanvas();

// Handle window resize
window.addEventListener('resize', () => {
  const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  initCanvas();
  ctx.putImageData(temp, 0, 0);
  stickyNotes.forEach(note => document.body.appendChild(note.element));
});

// Set frame size
function setFrameSize() {
  const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  initCanvas();
  ctx.putImageData(temp, 0, 0);
  Telegram.WebApp.showAlert(`Frame size set to ${frameSelect.value}!`);
}

// Apply template
function applyTemplate() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (templateSelect.value === 'grid') {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
  Telegram.WebApp.showAlert(`Template set to ${templateSelect.value}!`);
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
      applyTemplate();
    } else if (data.type === 'text') {
      ctx.font = '16px Poppins';
      ctx.fillStyle = data.color;
      wrapText(data.text, data.x, data.y);
    } else if (data.type === 'sticky') {
      addStickyNote(data.x, data.y, data.text, false);
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

// Wrap text to fit canvas
function wrapText(text, x, y) {
  ctx.font = '16px Poppins';
  const maxWidth = canvas.width - x - 10; // 10px padding
  const lineHeight = 20;
  let words = text.split(' ');
  let line = '';
  let currentY = y;

  if (currentY < 16) currentY = 16; // Ensure text is not too high
  if (currentY > canvas.height - 10) {
    Telegram.WebApp.showAlert('Text cannot be placed outside canvas boundaries.');
    return;
  }

  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + ' ';
    let testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
      if (currentY > canvas.height - 10) {
        ctx.fillText('...', x, currentY);
        Telegram.WebApp.showAlert('Text truncated to fit canvas.');
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

// Place text on canvas
function placeText() {
  const text = textInput.value.trim();
  if (text && textX && textY) {
    const adjustedX = Math.min(textX, canvas.width - 10);
    if (adjustedX < 0 || textY > canvas.height - 10) {
      Telegram.WebApp.showAlert('Text cannot be placed outside canvas boundaries.');
      return;
    }
    ctx.fillStyle = currentColor;
    wrapText(text, adjustedX, textY);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'text', text, x: adjustedX, y: textY, color: currentColor }));
    }
    textInput.value = '';
    Telegram.WebApp.showAlert('Text added to whiteboard!');
  }
}

// Add sticky note
function addStickyNote(x = 50, y = 50, text = 'New Note', broadcast = true) {
  const note = document.createElement('textarea');
  note.className = 'sticky-note';
  note.style.left = `${x}px`;
  note.style.top = `${y}px`;
  note.value = text;
  document.body.appendChild(note);
  stickyNotes.push({ element: note, x, y });

  // Drag functionality
  let isDragging = false;
  let offsetX, offsetY;
  note.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - note.offsetLeft;
    offsetY = e.clientY - note.offsetTop;
  });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      note.style.left = `${e.clientX - offsetX}px`;
      note.style.top = `${e.clientY - offsetY}px`;
    }
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Broadcast sticky note
  if (broadcast && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'sticky', x, y, text }));
  }
  Telegram.WebApp.showAlert('Sticky note added!');
}

// Basic shape recognition
function recognizeShape(points) {
  if (points.length < 10) return null;
  const dx = points[points.length - 1].x - points[0].x;
  const dy = points[points.length - 1].y - points[0].y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 10) { // Likely a circle
    const centerX = (points[0].x + points[points.length - 1].x) / 2;
    const centerY = (points[0].y + points[points.length - 1].y) / 2;
    const radius = Math.max(...points.map(p => Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)));
    return { type: 'circle', x: centerX, y: centerY, radius };
  }
  return null;
}

// Mouse events
let drawPoints = [];
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  if (textInput.value.trim()) {
    textX = e.clientX - rect.left;
    textY = e.clientY - rect.top;
    placeText();
  } else {
    drawing = true;
    drawPoints = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (drawing) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawPoints.push({ x, y });
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'draw', startX: x - 1, startY: y - 1, endX: x, endY: y, color: currentColor }));
    }
  }
});

canvas.addEventListener('mouseup', () => {
  if (drawing) {
    const shape = recognizeShape(drawPoints);
    if (shape && shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  drawing = false;
  drawPoints = [];
  ctx.closePath();
});

canvas.addEventListener('mouseout', () => {
  drawing = false;
  drawPoints = [];
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
    drawPoints = [{ x: touch.clientX - rect.left, y: touch.clientY - rect.top }];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (drawing) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    drawPoints.push({ x, y });
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'draw', startX: x - 1, startY: y - 1, endX: x, endY: y, color: currentColor }));
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (drawing) {
    const shape = recognizeShape(drawPoints);
    if (shape && shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  drawing = false;
  drawPoints = [];
  ctx.closePath();
}, { passive: false });

function toggleWhiteboard() {
  const container = document.getElementById('whiteboard-container');
  container.classList.toggle('whiteboard-hidden');
  initCanvas();
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
  stickyNotes.forEach(note => note.element.remove());
  stickyNotes = [];
  applyTemplate();
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