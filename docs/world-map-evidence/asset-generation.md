# 雾行图素材生成记录

方法：内置 ImageGen。地形编辑以 `docs/design-references/mist-world-expanded-v4.png` 为编辑目标；地标用该图作风格参考；棋子用角色设定表作身份参考，`mist-world-pieces-transition-v3.png` 仅作棋子形态参考。最终浏览器资产为 `public/assets/world-map/` 中六张独立 WebP。

## 地形

> Edit target: expanded world-map reference. Preserve overall geography, continent and floating-island silhouette, watercolor pencil style, snow mountains north, west forest and lake, east river terraces, southeast small island, cloud sea and pastel ivory/mist blue/gray-green color. Remove every piece of text, heading, interface control, compass, chess character, location ring, dotted route, and all three main functional buildings. Replace removed subjects with natural open terrain. Keep faint nonfunctional ruins. Output scenery only, no words, UI or watermark.

## 地标

三座建筑分别生成单体透明资产。共同提示：近俯视三分之四角度、完整轮廓、底部中央接地、细铅笔线与低饱和水彩、象牙白/雾蓝/灰绿、真实透明 alpha、无字、无棋子、无地图。

- 窗边居所：带浅蓝圆顶、圆形黄铜窗、矮墙与小台阶的石质观测小屋。
- 幻想工坊：象牙白写作工坊、四叶风车塔、蓝色尖顶、入口附近的纸页和书桌意象。
- 拾光画廊：浅石展馆、灰蓝屋顶、拱门和台阶、外悬小画框。

## 棋子

共同提示：一枚独立西洋棋式人物棋子，上半部保留角色头发、帽饰与披肩，下半部是连续收腰陶瓷棋身和宽阶梯圆底座；没有腿、棋盘或文字；小尺寸轮廓清晰，与地图角度一致。诺瓦尔依据 `public/assets/characters/noval/character-sheet.webp`，保留银白侧束、白花、蓝缎带和浅蓝披肩，使用象牙白棋身。伊登依据 `public/assets/characters/eden/character-sheet.webp`，保留银灰长发、月星宽檐魔女帽、灰紫缎带和深蓝灰披肩，使用深蓝灰棋身。初次生成的两枚棋子背景不透明，因此分别执行 background-extraction，只移除暗色渐变背景，保留棋子本体与底座阴影。

最终素材尺寸：地形 1672×941；窗边居所 1204×987；幻想工坊 1077×1033；拾光画廊 1298×1070；诺瓦尔 565×1407；伊登 754×1443。WebP 总体积约 1.56 MB。
