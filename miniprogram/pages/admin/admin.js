const request = require('../../utils/request');
const { validateIdCard } = require('../../utils/validator');

Page({
  data: {
    activeTab: 'query',
    idCard: '',
    loading: false,
    showResult: false,
    hasRisk: false,
    riskLevel: '',
    remark: '',
    // 身份证导入
    selectedFile: null,
    importing: false,
    showImportResult: false,
    importResult: null,
    exporting: false,
    fileSizeText: '',
    // 手机号导入
    phoneFile: null,
    phoneImporting: false,
    showPhoneImportResult: false,
    phoneImportResult: null,
    phoneFileSizeText: '',
    // 用户列表
    userList: [],
    selectedUsers: [],
    updatingRole: false
  },

  onLoad() {
    this.loadUserList();
  },

  loadUserList() {
    request.get('/admin/users').then(data => {
      this.setData({
        userList: data || [],
        selectedUsers: []
      });
    }).catch(err => {
      console.error('Load users error:', err);
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'import') {
      this.loadUserList();
    }
  },

  onIdCardInput(e) {
    const value = e.detail.value.replace(/[^\dXx]/g, '');
    this.setData({ idCard: value });
  },

  handleQuery() {
    const { idCard } = this.data;

    if (!validateIdCard(idCard)) {
      wx.showToast({
        title: '请输入18位有效身份证号码',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    request.post('/query/risk', {
      idCard: idCard
    }).then(data => {
      this.setData({
        loading: false,
        showResult: true,
        hasRisk: data.hasRisk,
        riskLevel: data.riskLevel,
        remark: data.remark
      });
    }).catch(err => {
      console.error('Query error:', err);
      this.setData({ loading: false });
    });
  },

  handleReset() {
    this.setData({
      idCard: '',
      showResult: false,
      hasRisk: false,
      riskLevel: '',
      remark: ''
    });
  },

  // ========== 身份证/风险数据导入 ==========
  handleChooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          const fileSizeText = (file.size / 1024).toFixed(2) + " KB";
          this.setData({
            selectedFile: file,
            fileSizeText: fileSizeText,
            showImportResult: false,
            importResult: null
          });
        }
      },
      fail: (err) => {
        console.error('Choose file error:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  handleImport() {
    const { selectedFile } = this.data;

    if (!selectedFile) {
      wx.showToast({
        title: '请先选择文件',
        icon: 'none'
      });
      return;
    }

    this.setData({ importing: true });

    request.upload('/admin/import', selectedFile.path).then(data => {
      this.setData({
        importing: false,
        showImportResult: true,
        importResult: data,
        selectedFile: null,
        fileSizeText: ''
      });

      if (data.success > 0) {
        wx.showToast({
          title: `成功导入${data.success}条`,
          icon: 'success'
        });
      }
    }).catch(err => {
      console.error('Import error:', err);
      wx.showModal({
        title: '上传失败',
        content: err.errMsg || err || '请检查网络连接和服务器状态',
        showCancel: false
      });
      this.setData({ importing: false });
    });
  },

  handleExportFailures() {
    const { importResult } = this.data;

    if (!importResult || importResult.failed === 0) {
      return;
    }

    this.setData({ exporting: true });

    const app = getApp();

    wx.request({
      url: `${app.globalData.baseUrl}/admin/export-failures`,
      method: 'POST',
      data: { errors: importResult.errors },
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${app.globalData.token || ''}`
      },
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const fs = wx.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/失败数据.xlsx`;

          try {
            fs.writeFileSync(filePath, res.data, 'binary');

            wx.openDocument({
              filePath: filePath,
              fileType: 'xlsx',
              success: () => {
                wx.showToast({
                  title: '导出成功',
                  icon: 'success'
                });
              },
              fail: () => {
                wx.showToast({
                  title: '打开文件失败',
                  icon: 'none'
                });
              }
            });
          } catch (err) {
            console.error('Write file error:', err);
            wx.showToast({
              title: '保存文件失败',
              icon: 'none'
            });
          }
        } else {
          wx.showToast({
            title: '导出失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Export error:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ exporting: false });
      }
    });
  },

  // ========== 手机号码导入 ==========
  handleChoosePhoneFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          const phoneFileSizeText = (file.size / 1024).toFixed(2) + " KB";
          this.setData({
            phoneFile: file,
            phoneFileSizeText: phoneFileSizeText,
            showPhoneImportResult: false,
            phoneImportResult: null
          });
        }
      },
      fail: (err) => {
        console.error('Choose phone file error:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  handleImportPhones() {
    const { phoneFile } = this.data;

    if (!phoneFile) {
      wx.showToast({
        title: '请先选择文件',
        icon: 'none'
      });
      return;
    }

    this.setData({ phoneImporting: true });

    request.upload('/admin/import-phones', phoneFile.path).then(data => {
      this.setData({
        phoneImporting: false,
        showPhoneImportResult: true,
        phoneImportResult: data,
        phoneFile: null,
        phoneFileSizeText: ''
      });

      if (data.success > 0) {
        wx.showToast({
          title: `成功导入${data.success}条`,
          icon: 'success'
        });
        this.loadUserList();
      }
    }).catch(err => {
      console.error('Phone import error:', err);
      wx.showModal({
        title: '上传失败',
        content: err.errMsg || err || '请检查网络连接和服务器状态',
        showCancel: false
      });
      this.setData({ phoneImporting: false });
    });
  },

  // ========== 角色管理 ==========
  onUserCheck(e) {
    const phone = e.currentTarget.dataset.phone;
    let { selectedUsers } = this.data;
    const index = selectedUsers.indexOf(phone);
    if (index > -1) {
      selectedUsers.splice(index, 1);
    } else {
      selectedUsers.push(phone);
    }
    this.setData({ selectedUsers });
  },

  handleSelectAll() {
    const { userList, selectedUsers } = this.data;
    if (selectedUsers.length === userList.length) {
      this.setData({ selectedUsers: [] });
    } else {
      this.setData({ selectedUsers: userList.map(u => u.phone) });
    }
  },

  handleSetAdmin() {
    this._updateRoles('admin');
  },

  handleSetUser() {
    this._updateRoles('user');
  },

  _updateRoles(role) {
    const { selectedUsers } = this.data;

    if (selectedUsers.length === 0) {
      wx.showToast({
        title: '请先选择用户',
        icon: 'none'
      });
      return;
    }

    const roleName = role === 'admin' ? '管理员' : '普通用户';

    wx.showModal({
      title: '确认修改',
      content: `确定将${selectedUsers.length}位用户角色改为"${roleName}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.setData({ updatingRole: true });

          request.post('/admin/update-roles', {
            phones: selectedUsers,
            role: role
          }).then(data => {
            wx.showToast({
              title: `成功修改${data.success}位用户`,
              icon: 'success'
            });
            this.setData({
              selectedUsers: [],
              updatingRole: false
            });
            this.loadUserList();
          }).catch(err => {
            console.error('Update roles error:', err);
            this.setData({ updatingRole: false });
          });
        }
      }
    });
  }
});
