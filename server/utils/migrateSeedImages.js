const fs = require('fs');
const path = require('path');

const seedFilePath = path.join(__dirname, 'seed.js');
let content = fs.readFileSync(seedFilePath, 'utf8');

const imageMap = {
  '/uploads/nomad_power_bank.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080244/nomad_power_bank_kzz5d5.jpg',
  '/uploads/leather_wallet.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080005/leather_wallet_itvez3.jpg',
  '/uploads/polarized_sunglasses.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079843/polarized_sunglasses_qmwa3m.jpg',
  '/uploads/leather_wristband.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080236/leather_wristband_js05e0.jpg',
  '/uploads/tech_organizer.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079967/tech_organizer_t5jpfi.jpg',
  '/uploads/silk_tie.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079846/silk_tie_sol0rx.jpg',
  '/uploads/hyaluronic_serum.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080010/hyaluronic_serum_tzncnp.jpg',
  '/uploads/rosewater_toner.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079848/rosewater_toner_cberhe.jpg',
  '/uploads/shea_body_cream.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079953/shea_body_cream_ssytwg.jpg',
  '/uploads/foaming_cleanser.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080018/foaming_cleanser_zudtmd.jpg',
  '/uploads/mineral_sunscreen.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080236/mineral_sunscreen_e994bk.jpg',
  '/uploads/steering_wheel_cover.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079878/steering_wheel_cover_eyqzm7.jpg',
  '/uploads/led_bike_light.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080231/led_bike_light_fpcxun.jpg',
  '/uploads/u_lock_bike_lock.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079870/u_lock_bike_lock_llvu4g.jpg',
  '/uploads/car_seat_organizer.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080020/car_seat_organizer_pyokrw.jpg',
  '/uploads/car_phone_mount.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079962/car_phone_mount_aangqi.jpg',
  '/uploads/tire_inflator.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079868/tire_inflator_jqfyjt.jpg',
  '/uploads/foam_cannon.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079975/foam_cannon_aihuzu.jpg',
  '/uploads/bike_frame_bag.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785079984/bike_frame_bag_eouqug.jpg',
  '/uploads/gps_tracker.png': 'https://res.cloudinary.com/c9trtuqh/image/upload/v1785080008/gps_tracker_fsrapt.jpg',
};

let replacedCount = 0;
for (const [oldPath, newUrl] of Object.entries(imageMap)) {
  const before = content;
  content = content.split(oldPath).join(newUrl);
  if (content !== before) replacedCount++;
}

fs.writeFileSync(seedFilePath, content, 'utf8');
console.log(`Done. Replaced ${replacedCount} of ${Object.keys(imageMap).length} image paths in seed.js`);