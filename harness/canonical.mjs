// JSON with object keys sorted, so two states compare equal regardless of key insertion order.
export function canonical(v) {
  return JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x));
}
