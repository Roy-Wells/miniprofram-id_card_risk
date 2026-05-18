const app = getApp();

function request(url, method, data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${app.globalData.token || ''}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.success) {
            resolve(res.data.data);
          } else {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none',
              duration: 2000
            });
            reject(res.data.message);
          }
        } else if (res.statusCode === 401) {
          app.clearToken();
          wx.reLaunch({
            url: '/pages/login/login'
          });
          reject('登录已过期');
        } else if (res.statusCode === 403) {
          const msg = res.data.message || '无权访问';
          reject(msg);
        } else {
          wx.showToast({
            title: '服务器错误',
            icon: 'none',
            duration: 2000
          });
          reject('服务器错误');
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
        reject(err);
      }
    });
  });
}

function uploadFile(url, filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${app.globalData.baseUrl}${url}`,
      filePath: filePath,
      name: 'file',
      formData: formData,
      // ✅ 修复：上传文件不能加 JSON 请求头！
      header: {
        'Authorization': `Bearer ${app.globalData.token || ''}`
      },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (res.statusCode === 200 && data.success) {
            resolve(data.data);
          } else {
            wx.showToast({
              title: data.message || '上传失败',
              icon: 'none'
            });
            reject(data.message);
          }
        } catch (e) {
          wx.showToast({ title: '解析返回数据失败', icon: 'none' });
          reject(e);
        }
      },
      fail: (err) => {
        console.error('上传失败：', err);
        wx.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

module.exports = {
  get: (url, data) => request(url, 'GET', data),
  post: (url, data) => request(url, 'POST', data),
  upload: uploadFile
};