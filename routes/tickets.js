// routes/tickets.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

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

router.get('/getAndares', async (req, res) => {
    const { data, error } = await supabase
        .from('Cadeiras')
        .select('andar', { distinct: true })
        .is('disponivel', true)
        .order('andar', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    const uniqueAndares = [...new Set(data.map((item) => item.andar))];
    res.json({ andares: uniqueAndares });
});

// Rota para obter as fileiras disponíveis para um andar específico
router.get('/getFileiras/:andar', async (req, res) => {
    const { andar } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .select('fileira')
        .eq('andar', andar)
        .is('disponivel', true)
        .order('fileira', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    const uniqueFileiras = [...new Set(data.map((item) => item.fileira))];
    res.json({ fileiras: uniqueFileiras });
});

// Rota para obter as cadeiras disponíveis em um andar e fileira específicos
router.get('/getCadeiras/:andar/:fileira', async (req, res) => {
    const { andar, fileira } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .select('numero')
        .eq('andar', andar)
        .eq('fileira', fileira)
        .is('disponivel', true)
        .order('numero', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ cadeiras: data.map((item) => item.numero) });
});

// Dados das fileiras e números
const fileiras = {
    A: 44
    /*B: 19,
    C: 19,
    D: 19,
    E: 28,
    F: 28,
    G: 28,
    H: 29,
    I: 29,
    J: 28,
    K: 30,
    L: 25*/
};
router.get('/preencher-cadeiras', async (req, res) => {
    const cadeiras = [];

    // Gerar as cadeiras
    for (const [fileira, numeroDePoltronas] of Object.entries(fileiras)) {
        for (let numero = 1; numero <= numeroDePoltronas; numero++) {
            cadeiras.push({
                andar: 3,
                fileira,
                numero,
                disponivel: true
            });
        }
    }

    // Inserir as cadeiras no Supabase
    const { data, error } = await supabase
        .from('Cadeiras')
        .insert(cadeiras);

    if (error) {
        console.error('Erro ao inserir cadeiras:', error);
        return res.status(500).json({ error: 'Erro ao preencher o banco de dados' });
    }

    res.json({ message: 'Banco de dados preenchido com sucesso', data });
});

module.exports = router;
