const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    user: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: String, required: true },
}, { timestamps: true }); // Enables createdAt for the "diminishing" feature

module.exports = mongoose.model('Message', MessageSchema);
