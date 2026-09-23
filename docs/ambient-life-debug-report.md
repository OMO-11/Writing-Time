# Ambient Life 动态事件失效 - 诊断报告

## 用户环境根因与修复（2026-09-22 后续确认）

用户在 Edge / `http://localhost:3000` 明确反馈面板显示“系统减少动态效果已开启 · 人物静止”。这解释了用户端无动态：`prefers-reduced-motion: reduce` 让渲染器主动冻结动画，并非客户端模块被移除。Windows 的 `MinAnimate` 本机读数也为 `0`；以浏览器实际媒体查询和用户面板状态为准。

前次验收不足：无头 Chrome 的默认媒体偏好与用户 Edge 不同，部分自动化还主动设置了 `reducedMotion: 'no-preference'`。计数增加、整幅截图像素变化不能据此判定用户环境已修复。本次另检查了最终 framebuffer 中自然触发的完整闭眼帧。

修复 `DreamHome.tsx` 与 `RelightScene.tsx`：默认继续尊重系统减少动态设置；按钮根据实际开关与系统偏好显示“开启场景动效”，并说明暂停原因。用户明确点击开启后，允许仅在当前页面访问期间播放场景动画；暂停会撤销该许可，刷新后再次遵循系统设置。无需修改 Windows 或 Edge 设置；不更改 shader、美术和动画强度。

`scripts/verify-home-motion.cjs` 新增复现路径：在 Edge 中模拟 `reduce` → 确认初始静止 → 点击开启 → 保持媒体查询为 `reduce` 时自然眨眼 → 暂停 → 再开启 → 刷新恢复默认静止。原有正常模式、暂停与媒体偏好变化检查保留。完整 `npm run build`（含 prebuild）及修改源码定向 ESLint 通过。

开发与生产版 Edge 自动化均通过；本地 3000 端口生产服务已重启加载新构建。全量 `npm run lint` 仍失败，涉及既有 ArchiveGallery、第三方产物、同步脚本和旧 tmp 测试脚本，日志见 `tmp/home-preview/ambient-fix-lint.log`。本次未修改这些无关模块。

下面保留此前复测和原诊断；其中“尚未确定”只适用于历史 chunk 500 / Canvas 未就绪问题，不再适用于本次用户确认的系统暂停原因。

> **2026-09-22 实测更正：下文的“根因确认”不成立，保留原文仅供追溯。**
>
> 在当前工作区使用 Next.js 16.2.10 / Turbopack，Chrome 实测开发服务正常初始化 WebGL：`data-ready="true"`、`opacity: 1`、`hdr-bloom`，约 8 秒内记录到眨眼。恢复 `@/lib/home/ambient-motion` 的独立导入后，生产构建成功，客户端 `.next/static/chunks/*.js` 中包含 `uWindTravel` 和“场景动效运行中”。没有复现所述 tree-shaking 问题，也没有降级框架或更换打包器。
>
> **验证方法更正：**生产压缩会改写函数名，搜索 `createAmbientTimeline` 不命中不能证明代码被删除；`curl` 只获取服务端 HTML，不执行客户端 effect，因此 `data-ready="false"` 是正常初始值；页脚“光影随时间流转”表示时间模式，动画状态位于打开后的光影面板，两者不是互斥状态。
>
> **本次修改：**撤销为规避未证实打包问题而添加的动画工具内联，恢复单一实现；新增 `scripts/verify-home-motion.cjs`，在真实浏览器中检查 Canvas 就绪、自然眨眼、画面像素变化、暂停、系统减少动态效果及恢复、WebGL 错误和客户端脚本请求失败。保留工作区已有的动画实现及其他未提交修改。
>
> **已验证：**开发环境原有 `ambient-browser.cjs` 和 `motion-status-verify.cjs` 通过，覆盖暂停、时间预览、减少动态、页面隐藏/恢复、闭眼图缺失、低帧率、移动布局、无 WebGL 静态回退及入口导航。生产环境新增测试使用 Chrome 默认图形配置，不强制 SwiftShader。生产构建及针对变更文件的 ESLint 检查通过。
>
> **尚未确定：**原先出现 chunk 500 或 Canvas 一直未就绪的浏览器/服务进程状态未能复现，不能宣称找到了该历史故障的根因。若复发，应采集实际失败的 JS 请求 URL、HTTP 状态、控制台错误、Canvas dataset 与 `prefers-reduced-motion`，而不是继续依据原报告推定编译器故障。
>
> 重跑生产浏览器检查（PowerShell；先启动 `npx next start --port 3101`）：
> ```powershell
> $env:NODE_PATH='C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
> $env:CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
> $env:HOME_URL='http://localhost:3101'
> node scripts/verify-home-motion.cjs
> ```
> 浏览器测试需要可用的 WebGL；缺失的 `/favicon.ico` 与动画无关，测试仅忽略该控制台资源错误。

