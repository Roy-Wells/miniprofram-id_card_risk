const request = require('../../utils/request');
const { validateIdCard } = require('../../utils/validator');

const PAGE_SIZE = 20;

Page({
  data: {
    activeTab: 'query',
    idCard: '', loading: false, showResult: false, hasRisk: false, riskLevel: '', remark: '',
    // 身份证导入（UI统一升级）
    selectedFile: null, importing: false, showImportResult: false, importResult: null,
    exporting: false, fileSizeText: '', idImportProgress: 0, showIdFailures: false,
    // 手机号导入
    phoneFile: null, phoneImporting: false, phoneImportProgress: 0,
    showPhoneImportResult: false, phoneImportResult: null, phoneFileSizeText: '',
    showPhoneFailures: false,
    // 用户角色管理（增强）
    allUsers: [], filteredUsers: [], currentPageUsers: [], selectedUsers: [],
    searchKeyword: '', currentPage: 1, totalPages: 1, updatingRole: false,
    // 重置密码模态框
    showResetModal: false, resetPhone: '', resetNewPwd: '', resetConfirmPwd: '',
    resetError: '', resetShowPwd: false, resetSubmitting: false
  },

  onLoad() { this.loadUserList(); },

  // ========== Tab 切换 ==========
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'import') this.loadUserList();
  },

  // ========== 风险查询（保持不变） ==========
  onIdCardInput(e) { this.setData({ idCard: e.detail.value.replace(/[^\dXx]/g, '') }); },

  handleQuery() {
    const { idCard } = this.data;
    if (!validateIdCard(idCard)) { wx.showToast({ title: '请输入18位有效身份证号码', icon: 'none' }); return; }
    this.setData({ loading: true });
    request.post('/query/risk', { idCard }).then(data => {
      this.setData({ loading: false, showResult: true, hasRisk: data.hasRisk, riskLevel: data.riskLevel, remark: data.remark });
    }).catch(err => { console.error('Query error:', err); this.setData({ loading: false }); });
  },

  handleReset() { this.setData({ idCard: '', showResult: false, hasRisk: false, riskLevel: '', remark: '' }); },

  // ========== 身份证/风险数据导入（UI统一升级） ==========
  handleChooseFile() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          this.setData({ selectedFile: file, fileSizeText: (file.size / 1024).toFixed(2) + " KB", showImportResult: false, importResult: null, showIdFailures: false });
        }
      }, fail: () => wx.showToast({ title: '选择文件失败', icon: 'none' })
    });
  },

  handleImport() {
    const { selectedFile } = this.data;
    if (!selectedFile) { wx.showToast({ title: '请先选择文件', icon: 'none' }); return; }
    this.setData({ importing: true, idImportProgress: 0 });
    this._idTimer = setInterval(() => {
      const p = this.data.idImportProgress;
      if (p < 90) this.setData({ idImportProgress: p + Math.floor(Math.random() * 15) + 5 });
    }, 300);
    request.upload('/admin/import', selectedFile.path).then(data => {
      clearInterval(this._idTimer);
      this.setData({ idImportProgress: 100, importing: false, showImportResult: true, importResult: data, selectedFile: null, fileSizeText: '' });
      if (data.success > 0) wx.showToast({ title: `成功导入${data.success}条`, icon: 'success' });
    }).catch(err => {
      clearInterval(this._idTimer);
      wx.showModal({ title: '上传失败', content: err.errMsg || err || '请检查网络连接', showCancel: false });
      this.setData({ importing: false, idImportProgress: 0 });
    });
  },

  toggleIdFailures() { this.setData({ showIdFailures: !this.data.showIdFailures }); },

  handleExportFailures() { this._exportFailures(this.data.importResult, '身份证导入失败数据'); },

  // ========== 手机号码批量导入 ==========
  handleChoosePhoneFile() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          this.setData({ phoneFile: file, phoneFileSizeText: (file.size / 1024).toFixed(2) + " KB", showPhoneImportResult: false, phoneImportResult: null, showPhoneFailures: false });
        }
      }, fail: () => wx.showToast({ title: '选择文件失败', icon: 'none' })
    });
  },

  handleImportPhones() {
    const { phoneFile } = this.data;
    if (!phoneFile) { wx.showToast({ title: '请先选择文件', icon: 'none' }); return; }
    this.setData({ phoneImporting: true, phoneImportProgress: 0 });
    this._phoneTimer = setInterval(() => {
      const p = this.data.phoneImportProgress;
      if (p < 90) this.setData({ phoneImportProgress: p + Math.floor(Math.random() * 15) + 5 });
    }, 300);
    request.upload('/admin/import-phones', phoneFile.path).then(data => {
      clearInterval(this._phoneTimer);
      this.setData({ phoneImportProgress: 100, phoneImporting: false, showPhoneImportResult: true, phoneImportResult: data, phoneFile: null, phoneFileSizeText: '' });
      if (data.success > 0) wx.showToast({ title: `成功导入${data.success}条`, icon: 'success' });
      this.loadUserList();
    }).catch(err => {
      clearInterval(this._phoneTimer);
      wx.showModal({ title: '上传失败', content: err.errMsg || err || '请检查网络连接', showCancel: false });
      this.setData({ phoneImporting: false, phoneImportProgress: 0 });
    });
  },

  togglePhoneFailures() { this.setData({ showPhoneFailures: !this.data.showPhoneFailures }); },

  handleExportPhoneFailures() { this._exportFailures(this.data.phoneImportResult, '手机号导入失败数据'); },

  // ========== 用户角色管理（增强） ==========
  loadUserList() {
    request.get('/admin/users').then(data => {
      this.setData({ allUsers: data || [], selectedUsers: [] });
      this._applyFilter();
    }).catch(err => console.error('Load users error:', err));
  },

  _applyFilter() {
    const { allUsers, searchKeyword } = this.data;
    const keyword = (searchKeyword || '').trim();
    const filteredUsers = keyword ? allUsers.filter(u => u.phone.includes(keyword)) : allUsers;
    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
    const currentPage = Math.min(this.data.currentPage, totalPages);
    this.setData({ filteredUsers, totalPages, currentPage });
    this._applyPagination();
  },

  _applyPagination() {
    const { filteredUsers, currentPage } = this.data;
    const start = (currentPage - 1) * PAGE_SIZE;
    this.setData({ currentPageUsers: filteredUsers.slice(start, start + PAGE_SIZE) });
  },

  onSearchInput(e) { this.setData({ searchKeyword: e.detail.value }); },
  handleSearch() { this.setData({ currentPage: 1 }); this._applyFilter(); },
  handlePrevPage() { if (this.data.currentPage > 1) { this.setData({ currentPage: this.data.currentPage - 1 }); this._applyPagination(); } },
  handleNextPage() { if (this.data.currentPage < this.data.totalPages) { this.setData({ currentPage: this.data.currentPage + 1 }); this._applyPagination(); } },

  onUserCheck(e) {
    const phone = e.currentTarget.dataset.phone;
    const selectedUsers = [...this.data.selectedUsers];
    const idx = selectedUsers.indexOf(phone);
    if (idx > -1) { selectedUsers.splice(idx, 1); } else { selectedUsers.push(phone); }
    this.setData({ selectedUsers });
  },

  handleSelectAll() {
    const { filteredUsers, selectedUsers } = this.data;
    this.setData({ selectedUsers: selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? [] : filteredUsers.map(u => u.phone) });
  },

  handleSetAdmin() { this._updateRoles('admin'); },
  handleSetUser() { this._updateRoles('user'); },
  handleSetSingleAdmin(e) { this._updateRoles('admin', [e.currentTarget.dataset.phone]); },
  handleSetSingleUser(e) { this._updateRoles('user', [e.currentTarget.dataset.phone]); },

  _updateRoles(role, phones) {
    const selected = phones || this.data.selectedUsers;
    if (selected.length === 0) { wx.showToast({ title: '请先选择用户', icon: 'none' }); return; }
    const roleName = role === 'admin' ? '管理员' : '普通用户';
    wx.showModal({
      title: '确认修改', content: `确定将${selected.length}位用户角色改为"${roleName}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.setData({ updatingRole: true });
          request.post('/admin/update-roles', { phones: selected, role }).then(data => {
            wx.showToast({ title: `成功修改${data.success}位用户`, icon: 'success' });
            this.setData({ selectedUsers: [], updatingRole: false });
            this.loadUserList();
          }).catch(err => { console.error('Update roles error:', err); this.setData({ updatingRole: false }); });
        }
      }
    });
  },

  handleDeleteUser(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.showModal({
      title: '确认删除', content: `确定删除用户 ${phone} 吗？此操作不可恢复。`, confirmColor: '#F53F3F',
      success: (res) => { if (res.confirm) this._deleteUsers([phone]); }
    });
  },

  handleBatchDelete() {
    const { selectedUsers } = this.data;
    if (selectedUsers.length === 0) { wx.showToast({ title: '请先选择用户', icon: 'none' }); return; }
    wx.showModal({
      title: '确认删除', content: `确定删除${selectedUsers.length}位用户吗？此操作不可恢复。`, confirmColor: '#F53F3F',
      success: (res) => { if (res.confirm) this._deleteUsers(selectedUsers); }
    });
  },

  _deleteUsers(phones) {
    request.post('/admin/delete-users', { phones }).then(data => {
      wx.showToast({ title: `成功删除${data.success}位用户`, icon: 'success' });
      this.setData({ selectedUsers: [] });
      this.loadUserList();
    }).catch(err => console.error('Delete users error:', err));
  },

  // ========== 重置密码模态框 ==========
  handleShowResetModal(e) {
    this.setData({
      showResetModal: true, resetPhone: e.currentTarget.dataset.phone,
      resetNewPwd: '', resetConfirmPwd: '', resetError: '', resetShowPwd: false, resetSubmitting: false
    });
  },

  handleCloseResetModal() { this.setData({ showResetModal: false }); },

  onResetNewPwdInput(e) {
    this.setData({ resetNewPwd: e.detail.value, resetError: '' });
  },

  onResetConfirmPwdInput(e) {
    this.setData({ resetConfirmPwd: e.detail.value, resetError: '' });
  },

  handleResetPassword() {
    const { resetPhone, resetNewPwd, resetConfirmPwd } = this.data;

    if (!resetNewPwd || resetNewPwd.length < 6 || resetNewPwd.length > 20) {
      this.setData({ resetError: '密码长度须为6-20位' }); return;
    }
    if (resetNewPwd !== resetConfirmPwd) {
      this.setData({ resetError: '两次输入的密码不一致' }); return;
    }

    this.setData({ resetSubmitting: true });
    request.post('/admin/reset-password', { phone: resetPhone, password: resetNewPwd }).then(() => {
      wx.showToast({ title: '密码重置成功', icon: 'success' });
      this.setData({ showResetModal: false });
    }).catch(err => {
      console.error('Reset password error:', err);
    }).finally(() => { this.setData({ resetSubmitting: false }); });
  },

  // ========== 公共方法 ==========
  _exportFailures(importResult, filename) {
    if (!importResult || importResult.failed === 0) return;
    this.setData({ exporting: true });
    const app = getApp();
    wx.request({
      url: `${app.globalData.baseUrl}/admin/export-failures`, method: 'POST',
      data: { errors: importResult.errors },
      header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${app.globalData.token || ''}` },
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const fs = wx.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/${filename}.xlsx`;
          try {
            fs.writeFileSync(filePath, res.data, 'binary');
            wx.openDocument({ filePath, fileType: 'xlsx', success: () => wx.showToast({ title: '导出成功', icon: 'success' }), fail: () => wx.showToast({ title: '打开文件失败', icon: 'none' }) });
          } catch (err) { wx.showToast({ title: '保存文件失败', icon: 'none' }); }
        } else { wx.showToast({ title: '导出失败', icon: 'none' }); }
      },
      fail: () => wx.showToast({ title: '网络错误', icon: 'none' }),
      complete: () => this.setData({ exporting: false })
    });
  },

  onUnload() {
    if (this._idTimer) clearInterval(this._idTimer);
    if (this._phoneTimer) clearInterval(this._phoneTimer);
  }
});
