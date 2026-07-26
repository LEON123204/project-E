require('dotenv').config();
const cloudinary = require('../config/cloudinary');

const listImages = async () => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: '',
      max_results: 100,
    });

    console.log(`Found ${result.resources.length} images:\n`);
    result.resources.forEach((resource) => {
      console.log(`${resource.public_id} => ${resource.secure_url}`);
    });
  } catch (error) {
    console.error('Error fetching Cloudinary images:', error.message);
  }
};

listImages();