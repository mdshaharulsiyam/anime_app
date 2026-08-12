import express from 'express';
import {
  getUserAnime,
  upsertUserAnime,
  deleteUserAnime,
} from '../controllers/animeController.js';

const router = express.Router();

// GET /api/anime/:username
router.get('/:username', getUserAnime);

// POST /api/anime/:username
router.post('/:username', upsertUserAnime);

// DELETE /api/anime/:username/:animeId
router.delete('/:username/:animeId', deleteUserAnime);

export default router;
