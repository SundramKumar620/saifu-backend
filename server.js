import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: join(__dirname, '.env') });

import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';

// Trust proxy is required for rate limiting behind Fly.io/Render load balancers
app.set('trust proxy', 1);

console.log('🔑 HELIUS_API_KEY loaded:', HELIUS_API_KEY ? 'Yes ✅' : 'No ❌');

// Security middleware
app.use(helmet());

// CORS configuration - allow requests from browser extension
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow chrome-extension:// and moz-extension:// origins
        if (origin.startsWith('chrome-extension://') ||
            origin.startsWith('moz-extension://') ||
            origin === 'http://localhost:5173' || // Vite dev server
            origin === 'http://localhost:3000') { // Alternative dev port
            return callback(null, true);
        }

        // In production, log rejected origins for debugging
        if (process.env.NODE_ENV === 'production') {
            console.log('⚠️  CORS rejected origin:', origin);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Rate limiting - prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Body parser
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Wallet backend server running on port ${PORT}`);
    console.log(`📡 Network: ${SOLANA_NETWORK}`);
    console.log(`🔒 CORS enabled for browser extensions`);
    console.log(`📡 HTTP RPC proxy available at /api/rpc`);
});
