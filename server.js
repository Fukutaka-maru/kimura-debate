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
  resultAnnounced: false,
  challengerName: '挑戦者',
  votes: { kimura: 0, challenger: 0 },
  connectedUsers: 0
};

function getWinner() {
  if (state.votes.kimura > state.votes.challenger) return '木村';
  if (state.votes.challenger > state.votes.kimura) return state.challengerName;
  return '引き分け';
}

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
    state.resultAnnounced = false;
    state.challengerName = challengerName || '挑戦者';
    state.votes = { kimura: 0, challenger: 0 };
    io.emit('debate_started', state);
  });

  socket.on('admin_end', () => {
    state.debateActive = false;
    state.debateEnded = true;
    state.resultAnnounced = false;
    io.emit('debate_ended', { votes: state.votes, challengerName: state.challengerName });
  });

  socket.on('admin_announce_result', () => {
    if (!state.debateEnded) return;
    state.resultAnnounced = true;
    io.emit('result_announced', {
      votes: state.votes,
      winner: getWinner(),
      challengerName: state.challengerName
    });
  });

  socket.on('admin_reset', () => {
    state = {
      debateActive: false,
      debateEnded: false,
      resultAnnounced: false,
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
