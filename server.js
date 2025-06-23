const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const User = require('./models/user');
const Message = require('./models/message');

dotenv.config();

// App setup
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to DB
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅ Connected to MongoDB');
});

// Registration Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        const user = await User.create({ username, password: hash });
        res.json({ success: true });
    } catch {
        res.json({ success: false, error: 'User already exists' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, error: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, error: 'Invalid password' });
    const token = jwt.sign({ username }, process.env.JWT_SECRET);
    res.json({ success: true, token, username });
});

// Route to Clear Chat Messages
app.delete('/clear-messages', async (req, res) => {
    try {
        await Message.deleteMany({});
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ⚡️ Diminishing Feature: Delete messages older than 1 hour
const deleteOldMessages = async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await Message.deleteMany({ createdAt: { $lt: oneHourAgo } }); 
};

io.on('connection', async (socket) => {
    console.log('User connected');

    // ✅ Clear old messages
    await deleteOldMessages();

    // ✅ Load recent messages
    const messages = await Message.find({}).sort({ createdAt: 1 }); 
    socket.emit('chat history', messages);

    // ✅ Receive new chat messages
    socket.on('chat message', async (data) => {
        const { user, text } = data;
        const message = await Message.create({ user, text, time: new Date().toLocaleTimeString() });
        io.emit('chat message', message);
    });
});

// Optional: Periodic Cleanup every 5 mins (uncomment if needed)
/*
setInterval(async () => {
    await deleteOldMessages();
    console.log('✅ Old messages deleted periodically');
}, 5 * 60 * 1000);
*/

server.listen(process.env.PORT, () => {
    console.log(`✅ Server is running at http://localhost:${process.env.PORT}`);
});
