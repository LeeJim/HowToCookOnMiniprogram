import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.locale('zh-cn')

const size = 10;

Component({
  data: {
    data: [],
    loading: false,
    noMore: false,
    page: 0,
  },

  methods: {
    onShow() {
      this.getList();
    },
    getList() {
      this.setData({ loading: true })
      wx.cloud.callFunction({
        name: 'sku',
        data: {
          action: 'get',
          page: this.data.page,
          size
        }
      }).then(({ result }) => {
        if (result.code === 0) {
          const tmp = result.data.map(item => ({ 
            ...item,
            expiredTxt: dayjs(item.expiredDate).fromNow(),
            expiredDate: dayjs(item.expiredDate).format('YYYY.MM.DD')
          }))
          this.setData({
            data: [...this.data.data, ...tmp],
            noMore: result.data.length < size,
            page: this.data.page + 1,
          });
        } else {
          this.setData({ noMore: true })
        }
      }).finally(() => {
        this.setData({ loading: false })
      })
    },
    handleClick(e) {
      const { pic } = e.target.dataset;

      if (pic) {
        wx.previewImage({
          urls: [pic],
        })
      }
    },
    handleScrollToBottom() {
      if (!this.data.noMore) {
        this.getList();
      }
    }
  }
})