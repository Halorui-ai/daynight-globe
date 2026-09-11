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

## 贴图

`public/textures/` 里是分级分辨率：

| 文件 | 用途 |
|---|---|
| `earth-day-2k.jpg` / `earth-night-2k.jpg` | 首屏立刻显示 |
| `earth-day-4k.jpg` / `earth-night-4k.jpg` | 手机后台增强 |
| `earth-day-8k.jpg` / `earth-night-8k.jpg` | 桌面端拉近地表时才加载 |
| `earth-clouds.jpg` | 云层（灰度） |

白天来自 NASA Blue Marble，夜景来自 Black Marble。首屏只加载约 0.4 MB 的 2K 图；空闲后再换成 4K。8K 只在电脑上把地球拉得很近时才会下载，避免一进来就卡。

## 技术

React + TanStack Start + Three.js（React Three Fiber）。不需要账号或数据库即可运行地球仪本身。
