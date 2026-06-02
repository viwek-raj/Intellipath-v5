import Activity from '../models/Activity.js';

export const logActivity = async (req, res, next) => {
    // Wait until response finishes to avoid blocking the API response
    res.on('finish', async () => {
        if (req.user && req.user._id) {
            try {
                // Get current date in YYYY-MM-DD format (local time)
                const today = new Date();
                const dateStr = today.getFullYear() + '-' + 
                                String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                String(today.getDate()).padStart(2, '0');

                await Activity.findOneAndUpdate(
                    { user: req.user._id, date: dateStr },
                    { $inc: { count: 1 } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            } catch (error) {
                console.error('Activity Logging Error:', error.message);
            }
        }
    });
    
    next();
};
