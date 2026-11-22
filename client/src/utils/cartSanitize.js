/**
 * cartSanitize.js
 * Pure helpers for validating, sanitizing, and parsing cart items.
 * Used by CartContext and tests.
 */

export const isValid24HexId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitizes a single cart item entry.
 * Returns null if the item is invalid (bad ID, non-numeric price or quantity).
 * Clamps quantity to 1..stock-or-99.
 * Fills safe defaults for optional display fields.
 */
export const sanitizeCartItem = (rawItem) => {
  if (!rawItem || typeof rawItem !== 'object') return null;

  const prod = rawItem.product && typeof rawItem.product === 'object'
    ? rawItem.product
    : rawItem;

  const id = prod._id || prod.id;
  if (!isValid24HexId(id)) return null;

  // Numeric price validation
  const rawPrice = Number(prod.price);
  if (!Number.isFinite(rawPrice) || rawPrice < 0) return null;

  // Numeric quantity validation
  const rawQty = Number(rawItem.quantity);
  if (!Number.isFinite(rawQty)) return null;

  // Stock evaluation (defaults to 99 if missing or invalid)
  const rawStock = Number(prod.stock);
  const stock = (Number.isFinite(rawStock) && rawStock >= 0) ? Math.floor(rawStock) : 99;

  // Clamp quantity to 1..stock-or-99
  const maxLimit = stock > 0 ? stock : 99;
  const clampedQty = Math.max(1, Math.min(Math.floor(rawQty), maxLimit));

  // Images fallback
  let images = [];
  if (Array.isArray(prod.images)) {
    images = prod.images.filter((img) => typeof img === 'string' && img.trim().length > 0);
  } else if (typeof prod.image === 'string' && prod.image.trim().length > 0) {
    images = [prod.image.trim()];
  }

  const name = typeof prod.name === 'string' && prod.name.trim().length > 0
    ? prod.name.trim()
    : 'Product';

  return {
    product: {
      _id: String(id),
      name,
      price: rawPrice,
      images,
      stock
    },
    quantity: clampedQty
  };
};

/**
 * Sanitizes an array of cart items:
 * - Drops invalid entries
 * - Merges duplicates by summing quantities (clamped to stock limit)
 */
export const sanitizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];

  const mergedMap = new Map();
  for (const raw of items) {
    const sanitized = sanitizeCartItem(raw);
    if (!sanitized) continue;

    const id = sanitized.product._id;
    if (mergedMap.has(id)) {
      const existing = mergedMap.get(id);
      const stock = existing.product.stock;
      const maxLimit = stock > 0 ? stock : 99;
      existing.quantity = Math.max(1, Math.min(existing.quantity + sanitized.quantity, maxLimit));
    } else {
      mergedMap.set(id, sanitized);
    }
  }

  return Array.from(mergedMap.values());
};

/**
 * Safely parses guest cart JSON from localStorage.
 * Never throws on corrupt or non-array JSON (returns []).
 */
export const parseGuestCart = (rawJson) => {
  if (!rawJson || typeof rawJson !== 'string') return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return sanitizeCartItems(parsed);
  } catch {
    return [];
  }
};
