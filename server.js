const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// Enable CORS for ALL origins
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. SECURE SERVER DATA
let market = [
    { symbol: "BTC", name: "Bitcoin", price: 52000, vol: 150, candles: [] },
    { symbol: "ETH", name: "Ethereum", price: 2900, vol: 20, candles: [] },
    { symbol: "NVT", name: "NovaTech", price: 185, vol: 5, candles: [] }
];

let users = {};
let chatLog = [{ user: "System", msg: "Welcome to the TradeNova Global Chat!" }];

// 2. MARKET ENGINE
function generateCandle(stock, time) {
    const lastClose = stock.candles.length > 0 ? stock.candles[stock.candles.length - 1].close : stock.price;
    const change = stock.vol * (Math.random() - 0.48);
    const close = lastClose + change;
    stock.price = close;
    
    stock.candles.push({ 
        time: time, open: lastClose, 
        high: Math.max(lastClose, close) + (stock.vol * 0.2), 
        low: Math.min(lastClose, close) - (stock.vol * 0.2), close: close 
    });
    
    if(stock.candles.length > 100) stock.candles.shift();
}

market.forEach(s => {
    let now = Math.floor(Date.now() / 1000);
    for(let i=100; i>0; i--) generateCandle(s, now - (i * 5));
});

setInterval(() => {
    let now = Math.floor(Date.now() / 1000);
    market.forEach(s => generateCandle(s, now));
}, 5000);

// 3. API ENDPOINTS
app.get('/api/market', (req, res) => res.json(market));

app.get('/api/user/:username', (req, res) => {
    if (!users[req.params.username]) users[req.params.username] = { balance: 10000, portfolio: {} };
    res.json(users[req.params.username]);
});

app.post('/api/trade', (req, res) => {
    const { username, symbol, qty, type } = req.body;
    let user = users[username];
    let stock = market.find(s => s.symbol === symbol);

    if (!user || !stock || qty <= 0) return res.status(400).json({ error: "Invalid request" });
    let cost = stock.price * qty;

    if (type === 'BUY') {
        if (user.balance < cost) return res.status(400).json({ error: "Insufficient funds" });
        user.balance -= cost;
        user.portfolio[symbol] = (user.portfolio[symbol] || 0) + qty;
    } else if (type === 'SELL') {
        if (!user.portfolio[symbol] || user.portfolio[symbol] < qty) return res.status(400).json({ error: "Not enough shares" });
        user.balance += cost;
        user.portfolio[symbol] -= qty;
        if(user.portfolio[symbol] === 0) delete user.portfolio[symbol];
    }
    res.json({ success: true, balance: user.balance, portfolio: user.portfolio });
});

app.get('/api/chat', (req, res) => res.json(chatLog));

app.post('/api/chat', (req, res) => {
    const { username, msg } = req.body;
    if(username && msg) {
        chatLog.push({ user: username, msg: msg });
        if(chatLog.length > 50) chatLog.shift();
    }
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
