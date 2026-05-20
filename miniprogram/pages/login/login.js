const request = require('../../utils/request');

Page({
  data: {
    phone: '',
    password: '',
    showPassword: false,
    loading: false,
    autoLogging: true,     // 正在自动登录
    showLoginForm: false,  // 是否显示手动登录表单
    noPermission: false    // 无权限提示
  },

  onLoad() {
    this.tryAutoLogin();
  },

  // ========== 自动登录 ==========
  tryAutoLogin() {
    this.setData({ autoLogging: true, showLoginForm: false, noPermission: false });

    wx.login({
      success: (res) => {
        if (res.code) {
          request.post('/auth/auto-login', { code: res.code }).then(data => {
            this.onLoginSuccess(data);
          }).catch(err => {
            console.log('Auto login failed:', err);
            // 自动登录失败，显示手动登录表单
            this.setData({ autoLogging: false, showLoginForm: true });
            if (err === '无权限访问') {
              this.setData({ noPermission: true });
            }
          });
        } else {
          this.setData({ autoLogging: false, showLoginForm: true });
        }
      },
      fail: () => {
        this.setData({ autoLogging: false, showLoginForm: true });
      }
    });
  },

  // ========== 登录成功通用处理 ==========
  onLoginSuccess(data) {
    const app = getApp();
    app.setToken(data.token);
    app.setUserInfo({ phone: data.phone, role: data.role });

    this.setData({ autoLogging: false });
    wx.showToast({ title: '登录成功', icon: 'success' });

    setTimeout(() => {
      if (data.role === 'admin') {
        wx.redirectTo({ url: '/pages/admin/admin' });
      } else {
        wx.redirectTo({ url: '/pages/query/query' });
      }
    }, 1500);
  },

  // ========== 手动登录 ==========
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }); },

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

    // 手动登录时同时获取 code 绑定 openid
    wx.login({
      success: (loginRes) => {
        const code = loginRes.code || '';
        request.post('/auth/login', { phone, password, code }).then(data => {
          this.onLoginSuccess(data);
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
      },
      fail: () => {
        // wx.login 失败，不带 code 登录
        request.post('/auth/login', { phone, password }).then(data => {
          this.onLoginSuccess(data);
        }).catch(err => {
          wx.showModal({ title: '登录失败', content: err || '请重试', showCancel: false });
        }).finally(() => {
          this.setData({ loading: false });
        });
      }
    });
  }
});
