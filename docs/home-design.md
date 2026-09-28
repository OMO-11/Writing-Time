# 双层主页

入口：`app/page.tsx`；交互：`components/home/DreamHome.tsx`；样式：`app/dream-home.css`。

首层包含本地实时时钟、分时欢迎词和诺瓦尔观星书房。第二层由右侧滑入，桌面保留左侧时钟与场景；移动端保留顶部时钟，并在下方展示可滚动的半透明侧滑面板。支持按钮、左右触摸滑动及 Escape 返回，关闭时恢复焦点，隐藏面板使用 inert 阻止键盘误入。遵循 prefers-reduced-motion，可手动暂停粒子动效。

卡片由 destinations 数组维护。现有入口为 /workshop 和 /archive-gallery；后续可追加新功能。未来功能占位没有虚假链接。

## 光影

设计参考：https://github.com/buger404/KumengScreen，阅读 README、lib/daylight.ts 与 lib/stylized-lighting.ts；为当前素材独立编写着色器与区域校准，未复制第三方背景、法线图或源代码。

现使用 WebGL 逐像素重光照：底图提供颜色，配套 RGB 法线图提供朝向（X 向右、Y 向上、Z 朝观察者）。两张图共用相同 cover 裁切坐标。根据本地时间计算太阳方向、晨昏主光色和天空环境色，在线性颜色空间以法线点积计算受光，直接光改为有限面积窗光的 9 个方向加权采样，每个方向按 Lambert 余弦衰减，再求平均，得到稳定的入射光量；再以 85% 双档绘画响应与 15% 连续响应混合，形成明确的明暗两区，仅在交界处柔和过渡。法线在上传纹理时做连续高斯低通，渲染时再归一化，仅保留稳定的大尺度形体。移除稀疏远距离采样，避免它把法线图中错位的细节复制成多层阴影；颜色纹理始终只有一次采样，不做模糊或 UV 扭曲。最后采用 EV 曝光，仅对线性亮度大于 0.85 的高光做柔和压缩，再做 gamma 编码；不再使用压暗全部中间调的 Reinhard 曲线。

默认阴影柔和度为 40%，曝光为 0 EV，调节范围 −2 至 +1 EV。取消原有反照率提亮补偿与接近白色的加法高光，亮部保留暖纸色、阴影保留冷色颜料感。所有光照项统一经过曝光，最低档可以实际压暗全部光源。脸部与全场景使用同一连续法线场。移除鼻尖椭圆、固定脸颊法线替换及局部受光方向覆盖，消除侧光时出现的圆形边界。皮肤在白昼阴影区有微弱暖色反射。银发弧形柔光带的位置、强度随主光方向变化，并受头发区域与色彩遮罩限制。双眼虹膜具有局部反射，夜间关闭太阳光，改用独立月光方向与银蓝色主光。月光穿窗形成宽且柔和的照明区域，并按表面法线形成受光、轮廓与阴影；发丝保留弱月光柔光带，虹膜仅有微弱反射。环境光分为随法线朝向变化的冷色天空散射，以及桌面附近的弱暖色木质反射。月光轨迹是美术设定，不是当地天文星历。

渲染器：components/home/RelightScene.tsx；GLSL：lib/home/relight-shaders.ts 与 lib/home/atmosphere-shaders.ts。粒子开启时约 30 fps，关闭动效、减少动态效果或查看贴图时仅按需渲染；后台标签暂停，恢复时不跳帧快进。纹理加载失败或 WebGL 不可用时保留静态背景，支持上下文丢失后重建。画布分辨率限制最大边长 2560，以控制移动端开销。

左下角可预览全天光照、调节阴影边缘柔和度、发丝柔光、曝光、光束与浮尘强度，并比较光照效果／底图／法线图。时间预览不改变真实时钟。

限制：法线图由图像生成模型估计，属于艺术化几何近似；原始底图仍含少量已绘制光影，着色器保留原画中的线稿和固有色细节，不等同于真实三维模型或完全去光照的物理反照率贴图。

