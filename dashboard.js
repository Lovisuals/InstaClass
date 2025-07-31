const Telegram = window.Telegram.WebApp;
Telegram.ready();
Telegram.expand();

const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;
let currentColor = 'black';
let currentStickyColor = '#fff3cd'; // Default yellow
let ws;
let textInput = document.getElementById('text-input');
let frameSelect = document.getElementById('frame-size');
let templateSelect = document.getElementById('template-select');
let stickyColorSelect = document.getElementById('sticky-color');
let textX, textY;
let stickyNotes = [];

// Initialize landscape canvas
function initCanvas() {
  const container = document.getElementById('whiteboard-container');
  const maxWidth = container.offsetWidth - 20;
  const maxHeight = window.innerHeight * 0.6;
  let width, height;

  switch (frameSelect.value) {
    case 'android':
    case 'iphone':
    case 'pc':
    case 'youtube':
      width = Math.min(maxWidth, 800);
      height = width * (9 / 16);
      break;
    case 'instagram':
      width = Math.min(maxWidth, 600);
      height = width;
      break;
    default:
      width = maxWidth;
      height = width * (9 / 16);
      if (height > maxHeight) {
        height = maxHeight;
        width = height * (16 / 9);
      }
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  applyTemplate();
}
initCanvas();

// Handle window resize
window.addEventListener('resize', () => {
  const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  initCanvas();
  ctx.putImageData(temp, 0, 0);
  stickyNotes.forEach(note => {
    document.body.appendChild(note.element);
    note.element.style.left = `${Math.min(note.x, canvas.width - 100)}px`;
    note.element.style.top = `${Math.min(note.y, canvas.height - 100)}px`;
  });
});

// Set frame size
function setFrameSize() {
  console.log('Setting frame size:', frameSelect.value);
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

// Set sticky note color
function setStickyColor() {
  currentStickyColor = stickyColorSelect.value;
  Telegram.WebApp.showAlert(`Sticky note color set to ${stickyColorSelect.options[stickyColorSelect.selectedIndex].text}!`);
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
      stickyNotes.forEach(note => note.element.remove());
      stickyNotes = [];
      applyTemplate();
    } else if (data.type === 'text') {
      ctx.font = '16px Poppins';
      ctx.fillStyle = data.color;
      wrapText(data.text, data.x, data.y);
    } else if (data.type === 'sticky') {
      addStickyNote(data.x, data.y, data.text, data.color, false);
    } else if (data.type === 'remove_sticky') {
      const note = stickyNotes.find(n => n.id === data.id);
      if (note) {
        note.element.remove();
        stickyNotes = stickyNotes.filter(n => n.id !== data.id);
      }
    } else if (data.type === 'remove_all_sticky') {
      stickyNotes.forEach(note => note.element.remove());
      stickyNotes = [];
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
  const maxWidth = canvas.width - x - 10;
  const maxHeight = canvas.height - 10;
  const lineHeight = 20;
  let words = text.split(' ');
  let line = '';
  let currentY = y;

  if (currentY < 16) currentY = 16;
  if (currentY > maxHeight) {
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
      if (currentY > maxHeight) {
        ctx.fillText('...', x, currentY - lineHeight);
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
function addStickyNote(x = 50, y = 50, text = 'New Note', color = currentStickyColor, broadcast = true) {
  const noteId = Date.now() + Math.random(); // Unique ID
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.style.background = color;
  note.style.border = `1px solid ${darkenColor(color)}`;
  note.style.left = `${Math.min(x, canvas.width - 100)}px`;
  note.style.top = `${Math.min(y, canvas.height - 100)}px`;

  const header = document.createElement('div');
  header.className = 'sticky-note-header';
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'sticky-note-delete';
  deleteBtn.innerText = 'X';
  deleteBtn.onclick = () => removeStickyNote(noteId);
  header.appendChild(deleteBtn);
  note.appendChild(header);

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.width = '100%';
  textarea.style.height = 'calc(100% - 20px)';
  textarea.style.background = 'transparent';
  textarea.style.border = 'none';
  textarea.style.fontSize = '12px';
  textarea.style.fontFamily = 'Poppins, sans-serif';
  note.appendChild(textarea);

  document.body.appendChild(note);
  stickyNotes.push({ id: noteId, element: note, x, y, color });

  // Drag functionality
  let isDragging = false;
  let offsetX, offsetY;
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - note.offsetLeft;
    offsetY = e.clientY - note.offsetTop;
  });
  header.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - note.offsetLeft;
    offsetY = touch.clientY - note.offsetTop;
  }, { passive: false });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      note.style.left = `${Math.min(Math.max(e.clientX - offsetX, 0), canvas.width - 100)}px`;
      note.style.top = `${Math.min(Math.max(e.clientY - offsetY, 0), canvas.height - 100)}px`;
    }
  });
  document.addEventListener('touchmove', (e) => {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      note.style.left = `${Math.min(Math.max(touch.clientX - offsetX, 0), canvas.width - 100)}px`;
      note.style.top = `${Math.min(Math.max(touch.clientY - offsetY, 0), canvas.height - 100)}px`;
    }
  }, { passive: false });
  document.addEventListener('mouseup', () => isDragging = false);
  document.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDragging = false;
  }, { passive: false });

  if (broadcast && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'sticky', x, y, text, color }));
  }
  Telegram.WebApp.showAlert('Sticky note added!');
}

// Remove sticky note
function removeStickyNote(id) {
  const note = stickyNotes.find(n => n.id === id);
  if (note) {
    note.element.remove();
    stickyNotes = stickyNotes.filter(n => n.id !== id);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'remove_sticky', id }));
    }
    Telegram.WebApp.showAlert('Sticky note removed!');
  }
}

// Remove all sticky notes
function removeAllStickyNotes() {
  stickyNotes.forEach(note => note.element.remove());
  stickyNotes = [];
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'remove_all_sticky' }));
  }
  Telegram.WebApp.showAlert('All sticky notes removed!');
}

// Darken color for border
function darkenColor(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, r - 30);
  g = Math.max(0, g - 30);
  b = Math.max(0, b - 30);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Mock web search (replace with actual API in production)
function performWebSearch() {
  const query = document.getElementById('web-search').value.trim();
  if (!query) {
    Telegram.WebApp.showAlert('Please enter a search query.');
    return;
  }
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.classList.remove('search-results-hidden');
  resultsDiv.innerHTML = '';

  // Mock search results
  const mockResults = [
    { title: `Result 1 for "${query}"`, url: `https://example.com/?q=${encodeURIComponent(query)}` },
    { title: `Result 2 for "${query}"`, url: `https://example.org/?q=${encodeURIComponent(query)}` },
  ];

  mockResults.forEach(result => {
    const div = document.createElement('div');
    div.className = 'search-result';
    div.innerHTML = `<a href="${result.url}" target="_blank">${result.title}</a>`;
    div.onclick = () => {
      addStickyNote(50, 50, result.title + '\n' + result.url, currentStickyColor);
      resultsDiv.classList.add('search-results-hidden');
    };
    resultsDiv.appendChild(div);
  });

  Telegram.WebApp.showAlert('Search completed! Click a result to add as a sticky note.');
  document.getElementById('web-search').value = '';
}

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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
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
  drawing = false;
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
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);
    const dataURL = tempCanvas.toDataURL('image/png');
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