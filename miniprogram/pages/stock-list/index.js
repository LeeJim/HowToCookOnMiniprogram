import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.locale('zh-cn')

const size = 10;

function getExpiryStatus(expiredDate) {
  const now = dayjs();
  const expired = dayjs(expiredDate);
  const diffDays = expired.diff(now, 'day');

  if (diffDays < 0) return { color: '#e34d59', label: '已过期' };
  if (diffDays <= 3) return { color: '#e37318', label: '即将过期' };
  return { color: '#00a870', label: '正常' };
}

const FILTERS = {
  all: { label: '全部', fn: () => true },
  week: { label: '一周内', fn: (d) => d <= 7 && d >= 0 },
  month: { label: '一月内', fn: (d) => d <= 30 && d >= 0 },
  '3month': { label: '三月内', fn: (d) => d <= 90 && d >= 0 },
  '6month': { label: '半年内', fn: (d) => d <= 180 && d >= 0 },
  expired: { label: '已过期', fn: (d) => d < 0 },
};

function applyFilter(items, filterKey) {
  const fn = FILTERS[filterKey] ? FILTERS[filterKey].fn : FILTERS.all.fn;
  const now = dayjs();
  return items.filter(item => {
    const expired = dayjs(item.expiredDate);
    const diffDays = expired.diff(now, 'day');
    return fn(diffDays);
  });
}

Component({
  data: {
    data: [],
    loading: false,
    noMore: false,
    page: 0,
    activeFilter: 'all',
    allData: [],
  },

  methods: {
    onShow() {
      this.setData({ allData: [], data: [], page: 0, noMore: false });
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
          const tmp = result.data.map(item => {
            const status = getExpiryStatus(item.expiredDate);
            return {
              ...item,
              expiredTxt: dayjs(item.expiredDate).fromNow(),
              expiredDate: dayjs(item.expiredDate).format('YYYY.MM.DD'),
              statusColor: status.color,
              statusLabel: status.label,
            }
          })
          const allData = [...this.data.allData, ...tmp];
          this.setData({
            allData,
            data: applyFilter(allData, this.data.activeFilter),
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

    switchFilter(e) {
      const filter = e.currentTarget.dataset.filter;
      this.setData({
        activeFilter: filter,
        data: applyFilter(this.data.allData, filter),
      });
    },

    handleClick(e) {
      const { pic } = e.target.dataset;
      if (pic) {
        wx.previewImage({ urls: [pic] })
      }
    },

    handleScrollToBottom() {
      if (!this.data.noMore) {
        this.getList();
      }
    },

    handleBack() {
      wx.navigateBack({ delta: 1 });
    },
  }
})