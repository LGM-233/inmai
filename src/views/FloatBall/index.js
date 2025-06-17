const { createApp } = require('vue')
const toast = require('../../utils/toast'); // 引入 toast 模块

let biasX = 0
let biasY = 0
const moveS = [0, 0, 0, 0]
function calcS() {
  const res = Math.pow(moveS[0] - moveS[2], 2) + Math.pow(moveS[1] - moveS[3], 2)
  return res < 5
}
function handleMove(e) {
  window.electronAPI.send('ballWindowMove', { x: e.screenX - biasX, y: e.screenY - biasY })
}

const app = createApp({
  data() {
    return {
      transparent: 'transparent',
      opacity: 0.8,
      isDragging: false,
      startX: 0,
      startY: 0,
      lastClickTime: 0,
      clickTimeout: null,
      updateAvailable: false,
      updateInfo: null,
      downloadProgress: 0,
      hasInternalNetworkAccess: false, // 已更改：内网访问状态
    }
  },
  methods: {
    handleMouseDown(e) {
      if (!this.hasInternalNetworkAccess) {
        toast.show('请连接到公司内网以使用此功能。');
        return;
      }
      if (e.button === 2) {
        window.electronAPI.send('openMenu')
        return
      }
      
      const currentTime = new Date().getTime()
      const timeDiff = currentTime - this.lastClickTime
      
      if (timeDiff < 300) { // 双击
        clearTimeout(this.clickTimeout)
        this.showFunctionList()
        this.lastClickTime = 0
      } else { // 单击
        this.lastClickTime = currentTime
        this.isDragging = true
        this.startX = e.clientX
        this.startY = e.clientY
        
        // 设置单击超时
        this.clickTimeout = setTimeout(() => {
          this.lastClickTime = 0
        }, 300)
      }
    },
    handleMouseMove(e) {
      if (this.isDragging) {
        const moveX = e.clientX - this.startX
        const moveY = e.clientY - this.startY
        window.electronAPI.send('ballWindowMove', {
          x: window.screenX + moveX,
          y: window.screenY + moveY
        })
      }
    },
    handleMouseUp() {
      this.isDragging = false
    },
    showFunctionList() {
      if (!this.hasInternalNetworkAccess) {
        toast.show('请连接到公司内网以使用此功能。');
        return;
      }
      window.electronAPI.send('showFunctionList')
    },
    openMenu() {
      window.electronAPI.send('openMenu')
    }
  },
  mounted() {
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)

    // 监听更新事件
    window.electronAPI.on('update-message', (message) => {
      toast.show(message);
    });

    window.electronAPI.on('update-ready-to-install', () => {
      if (confirm('更新已下载完成，是否立即重启安装？')) {
        window.electronAPI.send('quitAndInstall');
      }
    });

    // 监听网络访问状态
    window.electronAPI.on('network-status', (hasAccess) => {
      this.hasInternalNetworkAccess = hasAccess;
      if (hasAccess) {
        toast.show('已连接到公司内网，功能已启用。', 3000);
      } else {
        toast.show('未连接到公司内网，功能已禁用！', 3000);
      }
    });

    // 初始请求网络访问状态
    window.electronAPI.send('request-network-status');
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  }
})
app.mount("#app")

// 点击事件
document.getElementById('floatBall').addEventListener('click', (e) => {
  e.preventDefault()
  // 这里也需要检查内网访问状态
  if (app._instance.data.hasInternalNetworkAccess) { // 访问 Vue 实例数据
    window.electronAPI.send('showFunctionList')
  } else {
    toast.show('请连接到公司内网以使用此功能。');
  }
})