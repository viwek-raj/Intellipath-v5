import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { startEmailWorker } from './workers/emailWorker.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Connect to Database
connectDB();

// Start Background Workers
startEmailWorker();

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`👉 Local URL: http://localhost:${PORT}`);
});