验证：浏览器真实 WebGL 编译与绘制、早晚方向变化和夜间亮度比较、上下文丢失恢复、移动端布局与关闭焦点恢复。新回归脚本 tmp/home-preview/atmosphere-verify.cjs 扫描 12 个时刻的面部，验证光束强度、粒子运动、暂停、减少动态效果、上下文恢复及移动端焦点。面部检查图：tmp/home-preview/face-day-cycle.png。

## 环境与粒子

保留月光和冷色天空散射，增加少量木质环境反射。穿窗光束采用二维单次散射近似：窗口孔隙决定光束分布，距离控制衰减，人物前景有柔和遮挡。它是丁达尔风格的视觉近似，不是有真实深度的三维体积渲染。

300 个确定性种子的 WebGL 点精灵独立绘制，随时间缓慢上浮、侧移和闪动，沿用表面光照同一时刻与窗口光束场。白昼米金色、晨昏偏暖金、夜间弱银蓝；进入光束的浮尘更亮，面部区域降低粒子强度以免造成新的斑点。光束与粒子随昼夜改变，静态底图／法线对比模式不绘制这些效果。

## 生成素材

配套法线图使用内置 image_gen，以完整背景为注册参考生成，保存于 public/assets/home/noval-observatory-normal.png（1672×941，无损 PNG）。最终法线生成提示词：

Convert the supplied illustration into a precisely registered camera-space RGB surface NORMAL MAP for real-time relighting. This is a technical texture, NOT a colored illustration. Preserve EXACT composition, silhouettes, facial feature positions, hands, book, windows and every object; do not move or redraw anything. Same 1672x941 landscape aspect ratio. Encode normal X pointing image-right in red, Y pointing image-UP in green, Z pointing toward viewer in blue. Front facing surfaces RGB(128,128,255); left facing surfaces low red, right facing high red; upward facing surfaces high green. Smooth rounded volume for girl's face, cheeks, nose, forehead, white hair locks, hands, shoulders and cloth folds. Hair masses have smooth broad cylindrical/ellipsoidal normal gradients, not noisy fine detail. Face gently convex with recognizable nose normals, no painted skin or eyes colors. Desk and book upward facing cyan-blue; window frontal blue-violet; books and wooden frames accurate geometric normals. Distant sky neutral (128,128,255). Absolutely no original diffuse colors, no lighting, no shadows, no specular highlights, no text or legend. Entire image is clean saturated blue/purple/cyan RGB normal data. The source image is the exact registration target.

使用内置 image_gen 工具，以 图片素材/诺瓦尔.png 为人物参考生成。原始文件：public/assets/home/noval-observatory.png。现已替换为用户提供的 3344×1882 超分图 public/assets/home/enhance-noval-observatory.png；网页使用同尺寸 quality 94 的 enhance-noval-observatory.webp（约 1 MB）。原始超分 PNG 保留不动。色图与法线各自保留原始分辨率，统一用归一化 UV 对齐，不再用色图尺寸计算法线滤波半径。

生成提示词：

Use case: stylized-concept. Create a premium 16:9 wide anime illustration as the full-screen background of a literary personal creative workspace. Reference image defines the SAME character Noval: silver white bob with a small side ponytail and blue ribbon, pale blue eyes, flower hairpin, delicate powder-blue cape and medieval cream-blue dress. Preserve her identity and costume. New setting: tranquil old observatory reading atelier with an enormous arched window to the LEFT, distant blue mountains and clouds, bookshelves, manuscript desk, small glass vases, warm ivory plaster and worn wood. Character seated at the desk on the RIGHT at approximately 70% of image width, waist-up, gently looking toward viewer with an open book. Left 42% is spacious subdued pale blue window and hazy landscape with low detail suitable for a large clock and welcome text overlay. Exquisite painterly anime linework, refined muted slate blue, warm parchment and soft gold, cinematic soft directional afternoon sunlight from upper left, luminous silver hair, atmospheric dust. No UI, no text, no lettering, no watermark. Entire scene edge to edge, wide landscape 16:9. This is an original composition, not a copy of any existing project background.




