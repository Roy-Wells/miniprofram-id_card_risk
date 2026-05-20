const request = require('../../utils/request');

Page({
  data: {
    phone: '',
    password: '',
    showPassword: false,
    loading: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  // ========== 检查本地缓存登录状态 ==========
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (token && userInfo && userInfo.role) {
      if (userInfo.role === 'admin') {
        wx.redirectTo({ url: '/pages/admin/admin' });
      } else {
        wx.redirectTo({ url: '/pages/query/query' });
      }
    }
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }); },

  // ========== 登录 ==========
  handleLogin() {
    const { phone, password } = this.data;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入11位有效手机号', icon: 'none' });
      return;
    }

    if (!password || password.length < 6) {
      wx.showToast({ title: '请输入6位以上密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    request.post('/auth/login', { phone, password }).then(data => {
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
      console.error('Login error:', err);
      if (err === '您非邀请用户，暂时无法使用') {
        wx.showToast({ title: '您非邀请用户，暂时无法使用', icon: 'none', duration: 3000 });
      } else {
        wx.showModal({
          title: '登录失败',
          content: err || '请重试',
          showCancel: false,
          confirmText: '重试'
        });
      }
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
