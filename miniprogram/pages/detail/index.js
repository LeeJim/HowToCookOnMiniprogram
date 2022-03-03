// pages/detail/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    index: 0,
    stepIndex: 0,
    startCountDown: false,
    // title: '吐司+果酱的做法',
    // desc: '饱腹感的懒人快速营养早餐，2min 搞定',
    // sections: [{
    //   "type": "heading",
    //   "value": "原料和工具",
    //   "child": [{
    //     "value": ["新鲜吐司", "果酱", "面包机"],
    //     "type": "list"
    //   }]
    // }, {
    //   "type": "heading",
    //   "value": "计算",
    //   "child": [{
    //     "value": ["吐司两片", "果酱足够涂满一面土司的量"],
    //     "type": "list"
    //   }]
    // }, {
    //   "type": "heading",
    //   "value": "操作",
    //   "child": [{
    //     "value": ["将吐司放入面包机", "设置好档位,时间到了会自动弹出", "两分钟后吐司加热完成弹出", "先取出一片吐司,涂满果酱再盖上另一片吐司即可", "用餐巾纸包一下可以边走边吃也可以吃完再出门"],
    //     "type": "list"
    //   }, {
    //     "value": "两分钟快速搞定,操作很简单,味道十分美味,十分适合程序员。耗时短,不会产生额外垃圾,也不需要清洗工具什么的。",
    //     "type": "paragraph"
    //   }]
    // }, {
    //   "type": "heading",
    //   "value": "附加内容",
    //   "child": [{
    //     "value": "面包机一般不会超过一百块,吐司去楼下超市或美团买菜送上门,一般一包十块钱八片,保质期比较短,很干净卫生。这里果酱推介一下山姆超市的草莓果酱,很甜,它们家的蓝莓酱倒是一般般,反正我是感觉没啥味。干净又卫生哦,兄弟们。",
    //     "type": "paragraph"
    //   }, {
    //     "value": "如果您遵循本指南的制作流程而发现有问题或可以改进的流程，请提出 Issue 或 Pull request。",
    //     "type": "paragraph"
    //   }]
    // }]
  },

  onLoad: function (options) {
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('acceptDataFromOpenerPage', ({ data }) => {
      const [main] = data;
      const sectionStartIndex = main.child.findIndex(item => item.type == 'heading');
      const hasDesc = sectionStartIndex > 0;
      const sections = hasDesc ? main.child.slice(sectionStartIndex) : main.child;

      sections[0].value = sections[0].value.slice(2)
      this.setData({
        title: main.value,
        desc: hasDesc ? main.child[0].value : '可以动手试试',
        sections,
      })
    })
  },
  handleTabChange({ detail }) {
    console.log(detail)
  },
  toNext() {
    wx.vibrateShort()
    this.setData({
      stepIndex: this.data.stepIndex + 1,
      startCountDown: false
    })
  },
  toAgain() {
    this.setData({ stepIndex: 0 })
  },
  handleStart() {
    this.setData({ startCountDown: true })
  },
  handleCountdown(e) {
    const { minutes, seconds } = e.detail

    if (minutes <= 0 && seconds <= 0) {
      wx.vibrateLong()
      this.setData({ startCountDown: false })
    }
  }
})