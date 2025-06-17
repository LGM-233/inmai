const { BrowserWindow, screen, shell } = require('electron');
const path = require('path');

// 悬浮球
const createSuspensionWindow = (suspensionConfig) => {
  // Create the browser window.
  const win = new BrowserWindow({
    width: suspensionConfig.width,
    height: suspensionConfig.height,
    type: 'toolbar',
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'views/FloatBall/index.html'));
  const { left, top } = { left: screen.getPrimaryDisplay().workAreaSize.width - 150, top: screen.getPrimaryDisplay().workAreaSize.height - 100 }
  // mainWindow.setBounds({ x: left, y: top, width: suspensionConfig.width, height: suspensionConfig.height })
  win.setPosition(left, top)
  // mainWindow.setIgnoreMouseEvents(true, { forward: true })
  // win.webContents.openDevTools({mode:'detach'})

  return win
};

const createFunctionListWindow = () => {
  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  const screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
  const windowWidth = 300;
  const windowHeight = 400;
  
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: windowWidth,
    x: screenWidth - windowWidth,
    y: (screenHeight - windowHeight) / 2,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'views/FunctionList/index.html'));
  win.setMenu(null);
  
  return win;
};

const createAssistantWindow = (url) => {
  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  const screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
  const windowWidth = 800;
  const windowHeight = 600;
  
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: windowWidth,
    x: screenWidth - windowWidth,
    y: (screenHeight - windowHeight) / 2,
    icon: path.join(__dirname, './assets/edit-green.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      nativeWindowOpen: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 设置 CSP 头
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://8.133.247.198 https://8.133.247.198"],
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type, Authorization']
      }
    });
  });

  win.loadURL(url);
  win.setMenu(null);

  // 拦截导航事件
  win.webContents.on('will-navigate', (event, url) => {
    console.log('Will navigate to URL:', url);
    event.preventDefault(); // 阻止默认导航行为
    shell.openExternal(url); // 在系统默认浏览器中打开链接
  });

  // 使用 setWindowOpenHandler 拦截所有新窗口请求
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('setWindowOpenHandler triggered for URL:', url);
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' }; // 拒绝在 Electron 中打开新窗口
    }
    return { action: 'allow' }; // 对于非外部链接，允许默认行为 (例如about:blank)
  });

  return win;
};

const createConfigWindow = () => {
  const { left, top } = { left: screen.getPrimaryDisplay().workAreaSize.width - 360, top: screen.getPrimaryDisplay().workAreaSize.height - 840 }
  const win = new BrowserWindow({
    width: 800,
    minWidth: 300,
    maxWidth: 300,
    height: 500,
    x: left,
    y: top,
    icon: path.join(__dirname, './assets/edit-green.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, 'views/Config/index.html'));
  // win.webContents.openDevTools()
  return win
}

module.exports = {
  createSuspensionWindow,
  createAssistantWindow,
  createConfigWindow,
  createFunctionListWindow
}