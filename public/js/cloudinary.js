const cloudinary = require('cloudinary');  
const CloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary, 
    folder: 'crop-images',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only jpg, png, and webp images are allowed'), false);
      }
    }
  });

module.exports = { cloudinary, upload };