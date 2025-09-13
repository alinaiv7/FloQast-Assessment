const express = require('express');
const cors = require('cors');
require('dotenv').config();

const CONFIG = {
  DEFAULT_USER_PASSWORD: process.env.DEFAULT_USER_PASSWORD,
};
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let users = [];
let transactions = [];
let nextId = 1;
let sessions = [];
let nextSessionId = 1;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const session = sessions.find(s => s.token === token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions = sessions.filter(s => s.token !== token);
    return res.status(401).json({ success: false, error: 'Token expired' });
  }

  req.user = session.user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.accountType !== role) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

app.get('/api/config', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      defaultPassword: CONFIG.DEFAULT_USER_PASSWORD 
    } 
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  if (password !== CONFIG.DEFAULT_USER_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  const token = `token_${nextSessionId}_${Date.now()}`;
  const session = {
    id: nextSessionId++,
    token,
    userId: user.id,
    user: user,
    createdAt: Date.now()
  };
  sessions.push(session);
  
  res.json({ 
    success: true, 
    data: { 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        accountType: user.accountType 
      } 
    } 
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const token = req.headers['authorization'].split(' ')[1];
  sessions = sessions.filter(s => s.token !== token);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      id: req.user.id, 
      name: req.user.name, 
      email: req.user.email, 
      accountType: req.user.accountType 
    } 
  });
});

app.post('/api/users', (req, res) => {
  const { name, email, accountType } = req.body;
  
  if (!name || !email || !accountType) {
    return res.status(400).json({ success: false, error: 'Email is required, Valid account type is required' });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email format is required' });
  }
  
  const user = { id: nextId++, name, email, accountType };
  users.push(user);
  
  res.status(200).json({ success: true, data: user });
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id == req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

app.post('/api/transactions', (req, res) => {
  const { userId, amount, type, recipientId } = req.body;
  
  if (!userId || !amount || !type) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid amount is required' });
  }
  
  if (type === 'transfer' && !recipientId) {
    return res.status(400).json({ success: false, error: 'Recipient ID is required for transfers' });
  }
  
  const transaction = { 
    id: nextId++, 
    userId: parseInt(userId), 
    amount: parseFloat(amount), 
    type, 
    recipientId: recipientId ? parseInt(recipientId) : null,
    timestamp: new Date().toISOString()
  };
  transactions.push(transaction);
  
  res.status(200).json({ success: true, data: transaction });
});

app.get('/api/transactions/:userId', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (req.user.id !== userId) {
    return res.status(403).json({ success: false, error: 'Access denied: Can only view your own transactions' });
  }
  
  const userTransactions = transactions.filter(t => t.userId == userId);
  res.json({ success: true, data: userTransactions });
});

app.get('/api/admin/users', authenticateToken, requireRole('premium'), (req, res) => {
  res.json({ success: true, data: users });
});

app.get('/api/admin/transactions', authenticateToken, requireRole('premium'), (req, res) => {
  res.json({ success: true, data: transactions });
});

app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, accountType } = req.body;
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  if (!name || !email || !accountType) {
    return res.status(400).json({ success: false, error: 'Email is required, Valid account type is required' });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email format is required' });
  }
  
  const updatedUser = {
    ...users[userIndex],
    name,
    email,
    accountType,
    updatedAt: new Date().toISOString()
  };
  
  users[userIndex] = updatedUser;
  res.status(200).json({ success: true, data: updatedUser });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  const userTransactions = transactions.filter(t => t.userId !== userId);
  transactions = userTransactions;
  
  const deletedUser = users.splice(userIndex, 1)[0];
  res.status(200).json({ success: true, data: deletedUser });
});

app.put('/api/transactions/:id', (req, res) => {
  const transactionId = parseInt(req.params.id);
  const { userId, amount, type, recipientId } = req.body;
  
  const transactionIndex = transactions.findIndex(t => t.id === transactionId);
  if (transactionIndex === -1) {
    return res.status(404).json({ success: false, error: 'Transaction not found' });
  }
  
  if (!userId || !amount || !type) {
    return res.status(400).json({ success: false, error: 'User ID, amount, and type are required' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid amount is required' });
  }
  
  if (type === 'transfer' && !recipientId) {
    return res.status(400).json({ success: false, error: 'Recipient ID is required for transfers' });
  }
  
  const updatedTransaction = {
    ...transactions[transactionIndex],
    userId: parseInt(userId),
    amount: parseFloat(amount),
    type,
    recipientId: recipientId ? parseInt(recipientId) : undefined,
    updatedAt: new Date().toISOString()
  };
  
  transactions[transactionIndex] = updatedTransaction;
  res.status(200).json({ success: true, data: updatedTransaction });
});

app.delete('/api/transactions/:id', (req, res) => {
  const transactionId = parseInt(req.params.id);
  const transactionIndex = transactions.findIndex(t => t.id === transactionId);
  
  if (transactionIndex === -1) {
    return res.status(404).json({ success: false, error: 'Transaction not found' });
  }
  
  const deletedTransaction = transactions.splice(transactionIndex, 1)[0];
  res.status(200).json({ success: true, data: deletedTransaction });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
