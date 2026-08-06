import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import {
  adminGetMannequins, adminCreateMannequin, adminUpdateMannequin, adminDeleteMannequin,
  adminGetCategories, adminCreateCategory,
  adminGetOrders, adminUpdateOrderStatus,
  adminGetConfig, adminUpdateConfig,
  adminGetIdentities, adminVerifyIdentity,
  adminGetDashboard,
} from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

router.get('/dashboard', adminGetDashboard);

router.get('/mannequins', adminGetMannequins);
router.post('/mannequins', adminCreateMannequin);
router.put('/mannequins/:id', adminUpdateMannequin);
router.delete('/mannequins/:id', adminDeleteMannequin);

router.get('/categories', adminGetCategories);
router.post('/categories', adminCreateCategory);

router.get('/orders', adminGetOrders);
router.patch('/orders/:id/status', adminUpdateOrderStatus);

router.get('/config', adminGetConfig);
router.patch('/config', adminUpdateConfig);

router.get('/identities', adminGetIdentities);
router.patch('/identities/:id', adminVerifyIdentity);

export default router;
