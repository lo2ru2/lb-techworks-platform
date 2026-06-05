export function legacyAsset(pathFromLegacyRoot: string) {
  const clean = pathFromLegacyRoot.replaceAll('\\', '/').replace(/^\/+/, '');
  return `/shop-assets/${clean}`;
}

