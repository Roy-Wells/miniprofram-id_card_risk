const pool = require('../config/database');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    const phoneStr = String(phone).trim();
    if (!/^1[3-9]\d{9}$/.test(phoneStr)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式错误'
      });
    }

    const [users] = await pool.query(
      'SELECT phone, role FROM user_roles WHERE phone = ?',
      [phoneStr]
    );

    if (users.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您非邀请用户，暂时无法使用'
      });
    }

    const role = users[0].role;

    const token = jwt.sign(
      { phone: phoneStr, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        role,
        phone: phoneStr
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
