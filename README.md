# Writing Time · Personal Creative Universe

**Writing Time** 是一个以本地优先（local-first）为核心的个人创作空间。项目目前由顶层入口 **Writing Time Portal** 统一承载多个创作模块：已经投入使用的 **Fantasy Workshop（幻想工坊）** 负责 Markdown 写作、设定与内容管理，**Archive Gallery（拾光画廊）** 负责沉浸式图片档案浏览，后续模块可以继续挂载到同一入口之下。

用户作品、图片、设定与元数据保存在浏览器本地的 IndexedDB 中；项目没有用于存储个人创作内容的后端服务。

当前核心能力：

- **Writing Time Portal**：全屏场景入口、本地实时时钟、昼夜欢迎词、双层空间导航与 WebGL 动态重光照
- **Fantasy Workshop**：CodeMirror 6 Markdown 编辑器、实时预览、大纲、斜杠命令、自动保存与恢复快照
- **统一内容模型**：文章、图片、图片集、设定卡、项目、合集、时间线、灵感、展览共 9 类内容
- **Archive Gallery**：独立图片画廊，复用 Writing Time 本地图片数据，支持挑选、预览和移出
- **图片资源管理**：批量导入、网格 / 瀑布流、灯箱、引用追踪和跨内容关联
- **全文搜索**：MiniSearch 本地索引，支持中文 bigram、类型 / 状态 / 标签 / 合集 / 时间筛选
- **Wiki 双链**：支持 `[[标题]]` 与 `[[标题#小节]]`
- **备份与导出**：完整 JSON 备份、Markdown、内容包 ZIP、图片集 ZIP、项目 ZIP、静态 HTML
- **角色与视觉系统**：诺瓦尔 / 伊登角色主题、场景插画、动态光影、粒子与减少动效适配

---

## 2026-09-28 改进状态

已实现保存队列刷新、跨标签页覆盖检测、定稿图片保护、备份 v4 校验与一致快照、资源完整导出、恢复历史和修订副本。书籍编订位于 `/projects`，连续阅读位于 `/books/[id]`；图片资源库按元数据筛选，每页最多读取 48 张图片。恢复历史提供并排预览，恢复时创建新草稿。

TypeScript 与轻量核心测试通过；源码 ESLint 汇总 0 错误、1 条既有警告。本机 Node ARM64 的 Lightning CSS / Tailwind oxide 原生依赖仍无法加载，生产构建、浏览器与手机验收按要求跳过。详细范围、未完成建议及跳过原因见 [实施日志](dosc/项目改进实施日志-2026-09-28.md)。

文档分工：[需求与实施进度](dosc/README.md) · [设计与视觉资料](docs/README.md)。

## 目录

