"use client";

import { Eye, ImageOff, Sparkles, WandSparkles } from "lucide-react";
import { db } from "@/lib/db";
import { useUIStore } from "@/stores/ui-store";
import type { CharacterDisplayPreferences } from "@/types/theme";
import { CharacterIllustration } from "@/components/theme/CharacterIllustration";

export function CharacterDisplaySettings() {
  const illustrationMode = useUIStore((state) => state.illustrationMode);
  const textureMode = useUIStore((state) => state.textureMode);
  const motionMode = useUIStore((state) => state.motionMode);
  const themePreference = useUIStore((state) => state.themePreference);
  const setPreferences = useUIStore((state) => state.setCharacterPreferences);
  const preferences: CharacterDisplayPreferences = { illustrationMode, textureMode, motionMode, themePreference };
  const update = <K extends keyof CharacterDisplayPreferences>(key: K, value: CharacterDisplayPreferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    void db.settings.put({ key: "character-display-preferences", value: next });
  };
  return (
    <section className="character-display-settings">
      <WandSparkles aria-hidden="true" size={23} />
      <div>
        <h2>双角色外观</h2>
        <p>控制诺瓦尔与伊登的插画、纸张纹理、动画和页面主题。关闭插画不会影响任何功能。</p>
        <div className="appearance-setting-grid">
          <label>
            <span><Eye aria-hidden="true" size={15} />人物插画</span>
            <select value={preferences.illustrationMode} onChange={(event) => update("illustrationMode", event.target.value as CharacterDisplayPreferences["illustrationMode"])}>
              <option value="full">完整</option><option value="compact">精简</option><option value="off">关闭</option>
            </select>
          </label>
          <label>
            <span><Sparkles aria-hidden="true" size={15} />装饰纹理</span>
            <select value={preferences.textureMode} onChange={(event) => update("textureMode", event.target.value as CharacterDisplayPreferences["textureMode"])}>
              <option value="on">开启</option><option value="off">关闭</option>
            </select>
          </label>
          <label>
            <span><ImageOff aria-hidden="true" size={15} />动画</span>
            <select value={preferences.motionMode} onChange={(event) => update("motionMode", event.target.value as CharacterDisplayPreferences["motionMode"])}>
              <option value="full">完整</option><option value="reduced">减少</option><option value="off">关闭</option>
            </select>
          </label>
          <label>
            <span><WandSparkles aria-hidden="true" size={15} />角色主题</span>
            <select value={preferences.themePreference} onChange={(event) => update("themePreference", event.target.value as CharacterDisplayPreferences["themePreference"])}>
              <option value="auto">自动分配</option><option value="noval">诺瓦尔晨雾</option><option value="eden">伊登星夜</option><option value="balanced">共同旅途</option>
            </select>
          </label>
        </div>
      </div>
      <CharacterIllustration character="eden" variant="housework" placement="right" size="md" fade />
    </section>
  );
}
