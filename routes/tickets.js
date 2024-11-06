// routes/tickets.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

router.get('/dashboard', async (req, res) => {
    let paymentSuccess, paymentPedding;
    const { data: dataSuccess, error: errorSuccess, count: countSuccess } = await supabase
        .from('Cadeiras')
        .select('payment', { count: 'exact' })
        .eq('payment', 'S');
    if (errorSuccess) return res.status(500).json({ error: errorSuccess.message });
    paymentSuccess = countSuccess;

    const { data: dataPedding, error: errorPedding, count: countPedding } = await supabase
        .from('Cadeiras')
        .select('payment', { count: 'exact' })
        .eq('payment', 'P');
    if (errorPedding) return res.status(500).json({ error: errorPedding.message });
    paymentPedding = countPedding;

    res.json({ paymentSuccess: paymentSuccess, paymentPedding: paymentPedding });
});

router.get('/select-tickets', (req, res) => {
    res.render('tickets/select-tickets');
});

router.get('/select-seats', (req, res) => {
    res.render('tickets/select-seats');
});

router.get('/change-seats', (req, res) => {
    res.render('tickets/change-seats');
});

router.get('/getAndares/:sessao', async (req, res) => {
    const { sessao } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .select('andar', { distinct: true })
        .is('disponivel', true)
        .eq('sessao', sessao)
        .order('andar', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    const uniqueAndares = [...new Set(data.map((item) => item.andar))];

    res.json({ andares: uniqueAndares });
});

router.get('/getFileiras/:sessao/:andar', async (req, res) => {
    const { sessao, andar } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .select('fileira')
        .eq('sessao', sessao)
        .eq('andar', andar)
        .is('disponivel', true)
        .order('fileira', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    const uniqueFileiras = [...new Set(data.map((item) => item.fileira))];
    res.json({ fileiras: uniqueFileiras });
});

router.get('/getCadeiras/:sessao/:andar/:fileira', async (req, res) => {
    const { sessao, andar, fileira } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .select('numero')
        .eq('sessao', sessao)
        .eq('andar', andar)
        .eq('fileira', fileira)
        .is('disponivel', true)
        .order('numero', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ cadeiras: data.map((item) => item.numero) });
});

router.get('/checkAssentosDisponiveis/:sessao', async (req, res) => {
    const { sessao } = req.params;
    const { assentos } = req.query;
    const assentosArray = JSON.parse(assentos);
    const numerosAssentos = assentosArray.map(assento => assento.numero);
    const letrasFileiras = assentosArray.map(assento => assento.fileira);
    const numerosAndares = assentosArray.map(assento => assento.andar)

    const { data, error } = await supabase
        .from('Cadeiras')
        .select('sessao, andar, fileira, numero')
        .eq('sessao', sessao)
        .is('disponivel', true)
        .in('numero', numerosAssentos)
        .in('fileira', letrasFileiras)
        .in('andar', numerosAndares)

    if (error) return res.status(500).json({ error: error.message });
    const assentosDisponiveis = data.map(({ andar, fileira, numero }) => `${andar}-${fileira}-${numero}`);
    
    if (assentosArray.every(assento => assentosDisponiveis.includes(`${assento.andar}-${assento.fileira}-${assento.numero}`))) res.json({ disponivel: true });
    else res.json({ disponivel: false, assentosDisponiveis });
});

router.post('/getAssento/:sessao/:andar/:fileira/:numero/:userId', async (req, res) => {
    const { sessao, andar, fileira, numero, userId } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .update({ disponivel: false, payment: 'P', user: userId })
        .eq('sessao', sessao)
        .eq('andar', andar)
        .eq('fileira', fileira)
        .eq('numero', numero)
        .is('disponivel', true)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ cadeira: data });
});

router.get('/admin', async (req, res) => {
    res.render('tickets/admin');
});

router.get('/confirm-seats', async (req, res) => {
    res.render('tickets/confirm-seats');
});

