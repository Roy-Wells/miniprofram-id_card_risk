const request = require('../../utils/request');

Page({
  data: {
    loading: false
  },

  onLoad() {
    // 检查本地缓存登录状态
    this.checkLoginStatus();
  },

  // ========== 检查本地缓存登录状态 ==========
  checkLoginStatus() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (token && userInfo && userInfo.role) {
      // 已登录，直接跳转
      if (userInfo.role === 'admin') {
        wx.redirectTo({ url: '/pages/admin/admin' });
      } else {
        wx.redirectTo({ url: '/pages/query/query' });
      }
    }
  },

  // ========== 微信快捷登录 ==========
  handleGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      // 用户拒绝授权
      if (e.detail.errMsg.includes('deny') || e.detail.errMsg.includes('cancel')) {
        wx.showToast({ title: '需要授权手机号才能登录', icon: 'none', duration: 2500 });
      } else {
        wx.showToast({ title: '获取手机号失败，请重试', icon: 'none' });
      }
      return;
    }

    const code = e.detail.code;
    if (!code) {
      wx.showToast({ title: '获取授权码失败', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    request.post('/auth/phone-login', { code }).then(data => {
      const app = getApp();
      app.setToken(data.token);
      app.setUserInfo({ phone: data.phone, role: data.role });

      wx.showToast({ title: '登录成功', icon: 'success' });

      setTimeout(() => {
        if (data.role === 'admin') {
          wx.redirectTo({ url: '/pages/admin/admin' });
        } else {
          wx.redirectTo({ url: '/pages/query/query' });
        }
      }, 1500);
    }).catch(err => {
      console.error('Phone login error:', err);
      if (err === '手机号无访问权限，请联系管理员') {
        wx.showModal({
          title: '无访问权限',
          content: '手机号无访问权限，请联系管理员',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showModal({
          title: '登录失败',
          content: err || '请检查网络后重试',
          showCancel: false,
          confirmText: '重试'
        });
      }
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
