const normalizeBasePath = (basePath: string) => {
  const cleaned = (basePath || "/").trim();
  if (!cleaned || cleaned === "/") return "/";
  return `/${cleaned.replace(/^\/+|\/+$/g, "")}`;
};

export const getAppBasePath = () => normalizeBasePath(import.meta.env.BASE_URL || "/");

export const getPublicStorePath = (slug: string) => {
  const basePath = getAppBasePath();
  return basePath === "/" ? `/${slug}` : `${basePath}/${slug}`;
};

export const getPublicStoreUrl = (slug: string) => {
  const path = getPublicStorePath(slug);
  return new URL(path, window.location.origin).toString();
};