const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 手机号+密码登录
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的手机号'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '请输入密码'
      });
    }

    const [users] = await pool.query(
      'SELECT phone, role, password FROM user_roles WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您非邀请用户，暂时无法使用'
      });
    }

    const user = users[0];
    const inputHash = hashPassword(password);

    if (user.password !== inputHash) {
      return res.status(400).json({
        success: false,
        message: '密码错误'
      });
    }

    const token = jwt.sign(
      { phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
};