主页首层已移除桌面与移动端的整屏暗色渐变遮罩，时钟和欢迎词直接叠在 WebGL 场景上，仅保留字形阴影辅助阅读。浮尘增大粒径、提高可见亮度和密度，保持原有昼夜色温、光束响应及暂停机制。


通透度调整：删除加载底图的 CSS brightness/saturate 滤镜，提高日间环境填充、让窗外亮度接近原画，并移除叠乘导致全画面偏灰的阴影色。夜间保留方向性月光及局部阴影。白昼文字采用深蓝灰，夜间采用浅色，不借助整屏遮罩保证阅读。


## 窗口方向与硬边校准

太阳、月光、穿窗光束与粒子共用窗口方向函数。下午仍从左侧窗户入光，只有仰角与入射角变化，不会越过墙壁从右侧照入。每个窗口采样方向在 N·L≤0 时贡献为零；只有能看到部分窗口的表面才接收该方向的直接光。窗口角尺寸固定为 0.20；柔和度仅控制分档交界宽度，最低档仍保留非零过渡与有限面积窗光采样。发丝与瞳孔反射同时受对应的直接光可见度约束。

降低背光环境填充，提高受光侧主光能量，拉开局部明暗对比，同时保留通透的天空和曝光映射。针对推测法线中的非物理凹坑，用连续整头曲面引导与原法线混合稳定明暗交界；不恢复鼻尖椭圆或固定法线补丁。这仍是当前插画的艺术化表面近似，没有真实三维遮挡计算。

浮尘调整为 300 个粒子，尺寸和漂移速度随深度变化，共用缓慢阵风及局部扰动。光束中的粒子明显增亮，远近粒子形成持续流动；面部净空、暂停、减少动态效果及后台暂停行为保留。最低柔和度检查脚本：tmp/home-preview/hard-light-check.cjs；检查图：tmp/home-preview/hard-light-cycle.png。

参考参数校准：依据 KumengScreen 的 lib/stylized-lighting.ts 与 lib/daylight.ts，采用 0.50 受光阈值、0.025–0.14 过渡半宽、0.14/0.70 明暗响应、0.85 风格化比例，默认柔和度 0.40。连续面积窗光积分负责入射光，绘画响应负责明暗层次；背向全部窗口采样时直接光仍为零。日间环境填充基准为 0.10 + 0.18 × day，太阳强度为 0.14 + day，再乘本场景的昼夜可见度。月光边缘略宽，保留现有独立月光与环境反射。这里参考的是参数与响应形式，窗户方向、头部连续法线校正和材质区域仍匹配当前插画。



## HDR 与绘画后处理

光照模式使用线性 RGBA 半浮点场景缓冲，人物、环境散射及浮尘在同一缓冲中合成。曝光只在后处理计算一次；曝光后的高亮通过软阈值提取，在 1/2、1/4、1/8 分辨率下做横纵可分离高斯模糊，以 0.55/0.30/0.15 权重合成泛光。白昼泛光强度 0.16，夜间 0.055，保留明暗两档和清晰线稿。以最大颜色通道统一缩放的高光肩部曲线保留颜色比例，随后做轻微冷影暖光调色、gamma 显示编码。底图与法线诊断模式直接显示原贴图，不经过曝光或泛光。

脸部保留连续法线采样和整头曲面引导，以连续肤色权重对太阳方向做微小校正，避免局部硬边。保留随光源方向移动的银发弧带与局部肤色/虹膜修正，夜间发丝和瞳孔仅有微弱反射，场景月光照明仍保留。设备不支持可过滤、可渲染半浮点纹理时退回直接光照；画布 resize 重建缓冲，卸载释放纹理与帧缓冲，上下文恢复后重新初始化。

后处理实现：lib/home/postprocess.ts。浏览器 canvas 的 data-pipeline 标识实际使用的 hdr-bloom / direct 路径。


