const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Component({
  data: {
    nickName: '',
    avatarUrl: defaultAvatarUrl,
    loading: false,
  },

  methods: {
    onShow(){
      wx.cloud.callFunction({
        name: 'userinfo',
        data: {
          action: 'get',
        }
      }).then(({ result }) => {
        if (result.code === 0) {
          const { nickName, avatarUrl } = result.data;
          this.setData({
            nickName,
            avatarUrl,
          })
        }
      })
    },
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail 
      this.setData({
        avatarUrl,
      })
    },
    handleNameInput(e) {
      const { value } = e.detail;
      this.setData({
        nickName: value,
      })
    },
    handleSubmit(e) {
      const { avatarUrl, nickName } = this.data;
      
      if (!nickName) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none',
        })
        return;
      }

      this.setData({
        loading: true,
      })
      wx.cloud.callFunction({
        name: 'userinfo',
        data: {
          action: 'update',
          body: {
            avatarUrl,
            nickName,
          }
        }
      }).then(({ result }) => {
        if (result.code === 0) {
          wx.showToast({
            title: '保存成功',
            icon: 'success',
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        } else {
          wx.showToast({
            title: result.message,
            icon: 'none',
          })
        }
      }).finally(() => {
        this.setData({
          loading: false,
        })
      })
    }
  }
})