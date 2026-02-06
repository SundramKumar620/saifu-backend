import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';

const router = express.Router();

// Get Helius API key from environment
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';

// Create Solana connection with Helius RPC or fallback to public RPC
const getConnection = () => {
    let rpcUrl;

    if (HELIUS_API_KEY && HELIUS_API_KEY.trim() !== '') {
        // Use Helius RPC with API key
        rpcUrl = `https://${SOLANA_NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        console.log('🔗 Using Helius RPC');
    } else {
        // Fallback to public Solana RPC
        rpcUrl = SOLANA_NETWORK === 'mainnet-beta'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com';
        console.log('⚠️  Using public Solana RPC (rate limited)');
    }

    return new Connection(rpcUrl, 'confirmed');
};

// ============================================
// 1. Get SOL Balance
// ============================================
router.get('/sol-balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const connection = getConnection();
        const publicKey = new PublicKey(address);

        const balanceLamports = await connection.getBalance(publicKey);
        const balanceSOL = balanceLamports / 1_000_000_000; // LAMPORTS_PER_SOL

        res.json({ balance: balanceSOL });
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 2. Get Token Balances (Helius API)
// ============================================
router.get('/token-balances/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const url = `https://api-${SOLANA_NETWORK}.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        // Transform data to match frontend expectations
        if (!data.tokens || !Array.isArray(data.tokens)) {
            return res.json({ tokens: [] });
        }

        const tokens = data.tokens.map(token => ({
            mint: token.mint,
            symbol: token.symbol || 'Unknown',
            name: token.name || 'Unknown Token',
            logo: token.logo,
            balance: token.amount / Math.pow(10, token.decimals)
        }));

        res.json({ tokens });
    } catch (error) {
        console.error('Error fetching token balances:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 3. Get SOL Price (CoinGecko)
// ============================================
router.get('/sol-price', async (req, res) => {
    try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
        const response = await fetch(url);
        const data = await response.json();

        const price = data?.solana?.usd ?? null;
        res.json({ price });
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 4. Get Swap Quote (Jupiter)
// ============================================
router.get('/swap/quote', async (req, res) => {
    try {
        const { inputMint, outputMint, amount, slippageBps = 50 } = req.query;

        if (!inputMint || !outputMint || !amount) {
            return res.status(400).json({ error: 'Missing required parameters: inputMint, outputMint, amount' });
        }

        const url =
            `https://quote-api.jup.ag/v6/quote?` +
            `inputMint=${inputMint}` +
            `&outputMint=${outputMint}` +
            `&amount=${amount}` +
            `&slippageBps=${slippageBps}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching swap quote:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 5. Get Swap Transaction (Jupiter)
// ============================================
router.post('/swap/transaction', async (req, res) => {
    try {
        const { quoteResponse, userPublicKey } = req.body;

        if (!quoteResponse || !userPublicKey) {
            return res.status(400).json({ error: 'Missing required parameters: quoteResponse, userPublicKey' });
        }

        const response = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey,
                wrapAndUnwrapSol: true,
            }),
        });

        const data = await response.json();

        if (!data.swapTransaction) {
            return res.status(400).json({ error: data.error || 'Swap transaction failed' });
        }

        res.json({ swapTransaction: data.swapTransaction });
    } catch (error) {
        console.error('Error fetching swap transaction:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 6. RPC Proxy for Solana Connection
// ============================================
router.post('/rpc', async (req, res) => {
    try {
        const rpcUrl = `https://${SOLANA_NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error proxying RPC request:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
