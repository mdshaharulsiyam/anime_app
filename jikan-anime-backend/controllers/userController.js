import User from '../models/User.js';

/**
 * @desc    Login a user with username and passkey
 * @route   POST /api/users/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { username, passkey } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid username is required',
      });
    }

    if (!passkey || typeof passkey !== 'string' || !passkey.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid passkey is required',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPasskey = passkey.trim();

    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User does not exist',
      });
    }

    // If user has passkey set, check match
    if (user.passkey && user.passkey !== cleanPasskey) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSKEY',
        message: 'Incorrect passkey',
      });
    }

    // If existing legacy user didn't have passkey yet, link this passkey
    if (!user.passkey) {
      user.passkey = cleanPasskey;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new user with username and passkey
 * @route   POST /api/users/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, passkey } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid username is required',
      });
    }

    if (!passkey || typeof passkey !== 'string' || !passkey.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid passkey is required (at least 3 characters)',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPasskey = passkey.trim();

    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'USER_ALREADY_EXISTS',
        message: 'Username is already taken',
      });
    }

    const user = await User.create({
      username: cleanUsername,
      passkey: cleanPasskey,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Legacy Login or register fallback
 * @route   POST /api/users/login-or-register
 * @access  Public
 */
export const loginOrRegister = async (req, res, next) => {
  try {
    const { username, passkey } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid username is required',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPasskey = passkey ? passkey.trim() : undefined;

    let user = await User.findOne({ username: cleanUsername });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        username: cleanUsername,
        passkey: cleanPasskey || '1234',
      });
      isNewUser = true;
    } else if (cleanPasskey && user.passkey && user.passkey !== cleanPasskey) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSKEY',
        message: 'Incorrect passkey',
      });
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
