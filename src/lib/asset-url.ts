/** Root-relative in the web app, relative in the offline pack (`base: './'`). */
export function assetUrl(path: string): string {
  const cleaned = path.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "/";
  if (base === "./" || base === "") return `./${cleaned}`;
  if (base.endsWith("/")) return `${base}${cleaned}`;
  return `/${cleaned}`;
}

export function isFileProtocol(): boolean {
  return typeof location !== "undefined" && location.protocol === "file:";
}
