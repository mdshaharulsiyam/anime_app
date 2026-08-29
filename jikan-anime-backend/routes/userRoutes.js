import express from 'express';
import { login, loginOrRegister, register } from '../controllers/userController.js';

const router = express.Router();

// POST /api/users/login
router.post('/login', login);

// POST /api/users/register
router.post('/register', register);

// POST /api/users/login-or-register
router.post('/login-or-register', loginOrRegister);

export default router;
