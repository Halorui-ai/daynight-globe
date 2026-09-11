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

把 `offline-dist/` 整个文件夹拷到 U 盘，再到公司电脑：

1. 电脑需已安装 **Python 3** 或 **Node.js**（可用离线安装包，运行地球时不用网）
2. 浏览器用 Chrome 或 Edge（需要 WebGL）
3. Windows 双击 `启动地球.bat`，然后打开 http://127.0.0.1:8080
4. 不要直接双击 `index.html`，浏览器会拦截本地贴图

```bash
# 其它系统
cd offline-dist
python3 -m http.server 8080 --bind 127.0.0.1
# 或
node serve.mjs
```

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
