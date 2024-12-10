// routes/tickets.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const Jimp = require('jimp');
const QRCode = require('qrcode');
const { createCanvas } = require('canvas');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb } = require('pdf-lib');

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

router.get('/download-tickets-page', (req, res) => {
    res.render('tickets/download-tickets');
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

router.post('/getAssento/:sessao/:andar/:fileira/:numero/:userId/:cpf', async (req, res) => {
    const { sessao, andar, fileira, numero, userId, cpf } = req.params;
    const qrcode_content = {
        "cpf": cpf,
        "andar": andar,
        "idUser": userId,
        "numero": numero,
        "sessao": sessao,
        "fileira": fileira
    }
    const { data, error } = await supabase
        .from('Cadeiras')
        .update({ disponivel: false, payment: 'P', user: userId, qrcode_content: qrcode_content })
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

router.get('/search-seats-general/:userId', async (req, res) => {
    const { userId } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .select()
        .eq('payment', 'S')
        .eq('user', userId);
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

router.get('/download-tickets/:idCadeira', async (req, res) => {
    const { idCadeira } = req.params;

    console.log(`[INFO] Iniciando geração do ticket para idCadeira: ${idCadeira}`);

    async function generateQRCode(data) {
        try {
            return await QRCode.toBuffer(JSON.stringify(data));
        } catch (err) {
            console.error('[ERROR] Erro ao gerar QR Code:', err);
            throw err;
        }
    }

    function measureTextWidth(text, font) {
        const canvas = createCanvas(1, 1);
        const context = canvas.getContext('2d');
        context.font = font;
        return context.measureText(text).width;
    }

    async function createEventTicket(user) {
        try {
            const sessao = user.sessao == 1 ? 'sessao1.png' : 'sessao2.png';
            console.log(`[INFO] Selecionando imagem da sessão: ${sessao}`);
            const image = await Jimp.read(path.join(__dirname, '..', 'public', 'images', sessao));

            const fontPath = path.join(__dirname, '..', 'public', 'fonts', 'open-sans', 'open-sans-32-white', 'open-sans-32-white.fnt');
            const font = await Jimp.loadFont(fontPath);
            console.log('[INFO] Fonte carregada com sucesso.');

            const text1 = `${user.nome} | ${user.cpf}`;
            const text2 = `Sessão: ${user.sessao}, Andar: ${user.andar}, Fileira: ${user.fileira}, Poltrona: ${user.numero}`;

            const textWidth1 = measureTextWidth(text1, "32px Arial");
            const textWidth2 = measureTextWidth(text2, "32px Arial");
            const centerX = image.bitmap.width / 2;

            // Ajusta a posição do texto de acordo com a resolução da imagem
            const margin = 20; // margem para não colar nas bordas
            const adjustedCenterX1 = Math.min(centerX - (textWidth1 / 2), image.bitmap.width - margin);
            const adjustedCenterX2 = Math.min(centerX - (textWidth2 / 2), image.bitmap.width - margin);

            // Ajusta para a largura máxima da imagem (evita que texto ultrapasse as bordas)
            image.print(font, adjustedCenterX1, 590, text1);
            image.print(font, adjustedCenterX2, 625, text2);

            const qrCode = await generateQRCode(user);
            const qrImage = await Jimp.read(qrCode);
            qrImage.resize(300, 300);
            image.composite(qrImage, 210, 700);

            console.log('[INFO] QR Code adicionado ao ticket.');

            return new Promise((resolve, reject) => {
                image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                    if (err) {
                        console.error('[ERROR] Erro ao converter imagem em buffer:', err);
                        reject(err);
                    } else {
                        console.log('[INFO] Ticket gerado com sucesso.');
                        resolve(buffer);
                    }
                });
            });

        } catch (err) {
            console.error('[ERROR] Erro ao criar o ticket:', err);
            throw err;
        }
    }

    try {
        const { data: cadeiraSearch, error: erroCadeiraSearch } = await supabase
            .from('Cadeiras')
            .select()
            .eq('id', idCadeira);

        if (erroCadeiraSearch) {
            console.error('[ERROR] Erro ao buscar cadeira no Supabase:', erroCadeiraSearch);
            return res.status(500).json({ message: 'Erro ao buscar cadeira', erro: erroCadeiraSearch });
        }

        if (!cadeiraSearch || cadeiraSearch.length === 0) {
            console.error('[ERROR] Cadeira não encontrada.');
            return res.status(404).json({ message: 'Cadeira não encontrada.' });
        }

        console.log(`[INFO] Cadeira encontrada: ${JSON.stringify(cadeiraSearch[0])}`);

        const { data: user, error: erroUser } = await supabase
            .from('Users')
            .select()
            .eq('id', cadeiraSearch[0].user);

        if (erroUser) {
            console.error('[ERROR] Erro ao buscar usuário no Supabase:', erroUser);
            return res.status(500).json({ message: 'Erro ao buscar usuário', erro: erroUser });
        }

        if (!user || user.length === 0) {
            console.error('[ERROR] Usuário não encontrado.');
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        console.log(`[INFO] Usuário encontrado: ${JSON.stringify(user[0])}`);

        if (!cadeiraSearch[0].qrcode_content || cadeiraSearch[0].qrcode_content == null) {
            console.error('[ERROR] qrcode_content está vazio ou nulo.');
            return res.status(500).json({ message: 'qrcode_content é nulo' });
        }

        const userJson = {
            ...cadeiraSearch[0].qrcode_content,
            email: user[0].email,
            nome: user[0].nome,
        };

        console.log(`[INFO] Dados para geração do ticket: ${JSON.stringify(userJson)}`);

        const ticketBuffer = await createEventTicket(userJson);

        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `attachment; filename=ticket_${idCadeira}.png`);
        console.log('[INFO] Enviando ticket para o cliente.');
        return res.send(ticketBuffer);

    } catch (err) {
        console.error('[ERROR] Erro inesperado na geração do ticket:', err);
        return res.status(500).json({ message: 'Erro ao gerar o ticket', error: err.message });
    }
});

router.get('/confirm-Payment/:idCadeira', async (req, res) => {
    async function generateQRCode(data) {
        return await QRCode.toBuffer(JSON.stringify(data));
    }
    function measureTextWidth(text, font) {
        const canvas = createCanvas(1, 1);
        const context = canvas.getContext('2d');
        context.font = font;
        return context.measureText(text).width;
    }
    async function createEventTicket(user) {
        try {
            const sessao = user.sessao == 1 ? 'sessao1.png' : 'sessao2.png';
            console.log(`[INFO] Selecionando imagem da sessão: ${sessao}`);
            const image = await Jimp.read(path.join(__dirname, '..', 'public', 'images', sessao));

            const fontPath = path.join(__dirname, '..', 'public', 'fonts', 'open-sans', 'open-sans-32-white', 'open-sans-32-white.fnt');
            const font = await Jimp.loadFont(fontPath);
            console.log('[INFO] Fonte carregada com sucesso.');

            const text1 = `${user.nome} | ${user.cpf}`;
            const text2 = `Sessão: ${user.sessao}, Andar: ${user.andar}, Fileira: ${user.fileira}, Poltrona: ${user.numero}`;

            const textWidth1 = measureTextWidth(text1, "32px Arial");
            const textWidth2 = measureTextWidth(text2, "32px Arial");
            const centerX = image.bitmap.width / 2;

            // Ajusta a posição do texto de acordo com a resolução da imagem
            const margin = 20; // margem para não colar nas bordas
            const adjustedCenterX1 = Math.min(centerX - (textWidth1 / 2), image.bitmap.width - margin);
            const adjustedCenterX2 = Math.min(centerX - (textWidth2 / 2), image.bitmap.width - margin);

            // Ajusta para a largura máxima da imagem (evita que texto ultrapasse as bordas)
            image.print(font, adjustedCenterX1, 590, text1);
            image.print(font, adjustedCenterX2, 625, text2);

            const qrCode = await generateQRCode(user);
            const qrImage = await Jimp.read(qrCode);
            qrImage.resize(300, 300);
            image.composite(qrImage, 210, 700);

            console.log('[INFO] QR Code adicionado ao ticket.');

            return new Promise((resolve, reject) => {
                image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                    if (err) {
                        console.error('[ERROR] Erro ao converter imagem em buffer:', err);
                        reject(err);
                    } else {
                        console.log('[INFO] Ticket gerado com sucesso.');
                        resolve(buffer);
                    }
                });
            });

        } catch (err) {
            console.error('[ERROR] Erro ao criar o ticket:', err);
            throw err;
        }
    }
    async function sendEmail(recipient, ticketBuffer) {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            auth: {
                user: 'jeffalvess6142@gmail.com',
                pass: 'zevfuptsmzojjccp'
            }
        });

        const mailOptions = {
            from: 'jeffalvess6142@gmail.com',
            to: recipient.email,
            subject: 'Ingresso do Evento',
            text: 'Segue em anexo o seu ingresso para o evento.',
            attachments: [
                {
                    filename: `${recipient.nome.replace(/\s+/g, '_')}.png`,
                    content: ticketBuffer,
                    contentType: 'image/png'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
    }

    const { idCadeira } = req.params;
    const { data: cadeiraSearch, error: erroCadeiraSearch } = await supabase
        .from('Cadeiras')
        .select()
        .eq('id', idCadeira);
    if (erroCadeiraSearch) return res.status(500).json({ message: 'Erro buscar cadeira', erroCadeiraSearch });

    const { data: user, error: erroUser } = await supabase
        .from('Users')
        .select()
        .eq('id', cadeiraSearch[0].user);
    if (erroUser) return res.status(500).json({ message: 'Erro ao buscar usuario', erroUser });

    try {
        if (!cadeiraSearch[0].qrcode_content || cadeiraSearch[0].qrcode_content == null) return res.status(500).json({ message: 'qrcode_content null' });
        const userJson = {
            ...cadeiraSearch[0].qrcode_content,
            email: user[0].email,
            nome: user[0].nome
        };
        const ticketBuffer = await createEventTicket(userJson);
        await sendEmail(userJson, ticketBuffer);

        const { data: cadeiraUpdate, error: erroCadeiraUpdate } = await supabase
            .from('Cadeiras')
            .update({ payment: 'S' })
            .eq('id', idCadeira);
        if (erroCadeiraUpdate) return res.status(500).json({ message: 'Erro atualizar cadeira', erroCadeiraUpdate });
    } catch (err) {
        console.log("Erro ao enviar mail: ", err);
        return res.status(500).json({ message: 'Erro interno do servidor', error: err });
    }
    return res.status(200).json({ message: 'Pagamento confirmado', id: idCadeira });
});

router.get('/deny-payment/:idCadeira', async (req, res) => {
    const { idCadeira } = req.params;
    const { data, error } = await supabase
        .from('Cadeiras')
        .update({ disponivel: true, payment: 'F', user: null, qrcode_content: null })
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

/*router.get('/created-qrcode-json', async (req, res) => {
    let qtd_cadeiras = 0;
    const { data: users, error: errorUsers } = await supabase
        .from('Users')
        .select('*');

    if (errorUsers) {
        console.error('Erro ao buscar usuários:', errorUsers);
        return res.status(500).send('Erro ao buscar usuários');
    }

    for (const user of users) {
        console.log(user)
        const { data: cadeiras, error: errorCadeiras } = await supabase
            .from('Cadeiras')
            .select('*')
            .eq('user', user.id)
            .eq('payment', 'S')
            .eq('disponivel', false);

        if (errorCadeiras) {
            console.error(`Erro ao buscar cadeiras para o usuário ${user.id}:`, errorCadeiras);
            continue;
        }
        for (const cadeira of cadeiras) {
            const qrcodeContent = {
                idUser: user.id,
                sessao: cadeira.sessao,
                andar: cadeira.andar,
                fileira: cadeira.fileira,
                numero: cadeira.numero,
                cpf: user.cpf,
            };

            const { error: errorUpdate } = await supabase
                .from('Cadeiras')
                .update({ qrcode_content: qrcodeContent })
                .eq('id', cadeira.id);

            if (errorUpdate) {
                console.error(`Erro ao atualizar cadeira ${cadeira.id} do usuário ${user.id}:`, errorUpdate);
            } else {
                console.log(`QR code atualizado para a cadeira ${cadeira.id} do usuário ${user.id}`);
            }
        }
        qtd_cadeiras += 1;
    }
    console.log("quantidade de cadeiras modificadas: " + qtd_cadeiras);
    res.status(200).send();
});*/

module.exports = router;
