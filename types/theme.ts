export type CharacterTheme = "noval" | "eden" | "balanced";
export type CharacterThemePreference = "auto" | CharacterTheme;
export type CharacterDisplayMode = "full" | "compact" | "off";
export type TextureMode = "on" | "off";
export type CharacterMotionMode = "full" | "reduced" | "off";
export type CharacterName = "noval" | "eden" | "duo";
export type CharacterPlacement = "left" | "right" | "bottom-right" | "corner";
export type CharacterSize = "sm" | "md" | "lg";
export type CharacterVariant =
  | "full-body" | "welcome" | "writing" | "discovery" | "gallery" | "search"
  | "archive" | "housework" | "empty" | "chibi" | "bust" | "hug" | "reading" | "travel"
  | "project" | "success" | "footer";

export interface CharacterDisplayPreferences {
  illustrationMode: CharacterDisplayMode;
  textureMode: TextureMode;
  motionMode: CharacterMotionMode;
  themePreference: CharacterThemePreference;
}
