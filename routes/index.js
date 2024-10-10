// routes/index.js
const express = require('express');
const router = express.Router();

// Rota para a página inicial
router.get('/', (req, res) => {
    res.sendFile(__dirname + '/../public/index.html');
});

module.exports = router;
