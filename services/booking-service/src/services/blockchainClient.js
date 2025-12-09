const axios = require('axios');
const BLOCKCHAIN_BASE = process.env.BLOCKCHAIN_URL || 'http://localhost:3003/api/blockchain';

const client = axios.create({
  baseURL: BLOCKCHAIN_BASE,
  timeout: 10000
});

module.exports = client;
