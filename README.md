# Cookie Atelier Deluxe

一个暗夜甜品工坊风格的 Cookie Clicker 静态小游戏。

## 打开方式

GitHub Pages:

```text
https://sevenpointcoffee-wjh.github.io/cookie/
```

本项目按电脑端浏览器体验设计，推荐使用 1280px 以上宽度打开。

直接用浏览器打开 `index.html` 即可。也可以在当前目录启动本地服务：

```powershell
python -m http.server 5177 --bind 127.0.0.1
```

## 资产流程

资产不是从第三方游戏或 Wiki 复制的。`scripts/generate_assets.py` 会生成统一风格的大图资产板：

- `assets/atelier-atlas.png`

同时切出游戏实际使用的个体资源：

- `assets/cookie-main.png`
- `assets/cookie-gold.png`
- `assets/background-atelier.png`
- `assets/icon-*.png`
- `assets/upgrade-*.png`

重新生成资产：

```powershell
python .\scripts\generate_assets.py
```

## 已实现玩法

- 点击主饼干获得饼干
- 建筑自动产出
- 升级系统
- 黄金饼干事件
- 成就系统
- 统计面板
- 星尘转生
- 本地存档和离线收益
- 桌面/移动端响应式界面
