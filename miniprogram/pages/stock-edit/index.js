import dayjs from 'dayjs';
import Message from 'tdesign-miniprogram/message/index';

import { toScan } from '../../utils/scan';

Component({
  data: {
    barcode: '',
    start: dayjs().subtract(3, 'year').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
    today: dayjs().format('YYYY-MM-DD'),
    manufactureDate: '',
    preserveDate: '',
    unit: 'month',
    expiredDate: '',
    fileList: [],
    loading: false,
    name: '',
    standardInfo: {},
  },

  observers: {
    'manufactureDate, unit, preserveDate': function (mDate, unit, pDate) {
      if (mDate && unit && pDate) {
        const res = new dayjs(mDate).add(pDate, unit)
        this.setData({ expiredDate: res.format('YYYY-MM-DD') })
      } else {
        this.setData({ expiredDate: '' })
      }
    }
  },

  methods: {
    onLoad(options) {
      this.setData({ barcode: options.barcode })
    },

    handleDataready(e) {
      const { data } = e.detail;
  
      this.setData({ name: data. name, standardInfo: data })
    },
  
    showPicker(e) {
      this.setData({
        dateVisible: true,
      });
    },
  
    onConfirm(e) {
      const { value } = e.detail;
      console.log('confirm', value);
  
      this.setData({
        date: value,
        manufactureDate: value,
      });
  
      // this.hidePicker();
    },
  
    handlePreserveDateInput(e) {
      this.setData({ preserveDate: e.detail.value })
    },
  
    handleUnitChange(e) {
      console.log(e.detail.value);
      this.setData({ unit: e.detail.value })
    },

    handleImageAdd(e) {
      // console.log(e.detail);
      const { files } = e.detail;
      this.setData({ fileList: files })
    },

    toUpload(file) {
      return new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: this.data.barcode + '_' + Date.now(), // 上传至云端的路径
          filePath: file, // 小程序临时文件路径
          success: res => {
            resolve(res.fileID)
          },
          fail: reject
        })
      })
    },

    handleBarcodeTap() {
      wx.setClipboardData({
        data: this.data.barcode,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'none'
          })
        }
      })
    },

    handleNameInput(e) {
      this.setData({ name: e.detail.value })
    },

    toSubscribe() {
      return new Promise((resolve, reject) => {
        wx.requestSubscribeMessage({
          tmplIds: ['l5caNms6dSAey7__z4JkECg4mTUSro_4aA6tyyRXZxA'],
        }).then(({ l5caNms6dSAey7__z4JkECg4mTUSro_4aA6tyyRXZxA: status }) => {
          if (status === 'accept') {
            resolve()
          } else {
            reject(new Error('订阅失败'))
          }
        }).catch(reject)
      })
    },

    async handleSubmit() {
      const { barcode, name, expiredDate, fileList, manufactureDate, unit, preserveDate } = this.data;
      const isEmpty = (val) => val == null || val === '';
      if (isEmpty(name)) {
        wx.showToast({
          title: '名称不能为空',
          icon: 'none'
        })
        return;
      }

      if (isEmpty(manufactureDate)) {
        wx.showToast({
          title: '请填写生产时间',
          icon: 'none'
        })
        return;
      }

      if (isEmpty(expiredDate)) {
        wx.showToast({
          title: '请填写质保时间',
          icon: 'none'
        })
        return;
      }

      try {
        await this.toSubscribe()
      } catch (err) {
        console.error('subscribe fail: ', err)

        Message.error({
          context: this,
          duration: 3000,
          offset: [0, 50],
          content: '订阅失败，后续将无法收到过期提醒',
        });
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      this.setData({ loading: true })

      const handleSave = (obj) => {
        const data = { ...obj, barcode, name, expiredDate, manufactureDate, unit, preserveDate }

        console.log('save', data);
        wx.showLoading({
          title: '保存中',
        })
        wx.cloud.callFunction({
          name: 'sku',
          data: {
            action: 'save',
            body: data
          }
        }).then(({ result }) => {
          if (result.code == 0) {
            wx.showModal({
              title: '保存成功',
              content: '继续保存还是前往列表页面',
              confirmText: '继续添加',
              cancelText: '去列表页',
              success({ confirm }) {
                if (confirm) {
                  toScan()
                } else {
                  wx.redirectTo({
                    url: '/pages/stock-list/index',
                  })
                }
              },
              fail: console.error
            })
          }
        }).finally(() => {
          wx.hideLoading()
          this.setData({ loading: false })
        })
      }

      if (fileList.length > 0) {
        wx.showToast({
          title: '正在上传图片...',
          icon: 'none'
        })
        this.toUpload(fileList[0].url).then((fileId) => {
          wx.hideToast()
          handleSave({ pic: fileId })
        }).catch((err) => {
          console.error('upload fail: ', err)
          wx.hideToast()
          this.setData({ loading: false })
          Message.error({
            context: this,
            duration: 2000,
            content: err.message,
          });
        })
      } else {
        handleSave({})
      }
    }
  }
})