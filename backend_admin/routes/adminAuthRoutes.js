import express from 'express';
import { loginAdmin } from '../controllers/adminAuthController.js';
import { registerAdmin } from '../controllers/adminAuthController.js';
import { verifyAdminToken } from '../middleware/adminAuthMiddleware.js';
import { getAllUsers } from '../controllers/adminUserController.js';
import { getUserDetailsById } from '../controllers/adminUserController.js';
import { getAllTransactions, getAllBudgets } from '../controllers/adminDataController.js';
import {
  deleteUserById,
  deleteTransactionById,
  deleteBudgetById
} from '../controllers/adminDataController.js';
const router = express.Router();

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);
router.get('/users', verifyAdminToken, getAllUsers);
router.get('/users/:id', verifyAdminToken, getUserDetailsById);
router.get('/transactions', verifyAdminToken, getAllTransactions);
router.get('/budgets', verifyAdminToken, getAllBudgets);
router.delete('/users/:id', verifyAdminToken, deleteUserById);
router.delete('/transactions/:id', verifyAdminToken, deleteTransactionById);
router.delete('/budgets/:id', verifyAdminToken, deleteBudgetById);

router.get('/test', (req, res) => {
  res.send('Test route working');
});
export default router;
