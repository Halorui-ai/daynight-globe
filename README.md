# 昼夜地球

交互式三维地球仪：按真实太阳直射点推进昼夜，夜半球是 NASA 城市灯火，可搜索国家/城市并飞过去。另有「地月日」视图——太阳居中，地球绕太阳公转，月亮绕地球公转。

## 本地运行

需要 Node.js 20+。

```bash
npm install
npm run dev
```

浏览器打开终端里提示的地址（默认 `http://localhost:8080`）。

```bash
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

## 操作

- 拖动旋转，滚轮拉近
- 搜索国家或城市，点击飞过去
- 底部可调时间流速（实时 / 1 日每分 / 1 日每秒）
- 「地月日」查看三体轨道关系；点「地球」回到地表

## 离线运行（公司内网 / 不能联网的电脑）

地球仪本身不访问互联网：贴图、国界、城市数据都在本地。但 **`npm install` 必须联网**，而且不要把 Linux 上的 `node_modules` 拷到 Windows（里面有系统相关的二进制，会直接报错）。

正确做法：在能上网的电脑打包一次，把生成的文件夹拷走。

```bash
npm install
npm run build:offline
```

把 `offline-dist/` **整个文件夹**拷到 U 盘，再到公司电脑：

1. 浏览器用 **Chrome 或 Edge**（需要 WebGL；IE / 360 兼容模式会得到全黑画面）
2. Windows **双击 `启动地球.bat`** —— 用系统自带的 PowerShell 打开 `http://127.0.0.1:8080`，**不用安装 Node / Python，也不用联网**
3. **黑色命令窗口必须一直开着**。关掉它，网页也就停了
4. **不要直接双击 `index.html`**。浏览器会拦截 `file://` 下的贴图，地球是全黑的

公司电脑不需要下载任何软件。若窗口闪一下就关：看同目录里的 `start-error.txt`，并把整个 `offline-dist` 文件夹一起拷走（不要只拷 bat）。

若仍是全黑，看地址栏：

- 以 `file:///` 开头：没有走本地网页服务，回到第 2 步
- 是 `http://127.0.0.1:8080` 但仍全黑：换 Edge / Chrome，关掉 360，不要用远程桌面

## 贴图

`public/textures/` 里是分级分辨率：

| 文件 | 用途 |
|---|---|
| `earth-day-2k.jpg` / `earth-night-2k.jpg` | 首屏立刻显示 |
| `earth-day-4k.jpg` / `earth-night-4k.jpg` | 手机后台增强 |
| `earth-day-8k.jpg` / `earth-night-8k.jpg` | 桌面端拉近地表时才加载 |
| `earth-clouds.jpg` | 云层（灰度） |

白天来自 NASA Blue Marble，夜景来自 Black Marble。首屏只加载约 0.4 MB 的 2K 图；空闲后再换成 4K。8K 只在电脑上把地球拉得很近时才会从本地读取。

## 技术

React + TanStack Start + Three.js（React Three Fiber）。不需要账号或数据库即可运行地球仪本身。
