const express = require('express');
const cors = require('cors');
const app = express();

// Render requires apps to listen on a dynamic port
const PORT = process.env.PORT || 3000; 

// Allow your frontend to talk to this backend
app.use(cors());
app.use(express.json());

// 1. SECURE SERVER DATA
let market = [
    { symbol: "BTC", name: "Bitcoin", price: 52000, vol: 150, candles: [] },
    { symbol: "ETH", name: "Ethereum", price: 2900, vol: 20, candles: [] },
    { symbol: "NVT", name: "NovaTech", price: 185, vol: 5, candles: [] }
];

// In a real app, this would be a MongoDB database. 
// For now, it lives in the server's memory.
let users = {
    "Trader1": { balance: 25000, portfolio: {} } 
};

// 2. MARKET ENGINE (Runs 24/7 on the Server)
function generateCandle(stock, time) {
    const lastClose = stock.candles.length > 0 ? stock.candles[stock.candles.length - 1].close : stock.price;
    const change = stock.vol * (Math.random() - 0.48);
    const close = lastClose + change;
    stock.price = close;
    
    stock.candles.push({ 
        time: time, 
        open: lastClose, 
        high: Math.max(lastClose, close) + (stock.vol * 0.2), 
        low: Math.min(lastClose, close) - (stock.vol * 0.2), 
        close: close 
    });
    
    if(stock.candles.length > 100) stock.candles.shift();
}

// Pre-fill history so the charts aren't empty when users log in
market.forEach(s => {
    let now = Math.floor(Date.now() / 1000);
    for(let i=100; i>0; i--) generateCandle(s, now - (i * 5));
});

// Tick every 5 seconds continuously
setInterval(() => {
    let now = Math.floor(Date.now() / 1000);
    market.forEach(s => generateCandle(s, now));
}, 5000);

// 3. API ENDPOINTS (How the frontend talks to this server)

// Send market data to the app
app.get('/api/market', (req, res) => {
    res.json(market);
});

// Get a specific user's balance and portfolio
app.get('/api/user/:username', (req, res) => {
    // If user doesn't exist, create a new one with starting cash
    if (!users[req.params.username]) {
        users[req.params.username] = { balance: 10000, portfolio: {} };
    }
    res.json(users[req.params.username]);
});

// Process a Buy or Sell request
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

// START SERVER
app.listen(PORT, () => {
    console.log(`🚀 TradeNova Cloud Backend running on port ${PORT}`);
});