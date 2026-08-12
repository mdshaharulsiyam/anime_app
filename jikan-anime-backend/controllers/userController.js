import User from '../models/User.js';

/**
 * @desc    Login or register a user by username
 * @route   POST /api/users/login-or-register
 * @access  Public
 */
export const loginOrRegister = async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid username is required',
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Find existing user or create a new one
    let user = await User.findOne({ username: cleanUsername });
    let isNewUser = false;

    if (!user) {
      user = await User.create({ username: cleanUsername });
      isNewUser = true;
    }

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser ? 'User created successfully' : 'User logged in successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
