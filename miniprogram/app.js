App({
  globalData: {
    token: null,
    userInfo: null,
    baseUrl: 'http://43.136.124.95:3000/api'
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
  },

  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
  },

  clearToken() {
    this.globalData.token = null;
    wx.removeStorageSync('token');
  }
});