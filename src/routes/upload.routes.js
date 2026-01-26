import express from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// Upload image (protected route)
router.post('/', protect, upload.single('image'), uploadImage);

export default router;