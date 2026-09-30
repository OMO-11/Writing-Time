const skins = ["mist", "night", "linen"];
export function BookCover({ id, title }: { id: string; title: string }) {
  const hash = Array.from(id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return <span className="book-cover" data-skin={skins[hash % skins.length]} aria-hidden="true"><span>{title}</span><svg viewBox="0 0 40 20" fill="none"><path d="M2 10h11m14 0h11M20 2l5 8-5 8-5-8z" stroke="currentColor" /></svg></span>;
}
