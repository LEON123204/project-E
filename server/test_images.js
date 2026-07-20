const axios = require('axios');

const urls = [
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1524498250428-903f553f1815?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1582793988951-97ff9d7ad210?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?w=800&auto=format&fit=crop&q=60'
];

async function check() {
  for (const url of urls) {
    try {
      const res = await axios.head(url);
      console.log(`OK (Status ${res.status}): ${url.split('?')[0]}`);
    } catch (e) {
      console.log(`FAILED (Status ${e.response?.status || e.message}): ${url.split('?')[0]}`);
    }
  }
}

check();
