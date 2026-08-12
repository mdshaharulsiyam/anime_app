import User from '../models/User.js';
import Anime from '../models/Anime.js';

/**
 * Helper to find user by username or throw 404
 */
const findUserByUsername = async (rawUsername) => {
  if (!rawUsername) return null;
  const cleanUsername = rawUsername.trim().toLowerCase();
  return await User.findOne({ username: cleanUsername });
};

/**
 * @desc    Get all saved anime for a user
 * @route   GET /api/anime/:username
 * @access  Public
 */
export const getUserAnime = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`,
      });
    }

    const animeList = await Anime.find({ user: user._id }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: animeList.length,
      data: animeList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add or update (upsert) an anime entry in user's collection
 * @route   POST /api/anime/:username
 * @access  Public
 */
export const upsertUserAnime = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { animeId, title, coverImage, status, episodesWatched, score } = req.body;

    if (!animeId || !title) {
      return res.status(400).json({
        success: false,
        message: 'both animeId and title are required',
      });
    }

    // Find or automatically register user if not found
    let user = await findUserByUsername(username);
    if (!user) {
      const cleanUsername = username.trim().toLowerCase();
      user = await User.create({ username: cleanUsername });
    }

    const updateData = {
      title,
      coverImage: coverImage ?? '',
      status: status || 'watching',
      episodesWatched: episodesWatched !== undefined ? Number(episodesWatched) : 0,
      score: score !== undefined && score !== null ? Number(score) : null,
    };

    const animeEntry = await Anime.findOneAndUpdate(
      { user: user._id, animeId: String(animeId) },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Anime list updated successfully',
      data: animeEntry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove an anime from user's collection
 * @route   DELETE /api/anime/:username/:animeId
 * @access  Public
 */
export const deleteUserAnime = async (req, res, next) => {
  try {
    const { username, animeId } = req.params;
    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`,
      });
    }

    const deletedAnime = await Anime.findOneAndDelete({
      user: user._id,
      animeId: String(animeId),
    });

    if (!deletedAnime) {
      return res.status(404).json({
        success: false,
        message: `Anime with ID '${animeId}' not found in user's collection`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Anime removed from collection successfully',
      data: deletedAnime,
    });
  } catch (error) {
    next(error);
  }
};
