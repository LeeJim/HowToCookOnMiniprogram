const itemHeight = 56 * 2;

Component({
  data: {
    childBoxHeight: 0,
  },
  externalClasses: ['t-class'],
  properties: {
    defaultOpen: {
      type: Boolean,
      value: false,
    },
    name: {
      type: String,
      value: '',
    },
    icon: {
      type: String,
      value: '',
    },
    list: {
      type: Array,
      value: [],
      observer(list) {
        this.setData({
          childBoxHeight: this.data.defaultOpen ? itemHeight * list.length : 0,
        });
      },
    },
  },
  methods: {
    switchHandle() {
      const { list, childBoxHeight } = this.data;
      this.setData({
        childBoxHeight: childBoxHeight > 0 ? 0 : list.length * itemHeight,
      });
    },
    handleTap(e) {
      this.triggerEvent('click', e.target.dataset);
    },
  },
});
