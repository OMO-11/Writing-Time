/** Final browser HTML boundary, including caches created by older app versions. */
export function safeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");
  const tags = new Set("p br hr h1 h2 h3 h4 h5 h6 ul ol li blockquote pre code em strong del a img table thead tbody tr th td input div span sup sub".split(" "));
  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    if (!tags.has(element.localName)) { element.remove(); continue; }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name;
      const value = attribute.value;
      let allowed = ["title", "alt", "colspan", "rowspan", "align"].includes(name);
      if (name === "id") allowed = /^section-[\p{L}\p{N}-]+$/u.test(value);
      if (name === "class") allowed = /^language-[\w-]+$/.test(value);
      if (name === "href") allowed = /^(https?:\/\/|mailto:|\/[^/]|#)/i.test(value);
      if (name === "src") allowed = /^(https?:\/\/|blob:|fw-asset:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(value);
      if (element.localName === "input") allowed = name === "disabled" || name === "checked" || name === "type" && value === "checkbox";
      if (!allowed) element.removeAttribute(name);
    }
    if (element.localName === "input") { element.setAttribute("disabled", ""); element.setAttribute("type", "checkbox"); }
  }
  return document.body.innerHTML;
}
