// server.js
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const indexRouter = require('./routes/index');
const ticketsRouter = require('./routes/tickets');

app.use('/', indexRouter);
app.use('/', ticketsRouter);

app.listen(port, () => {
    console.log(`App rodando em http://localhost:${port}`);
});
