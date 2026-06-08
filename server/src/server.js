import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import ensureIndexes from './config/dbIndexes.js';
import { startEmailWorker } from './workers/emailWorker.js';
import mongoose from 'mongoose';

dotenv.config();

const PORT = process.env.PORT || 3001;

// ============================================================
// STARTUP SEQUENCE
// ============================================================

const startServer = async () => {
    // 1. Connect to Database
    await connectDB();

    // 2. Ensure compound indexes on high-traffic collections
    await ensureIndexes();

    // 3. Start Background Workers
    startEmailWorker();

    // 4. Start HTTP Server
    const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`👉 Local URL: http://localhost:${PORT}`);
        console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`🔒 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // ============================================================
    // GRACEFUL SHUTDOWN
    // ============================================================

    const gracefulShutdown = async (signal) => {
        console.log(`\n⚡ ${signal} received. Starting graceful shutdown...`);

        // 1. Stop accepting new connections
        server.close(() => {
            console.log('   ✅ HTTP server closed (no new connections)');
        });

        try {
            // 2. Close MongoDB connection
            await mongoose.connection.close();
            console.log('   ✅ MongoDB connection closed');

            // 3. Final log
            console.log('🏁 Graceful shutdown complete. Goodbye!\n');
            process.exit(0);
        } catch (err) {
            console.error('   ❌ Error during shutdown:', err.message);
            process.exit(1);
        }
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections (safety net)
    process.on('unhandledRejection', (reason, promise) => {
        console.error('⚠️ Unhandled Promise Rejection:', reason);
        // Don't exit — let the error handler deal with it
    });

    // Handle uncaught exceptions (safety net)
    process.on('uncaughtException', (error) => {
        console.error('💥 Uncaught Exception:', error);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
};

startServer();