router.get('/search-seats-pending/:cpf', async (req, res) => {
    const { cpf } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select('id')
        .eq('cpf', cpf);
    if (error) return res.status(500).json({ error: error.message });
    if (data.length == 0) return res.status(500).json({ error: "CPF não encontrado" });
    const idUser = data[0].id;
    const { data: lugares, error: errorLugares } = await supabase
        .from('Cadeiras')
        .select()
        .eq('user', idUser)
        .eq('payment', 'P');
    if (error) return res.status(500).json({ error: errorLugares.message });
    res.json({ cadeiras: lugares });
});

router.get('/search-seats-pending-general', async (req, res) => {
    const { data, error } = await supabase
        .from('Cadeiras')
        .select()
        .eq('payment', 'P');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ cadeiras: data });
});

router.get('/search-seats-paid/:cpf', async (req, res) => {
    const { cpf } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select('id')
        .eq('cpf', cpf);
    if (error) return res.status(500).json({ error: error.message });
    if (data.length == 0) return res.status(500).json({ error: "CPF não encontrado" });
    const idUser = data[0].id;
    const { data: lugares, error: errorLugares } = await supabase
        .from('Cadeiras')
        .select()
        .eq('user', idUser)
        .eq('payment', 'S');
    if (error) return res.status(500).json({ error: errorLugares.message });
    res.json({ cadeiras: lugares });
});

router.get('/confirm-Payment/:idCadeira', async (req, res) => {
    const { idCadeira } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .update({ payment: 'S' })
        .eq('id', idCadeira);
    if (error) return res.status(500).json({ message: 'Erro ao atualizar a linha', error });
    return res.status(200).json({ message: 'Pagamento confirmado', id: idCadeira });
});

router.get('/deny-payment/:idCadeira', async (req, res) => {
    const { idCadeira } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .update({ disponivel: true, payment: 'F', user: null })
        .eq('id', idCadeira);
    if (error) return res.status(500).json({ message: 'Erro ao atualizar a linha', error });
    return res.status(200).json({ message: 'Pagamento negado', id: idCadeira });
});

router.get('/search-user-cpf/:cpf', async (req, res) => {
    const { cpf } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select()
        .eq('cpf', cpf);
    if (error) return res.status(500).json({ message: 'Erro na busca', user: null });
    if (data.length == 1) return res.status(200).json({ message: 'Usuário encontrado', user: data });
    return res.status(200).json({ message: 'Usuário não encontrado', user: null });
});

router.get('/search-user-email/:email', async (req, res) => {
    const { email } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select()
        .eq('email', email);
    if (error) return res.status(500).json({ message: 'Erro na busca', user: null });
    if (data.length == 1) return res.status(200).json({ message: 'Usuário encontrado', user: data });
    return res.status(200).json({ message: 'Usuário não encontrado', user: null });
});

router.get('/search-user-phone/:phone', async (req, res) => {
    const { phone } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select()
        .eq('phone', phone);
    if (error) return res.status(500).json({ message: 'Erro na busca', user: null });
    if (data.length == 1) return res.status(200).json({ message: 'Usuário encontrado', user: data });
    return res.status(200).json({ message: 'Usuário não encontrado', user: null });
});

router.get('/search-password/:cpf/:password', async (req, res) => {
    const { cpf, password } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select()
        .eq('cpf', cpf);
    if (error) return res.status(500).json({ message: 'Erro na busca', error });
    if (data.length == 1) {
        if (data[0].senha == password) return res.status(200).json({ message: 'Senha correta', user: data[0] });
    }
    return res.status(200).json({ message: 'Senha incorreta', user: null });
});

router.get('/login', async (req, res) => {
    res.render('tickets/login');
});

router.get('/register', async (req, res) => {
    res.render('tickets/register');
});

router.post('/authenticate', async (req, res) => {
    const { userName, userCPF, userEmail, userPhoneDecod, password } = req.body;
    const { data, error } = await supabase
        .from('Users')
        .insert({ nome: userName, cpf: userCPF, email: userEmail, phone: userPhoneDecod, senha: password })
        .select()
    if (error) return res.status(500).json({ message: 'Erro ao criar usuário', success: false });
    return res.status(200).json({ message: 'Usuário criado', success: true, user: data[0] });
});

module.exports = router;
