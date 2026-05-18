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
    selectedFile: null,
    importing: false,
    showImportResult: false,
    importResult: null,
    exporting: false,
    fileSizeText: ""
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
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

  handleChooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
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
        selectedFile: null
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
  }
});
