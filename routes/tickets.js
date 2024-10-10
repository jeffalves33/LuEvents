// routes/tickets.js
const express = require('express');
const router = express.Router();
const path = require('path');

// Rota para selecionar ingressos
router.get('/select-tickets', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public/select-tickets.html'));
});

router.post('/select-seats', (req, res) => {
    const tickets = req.body.tickets;
    res.sendFile(path.resolve(__dirname + '/../public/select-seats.html'));
});

router.post('/enter-cpf', (req, res) => {
    const seats = req.body['selected-seats'];
    res.sendFile(path.resolve(__dirname + '/../public/enter-cpf.html'));
});

router.post('/enter-details', (req, res) => {
    const cpf = req.body.cpf;
    res.sendFile(path.resolve(__dirname + '/../public/enter-details.html'));
});

router.post('/payment', (req, res) => {
    const details = req.body;
    res.sendFile(path.resolve(__dirname + '/../public/payment.html'));
});

module.exports = router;