- [当前产品结构](#当前产品结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [页面导览](#页面导览)
- [Writing Time Portal](#writing-time-portal)
- [Fantasy Workshop](#fantasy-workshop)
- [Archive Gallery](#archive-gallery)
- [统一内容模型](#统一内容模型)
- [搜索与 Wiki](#搜索与-wiki)
- [备份、导入与导出](#备份导入与导出)
- [数据架构](#数据架构)
- [Markdown 约定](#markdown-约定)
- [项目结构](#项目结构)
- [常用脚本](#常用脚本)
- [角色资产管线](#角色资产管线)
- [快捷键](#快捷键)
- [开发注意事项](#开发注意事项)
- [常见问题](#常见问题)

---

## 当前产品结构

项目已经从单一的 Fantasy Workshop 演进为一个可继续扩展的顶层创作入口：

```text
Writing Time  /
│
├── Fantasy Workshop  /workshop
│   ├── Markdown 创作工坊
│   ├── 内容库 / 设定 / 项目 / 时间线
│   ├── 本地图片资源库
│   ├── 搜索 / Wiki / 引用图谱
│   └── 备份与导出
│
├── Archive Gallery  /archive-gallery
│   └── 本地图片挑选与预览
│
└── Future Spaces
    └── 后续顶层模块预留入口
```

`/` 不再是旧版内容仪表盘，而是 Writing Time 的顶层 Portal；原来的本地创作仪表盘完整保留在 `/workshop`。

---

## 环境要求

| 依赖 | 要求 |
| --- | --- |
| Node.js | **>= 22.12.0** |
| npm | 随 Node.js 附带即可 |
| 浏览器 | 支持 IndexedDB、现代 JavaScript 与 WebGL 的现代浏览器 |
| Python | 仅角色插画预处理脚本需要 |

Node.js 最低版本以 `package.json` 的 `engines` 字段为准。

> 用户创作数据保存在浏览器 IndexedDB 中，不需要数据库服务。

---

## 快速开始

```bash
# 1. 安装 Writing Time 依赖
npm install

# 2. 启动开发服务器
npm run dev

# 默认访问
# http://localhost:3000

# 3. 生产构建
npm run build

# 4. 启动生产服务器
npm run start

# 5. 代码检查
npm run lint
```

### 云服务器通过公网 IP 访问

在云服务器上执行 `npm ci`、`npm run build`、`npm run start`。生产服务默认监听所有 IPv4 网卡的 **3000** 端口；确认服务器公网 IP 后，访问 `http://<公网IP>:3000/`。如果设置了 `PORT` 环境变量，访问时需使用对应端口。

还需在云平台安全组和服务器防火墙中放行入站 TCP 3000。可先在服务器上运行 `curl -I http://127.0.0.1:3000/` 检查应用是否启动，再从另一台设备访问公网地址；本机可以访问而公网不能访问时，检查安全组、防火墙与公网 IP 配置。

作品和图片保存在访问者浏览器的 IndexedDB 中。同一用户改用公网 IP、域名或另一台设备访问时，浏览器会将其视为不同站点，原有本地数据不会自动出现；请使用应用内的导出和恢复功能迁移数据。

端口被占用时：

```bash
npm run dev -- -p 3001
```

首次进入 Fantasy Workshop 后，应用会自动准备 starter 内容，之后的个人内容保存在当前浏览器 profile 的 IndexedDB 中。

---

## 页面导览

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | Writing Time Portal | 顶层创作入口，动态时钟、场景光影与模块导航 |
| `/workshop` | Fantasy Workshop 首页 | 原创作仪表盘：统计、快捷操作、模块化内容流 |
| `/archive-gallery` | Archive Gallery | 本地图片挑选与预览模块 |
| `/workbench?work={id}` | 创作工坊 | CodeMirror Markdown 编辑器 + 实时预览 |
| `/library?type={type}` | 作品库 | 按内容类型、状态与关键词浏览 |
| `/content` | 内容工作区 | 统一内容模型总览 |
| `/content/{id}` | 内容详情 | 各类型编辑器与关联关系面板 |
| `/gallery` | 图片资源库 | 图片导入、检索、引用管理与灯箱浏览 |
| `/search` | 全站搜索 | 多维度本地全文搜索 |
| `/wiki/{title}` | Wiki 跳转 | 解析 `[[链接]]` 并跳转到对应内容 |
| `/work/{slug}` | 作品阅读页 | 文章只读视图与继续编辑入口 |
| `/settings` | 设置 | 主题、动画、换行模式、备份恢复与隐私说明 |

> `/gallery` 是 Fantasy Workshop 内部的图片资源管理页面；`/archive-gallery` 是顶层沉浸式展示模块，两者复用同一套本地图片数据，而不是维护两份独立资源。

---

## Writing Time Portal

入口文件为 `app/page.tsx`，核心交互在 `components/home/DreamHome.tsx`。

当前 Portal 采用“双层主页”设计：第一层是诺瓦尔的观星书房场景、本地时间和欢迎语；第二层从右侧滑入，展示当前可以进入的创作空间。桌面端和移动端均支持按钮或横向手势切换，`Escape` 可关闭抽屉，并处理焦点恢复与隐藏区域键盘隔离。

### 动态光影

主页并非简单叠加 CSS 滤镜，而是使用 WebGL 对插画进行实时重光照：

- 原始场景图提供颜色
- 配套 RGB normal map 提供近似表面方向
- 根据本地时间计算日光 / 月光方向、色温与环境光
- 窗口方向决定主要入射光和光束
- 支持发丝柔光、虹膜反射、冷暖环境散射
- 使用线性 HDR 场景缓冲、曝光和后处理
- 约 300 个 WebGL 浮尘粒子随昼夜和光束变化
- WebGL 不可用或纹理加载失败时保留静态背景
- 后台标签页暂停，支持 `prefers-reduced-motion`
- 渲染画布限制最大边长，控制移动设备开销

左下角“窗边 · 调色手记”允许预览一天中的任意时刻，并调整：

- 曝光补偿
- 手绘光影强度
- 阴影边缘柔和度
- 发丝柔光
- 光束与浮尘

还可以切换 `光照效果 / 底图 / 法线图` 进行比较，或暂停场景动效。

更完整的实现说明见 [`docs/home-design.md`](docs/home-design.md)。

---

## Fantasy Workshop

`/workshop` 是原 Fantasy Workshop 仪表盘，也是所有本地创作工具的主要入口。

### 创作工坊

`/workbench` 是核心写作环境：

- **三种编辑模式**：分屏 / 纯编辑 / 纯预览
- **自动保存**：输入停顿 800ms 后写入 IndexedDB，并在失焦、标签页切换和站内跳转前兜底保存
- **恢复快照**：每 30 秒创建恢复快照，24 小时后过期
- **会话记忆**：恢复光标、滚动位置、编辑模式和大纲状态
- **文档大纲**：按标题层级生成并跟随当前编辑位置
- **格式工具**：工具栏、斜杠命令与选中文本浮动菜单
- **图片引用**：使用 `fw-asset://<图片ID>` 引用本地图片库资源
- **拖放导入**：Markdown 直接导入作品，图片直接进入资源库并插入引用
- **状态栏**：字数、段落、光标位置与保存状态
- **导出**：单篇作品可直接下载为 `.md`

### Workshop 首页

`/workshop` 的 `HomeDashboard` 保留原来的创作仪表盘能力：

- 本地作品与图片统计
- 新建作品 / 灵感 / 图片 / 设定快捷操作
- 继续编辑
- 灵感速记
- 进行中项目
- 最近作品
- 最新图片
- 未归类内容
- 收藏
- 今日动态

模块显隐与排序保存在 IndexedDB 的 `home-module-layout` 设置中。

### 图片资源库

`/gallery` 用于资源管理：

- 文件选择、拖放、剪贴板粘贴导入
- PNG / JPEG / WebP
- 名称 / Alt / 说明搜索
- 标签、关联内容、引用状态筛选
- 网格 / 瀑布流
- Lightbox 浏览
- 引用次数与反向关系查看

---

## Archive Gallery

`/archive-gallery` 是顶层独立模块，读取 Writing Time 已有的本地图片。可以新增图片、从网格中挑选、查看大图，或将图片移出画廊。移出画廊不会删除素材库中的原图。画廊采用「晨花与星藏」设计，可切换诺瓦尔的晨光与伊登的星夜氛围，配有白花月牙徽记、星轨拱窗与水晶吊饰。设计与验证说明见 [画廊设计](docs/gallery-design.md)。

---

## 统一内容模型

Fantasy Workshop 将资料统一抽象为 9 种内容类型，共用 `contents` 表及统一标签 / 合集 / 收藏 / 状态体系：

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| `article` | 文章 | Markdown 长文与章节 |
| `image` | 图片 | 原始图片、缩略图和元数据 |
| `gallery` | 图片集 | 图片排序编排与逐图说明 |
| `record` | 设定卡 | 角色 / 地点 / 物品 / 服装 / 魔法 |
| `project` | 项目 | 进度、成员、看板与里程碑 |
| `collection` | 合集 | 跨类型内容整理 |
| `timeline` | 时间线 | 事件、日期与关联内容 |
| `note` | 灵感 | 快速记录、配图、链接与项目关联 |
| `exhibition` | 展览 | 通过可排序区块编排展示内容 |

内容之间通过 `contentReferences` 构建引用图谱，目前包含：

- `wiki`：正文中的 Wiki 双链
- `asset`：正文或卡片使用的图片资源
- `relation`：设定、时间线等显式关系
- `cover`：封面引用
- `membership`：项目 / 合集成员关系

保存内容时会增量重建引用边；删除仍被引用的图片前会进行关系检查。

灵感卡片可以转换为文章、角色 / 地点设定，或转换成所属项目的看板任务。

---

## 搜索与 Wiki

### 全站搜索

本地全文搜索基于 MiniSearch：

- `liveQuery` 监听内容变化并自动重建索引
- 中文同时生成单字、相邻 bigram 和整词 token
- 前缀匹配 + fuzzy 0.2
- 字段权重：标题 5 > 标签 3 > 合集 2 > 正文 1
- 支持类型、状态、标签、合集、更新时间筛选
- 顶栏搜索框提供实时结果，完整结果进入 `/search`

### Wiki

支持：

```markdown
[[角色设定]]
[[角色设定#外貌]]
```

按标题匹配，同名时选择目标，也可用 `[[内容 ID]]` 建立固定引用。标题使用 `section-` 前缀锚点，重复标题编号；找不到目标时提供搜索入口。代码块和行内代码中的 Wiki 示例不生成引用。

---

## 备份、导入与导出

所有个人创作内容的导入导出都在浏览器侧完成。

| 操作 | 格式 | 内容 |
| --- | --- | --- |
| 完整备份 | `fantasy-workshop-backup-*.json` | 内容、图片 Data URL、编辑会话、恢复快照、活动与设置 |
| 恢复备份 | JSON v3/v4 | 校验后合并，定稿及其引用图片跳过；返回实际数量 |
| 单篇文章 | `.md` | 原始 Markdown + Frontmatter |
| 内容包 | `.zip` | 内容元数据、Markdown 与关联图片 |
| 图片集 | `.zip` | 图片集元数据与原始图片 |
| 项目 | `.zip` | 项目、成员清单和相关资源 |
| 静态网页 | `.html` | 图片内嵌，可离线打开；缺失资源中止导出 |
| 书籍 | `.html` / `.zip` | 整书目录、定稿正文、图片与 Markdown 文件 |
| Markdown 导入 | `.md` | 读取 title / tags / status Frontmatter |

---

## 数据架构

### IndexedDB

数据库名：`FantasyWorkshop`，通过 Dexie 4 访问，当前 schema 为 version 4。备份文件格式独立为 v4，兼容读取 v3。

| 表 | 主键 | 用途 |
| --- | --- | --- |
| `contents` | `id` | 9 类统一内容主表 |
| `books` | `id` | 书籍、章节与定稿作品目录 |
| `works` | `id` | 文章旧格式镜像，用于兼容 |
| `images` | `id` | 图片 Blob、WebP 缩略图与元数据 |
| `collections` | `id` | 合集旧格式镜像 |
| `contentReferences` | `id` | 内容引用图谱 |
| `editorSessions` | `workId` | 光标、滚动和编辑模式 |
| `recoverySnapshots` | `id` | 30 秒恢复快照 |
| `activity` | `id` | 内容活动日志 |
| `settings` | `key` | UI、迁移、主题和布局设置 |

### 迁移

- **v1 -> v2**：新增编辑会话与恢复快照，归一化旧状态与文章派生字段
- **v2 -> v3**：新增统一内容相关表，将旧 `works` / `images` / `collections` 折算为 `contents`
- **v3 -> v4**：新增书籍目录表 `books`

启动时通过幂等迁移确保内容镜像、HTML、纯文本、摘要、标题锚点和引用图谱处于可用状态。

### UI 状态

Zustand `stores/ui-store.ts` 管理编辑模式、专注 / 打字机模式、命令面板、抽屉、Toast、保存状态及全局 `flushSave` 注册机制。

---

## Markdown 约定

### Frontmatter

```markdown
---
title: 沿着道路进入工坊
tags: [旅途, 工坊]
status: draft
---
```

状态值：

```text
draft | completed | archived
```

### Wiki 链接

```markdown
[[标题]]
[[标题#小节]]
```

### 本地图片协议

```markdown
![说明](fw-asset://<图片ID>)
```

导出内容包时会自动带上关联原图。

### Markdown 渲染

- `gray-matter` 解析 Frontmatter
- `remark-gfm` 支持 GFM
- 可在设置中切换标准 CommonMark / `remark-breaks` 单换行模式
- 标题自动生成锚点 slug
- 自动提取纯文本和摘要
- HTML 输出统一经过 `rehype-sanitize` 清理

---

## 项目结构

```text
Writing-Time/
├── app/
│   ├── page.tsx                    # Writing Time Portal
│   ├── dream-home.css              # Portal 场景与交互样式
│   ├── workshop/                   # Fantasy Workshop 首页
│   ├── archive-gallery/            # 顶层 Archive Gallery
│   ├── workbench/                  # Markdown 创作工坊
│   ├── library/                    # 作品库
│   ├── content/                    # 统一内容工作区
│   ├── gallery/                    # 本地图片资源库
│   ├── search/                     # 本地全文搜索
│   ├── wiki/                       # Wiki 跳转
│   ├── work/                       # 作品阅读页
│   └── settings/                   # 设置
│
├── components/
│   ├── home/
│   │   ├── DreamHome.tsx           # Portal 主交互
│   │   ├── RelightScene.tsx        # WebGL 重光照与粒子场景
│   │   └── LightingSlider.tsx      # 光照参数控件
│   ├── archive-gallery/            # 本地图片画廊与预览
│   ├── workbench/                  # CodeMirror 编辑器与工具
│   ├── content/                    # 内容类型编辑器
│   ├── gallery/                    # 图片库与 Lightbox
│   ├── library/                    # 作品库
│   ├── search/                     # 搜索 UI
│   ├── settings/                   # 设置 UI
│   ├── markdown/                   # Markdown 展示
│   ├── theme/                      # 角色主题
│   └── ui/                         # 通用 UI
│
├── lib/
│   ├── home/
│   │   ├── relight-shaders.ts      # 场景重光照 GLSL
│   │   ├── atmosphere-shaders.ts   # 光束 / 散射 GLSL
│   │   └── postprocess.ts          # HDR / Bloom / Tone mapping
│   ├── db.ts                       # Dexie schema 与 starter 数据
│   ├── content-registry.ts         # 9 类内容注册表
│   ├── content-service.ts          # CRUD 与引用图谱
│   ├── markdown-service.ts         # Markdown 解析 / 渲染
│   ├── search-service.ts           # MiniSearch
│   ├── export-service.ts           # 备份和导出
│   ├── work-import.ts              # Markdown 导入
│   └── character-assets.ts         # 角色资产注册表
│
├── scripts/
│   └── prepare-character-assets.py # 角色插画预处理
│
├── docs/
│   ├── home-design.md              # Portal 与重光照设计文档
│   └── character-bible.md          # 角色一致性基准
│
├── public/
│   ├── assets/home/                # Portal 场景、法线图等
│   ├── assets/characters/          # 角色插画
│   ├── assets/decor/               # 装饰 SVG
│
├── stores/
├── types/
├── package.json
└── README.md
```

以下内容属于本地缓存或生成产物，不应提交：

```text
node_modules/
.next/
.npm-cache/
.npm-cache-*/
.vendor/
```

---

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Next.js 开发服务器 |
| `npm run build` | 执行生产构建和 TypeScript 检查 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 检查 |
| `npm test` | 无浏览器的保存队列、Markdown 与备份校验回归 |
| `npm run test:books` | 可选书籍浏览器回归，需提供 Playwright；支持 BASE_URL / BROWSER_CHANNEL |
| `python scripts/prepare-character-assets.py` | 预处理角色插画，需要 Pillow |

---

## 角色资产管线

1. 原始参考图与生成素材进入本地素材目录或 `public/images/`
2. `scripts/prepare-character-assets.py` 裁切透明边并恢复安全边距，输出 WebP
3. 在 `lib/character-assets.ts` 注册角色、变体、尺寸与生成状态
4. `components/theme/` 根据当前路由和主题偏好选择资产
5. 新增插画通过 [`docs/character-bible.md`](docs/character-bible.md) 验证角色一致性

主题目前围绕：

- `noval`：诺瓦尔·晨雾
- `eden`：伊登·星夜
- `balanced`：共同旅途

设置中可以控制人物插画、装饰纹理和动画强度，并遵循系统减少动态效果设置。

---

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `Ctrl/Cmd + K` | 打开 Fantasy Workshop 命令面板 |
| `Ctrl/Cmd + Shift + H` | 保存当前内容并返回 Workshop 首页 |
| `/`（编辑器行首） | 打开斜杠命令菜单 |
| `Esc` | 关闭命令面板 / 浮动菜单 / 抽屉；Portal 中关闭空间选择 |
| `Ctrl/Cmd + V`（图片库） | 从剪贴板导入图片 |

---

## 开发注意事项

### 不要提交缓存与生成目录

当前 `.gitignore` 已覆盖：

```gitignore
.npm-cache/
.npm-cache-*/
.vendor/
```

`.npm-cache-*` 等目录只用于本地隔离 npm 安装环境，不属于源码。

### 用户数据与构建网络请求不是同一回事

- 用户 Markdown、图片、设定、项目和偏好保存在 IndexedDB
- npm 请求只发生在依赖安装链路
- Writing Time 当前没有把个人内容上传到服务端的同步逻辑

---

## 常见问题

### 数据保存在哪里？

保存在当前浏览器 profile 的 IndexedDB，数据库名为 `FantasyWorkshop`。

### 会把我的作品上传到服务器吗？

当前没有用于同步个人创作数据的后端。Workshop 数据与图片都在浏览器本地。

### 清理浏览器数据会发生什么？

IndexedDB 属于浏览器站点数据。清除站点数据、使用新的浏览器 profile 或更换设备都会导致原内容不可见，因此建议定期在设置页导出完整 JSON 备份。

### 忘记保存会丢稿吗？

WorkBench 使用 800ms 防抖自动保存、失焦兜底、路由跳转前强制保存，并每 30 秒保留恢复快照。

### 如何迁移到另一台设备？

旧设备导出完整 JSON 备份，在新设备的设置页恢复即可；图片原文件也包含在完整备份内。

### 为什么搜索可以搜中文？

本地索引会同时生成中文单字、相邻双字和整词 token，再配合前缀与模糊匹配。

### `/gallery` 和 `/archive-gallery` 有什么区别？

`/gallery` 是资源管理工具，负责导入、标签、引用和元数据；`/archive-gallery` 是沉浸式浏览界面。两者使用同一份 Writing Time 图片数据。

### 新增一种内容类型要修改哪些地方？

通常需要：

1. 在 `types/content.ts` 增加 payload 类型
2. 在 `lib/content-registry.ts` 注册内容类型
3. 在 `lib/content-service.ts` 增加关系提取
4. 在 `lib/search-service.ts` 增加搜索文本提取
5. 在 `components/content/` 增加对应编辑器

`contents` 是类型无关的统一表，因此通常不需要修改数据库 schema。

---

Writing Time 目前仍处于持续迭代阶段。顶层 Portal、Fantasy Workshop 与 Archive Gallery 已经形成相互独立但共享本地内容基础设施的三层结构，后续的新创作模块可以继续挂载在 Portal 之下，而不需要破坏现有 Workshop 数据模型。
