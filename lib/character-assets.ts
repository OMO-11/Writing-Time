import type { CharacterName, CharacterVariant } from "@/types/theme";

export interface CharacterAsset {
  src: string;
  fallback: string;
  width: number;
  height: number;
  alt: string;
  generated: boolean;
  priority?: boolean;
}

const novalFallback = "/assets/decor/noval-fallback.svg";
const edenFallback = "/assets/decor/eden-fallback.svg";
const duoFallback = "/assets/decor/duo-fallback.svg";

export const characterAssets: Record<CharacterName, Partial<Record<CharacterVariant, CharacterAsset>>> = {
  noval: {
    "full-body": {
      src: "/assets/characters/noval/full-body.webp",
      fallback: novalFallback,
      width: 1086,
      height: 1448,
      alt: "银白发的见习修士诺瓦尔，穿着暖白与雾蓝旅行服饰",
      generated: true,
    },
    welcome: {
      src: "/assets/characters/noval/half-welcome-safe.webp",
      fallback: novalFallback,
      width: 1021,
      height: 1011,
      alt: "诺瓦尔抱着旅行手记和纸张，明亮地看向今天的创作",
      generated: true,
      priority: true,
    },
    writing: {
      src: "/assets/characters/noval/half-writing.webp",
      fallback: novalFallback,
      width: 703,
      height: 1554,
      alt: "诺瓦尔拿着笔和旅行手记，认真而有活力地记录新发现",
      generated: true,
    },
    discovery: {
      src: "/assets/characters/noval/half-discovery.webp",
      fallback: novalFallback,
      width: 785,
      height: 1534,
      alt: "诺瓦尔发现新事物后兴奋地指向前方，另一手抱着笔记本",
      generated: true,
    },
    empty: {
      src: "/assets/characters/noval/half-empty-editor-v2.webp",
      fallback: novalFallback,
      width: 1155,
      height: 1661,
      alt: "诺瓦尔抱着空白笔记本，期待一起开始记录",
      generated: true,
    },
    bust: {
      src: "/assets/characters/noval/bust-neutral.webp",
      fallback: novalFallback,
      width: 640,
      height: 640,
      alt: "诺瓦尔自然开心的头像",
      generated: false,
    },
    chibi: {
      src: "/assets/characters/noval/chibi-note.webp",
      fallback: novalFallback,
      width: 512,
      height: 512,
      alt: "抱着笔记本的 Q 版诺瓦尔",
      generated: false,
    },
    success: {
      src: "/assets/characters/noval/chibi-save.webp",
      fallback: novalFallback,
      width: 512,
      height: 512,
      alt: "举着发亮水晶的 Q 版诺瓦尔",
      generated: false,
    },
  },
  eden: {
    "full-body": {
      src: "/assets/characters/eden/full-body.webp",
      fallback: edenFallback,
      width: 864,
      height: 1821,
      alt: "灰银发的森林魔女伊登，戴着月星装饰的宽檐帽",
      generated: true,
    },
    gallery: {
      src: "/assets/characters/eden/half-gallery-v2.webp",
      fallback: edenFallback,
      width: 917,
      height: 1150,
      alt: "伊登平静地抱着画框和相册整理图片",
      generated: true,
    },
    search: {
      src: "/assets/characters/eden/half-search-safe.webp",
      fallback: edenFallback,
      width: 1067,
      height: 1605,
      alt: "伊登专注地翻阅索引书寻找资料",
      generated: true,
    },
    archive: {
      src: "/assets/characters/eden/half-archive-v2.webp",
      fallback: edenFallback,
      width: 768,
      height: 1227,
      alt: "伊登抱着书籍与档案，可靠地整理旅行资料",
      generated: true,
    },
    housework: {
      src: "/assets/characters/eden/half-housework-v2.webp",
      fallback: edenFallback,
      width: 985,
      height: 1200,
      alt: "伊登用克制的生活魔法安静整理物品",
      generated: true,
    },
    empty: {
      src: "/assets/characters/eden/chibi-empty.webp",
      fallback: edenFallback,
      width: 512,
      height: 512,
      alt: "守着空收藏箱的 Q 版伊登",
      generated: false,
    },
    bust: {
      src: "/assets/characters/eden/bust-neutral.webp",
      fallback: edenFallback,
      width: 640,
      height: 640,
      alt: "神情克制平静的伊登头像",
      generated: false,
    },
    chibi: {
      src: "/assets/characters/eden/chibi-organize.webp",
      fallback: edenFallback,
      width: 512,
      height: 512,
      alt: "整理档案箱的 Q 版伊登",
      generated: false,
    },
  },
  duo: {
    project: {
      src: "/assets/characters/duo/project-hero-safe.webp",
      fallback: duoFallback,
      width: 1233,
      height: 1003,
      alt: "诺瓦尔带着旅行手记、伊登拿着档案共同整理项目",
      generated: true,
    },
    welcome: {
      src: "/assets/characters/duo/welcome-small.webp",
      fallback: duoFallback,
      width: 1200,
      height: 800,
      alt: "诺瓦尔自然靠近伊登，伊登克制而包容",
      generated: false,
    },
    hug: {
      src: "/assets/characters/duo/noval-hugging-eden.webp",
      fallback: duoFallback,
      width: 1200,
      height: 1200,
      alt: "诺瓦尔从侧后方开心抱住略显无奈的伊登",
      generated: false,
    },
    reading: {
      src: "/assets/characters/duo/reading-together.webp",
      fallback: duoFallback,
      width: 1400,
      height: 1000,
      alt: "伊登指出书中内容，诺瓦尔兴奋地一起阅读",
      generated: false,
    },
    travel: {
      src: "/assets/characters/duo/travel-preparation.webp",
      fallback: duoFallback,
      width: 1400,
      height: 1000,
      alt: "伊登整理旅行用品，诺瓦尔在旁记录观察",
      generated: false,
    },
    success: {
      src: "/assets/characters/duo/project-complete.webp",
      fallback: duoFallback,
      width: 1400,
      height: 1000,
      alt: "项目完成后诺瓦尔开心抱住轻微微笑的伊登",
      generated: false,
    },
    footer: {
      src: "/assets/characters/duo/footer.webp",
      fallback: duoFallback,
      width: 1600,
      height: 600,
      alt: "诺瓦尔与伊登并肩坐在旅途营地旁",
      generated: false,
    },
  },
};

export function getCharacterAsset(character: CharacterName, variant: CharacterVariant) {
  return characterAssets[character][variant] ?? characterAssets[character].bust ?? characterAssets[character]["full-body"]!;
}
