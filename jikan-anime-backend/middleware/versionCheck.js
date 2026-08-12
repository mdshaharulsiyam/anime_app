import semver from 'semver';

/**
 * Middleware to check client version against server MINIMUM_SUPPORTED_VERSION
 */
export const checkVersion = (req, res, next) => {
  // Allow health check endpoint to bypass version check
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  const minVersion = process.env.MINIMUM_SUPPORTED_VERSION || '1.0.0';
  const downloadUrl = process.env.APP_DOWNLOAD_URL || 'https://github.com/mdshaharulsiyam/anime_app';
  
  const rawClientVersion = req.headers['x-app-version'] || req.headers['X-App-Version'];
  const clientVersion = typeof rawClientVersion === 'string' ? rawClientVersion.trim() : null;

  // Validate semver format for client version
  const validClientVersion = semver.valid(clientVersion) ? clientVersion : '0.0.0';
  const validMinVersion = semver.valid(minVersion) ? minVersion : '1.0.0';

  if (semver.lt(validClientVersion, validMinVersion)) {
    return res.status(426).json({
      success: false,
      error: 'OUTDATED_VERSION',
      message: 'A mandatory update is required to continue using the application.',
      minVersion: validMinVersion,
      currentVersion: validClientVersion,
      downloadUrl,
    });
  }

  next();
};
