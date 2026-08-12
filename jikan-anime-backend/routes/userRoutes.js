import express from 'express';
import { loginOrRegister } from '../controllers/userController.js';

const router = express.Router();

// POST /api/users/login-or-register
router.post('/login-or-register', loginOrRegister);

export default router;
