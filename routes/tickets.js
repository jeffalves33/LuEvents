// routes/tickets.js
const express = require('express');
const router = express.Router();
const path = require('path');

// Rota para selecionar ingressos
router.get('/select-tickets', (req, res) => {
    res.render('tickets/select-tickets');
});

router.get('/select-seats', (req, res) => {
    res.render('tickets/select-seats');
});

router.get('/change-seats', (req, res) => {
    res.render('tickets/change-seats');
});

module.exports = router;
