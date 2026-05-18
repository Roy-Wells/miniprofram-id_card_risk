const request = require('../../utils/request');

Page({
  data: {
    loading: false
  },

  handleGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '请授权手机号',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    request.post('/auth/login', {
      code: 'test-code',
      phone: '13800138000'
    }).then(data => {
      const app = getApp();
      app.setToken(data.token);
      app.setUserInfo({
        phone: data.phone,
        role: data.role
      });

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      setTimeout(() => {
        if (data.role === 'admin') {
          wx.redirectTo({
            url: '/pages/admin/admin'
          });
        } else {
          wx.redirectTo({
            url: '/pages/query/query'
          });
        }
      }, 1500);
    }).catch(err => {
      console.error('Login error:', err);
      if (err === '您非邀请用户，暂时无法使用') {
        wx.showToast({
          title: '您非邀请用户，暂时无法使用',
          icon: 'none',
          duration: 3000
        });
      } else {
        wx.showModal({
          title: '登录失败',
          content: err || '请重新授权登录',
          showCancel: false,
          confirmText: '重试'
        });
      }
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
