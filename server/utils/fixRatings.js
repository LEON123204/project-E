const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://zuhaibx3026_db_user:cgsIU24d3zIio9jp@cluster0.l1i6ak7.mongodb.net/project-e?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  const stats = await db.collection('reviews').aggregate([
    { $group: { _id: '$product', ratingsAvg: { $avg: '$rating' }, reviewsCount: { $sum: 1 } } }
  ]).toArray();

  console.log('Aggregated stats for', stats.length, 'products');

  const bulkOps = stats.map(s => ({
    updateOne: {
      filter: { _id: s._id },
      update: { $set: { ratingsAvg: Math.round(s.ratingsAvg * 10) / 10, reviewsCount: s.reviewsCount } }
    }
  }));

  const result = await db.collection('products').bulkWrite(bulkOps, { ordered: false });
  console.log('bulkWrite — matched:', result.matchedCount, '| modified:', result.modifiedCount);

  const sample = await db.collection('products')
    .find({}, { projection: { name: 1, ratingsAvg: 1, reviewsCount: 1 } })
    .limit(5).toArray();
  console.log('Sample after fix:');
  sample.forEach(p => console.log(' ', p.name, '| avg:', p.ratingsAvg, '| count:', p.reviewsCount));

  await mongoose.disconnect();
  console.log('Done!');
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
