const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 缓存 access_token
let accessTokenCache = { token: '', expiresAt: 0 };

// 获取微信 access_token
async function getAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('获取access_token失败: ' + JSON.stringify(data));
  }
  // 提前5分钟过期
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000
  };
  return data.access_token;
}

// 通过 getPhoneNumber 的 code 获取手机号
async function getPhoneByCode(code) {
  const accessToken = await getAccessToken();
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (data.errcode !== 0 || !data.phone_info) {
    throw new Error('获取手机号失败: ' + JSON.stringify(data));
  }
  return data.phone_info.phoneNumber;
}

// ========== 微信手机号快捷登录 ==========
exports.phoneLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '缺少授权码' });
    }

    // 调用微信接口获取手机号
    let phone;
    try {
      phone = await getPhoneByCode(code);
    } catch (e) {
      console.error('Get phone number error:', e.message);
      return res.status(400).json({ success: false, message: '获取手机号失败，请重试' });
    }

    // 校验手机号是否在数据库中
    const [users] = await pool.query(
      'SELECT phone, role FROM user_roles WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      return res.status(403).json({
        success: false,
        message: '手机号无访问权限，请联系管理员'
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
    console.error('Phone login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
};

// ========== 手机号+密码登录（管理员备用） ==========
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '请输入有效的手机号' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: '请输入密码' });
    }

    const [users] = await pool.query(
      'SELECT phone, role, password FROM user_roles WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      return res.status(403).json({ success: false, message: '您非邀请用户，暂时无法使用' });
    }

    const user = users[0];
    if (user.password !== hashPassword(password)) {
      return res.status(400).json({ success: false, message: '密码错误' });
    }

    const token = jwt.sign(
      { phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: { token, role: user.role, phone: user.phone }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
};
