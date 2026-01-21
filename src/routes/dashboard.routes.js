import express from 'express';
import {
  getStudentDashboard,
  getAgentDashboard,
  getOwnerDashboard,
  getServiceProviderDashboard,
  getAdminDashboard
} from '../controllers/dashboard.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

// Role-based dashboard routes
router.get('/student', restrictTo('student'), getStudentDashboard);
router.get('/agent', restrictTo('agent'), getAgentDashboard);
router.get('/owner', restrictTo('owner'), getOwnerDashboard);
router.get('/service-provider', restrictTo('service-provider'), getServiceProviderDashboard);
router.get('/admin', restrictTo('admin'), getAdminDashboard);

export default router;