import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import confessionRoutes from './routes/confessions.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 5001;


// ================= MIDDLEWARE =================

// Enable CORS (allow frontend to connect)
app.use(cors({
    origin: '*', // You can replace with your frontend URL later
}));

// Parse JSON
app.use(express.json());


// ================= ROUTES =================

// Root route (important for Render)
app.get('/', (req, res) => {
    res.send('🚀 ConfessionHub API is running');
});

// Health check route
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'ConfessionHub API is healthy'
    });
});

// API routes
app.use('/confessions', confessionRoutes);
app.use('/users', userRoutes);



// ================= DATABASE CONNECTION =================

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {

    console.log('✅ Connected to MongoDB');


    // Optional: Clean old indexes
    try {

        const usersCollection = mongoose.connection.db.collection('users');

        const indexes = await usersCollection.indexes();

        console.log('🔍 Current indexes:',
            indexes.map(index => index.name)
        );

        for (const index of indexes) {

            if (
                index.name.includes('clerk') ||
                index.name.includes('googleId')
            ) {

                console.log(`🧹 Dropping old index: ${index.name}`);

                await usersCollection.dropIndex(index.name);
            }

        }

    }
    catch (error) {

        console.log('ℹ️ Index cleanup skipped');

    }



    // ================= START SERVER =================

    app.listen(PORT, () => {

        console.log(`🚀 Server running on port ${PORT}`);

    });

})
.catch((error) => {

    console.error('❌ MongoDB connection failed:', error.message);

});