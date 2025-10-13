// Silenciar logs en PRODUCCIÓN (mantiene warn/error)
if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
}
