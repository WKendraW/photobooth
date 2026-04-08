import Peer from 'simple-peer';

let ws;
let peer;
let myStream;
let sessionCode;
let isCreator;
let photos = [];
let turnOrder = [];
let currentTurn = 0;
let myRole;

function generateCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createSession() {
  sessionCode = generateCode();
  isCreator = true;
  myRole = 'A';
  connectWS();
  document.getElementById('welcome').innerHTML = `
    <h1>Session Created</h1>
    <p>Share this code: <strong>${sessionCode}</strong></p>
    <p>Waiting for your partner to join...</p>
  `;
}

function joinSession() {
  sessionCode = document.getElementById('session-code').value.trim().toUpperCase();
  if (!sessionCode) return;
  isCreator = false;
  myRole = 'B';
  connectWS();
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('session').style.display = 'block';
}

function connectWS() {
  ws = new WebSocket('ws://localhost:5173/ws');
  ws.onopen = () => {
    console.log('WS connected');
    ws.send(JSON.stringify({ type: 'join', code: sessionCode }));
  };
  ws.onerror = (err) => {
    console.error('WS error', err);
    alert('Connection failed. Make sure the servers are running.');
  };
  ws.onmessage = handleMessage;
}

function handleMessage(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'joined') {
    if (isCreator) {
      setupPeer();
    }
  } else if (data.type === 'peer') {
    if (peer) {
      peer.signal(data.signal);
    }
  } else if (data.type === 'config') {
    turnOrder = data.turnOrder;
    updateTurn(0);
  } else if (data.type === 'photo') {
    addPhoto(data.photo, data.role);
  } else if (data.type === 'turn') {
    updateTurn(data.currentTurn);
  }
}

function setupPeer() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
    myStream = stream;
    document.getElementById('my-video').srcObject = stream;
    if (isCreator) {
      document.getElementById('welcome').style.display = 'none';
      document.getElementById('session').style.display = 'block';
    }
    peer = new Peer({ initiator: isCreator, trickle: false, stream });
    peer.on('signal', signal => {
      ws.send(JSON.stringify({ type: 'peer', signal, code: sessionCode }));
    });
    peer.on('stream', peerStream => {
      document.getElementById('peer-video').srcObject = peerStream;
      if (isCreator) {
        // Already shown
      } else {
        // Joiner might need to update, but already shown
      }
    });
    peer.on('connect', () => {
      console.log('Peer connected');
      if (isCreator) {
        turnOrder = ['A', 'B', 'A', 'B']; // Default alternating
        ws.send(JSON.stringify({ type: 'config', turnOrder, code: sessionCode }));
      }
    });
    peer.on('data', data => {
      const msg = JSON.parse(data);
      if (msg.type === 'photo') {
        addPhoto(msg.photo, msg.role);
      }
    });
  }).catch(err => {
    console.error('Camera access denied', err);
    alert('Camera access is required for TogetherBooth. Please allow camera permissions and refresh the page.');
  });
}

function takePhoto() {
  const canvas = document.createElement('canvas');
  const video = document.getElementById('my-video');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const photo = canvas.toDataURL('image/jpeg', 0.8);
  addPhoto(photo, myRole);
  peer.send(JSON.stringify({ type: 'photo', photo, role: myRole }));
  ws.send(JSON.stringify({ type: 'photo', photo, role: myRole, code: sessionCode }));
  nextTurn();
}

function addPhoto(photo, role) {
  photos.push({ photo, role });
  renderStrip();
  if (photos.length === turnOrder.length) {
    document.getElementById('download-strip').style.display = 'block';
  }
}

function renderStrip() {
  const canvas = document.getElementById('strip-canvas');
  const numPhotos = 4; // Fixed for now
  const photoHeight = 280;
  const photoWidth = 280;
  const gap = 20;
  const border = 10;
  canvas.width = photoWidth + 2 * border;
  canvas.height = numPhotos * (photoHeight + gap) - gap + 2 * border;
  const ctx = canvas.getContext('2d');
  // Dark background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // White frames
  ctx.fillStyle = '#fff';
  photos.forEach((p, i) => {
    const y = border + i * (photoHeight + gap);
    ctx.fillRect(border, y, photoWidth, photoHeight);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, border, y, photoWidth, photoHeight);
    };
    img.src = p.photo;
  });
}

function downloadStrip() {
  const canvas = document.getElementById('strip-canvas');
  const link = document.createElement('a');
  link.download = 'togetherbooth-strip.png';
  link.href = canvas.toDataURL();
  link.click();
}

function updateTurn(turn) {
  currentTurn = turn;
  const indicator = document.getElementById('turn-indicator');
  if (turn >= turnOrder.length) {
    indicator.textContent = 'All done!';
    document.getElementById('take-photo').disabled = true;
    return;
  }
  if (turnOrder[currentTurn] === myRole) {
    indicator.textContent = 'Your turn!';
    document.getElementById('take-photo').disabled = false;
  } else {
    indicator.textContent = 'Their turn...';
    document.getElementById('take-photo').disabled = true;
  }
}

function nextTurn() {
  currentTurn++;
  ws.send(JSON.stringify({ type: 'turn', currentTurn, code: sessionCode }));
  updateTurn(currentTurn);
}

function startCountdown() {
  let count = 3;
  const countdownEl = document.getElementById('countdown');
  countdownEl.style.display = 'block';
  countdownEl.textContent = count;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(interval);
      countdownEl.style.display = 'none';
      takePhoto();
    }
  }, 1000);
}

// Event listeners
document.getElementById('create-session').addEventListener('click', createSession);
document.getElementById('join-session').addEventListener('click', joinSession);
document.getElementById('take-photo').addEventListener('click', startCountdown);
document.getElementById('download-strip').addEventListener('click', downloadStrip);