脸部与暮色微调：脸部使用法线入射值计算更宽的局部明暗坡度（半宽 0.12–0.22），暗档响应轻提至 0.22，通过连续肤色权重与全局两档响应混合，并添加极弱暖色反射。衣物和头发仍保持原有分档。太阳、光束及浮尘共用 sunsetWarmth/sunlightTint，日光由淡黄转为低太阳高度的橙色；窗外天空与环境填充同步转暖，直接光在夕阳色形成前不再因 day 平方提前消失。入夜降低环境填充、月光、窗外和浮尘能量，保持暗夜层次与少量月光。该时间变化仍为美术化日循环，不是实时天文位置。


## 夜间曝光与人物动画

自动曝光补偿在 18:30–20:00 平滑从 0 增至 +1 EV，04:30–06:00 平滑退出；日间及夕阳时段不改变曝光。手动曝光滑块在此基础上叠加，HDR 与兼容路径共用同一个实际曝光值。

浮尘增加至 420 个，漂移方向响应太阳/月亮方向，位置随预览时刻平滑变化，穿过光束的粒子更亮。关闭浮尘仍保留人物动画。呼吸使用胸肩局部 UV 位移；发丝通过位置区域与银发颜色双重遮罩摆动，脸部、耳朵和手部设保护区。颜色图、平滑法线和闭眼帧基于同一变形 UV 采样，材质区域也跟随移动。眨眼在 13.7 秒周期中按不等间隔触发，快速闭合、稍慢睁开；仅混合两眼的羽化区域，虹膜反光随闭合消失。暂停冻结全部动画，减少动态效果显示静止睁眼帧，后台暂停不快进。

闭眼素材由内置 image_gen 编辑当前超分原图生成，保存 public/assets/home/noval-observatory-closed.png，1672×941。生成画面并非精确注册扫描，因此仅使用眼部区域，并分别校准左右眼 UV 偏移。最终提示词：

Edit target: supplied illustration. Make a precisely registered closed-eye animation frame. ONLY change the girl's two open eyes to naturally gently CLOSED eyelids, relaxed blink, thin curved anime eyelash lines. Keep exact head pose, face shape, eyebrows, hair strands, nose, mouth, hands, clothing, framing, background and colors. No smile changes. No lighting changes. Keep original aspect ratio and exact composition, no zoom or cropping. This will be blended only over the two eye regions of original for blink animation, so eye positions and surrounding skin MUST align exactly. Output full scene.

检查脚本 tmp/home-preview/animation-verify.cjs 验证日间/傍晚 0 EV 与夜间 +1 EV、闭眼与睁眼帧、WebGL 状态；atmosphere-verify.cjs 验证全天、运动、暂停、减少动态效果、上下文恢复及移动端。


## 最终超分背景与调色手记

当前页面与 WebGL 色图统一使用 enhance-noval-observatory-final.webp，来自用户新增的 enhance-noval-observatory-final.png（6688×3764）；以 quality 94 编码为约 2.84 MB 的 WebP，原 PNG 保留。沿用同构图法线与闭眼素材及归一化坐标。

参数面板重绘为暖纸色双栏手记，带细线、纸纹、衬线标题、键盘焦点、输出数值、手机滚动布局。新增泛光强度、高亮阈值、扩散半径、手绘光影比例，分别控制 HDR 合成能量、亮部提取、三级模糊采样间距、法线光照风格化混合。原曝光、边缘柔和、发丝柔光与浮尘仍可调。默认保留已有视觉参数；参考图配方一键设为曝光 −0.22 EV、泛光 0.05、阈值 1.05、半径 0.71×、手绘 100%、柔和 100%、发丝 46%。恢复默认重置八项视觉设置。参数为当前页面会话状态。泛光三项需要 HDR 支持，设备兼容降级时仍使用直接光照。

验证：tmp/home-preview/notebook-verify.cjs 比较四个新增参数的实际渲染像素、参考配方、恢复默认与移动端溢出；animation-verify.cjs 验证背景替换后的闭眼及夜间曝光。


