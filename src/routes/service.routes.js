import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  addServiceReview
} from '../controllers/service.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// Protected routes
router.post('/', protect, restrictTo('service-provider'), upload.array('images', 5), createService);
router.put('/:id', protect, restrictTo('service-provider'), upload.array('images', 5), updateService);
router.delete('/:id', protect, restrictTo('service-provider'), deleteService);

// Reviews
router.post('/:id/reviews', protect, addServiceReview);

export default router;