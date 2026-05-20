const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 调用微信接口获取 openid
async function getWxOpenid(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  return data;
}

// 自动登录：通过 wx.login 的 code 获取 openid 匹配用户
exports.autoLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '缺少code参数' });
    }

    const wxData = await getWxOpenid(code);

    if (!wxData.openid) {
      return res.status(400).json({ success: false, message: '微信登录失败' });
    }

    // 通过 openid 查找用户
    const [users] = await pool.query(
      'SELECT phone, role, openid FROM user_roles WHERE openid = ?',
      [wxData.openid]
    );

    if (users.length === 0) {
      return res.status(403).json({
        success: false,
        message: '无权限访问',
        needBind: true
      });
    }

    const user = users[0];
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
    console.error('Auto login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
};

// 手机号+密码登录（同时绑定 openid）
exports.login = async (req, res) => {
  try {
    const { phone, password, code } = req.body;

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
      'SELECT phone, role, password, openid FROM user_roles WHERE phone = ?',
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

    // 如果传了 code，绑定 openid（用于下次自动登录）
    if (code && !user.openid) {
      try {
        const wxData = await getWxOpenid(code);
        if (wxData.openid) {
          await pool.query('UPDATE user_roles SET openid = ? WHERE phone = ?', [wxData.openid, phone]);
        }
      } catch (e) {
        console.error('Bind openid error:', e);
      }
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
