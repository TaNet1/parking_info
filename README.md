# 泊车资讯

按原型实现的「泊车资讯」功能页，整体组件 **1024 × 980**（左 716 / 右 308）。

## 运行
```bash
node server.js
# 打开 http://localhost:3210
```
纯静态、零依赖，直接双击 `index.html` 也可（部分浏览器对 `file://` 下的 data URI 海报可正常显示）。

## 文件
| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面结构，右侧区域写死 |
| `styles.css` | 全部样式（9:16 海报、tab 横滑、markdown 排版等） |
| `data.js` | 模拟后台数据：场地 → tab → markdown + 海报 |
| `markdown.js` | 轻量 markdown 渲染器（离线、无依赖） |
| `app.js` | 交互逻辑：场地选择、tab 切换、海报轮播 |
| `server.js` | 本地预览用的极简静态服务器 |

## 已实现要点
- **场地选择器**（右上角）：下拉切换奥海城三期/二期/一期，不同场地的 tab 与内容不同。
- **Tab 栏**：横向排列，超出宽度后可横向滑动；切换 tab 显示对应内容。
- **内容区两种形态**：
  - 后台未上传海报 → 左侧 markdown 占满整个内容区。
  - 上传了海报 → markdown 区与海报区 **平分**。
- **海报轮播**：容器固定 **9:16**（`aspect-ratio: 9/16`），图片 `object-fit: contain` 自适应该比例并 **完整显示**；多张时含圆点、左右箭头与自动轮播。
- **Markdown 区**：内容超出时 **垂直滚动**。

## 接入真实后台
将 `data.js` 中的 `VENUES` 替换为接口返回的数据即可，结构：
```js
{ id, name, tabs: [ { id, title, markdown, posters: [imgUrl, ...] } ] }
```
`posters` 为空数组即表示该 tab 未配置海报（markdown 占满）。
