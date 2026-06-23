const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

let state = {
  debateActive: false,
  debateEnded: false,
  challengerName: '挑戦者',
  votes: { kimura: 0, challenger: 0 },
  connectedUsers: 0
};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  state.connectedUsers = io.engine.clientsCount;
  socket.emit('state_sync', state);
  io.emit('user_count', state.connectedUsers);

  socket.on('vote', (candidate) => {
    if (!state.debateActive || state.debateEnded) return;
    if (candidate !== 'kimura' && candidate !== 'challenger') return;
    state.votes[candidate]++;
    io.emit('vote_update', { votes: state.votes });
  });

  socket.on('admin_start', ({ challengerName }) => {
    state.debateActive = true;
    state.debateEnded = false;
    state.challengerName = challengerName || '挑戦者';
    state.votes = { kimura: 0, challenger: 0 };
    io.emit('debate_started', state);
  });

  socket.on('admin_end', () => {
    state.debateActive = false;
    state.debateEnded = true;
    const winner =
      state.votes.kimura > state.votes.challenger
        ? '木村'
        : state.votes.challenger > state.votes.kimura
        ? state.challengerName
        : '引き分け';
    io.emit('debate_ended', { votes: state.votes, winner, challengerName: state.challengerName });
  });

  socket.on('admin_reset', () => {
    state = {
      debateActive: false,
      debateEnded: false,
      challengerName: '挑戦者',
      votes: { kimura: 0, challenger: 0 },
      connectedUsers: io.engine.clientsCount
    };
    io.emit('state_sync', state);
  });

  socket.on('disconnect', () => {
    state.connectedUsers = io.engine.clientsCount;
    io.emit('user_count', state.connectedUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎤 木村ディベートサーバー起動中: http://localhost:${PORT}`);
  console.log(`   管理画面: http://localhost:${PORT}/admin.html`);
});