背景版本回退：根据用户反馈，静态底图与 WebGL 色图均已切回上一版 enhance-noval-observatory.webp（3344×1882）。final 超分素材保留备份，当前页面不再引用；参数面板、光照与动画保持不变。
`n面板精简：删除泛光、高亮阈值、扩散半径的自定义状态与控件，渲染保持默认 0.16 / 0.9 / 1。配方仅影响剩余可见参数。面板改为更紧凑的纸张手记，强化标题、分组、数值与分段按钮；光束浮尘独占整行。


## Ambient Life（2026-09-22）

本次仅扩展现有 motionTime / RAF 与 WebGL 场景，不改素材、构图、Portal UI、导航或数据层，不新增依赖。纯数学事件集中在 lib/home/ambient-motion.ts。

- 自然眨眼：确定性 LCG 调度，每次结束后间隔 3.5–8 秒；单眨约 85%、双眨 12%、长闭眼 3%。闭合 60–90 ms、保持 30–60 ms、睁开 80–120 ms；双眨间隔 120–180 ms，长闭眼总长约 310–450 ms。继续使用闭眼贴图、左右眼注册校正、眼部羽化混合及虹膜抑制；uBlink 替代固定 13.7 秒循环。
- 分区发丝：刘海约 4.3 秒、侧发约 7.6 秒、发梢带相位延迟、马尾约 8.7 秒；基础水平幅度分别约 0.00022 / 0.00042 / 0.00070 / 0.00105 UV，另乘区域和银发颜色权重。脸、耳、手保护遮罩复用，书与桌面不在变形区域内。颜色、法线、闭眼贴图共用 animatedUv。
- 呼吸：5 秒周期，胸肩局部横向与纵向微扩张，下缘锚定；不做全画面缩放。
- 统一阵风：基础风力 0.15，开始时刻间隔 15–40 秒，持续 2–4 秒，sin² 平滑升降，峰值 0.50–0.65。同一事件加强发梢、马尾与少量衣角，浮尘用同一风力的解析积分计算横向位移，避免风力变化导致跳位。
- 浮尘：保持 420 个种子，以 0.65 / 0.92 深度阈值划分约 65% 远层、27% 中层、8% 近层。远层小慢淡、近层少而柔；取消正弦闪烁，明暗由光束进入/离开决定，四边淡入淡出、近层扩大脸部净空。
- 窗外：仅在左侧天空内部保守区域（避开窗框、藤叶与建筑）做极小水平位移，约 240 秒周期、0.00065 UV；180 秒亮度变化 ±2.5%，另叠加低频薄雾变化（≤0.6%）。不移动整个窗景，不给窗框加变形。
- Ambient Time Drift：sceneHour 围绕现实时间以 360 秒周期摆动 ±0.3 小时；真实时钟与欢迎语不变，现实时间传入值补齐秒。手动预览关闭漂移并保留已有最短路径平滑追踪，点击跟随恢复。所有光源、发丝高光、光束与粒子受光使用同一个 sceneHour；不增加快速昼夜模式。

性能与生命周期：复用唯一约 30 FPS RAF，low-power、DPR/2560 上限不变；motionTime 是所有动态唯一时钟。后台停止 RAF，恢复不补算后台经过时间；暂停冻结所有动画相位，减少动态效果统一采样 t=0、睁眼、无漂移，仅现实光照按需更新；诊断视图保持原始贴图。帧间时间最多 250 ms，防止短暂卡顿或恢复后快进。上下文恢复重建资源并继续时间轴。静态 Image 与功能入口保持独立回退。

验证：ambient-math.cjs 模拟一小时，检查确定性、眨眼范围、风力范围、风积分单调性与 ±0.3 小时漂移边界；ambient-visual.cjs 对照静态、呼吸、阵风、闭眼及 90 秒相位截图；atmosphere-verify.cjs 检查 12 个时刻、暂停、减少动态效果、WebGL 恢复与移动端；ambient-browser.cjs 实时采样眨眼、预览、零浮尘时人物运动、后台恢复、390×844 布局和静态回退导航。

npm run build（包括 prebuild → sync:rhinelab）通过。本次修改源码的定向 ESLint 通过。npm run lint 全量未通过：现有 ArchiveGallery 等文件的规则错误、第三方运行产物、旧 tmp 预览脚本被全量扫描；按任务边界不修改相关系统或全局 lint 配置。视觉检查为短时实时观察与指定长周期相位截图，未进行物理移动设备与连续五分钟的主观观看验收。


### 动态可见性复验与修正

正常尺寸下原基础发丝与呼吸过弱，本次将刘海/侧发/发梢/马尾水平系数校准为 0.00050 / 0.00095 / 0.0014 / 0.0021 UV，仍乘颜色及保护遮罩；胸肩横纵扩张系数为 0.007 / 0.014，保留五秒周期与原锚点。短眨眼按本次帧间隔以 1/60 秒采样峰值，避免低帧率直接跳过闭合。闭眼图失败时禁用眨眼并显示失败提示，不再把睁眼底图偏移后当成闭眼帧。

面板增加一行实际状态：加载、运行及已触发眨眼次数、暂停、系统减少动态效果、贴图对比、闭眼图缺失、静态回退。仅状态变化时通知 React，不每帧更新组件；canvas data-motion-time 供诊断使用。计数表示提交了闭眼混合帧，不应替代实际画面验收。

accept-natural.cjs 在不强制时间/眨眼值、不覆盖系统媒体偏好的 Chrome 页面中读取最终 framebuffer，18.53 秒/532 帧观察中于 5.37 和 13.36 秒捕获自然闭眼帧。motion-status-verify.cjs 验证减少动态效果、暂停、贴图失败，以及 250ms RAF 间隔下实际眨眼触发。ambient-browser.cjs 回归通过，npm run build（含同步）通过，修改源码 lint 通过。用户原浏览器完全不显示眨眼的具体原因尚未远程复现，不能将以上修正说成已确认的用户端根因。


### 眨眼连续性调整

针对两张眼图交替感，眼部改为随头部倾斜校准的上眼睑扫描：闭眼贴图的睫毛线逐步下移，遮住原虹膜，末段收敛到完整闭眼帧；不压缩眼球，不移动脸部。普通闭合 110–140ms、保持 30–60ms、睁开 150–190ms，在约30FPS下提供更多中间状态。正常帧直接采样连续曲线；仅帧间隔超过80ms时检查遗漏的短事件，并限制单帧开合增量，避免上一版区间峰值造成突跳。眼图仍为二维近似，并非三维眼睑模型。检查了0/25/50/75/100%闭合状态并重录自然眨眼。

### 系统减少动态效果与手动开启

用户 Edge 的实际无动态原因已确认为 `prefers-reduced-motion: reduce`。默认继续冻结人物、浮尘、窗外与光照漂移，但光影面板现在显示实际的“开启场景动效”按钮，并解释系统暂停原因。明确点击开启后仅允许当前页面访问播放场景；暂停撤销许可，刷新重新遵循系统偏好，不写入持久化设置。CSS 的界面过渡仍遵循系统偏好，后台暂停、30 FPS、low-power、分辨率限制与静态回退不变。

回归脚本 `scripts/verify-home-motion.cjs` 覆盖 Edge 的 reduce 初始静止、手动开启后自然眨眼、暂停、再次开启和刷新复位，防止只在 no-preference 测试环境中通过而遗漏真实用户路径。

## 雾行图世界地图（2026-09-23）

首页保持 `enhance-noval-observatory.webp`、现有法线光照、风格化着色、昼夜与 Ambient Life 参数。原功能抽屉、背景横移和左右滑动开关已移除；「开启我的空间」改为轻量指南针文字入口。`DreamHome` 现在承载互斥的窗边与地图场景，`RelightScene` 仅新增 `active` 输入：地图可见时停 RAF，返回时重置帧间时间；着色器和后处理未因地图改写。

地图素材位于 `public/assets/world-map/`。生产地形由扩大版参考图经内置 ImageGen 编辑，清除了原稿中的文字、UI、路线、棋子和三座功能建筑；独立生成并压缩了三座透明地标和两枚透明西洋棋式角色棋子。诺瓦尔以象牙白棋身、银白侧束和花饰识别，伊登以深蓝灰棋身、月星宽檐帽识别。所有标签、路线、定位圈、按钮和链接由 DOM / SVG 绘制，地形不是整张设计截图。六张 WebP 合计约 1.56 MB，地形 1672×941；原 PNG 保留在本次 ImageGen 生成目录，运行时只依赖项目内 WebP。素材提示词以实施文档第 6 节为基础：地形执行 precise-object-edit 清除交互元素；三座地标执行 stylized-concept 透明单体建筑；两枚棋子依据项目角色设定表生成，再执行 background-extraction 去除暗色背景。

`lib/home/world-map.ts` 存放 1672×941 世界坐标、三处真实地点、预留区域、路径及相机投影与边界函数。默认聚焦中南部起始区域；总览显示完整大陆，外围保持自然地形留白。`WorldMapScene` 提供 Pointer Events 拖动、双指与滚轮缩放、总览、定位、目的地文本导航和原生模块链接。相机和当前地图场景按版本存入当前标签页的 sessionStorage；从模块返回 `/` 可恢复地图和视角，明确返回窗边则写回 home。手机初始镜头优先保证当前位置清晰，边缘地点可通过目的地列表查看和进入。

`usePortalTransition` 在雾色达到完全不透明且绘制两帧后切换活动场景；地图六张关键图片完成解码后才揭雾。雾层由纯色底和两层轻量柔雾渐变组成。过渡支持重复请求幂等、雾起 Esc 取消、满雾反向请求、超过 700 ms 的加载提示、8 秒超时、失败重试与返回。系统减少动态效果下使用短淡变且不等待 CSS 动画事件。闲置时雾层不拦截点击，非活动场景 inert / aria-hidden；返回后焦点回到首页入口。

验收证据在 `docs/world-map-evidence/`：首页、起始地图、总览、手机、横屏截图及 `fog-round-trip.webm` 往返录屏。`scripts/verify-world-map.cjs` 在 Chrome 生产服务上验证真实路由、拖动/缩放/定位、文字导航、隐藏首页 RAF、焦点恢复、手机与横屏、减少动态效果、底图失败后返回和重试，结果无页面异常。`scripts/verify-home-motion.cjs` 再次验证原人物动效、暂停及减少动态效果手动开启。`npx next build` 与 `npx tsc --noEmit` 通过，修改文件定向 ESLint 无错误；`npm run lint` 全量仍被既有 ArchiveGallery 等文件、第三方产物与旧临时脚本挡住。`npm run dev` 的 predev 同步脚本在当前沙箱对 `.git/FETCH_HEAD` 无写入权限，开发与生产验证分别直接使用 `npx next dev` 和 `npx next start`。未做物理移动设备和长时间帧率 profiler 测量。

## 雾行图美术与交互收尾（2026-09-24）

地图改用四地域细化后合成的 2912×1640 灰调彩铅底图，棋子依据用户草样替换为小头部、短披肩和收腰圆底座。建筑、棋子与地形共享世界变换，名称仅在悬停 / 聚焦时显示。增加棋子沿路线拾起、移动、落下后导航，模块提供保存并返回地图，按会话恢复实际地点。控件改为圆角半透明表面，并增加地图边缘柔云。完整素材提示词、实现说明与验证见 [雾行图美术与交互收尾记录](雾行图美术与交互收尾记录.md)，截图和录屏在 `docs/world-map-evidence/polish/`。

## 移除棋子（2026-09-24，最新调整）

按最新反馈移除地图角色棋子、定位光圈、棋子图片预加载与沿路线移动/镜头跟随逻辑。点击地标直接以 260 ms 淡出进入模块（减少动态效果时 100 ms），保留 Esc 取消、返回地图、当前位置记忆和地图定位。原棋子素材仅保留为历史文件，不参与页面渲染和预加载。此调整覆盖上文关于棋子及行进动画的描述。

验证：TypeScript、定向 ESLint，以及桌面和三种移动视口的浏览器回归；地标漂移 0 px，画廊/工坊往返和取消导航通过，无页面异常。最新截图已更新至 `docs/world-map-evidence/polish/`，旧行进录屏仅作历史参考。
