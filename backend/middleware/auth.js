const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('authVersion');
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    const tokenVersion = typeof decoded.authVersion === 'number' ? decoded.authVersion : 0;
    const currentVersion = user.authVersion || 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
