import express from 'express';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  addReview,
  saveProperty,
  getSavedProperties,
  getMyProperties
} from '../controllers/property.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProperties);
router.get('/:id', getPropertyById);

// Protected routes - Students, Agents, and Owners can create properties
router.post('/', 
  protect, 
  restrictTo('student', 'agent', 'owner'), 
  upload.array('images', 10), 
  createProperty
);

router.put('/:id', 
  protect, 
  restrictTo('student', 'agent', 'owner'), 
  upload.array('images', 10), 
  updateProperty
);

router.delete('/:id', 
  protect, 
  restrictTo('student', 'agent', 'owner'), 
  deleteProperty
);

// Get my properties
router.get('/my/properties', protect, getMyProperties);

// Reviews
router.post('/:id/reviews', protect, addReview);

// Saved properties
router.post('/:id/save', protect, saveProperty);
router.get('/saved/list', protect, getSavedProperties);

export default router;