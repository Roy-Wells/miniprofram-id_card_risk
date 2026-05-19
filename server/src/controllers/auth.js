const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const APP_ID = process.env.WX_APP_ID;
const APP_SECRET = process.env.WX_APP_SECRET;

async function getAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const res = await axios.get(url);
  if (res.data.errcode) {
    throw new Error(`获取access_token失败: ${res.data.errmsg}`);
  }
  return res.data.access_token;
}

async function getPhoneNumber(code) {
  const accessToken = await getAccessToken();
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
  const res = await axios.post(url, { code });
  if (res.data.errcode !== 0) {
    throw new Error(`获取手机号失败: ${res.data.errmsg}`);
  }
  return res.data.phone_info.phoneNumber;
}

exports.login = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '登录code不能为空'
      });
    }

    let phoneStr;

    try {
      phoneStr = await getPhoneNumber(code);
    } catch (error) {
      console.error('WeChat API error:', error.message);
      return res.status(500).json({
        success: false,
        message: '微信授权失败，请重试'
      });
    }

    if (!/^1[3-9]\d{9}$/.test(phoneStr)) {
      return res.status(400).json({
        success: false,
        message: '获取手机号格式异常'
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
