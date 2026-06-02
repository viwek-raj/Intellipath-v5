import { Worker } from 'bullmq';
import { getConnection } from '../config/queue.js';
import { sendEmail } from '../services/emailService.js';

let worker = null;

export const startEmailWorker = () => {
    if (worker) return;

    console.log('🚀 Starting Email Worker...');

    worker = new Worker(
        'email',
        async (job) => {
            const { to, subject, html } = job.data;
            
            console.log(`✉️ Processing email job ${job.id} for ${to}`);
            
            try {
                await sendEmail({ to, subject, html });
                console.log(`✅ Email job ${job.id} completed successfully`);
            } catch (error) {
                console.error(`❌ Email job ${job.id} failed:`, error.message);
                throw error; // Let BullMQ handle retries
            }
        },
        { 
            connection: getConnection(),
            concurrency: 5 // Process up to 5 emails concurrently
        }
    );

    worker.on('failed', (job, err) => {
        console.error(`Email Job ${job.id} failed after retries: ${err.message}`);
    });
};

export const stopEmailWorker = async () => {
    if (worker) {
        await worker.close();
        worker = null;
        console.log('⏹️ Email Worker stopped.');
    }
};
