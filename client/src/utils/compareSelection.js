/**
 * Pure helpers for Compare Selection state and URL query parsing.
 * Storage operations accept an injected storage object for deterministic unit testing.
 */

export const COMPARE_STORAGE_KEY = 'cartex_compare_selection';

const HEX_24_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Validates whether an ID is a valid 24-character hexadecimal ObjectId.
 * @param {any} id
 * @returns {boolean}
 */
export function isValidId(id) {
  if (typeof id !== 'string') return false;
  return HEX_24_RE.test(id.trim());
}

/**
 * Sanitizes and extracts the essential fields { _id, name, image, price } from a product object.
 * Returns null if the product is not an object or does not have a valid 24-hex ID.
 * @param {any} p
 * @returns {{ _id: string, name: string, image: string, price: number } | null}
 */
export function sanitizeProduct(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const rawId = p._id ?? p.id;
  if (!isValidId(rawId)) return null;

  const _id = String(rawId).trim().toLowerCase();
  const name = typeof p.name === 'string' ? p.name : '';
  let image = '';
  if (typeof p.image === 'string') {
    image = p.image;
  } else if (Array.isArray(p.images) && typeof p.images[0] === 'string') {
    image = p.images[0];
  }
  const price = typeof p.price === 'number' && !Number.isNaN(p.price)
    ? p.price
    : (Number(p.price) || 0);

  return { _id, name, image, price };
}

/**
 * Validates a list of selected products:
 * - Must be an array
 * - Each item sanitized to { _id, name, image, price } with valid 24-hex _id
 * - Dedupes by _id
 * - Caps at 3 items
 * @param {any} rawItems
 * @returns {Array<{ _id: string, name: string, image: string, price: number }>}
 */
export function validateSelection(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const seen = new Set();
  const result = [];
  for (const item of rawItems) {
    const sanitized = sanitizeProduct(item);
    if (!sanitized) continue;
    if (seen.has(sanitized._id)) continue;
    seen.add(sanitized._id);
    result.push(sanitized);
    if (result.length >= 3) break;
  }
  return result;
}

/**
 * Loads selection from storage (e.g. sessionStorage).
 * Never crashes on corrupt JSON, wrong types, or missing data.
 * @param {Storage|null} storage
 * @returns {Array<{ _id: string, name: string, image: string, price: number }>}
 */
export function loadSelection(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return validateSelection(parsed);
  } catch {
    return [];
  }
}

/**
 * Saves selection to storage after validating and capping at 3.
 * @param {Array<any>} items
 * @param {Storage|null} storage
 * @returns {Array<{ _id: string, name: string, image: string, price: number }>}
 */
export function saveSelection(items, storage) {
  const validated = validateSelection(items);
  if (storage) {
    try {
      storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(validated));
    } catch {}
  }
  return validated;
}

/**
 * Toggles a product in the selection:
 * - If already selected: removes it -> { items, added: false, limitReached: false }
 * - If not selected and count >= 3: returns { items, added: false, limitReached: true }
 * - If not selected and count < 3: adds it -> { items, added: true, limitReached: false }
 * @param {Array<any>} items
 * @param {any} product
 * @returns {{ items: Array<any>, added: boolean, limitReached: boolean }}
 */
export function toggleItem(items, product) {
  const sanitized = sanitizeProduct(product);
  const current = validateSelection(items);
  if (!sanitized) {
    return { items: current, added: false, limitReached: false };
  }
  const exists = current.some(it => it._id === sanitized._id);
  if (exists) {
    return {
      items: current.filter(it => it._id !== sanitized._id),
      added: false,
      limitReached: false
    };
  }
  if (current.length >= 3) {
    return {
      items: current,
      added: false,
      limitReached: true
    };
  }
  return {
    items: [...current, sanitized],
    added: true,
    limitReached: false
  };
}

/**
 * Removes an item by ID from the selection.
 * @param {Array<any>} items
 * @param {string} id
 * @returns {Array<any>}
 */
export function removeItem(items, id) {
  if (!id) return validateSelection(items);
  const targetId = String(id).trim().toLowerCase();
  return validateSelection(items).filter(it => it._id !== targetId);
}

/**
 * Clears the selection.
 * @returns {Array<any>}
 */
export function clearItems() {
  return [];
}

/**
 * Checks whether an item ID is in the selection.
 * @param {Array<any>} items
 * @param {string} id
 * @returns {boolean}
 */
export function hasItem(items, id) {
  if (!id || !Array.isArray(items)) return false;
  const targetId = String(id).trim().toLowerCase();
  return items.some(it => it && it._id === targetId);
}

/**
 * Parses and validates compare product IDs from a query string, URLSearchParams, or comma-separated string.
 * Validates client-side:
 * - 24-character hexadecimal ObjectIds (case-insensitive, normalized to lowercase)
 * - Unique (dedupes preserving order)
 * - Exactly 2 to 3 IDs
 * Returns an array of lowercase valid IDs if valid, or null if missing, invalid, fewer than 2, or more than 3.
 *
 * @param {string|URLSearchParams|null|undefined} input
 * @returns {Array<string>|null}
 */
export function parseCompareIds(input) {
  if (!input) return null;

  let raw = '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('?') || trimmed.includes('ids=')) {
      try {
        const search = trimmed.startsWith('?') ? trimmed : `?${trimmed}`;
        const params = new URLSearchParams(search);
        raw = params.get('ids') || '';
      } catch {
        raw = trimmed;
      }
    } else {
      raw = trimmed;
    }
  } else if (typeof input === 'object' && typeof input.get === 'function') {
    raw = input.get('ids') || '';
  }

  if (!raw || typeof raw !== 'string') return null;

  const parts = raw.split(',').map(s => s.trim());
  if (parts.length === 0) return null;

  const validIds = [];
  const seen = new Set();

  for (const part of parts) {
    if (!isValidId(part)) {
      // Any junk, malformed ID or non-hex string invalidates the query
      return null;
    }
    const normalized = part.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      validIds.push(normalized);
    }
  }

  // Must have 2 or 3 unique IDs
  if (validIds.length < 2 || validIds.length > 3) {
    return null;
  }

  return validIds;
}

/**
 * Route visibility check for the Compare Tray:
 * Shown when count >= 1 and NOT on routes starting with:
 * /admin, /seller, /checkout, /cart, /login, /register, /order, /compare
 *
 * @param {string} pathname
 * @param {number} count
 * @returns {boolean}
 */
export function shouldShowTray(pathname, count) {
  if (!pathname || typeof pathname !== 'string') return false;
  if (!count || count < 1) return false;

  const hiddenPrefixes = [
    '/admin',
    '/seller',
    '/checkout',
    '/cart',
    '/login',
    '/register',
    '/order',
    '/compare'
  ];

  return !hiddenPrefixes.some(prefix => pathname.startsWith(prefix));
}
