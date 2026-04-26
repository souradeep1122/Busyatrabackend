const { ADMIN_EMAILS } = require('../config/admin');

const adminOnly = async (req, res, next) => {
  try {
    const userEmail = req.auth?.sessionClaims?.email || 
                      req.auth?.sessionClaims?.['email_addresses']?.[0]?.email_address;

    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Unauthorized' });
  }
};

module.exports = adminOnly;
