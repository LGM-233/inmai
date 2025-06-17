const { app, Menu, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { createSuspensionWindow, createAssistantWindow, createConfigWindow, createFunctionListWindow } = require("./window.js")
const { exec } = require('child_process'); // 引入 child_process 模块
const os = require('os'); // 引入 os 模块


// 悬浮球的一些设置
const suspensionConfig = {
  width: 100,
  height: 100,
}

// 定义所有可能用到的页面
const pages = {
  suspensionWin: undefined,
  assistantWin: undefined,
  configWin: undefined,
  functionListWin: undefined,
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // 设置开机自启
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
    args: ['--hidden']  // 添加启动参数，使应用以隐藏模式启动
  });
  pages.suspensionWin = createSuspensionWindow(suspensionConfig)
  // 获取当前自启状态并发送给渲染进程
  const autoLaunchStatus = app.getLoginItemSettings().openAtLogin;
  if (pages.suspensionWin && pages.suspensionWin.webContents) {
    pages.suspensionWin.webContents.on('did-finish-load', () => {
      pages.suspensionWin.webContents.send('autoLaunchStatus', autoLaunchStatus);
    });
  }
  checkNetworkAccess(); // 调用新的函数
  // 可以定期检查网络连接，例如每 30 秒
  setInterval(checkNetworkAccess, 30000); // 30秒
  autoUpdater.checkForUpdatesAndNotify(); // 在应用启动时自动检查更新
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    pages.suspensionWin = createSuspensionWindow(suspensionConfig)
  }
});

// 主进程监听事件相关
ipcMain.on('showFunctionList', (e, data) => {
  if (pages.functionListWin) {
    pages.functionListWin.close()
    pages.functionListWin = null
  }
  pages.functionListWin = createFunctionListWindow()
  pages.functionListWin.on('close', () => {
    pages.functionListWin = null
  })
})

ipcMain.on('openAssistant', (e, url) => {
  if (pages.assistantWin) {
    pages.assistantWin.close()
    pages.assistantWin = null
  }
  pages.assistantWin = createAssistantWindow(url)
  pages.assistantWin.on('close', () => {
    pages.assistantWin = null
  })
})

ipcMain.on('ballWindowMove', (e, data) => {
  pages.suspensionWin.setBounds({ x: data.x, y: data.y, width: suspensionConfig.width, height: suspensionConfig.height })
})

let suspensionMenu
let topFlag = true
ipcMain.on('openMenu', (e) => {
  if (!suspensionMenu) {
    suspensionMenu = Menu.buildFromTemplate([
      {
        label: '检查更新',
        click: () => {
          autoUpdater.checkForUpdatesAndNotify();
        }
      },
      {
        label: '置顶/取消',
        click: () => {
          topFlag = !topFlag
          pages.suspensionWin.setAlwaysOnTop(topFlag)
        }
      },
      {
        label: '退出',
        click: () => {
          app.quit();
        }
      },
    ]);
  }
  suspensionMenu.popup({});
});

// ========== 开机自启相关 ========== //
// 1. 监听渲染进程设置开机自启请求
ipcMain.on('setAutoLaunch', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
    args: ['--hidden']  // 添加启动参数，使应用以隐藏模式启动
  });
});

// 自动更新相关
// autoUpdater.autoDownload = false; // 默认true
// autoUpdater.autoInstallOnAppQuit = true; // 默认true

// 设置日志，方便调试
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.on('checking-for-update', () => {
  console.log('正在检查更新...');
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('update-message', '正在检查更新...');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('发现新版本:', info);
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('update-message', `发现新版本 ${info.version}，正在下载...`);
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('当前已是最新版本。');
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('update-message', '当前已是最新版本。');
  }
});

autoUpdater.on('error', (err) => {
  console.error('更新出错:', err);
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('update-message', `更新出错: ${err.message}`);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `下载进度: ${progressObj.percent}% (${progressObj.bytesPerSecond/1000} KB/s)`;
  console.log(log_message);
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('update-message', `下载进度: ${progressObj.percent.toFixed(2)}%`);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('更新已下载完毕，准备安装:', info);
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('update-message', '更新已下载完毕，应用程序将在下次关闭时安装。');
    // 提示用户重启应用以安装更新
    ipcMain.once('quitAndInstall', () => {
      autoUpdater.quitAndInstall();
    });
    pages.suspensionWin.webContents.send('update-ready-to-install');
  }
});

// 内部网络限制功能相关
const INTERNAL_NETWORK_PREFIX = 'YOUR_INTERNAL_NETWORK_PREFIX_HERE'; // *** 请将这里替换为你的公司内网 IP 地址前缀！例如：'192.168.1.' ***
let hasInternalNetworkAccess = false;

function checkNetworkAccess() {
  const networkInterfaces = os.networkInterfaces();
  let foundInternalIp = false;

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      // 排除非 IPv4 和内部 (127.0.0.1) 地址
      if ('IPv4' !== iface.family || iface.internal !== false) {
        continue;
      }
      // 检查 IP 地址是否以内部网络前缀开头
      if (iface.address.startsWith(INTERNAL_NETWORK_PREFIX)) {
        foundInternalIp = true;
        break;
      }
    }
    if (foundInternalIp) break;
  }

  hasInternalNetworkAccess = foundInternalIp;
  console.log(`Has internal network access: ${hasInternalNetworkAccess}, Current IP: ${foundInternalIp ? 'N/A (IP check not fully logged)' : 'N/A'}`); // 简化日志，因为我们不确定是哪个 IP 匹配

  // 发送网络访问状态给渲染进程
  if (pages.suspensionWin) {
    pages.suspensionWin.webContents.send('network-status', hasInternalNetworkAccess);
  }
}

// 处理渲染进程请求网络状态的事件
ipcMain.on('request-network-status', (event) => {
  event.reply('network-status', hasInternalNetworkAccess);
});