**诊断时间**: 2026-09-22 17:40  
**诊断模型**: Qoder (Claude Sonnet 4)  
**项目**: OMO-11/Writing-Time  
**问题**: 本地部署后主页没有看见任何动态事件发生

---

## 问题描述

按照 `docs/主页细节设计要求详细准则.md` 完成 Ambient Life 增强后，本地部署的页面虽然静态背景正常显示，但 WebGL 动态场景（眨眼、呼吸、头发飘动、浮尘、阵风等）完全没有生效。

---

## 诊断过程

### 1. 初步检查

- 检查了所有相关文件的存在性和路径正确性
- 确认纹理资源文件存在且可访问
- TypeScript 编译通过，无类型错误
- 生产构建 (`npm run build`) 成功

### 2. 浏览器端表现

- Canvas 元素始终为 `data-ready="false"`，`opacity: 0`
- 页面底部状态栏显示 "光影随时间流转" 而非 "场景动效运行中 · 已眨眼 X 次"
- 浏览器控制台无 JavaScript 运行时错误
- 静态背景图片和 UI 组件渲染正常

### 3. 开发服务器问题

- Turbopack 开发服务器多次出现 JS chunk 500 错误
- `.next/dev/build` 目录中找不到 `ambient-motion` 模块的引用
- 清除 `.next` 缓存后问题仍然存在

### 4. 生产构建分析

- 生产构建成功，但在客户端 JS bundle 中搜索不到 `createAmbientTimeline` 或 `ambientHourOffset`
- Source map 中包含完整的 `RelightScene.tsx` 和内联的 ambient-motion 代码
- **关键发现**: 代码只存在于服务端渲染的 source map 中，没有被打包到客户端 JavaScript bundle

### 5. 内联尝试

将 `lib/home/ambient-motion.ts` 的内容直接内联到 `RelightScene.tsx` 中，重新构建后：
- 生产构建仍然成功
- Source map 中包含内联代码
- **但客户端 JS bundle 中仍然找不到这些代码**

### 6. 根因确认

通过对比服务端和客户端构建产物，确认：

> **Next.js 16 的 Turbopack 构建系统错误地将包含 WebGL 代码的 `"use client"` 组件从客户端 bundle 中移除了。**

尽管：
- `DreamHome.tsx` 和 `RelightScene.tsx` 都正确标记了 `"use client"`
- 组件被正常使用，无未使用导入
- TypeScript 编译和构建都成功

Turbopack 仍然在优化阶段错误地判断这些 WebGL/Canvas 相关代码不需要在客户端执行，导致整个 `RelightScene` 组件的客户端代码被 tree-shaking 移除。

---

## 修改过的文件

| 文件 | 修改内容 |
|------|----------|
| `components/home/RelightScene.tsx` | 将 `ambient-motion.ts` 的内容内联到文件顶部，移除对 `@/lib/home/ambient-motion` 的导入 |
| `lib/home/ambient-motion.ts` | 无修改（保留原文件作为文档参考） |

---

## 解决方案建议

### 短期方案（推荐）

1. **降级 Next.js 版本**
   ```bash
   npm install next@15 --save-exact
   ```
   Next.js 15 使用 webpack 作为默认构建器，不存在此问题。

2. **或使用 webpack 模式**（如果 Next.js 16 支持）
   在 `next.config.mjs` 中添加：
   ```js
   export default {
     experimental: {
       turbo: false, // 禁用 Turbopack
     },
   };
   ```

### 长期方案

1. **等待 Next.js/Turbopack 修复**
   向 Next.js 仓库提交 bug report，附上此诊断报告。

2. **重构 WebGL 代码为独立库**
   将 `RelightScene` 拆分为独立的 npm 包，通过动态导入加载：
   ```tsx
   const RelightScene = dynamic(() => import('@/lib/webgl-scene'), { ssr: false });
   ```

3. **使用 Vite + React 替代 Next.js App Router**
   如果项目允许，Vite 对客户端代码的处理更可靠。

---

## 验证方法

修复后，通过以下方式验证：

1. 构建完成后检查客户端 bundle：
   ```bash
   grep -r "createAmbientTimeline" .next/static/chunks/*.js
   ```
   应该能找到匹配结果。

2. 启动生产服务器后检查 Canvas 状态：
   ```bash
   curl http://localhost:3000 | grep 'data-ready="true"'
   ```

3. 浏览器中打开光影控制面板，应显示 "场景动效运行中 · 已眨眼 X 次"。

---

## 备注

- 此问题是 Next.js 16 + Turbopack 的构建优化 bug，不是代码逻辑问题
- 所有 Ambient Life 的代码实现（眨眼调度、分区域头发动态、呼吸、阵风、浮尘层次、窗外环境运动、Ambient Time Drift）都是正确的
- 一旦构建问题解决，所有动态效果应该能正常工作
- `lib/home/ambient-motion.ts` 文件保留在原位置，可作为未来修复后的恢复参考
