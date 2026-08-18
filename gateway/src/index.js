require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const statsRouter = require('./routes/stats');
const graphRouter = require('./routes/graph');
const evaluateRiskRouter = require('./routes/evaluateRisk');

const app = express();
const server = http.createServer(app);


// Dev-open CORS for the Socket.IO transport; tighten to REACT_APP_GATEWAY_URL's
// origin before the demo if judges will be on the same network as an
// untrusted third party (unlikely for a hackathon, but cheap to note).
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// Route handlers reach the Socket.IO instance via req.app.get('io') —
// see the emit in routes/evaluateRisk.js.
app.set('io', io);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1', evaluateRiskRouter);
app.use('/api/v1', statsRouter);
app.use('/api/v1', graphRouter);

io.on('connection', (socket) => {
  console.log(`[socket.io] client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[socket.io] client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.GATEWAY_PORT || 4000;
server.listen(PORT, () => {
  console.log(`[gateway] listening on port ${PORT}`);
});

module.exports = { app, server, io };
