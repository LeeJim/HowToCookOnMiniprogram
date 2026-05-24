import dayjs from 'dayjs';
import Message from 'tdesign-miniprogram/message/index';
import { toScan } from '../../utils/scan';

Component({
  data: {
    barcode: '',
    start: dayjs().subtract(3, 'year').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
    today: dayjs().format('YYYY-MM-DD'),
    minTimestamp: dayjs().subtract(3, 'year').valueOf(),
    maxTimestamp: dayjs().add(10, 'year').valueOf(),
    mode: 2,
    manufactureDate: '',
    preserveDate: '',
    unit: 'month',
    expiredDate: '',
    fileList: [],
    loading: false,
    name: '',
    standardInfo: {},
    calendarVisible: false,
    calendarTimestamp: dayjs().valueOf(),
    calendarTitle: '选择日期',
  },

  observers: {
    'manufactureDate, unit, preserveDate': function (mDate, unit, pDate) {
      if (this.data.mode !== 2) return;
      if (mDate && unit && pDate) {
        const res = new dayjs(mDate).add(pDate, unit)
        this.setData({ expiredDate: res.format('YYYY-MM-DD') })
      } else {
        this.setData({ expiredDate: '' })
      }
    }
  },

  methods: {
    handleBack() {
      wx.navigateBack({ delta: 1 });
    },

    switchMode(e) {
      const mode = Number(e.currentTarget.dataset.mode);
      this.setData({ mode });
    },

    onLoad(options) {
      this.setData({ barcode: options.barcode })
    },

    handleDataready(e) {
      const { data } = e.detail;
      this.setData({ name: data.name, standardInfo: data });
      this.lookupHistory();
    },

    async lookupHistory() {
      const { barcode } = this.data;
      if (!barcode) return;
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'sku',
          data: { action: 'lookup', barcode },
        });
        if (result && result.code === 0 && result.data) {
          const { preserveDate, unit } = result.data;
          this.setData({
            preserveDate: preserveDate || '',
            unit: unit || 'month',
          });
        }
      } catch (err) {
        console.error('查询历史保质期失败:', err);
      }
    },
  
    showMfrCalendar() {
      this.setData({
        calendarVisible: true,
        calendarTitle: '选择生产日期',
        calendarTimestamp: this.data.manufactureDate
          ? dayjs(this.data.manufactureDate).valueOf()
          : dayjs().valueOf(),
        minTimestamp: dayjs().subtract(3, 'year').valueOf(),
        maxTimestamp: dayjs().valueOf(),
        _calendarType: 'mfr',
      });
    },

    showExpCalendar() {
      this.setData({
        calendarVisible: true,
        calendarTitle: '选择过期日期',
        calendarTimestamp: this.data.expiredDate
          ? dayjs(this.data.expiredDate).valueOf()
          : dayjs().valueOf(),
        minTimestamp: dayjs().valueOf(),
        maxTimestamp: dayjs().add(10, 'year').valueOf(),
        _calendarType: 'exp',
      });
    },

    onCalendarChange(e) {
      const ts = e.detail.value;
      const date = dayjs(ts).format('YYYY-MM-DD');
      if (this.data._calendarType === 'exp') {
        this.setData({ expiredDate: date });
      } else {
        this.setData({ manufactureDate: date });
      }
    },

    onCalendarClose() {
      this.setData({ calendarVisible: false });
    },
  
    handlePreserveDateInput(e) {
      this.setData({ preserveDate: e.detail.value })
    },
  
    handleUnitChange(e) {
      this.setData({ unit: e.detail.value })
    },

    handleUnitTap(e) {
      const { unit } = e.currentTarget.dataset;
      this.setData({ unit });
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
      const { barcode, name, expiredDate, fileList, manufactureDate, unit, preserveDate, mode } = this.data;
      const isEmpty = (val) => val == null || val === '';
      if (isEmpty(name)) {
        wx.showToast({ title: '名称不能为空', icon: 'none' });
        return;
      }

      if (mode === 2) {
        if (isEmpty(manufactureDate)) {
          wx.showToast({ title: '请选择生产日期', icon: 'none' });
          return;
        }
        if (isEmpty(preserveDate)) {
          wx.showToast({ title: '请填写保质期', icon: 'none' });
          return;
        }
      }

      if (isEmpty(expiredDate)) {
        wx.showToast({ title: '请填写过期日期', icon: 'none' });
        return;
      }

      this.setData({ loading: true })

      // 非阻塞订阅
      this.toSubscribe().catch(err => {
        console.error('subscribe fail:', err);
      });

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