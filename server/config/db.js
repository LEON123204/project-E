const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryURI = process.env.MONGODB_URI;
  const fallbackURI = 'mongodb://127.0.0.1:27017/project-E';

  try {
    console.log('Connecting to primary MongoDB (Atlas)...');
    const conn = await mongoose.connect(primaryURI, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout to fallback quickly if offline
    });
    console.log(`MongoDB Connected (Primary): ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Primary connection failed (${error.message}). Falling back to local MongoDB...`);
    try {
      const conn = await mongoose.connect(fallbackURI);
      console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`Local MongoDB fallback also failed: ${fallbackError.message}`);
      console.error('ERROR: Please verify MongoDB is running locally, or configure a valid MONGODB_URI in your .env file.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
