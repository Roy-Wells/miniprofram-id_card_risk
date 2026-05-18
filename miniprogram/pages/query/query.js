const request = require('../../utils/request');
const { validateIdCard } = require('../../utils/validator');

Page({
  data: {
    idCard: '',
    agreed: false,
    loading: false,
    showResult: false,
    hasRisk: false,
    riskLevel: '',
    remark: ''
  },

  onIdCardInput(e) {
    const value = e.detail.value.replace(/[^\dXx]/g, '');
    this.setData({ idCard: value });
  },

  onAgreementChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 });
  },

  handleQuery() {
    const { idCard, agreed } = this.data;

    if (!agreed) {
      wx.showToast({
        title: '请先阅读并同意协议',
        icon: 'none'
      });
      return;
    }

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
      agreed: false,
      showResult: false,
      hasRisk: false,
      riskLevel: '',
      remark: ''
    });
  }
});