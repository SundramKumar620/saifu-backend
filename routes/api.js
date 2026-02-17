import express from 'express';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(dirname(__dirname), '.env') });

const router = express.Router();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';

const getConnection = () => {
  if (!HELIUS_API_KEY || HELIUS_API_KEY.trim() === '') {
    throw new Error('HELIUS_API_KEY is required but not set in environment variables');
  }

  const rpcUrl = `https://${SOLANA_NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  return new Connection(rpcUrl, 'confirmed');
};

router.get('/sol-balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const connection = getConnection();
    const publicKey = new PublicKey(address);
    const lamports = await connection.getBalance(publicKey);
    const balance = lamports / LAMPORTS_PER_SOL;
    res.json({ balance });
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/token-balances/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const url = `https://${SOLANA_NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const body = {
      jsonrpc: "2.0",
      id: "get-assets",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: address,
        page: 1,
        limit: 1000,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const { result } = await response.json();

    console.log("HELUIS getAssetsByOwner result:", result);



    const tokens = (result.items || []).map(asset => ({
      mint: asset.id,
      symbol: asset.token_info?.symbol || asset.content?.metadata?.symbol || "Unknown",
      name: asset.token_info?.name || asset.content?.metadata?.name || "Unknown",
      logo: asset.token_info?.logo_uri || asset.content?.links?.image || null,
      balance: Number(asset.token_info?.balance || 0) / Math.pow(10, asset.token_info?.decimals || 9),
      decimals: asset.token_info?.decimals ?? 0,
      raw: asset
    }));


    res.json({ tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

router.post('/rpc', async (req, res) => {
  try {
    const rpcUrl = `https://${SOLANA_NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      console.error('RPC Error:', response.status, req.body?.method);
      return res.status(response.status).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: `HTTP ${response.status}: ${response.statusText}` },
        id: req.body?.id || null
      });
    }

    const data = await response.json();

    if (data.error) {
      console.error('RPC Error:', data.error);
    }

    res.json(data);
  } catch (error) {
    console.error('RPC proxy error:', error.message);
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
      id: req.body?.id || null
    });
  }
});

export default router;