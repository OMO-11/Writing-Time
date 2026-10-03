const skins = ["mist", "night", "linen"];

export function BookCover({ id, title }: { id: string; title: string }) {
  const hash = Array.from(id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return <span className="book-cover" data-skin={skins[hash % skins.length]} aria-hidden="true"><span>{title}</span><i className="book-cover-imprint" data-mark={hash % 3} /></span>;
}
