'use strict';

const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Category = require('../models/Category');

// ---------------------------------------------------------------------------
// Keyword heuristics for RAG routing
// ---------------------------------------------------------------------------

const PRODUCT_KEYWORDS = [
  'product', 'item', 'buy', 'purchase', 'price', 'cost', 'cheap', 'expensive',
  'stock', 'available', 'availability', 'category', 'show', 'find', 'search',
  'recommend', 'suggestion', 'deal', 'offer', 'discount', 'sale', 'brand',
  'colour', 'color', 'size', 'model', 'laptop', 'phone', 'shirt', 'shoe',
  'book', 'watch', 'bag', 'furniture', 'electronic', 'gadget', 'appliance',
  // price-constraint phrasings that may appear without other product keywords
  'under', 'below', 'above', 'between', 'cheaper', 'affordable', 'budget',
  'inexpensive', 'least expensive', 'lowest price', 'cheapest', 'options',
  'less than', 'more than', 'greater than', 'at least',
  'rupees', 'rs', 'around', 'about', 'roughly', 'near',
  // chip-specific trigger words to ensure searchProducts is always called
  'in stock', 'on sale', 'similar', 'compare', 'popular', 'browse', 'trending',
  'most popular', 'filter by', 'browse all', 'cheaper option', 'cart'
];

const ORDER_KEYWORDS = [
  'order', 'orders', 'my order', 'status', 'track', 'tracking', 'where is',
  'delivery', 'deliver', 'delivered', 'shipped', 'shipping', 'dispatch',
  'dispatched', 'package', 'parcel', 'return', 'refund', 'cancel', 'cancelled'
];

const CART_KEYWORDS = [
  'cart', 'basket', 'checkout', 'my cart', 'shopping cart', 'what\'s in my cart', 'view cart', 'show cart'
];

// Keywords that signal the user wants catalog-level facts (product count, categories, what's available)
const CATALOG_KEYWORDS = [
  'how many products', 'how many items', 'total products', 'product count',
  'catalog', 'catalogue', 'what categories', 'which categories', 'list categories',
  'what do you sell', 'what do you have', 'what\'s available', 'what is available',
  'what can i buy', 'what do you carry', 'types of products', 'range of products',
  'what\'s in your store', 'what is in your store', 'your store', 'your shop',
  'overview', 'store overview', 'full catalog', 'entire catalog'
];

const lowerIncludes = (text, keywords) =>
  keywords.some(kw => text.toLowerCase().includes(kw));

// ---------------------------------------------------------------------------
// RAG helpers
// ---------------------------------------------------------------------------

/**
 * Parses price constraints from a natural-language message.
 *
 * Supported phrasings (with optional ₹ and commas in numbers):
 *   under/below/less than/cheaper than X  → { $lte: X }
 *   over/above/more than/at least X       → { $gte: X }
 *   between X and Y                       → { $gte: X, $lte: Y }
 *   around/about/roughly/near X           → { $gte: X * 0.8, $lte: X * 1.2 }
 *   for/at X                              → { $gte: X * 0.8, $lte: X * 1.2 }
 *   bare number (e.g. 1000 rupees)        → { $gte: X * 0.8, $lte: X * 1.2 }
 *
 * Returns a MongoDB price query object, or null if no constraint is found.
 */
function parsePriceConstraints(message) {
  const hasRupeeSymbol = /₹/.test(message);
  // Normalise: replace ₹ with Rs, strip commas in numbers so "₹1,000" / "Rs 1,000" → "1000"
  const normalized = message.replace(/₹/g, ' Rs ').replace(/,/g, '');

  // 1. between X and Y
  const betweenMatch = normalized.match(
    /between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i
  );
  if (betweenMatch) {
    const lo = parseFloat(betweenMatch[1]);
    const hi = parseFloat(betweenMatch[2]);
    return { $gte: Math.min(lo, hi), $lte: Math.max(lo, hi) };
  }

  // 2. under / below / less than / cheaper than / no more than X
  const lteMatch = normalized.match(
    /(?:under|below|less\s+than|cheaper\s+than|no\s+more\s+than|within)\s+(\d+(?:\.\d+)?)/i
  );
  if (lteMatch) {
    return { $lte: parseFloat(lteMatch[1]) };
  }

  // 3. over / above / more than / at least / greater than X
  const gteMatch = normalized.match(
    /(?:over|above|more\s+than|at\s+least|greater\s+than)\s+(\d+(?:\.\d+)?)/i
  );
  if (gteMatch) {
    return { $gte: parseFloat(gteMatch[1]) };
  }

  // Price context check
  const priceContextRegex = /rs\b|rupees?\b|price|cost|budget|cheap|expensive|affordable/i;
  const hasPriceContext = priceContextRegex.test(normalized) ||
    /\b\d+(?:\.\d+)?\s*(?:product|item)s?\b/i.test(normalized) ||
    hasRupeeSymbol;

  // 4. around / about / roughly / near X
  const approxMatch = normalized.match(
    /(?:around|about|roughly|near)\s+(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i
  );
  if (approxMatch) {
    const val = parseFloat(approxMatch[1]);
    return { $gte: val * 0.8, $lte: val * 1.2 };
  }

  // 5. for / at X
  const forAtMatch = normalized.match(
    /(?:\bfor|\bat)\s+(?:rs\.?\s*)?(\d+(?:\.\d+)?)\b/i
  );
  if (forAtMatch) {
    const val = parseFloat(forAtMatch[1]);
    const index = forAtMatch.index;
    const afterText = normalized.slice(index + forAtMatch[0].length).trim();
    const isTimeUnit = /^(?:days?|weeks?|months?|years?|hours?|mins?|minutes?|seconds?)/i.test(afterText);
    if (!isTimeUnit && (hasPriceContext || val >= 100)) {
      return { $gte: val * 0.8, $lte: val * 1.2 };
    }
  }

  // 6. Bare/implicit price mentions (approximate range)
  const numberMatches = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)];
  for (const match of numberMatches) {
    const val = parseFloat(match[1]);
    const index = match.index;

    const beforeText = normalized.slice(0, index).trim();
    const afterText = normalized.slice(index + match[0].length).trim();

    const isPrecededByRs = /rs\.?\s*$/i.test(beforeText);
    const isFollowedByRupeesOrProducts = /^(?:rupees?|rs\b|products?|items?)/i.test(afterText);
    const isFollowedByTimeUnit = /^(?:days?|weeks?|months?|years?|hours?|mins?|minutes?|seconds?)/i.test(afterText);

    if (isFollowedByTimeUnit) continue;

    if (isPrecededByRs || isFollowedByRupeesOrProducts || hasPriceContext) {
      return { $gte: val * 0.8, $lte: val * 1.2 };
    }
  }

  return null;
}

/**
 * Searches products using keyword regex matching and/or a price constraint.
 *
 * - If a price constraint is detected it is applied as a MongoDB numeric
 *   condition on the `price` field.
 * - If text keywords are also present they are OR-ed together and combined
 *   with the price filter via $and.
 * - If only a price constraint exists (no usable keywords) the price filter
 *   is used alone so purely price-based queries still return results.
 */
async function searchProducts(message, conversationHistory) {
  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'any',
    'has', 'was', 'had', 'will', 'would', 'could', 'should', 'that', 'this',
    'with', 'from', 'have', 'been', 'what', 'some', 'which', 'when', 'how',
    'its', 'your', 'our', 'their', 'his', 'her', 'about', 'find', 'show',
    'tell', 'give', 'looking', 'look', 'does', 'need', 'want', 'like', 'just',
    'under', 'below', 'above', 'between', 'cheaper', 'cheap', 'options',
    'items', 'products', 'affordable', 'budget', 'price', 'cost',
    'anything', 'something', 'buy', 'get', 'see', 'less', 'than', 'more',
    'over', 'within', 'range', 'priced', 'cheapest', 'least',
    'stuff', 'around', 'about', 'roughly', 'near', 'rupees', 'rs', 'for', 'at',
    'me', 'i', 'want',
    // Conversational / UI meta words — not product keywords
    'link', 'links', 'list', 'please', 'send', 'share', 'provide',
    'here', 'there', 'also', 'too', 'now', 'only', 'just', 'even', 'very',
    'good', 'nice', 'great', 'top', 'best', 'every', 'each', 'those', 'them',
    'they', 'these', 'make', 'made', 'type', 'kind', 'sort', 'way', 'any',
    'many', 'much', 'most', 'such', 'into', 'onto', 'back', 'both', 'more',
    'take', 'have', 'help', 'info', 'give'
  ]);


  // Use [''\u2019] to match both straight (') and curly/smart (\u2019) apostrophes
  const isStockQuery = /(?:in\s+stock|available|availability|what[''\u2019]s\s+in\s+stock|what\s+is\s+in\s+stock|anything\s+in\s+stock|what[''\u2019]s\s+available|items\s+in\s+stock)/i.test(message);
  const isSaleQuery = /(?:on\s+sale|deals?|offers?|discounts?|discounted|what[''\u2019]s\s+on\s+sale|what\s+is\s+on\s+sale|any\s+sales)/i.test(message);
  const isSimilarQuery = /(?:similar|related|like\s+this|like\s+these|alternatives?|show\s+similar)/i.test(message);
  const isCheaperQuery = /(?:cheaper|cheapest|less\s+expensive|lower\s+price|lowest\s+price|cheap\s+option|cheaper\s+options|budget\s+options|show\s+cheaper)/i.test(message);
  const isCategoryQuery = /(?:filter\s+by\s+category|show\s+categories|list\s+categories|categories|category\s+list)/i.test(message);
  const isPopularQuery = /(?:popular|best\s+seller|best\s+sellers|top\s+rated|highest\s+rated|most\s+popular|trending|what[''\u2019]s\s+most\s+popular)/i.test(message);
  const isCompareQuery = /(?:compare|comparison|price\s+comparison|compare\s+prices)/i.test(message);
  const isBrowseAllQuery = /(?:browse\s+all(?:\s+products)?|show\s+all\s+products|view\s+all\s+products|list\s+all\s+products|all\s+products)/i.test(message);
  const isCartQuery = /(?:cart|basket|my\s+cart|shopping\s+cart|view\s+cart|show\s+cart|what[''\u2019]s\s+in\s+my\s+cart)/i.test(message);

  // Helper to retrieve category IDs and keywords from history (last 1-2 turns)
  const getHistoryContext = async () => {
    let matchedCategoryIds = [];
    let recentTerms = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recentTurns = conversationHistory.slice(-2);
      const recentTexts = recentTurns.map(m => m.content.toLowerCase()).join(' ');

      const categories = await Category.find().lean();
      for (const cat of categories) {
        const catNameLower = cat.name.toLowerCase();
        const slugLower = cat.slug.toLowerCase();
        const words = catNameLower.split(/[\s&]+/);
        const isMatch = words.some(w => w.length >= 4 && recentTexts.includes(w)) || recentTexts.includes(slugLower);
        if (isMatch) {
          matchedCategoryIds.push(cat._id);
        }
      }

      recentTerms = recentTexts
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w) && w !== 'stock' && w !== 'available' && w !== 'sale' && w !== 'deal' && w !== 'discount');
    }
    return { matchedCategoryIds, recentTerms };
  };

  // 1. Stock Query Path
  if (isStockQuery) {
    let stockQuery = { stock: { $gt: 0 } };
    const { matchedCategoryIds, recentTerms } = await getHistoryContext();
    let hasContext = false;

    if (matchedCategoryIds.length > 0 && recentTerms.length > 0) {
      const regexConditions = recentTerms.flatMap(term => [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]);
      stockQuery = {
        $and: [
          { stock: { $gt: 0 } },
          { category: { $in: matchedCategoryIds } },
          { $or: regexConditions }
        ]
      };
      hasContext = true;
    } else if (matchedCategoryIds.length > 0) {
      stockQuery = { stock: { $gt: 0 }, category: { $in: matchedCategoryIds } };
      hasContext = true;
    } else if (recentTerms.length > 0) {
      const regexConditions = recentTerms.flatMap(term => [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]);
      stockQuery = {
        $and: [
          { stock: { $gt: 0 } },
          { $or: regexConditions }
        ]
      };
      hasContext = true;
    }

    let products = [];
    if (hasContext) {
      products = await Product.find(stockQuery)
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ ratingsAvg: -1 })
        .limit(5)
        .lean();
    }

    if (products.length === 0) {
      products = await Product.find({ stock: { $gt: 0 } })
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ ratingsAvg: -1 })
        .limit(5)
        .lean();
    }
    return products;
  }

  // 2. Sale Query Path
  if (isSaleQuery) {
    let saleQuery = { discountPercent: { $gt: 0 } };
    const { matchedCategoryIds, recentTerms } = await getHistoryContext();
    let hasContext = false;

    if (matchedCategoryIds.length > 0 && recentTerms.length > 0) {
      const regexConditions = recentTerms.flatMap(term => [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]);
      saleQuery = {
        $and: [
          { discountPercent: { $gt: 0 } },
          { category: { $in: matchedCategoryIds } },
          { $or: regexConditions }
        ]
      };
      hasContext = true;
    } else if (matchedCategoryIds.length > 0) {
      saleQuery = { discountPercent: { $gt: 0 }, category: { $in: matchedCategoryIds } };
      hasContext = true;
    } else if (recentTerms.length > 0) {
      const regexConditions = recentTerms.flatMap(term => [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]);
      saleQuery = {
        $and: [
          { discountPercent: { $gt: 0 } },
          { $or: regexConditions }
        ]
      };
      hasContext = true;
    }

    let products = [];
    if (hasContext) {
      products = await Product.find(saleQuery)
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ discountPercent: -1, ratingsAvg: -1 })
        .limit(5)
        .lean();
    }

    if (products.length === 0) {
      products = await Product.find({ discountPercent: { $gt: 0 } })
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ discountPercent: -1, ratingsAvg: -1 })
        .limit(5)
        .lean();
    }
    return products;
  }

  // 3. Similar Products Query Path
  if (isSimilarQuery) {
    let productIds = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recentTurns = conversationHistory.slice(-4);
      const atcRe = /\/product\/([a-f0-9]{24})/g;
      for (const turn of recentTurns) {
        let match;
        while ((match = atcRe.exec(turn.content)) !== null) {
          productIds.push(match[1]);
        }
      }
    }
    productIds = [...new Set(productIds)];

    let products = [];
    if (productIds.length > 0) {
      const refProduct = await Product.findById(productIds[0]).lean();
      if (refProduct) {
        products = await Product.find({
          category: refProduct.category,
          _id: { $ne: refProduct._id },
          stock: { $gt: 0 }
        })
          .populate('category', 'name')
          .select('name description price stock ratingsAvg category discountPercent')
          .limit(5)
          .lean();
      }
    }

    if (products.length === 0) {
      const { matchedCategoryIds } = await getHistoryContext();
      if (matchedCategoryIds.length > 0) {
        products = await Product.find({ category: { $in: matchedCategoryIds }, stock: { $gt: 0 } })
          .populate('category', 'name')
          .select('name description price stock ratingsAvg category discountPercent')
          .limit(5)
          .lean();
      }
    }

    if (products.length === 0) {
      products = await Product.find({ stock: { $gt: 0 } })
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ ratingsAvg: -1 })
        .limit(5)
        .lean();
    }
    return products;
  }

  // 4. Cheaper Options Query Path
  if (isCheaperQuery) {
    let productIds = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recentTurns = conversationHistory.slice(-4);
      const atcRe = /\/product\/([a-f0-9]{24})/g;
      for (const turn of recentTurns) {
        let match;
        while ((match = atcRe.exec(turn.content)) !== null) {
          productIds.push(match[1]);
        }
      }
    }
    productIds = [...new Set(productIds)];

    let products = [];
    if (productIds.length > 0) {
      const refProduct = await Product.findById(productIds[0]).lean();
      if (refProduct) {
        products = await Product.find({
          category: refProduct.category,
          price: { $lt: refProduct.price },
          stock: { $gt: 0 }
        })
          .populate('category', 'name')
          .select('name description price stock ratingsAvg category discountPercent')
          .sort({ price: 1 })
          .limit(5)
          .lean();
        
        if (products.length === 0) {
          products = await Product.find({
            category: refProduct.category,
            _id: { $ne: refProduct._id },
            stock: { $gt: 0 }
          })
            .populate('category', 'name')
            .select('name description price stock ratingsAvg category discountPercent')
            .sort({ price: 1 })
            .limit(5)
            .lean();
        }
      }
    }

    if (products.length === 0) {
      products = await Product.find({ stock: { $gt: 0 } })
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ price: 1 })
        .limit(5)
        .lean();
    }
    return products;
  }

  // 5. Category List Query Path
  if (isCategoryQuery) {
    const categories = await Category.find().lean();
    const products = [];
    for (const cat of categories) {
      const prod = await Product.findOne({ category: cat._id, stock: { $gt: 0 } })
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .sort({ ratingsAvg: -1 })
        .lean();
      if (prod) {
        products.push(prod);
      }
    }
    return products;
  }

  // 6. Popular Query Path
  if (isPopularQuery) {
    let popQuery = { stock: { $gt: 0 } };
    const { matchedCategoryIds } = await getHistoryContext();
    if (matchedCategoryIds.length > 0) {
      popQuery.category = { $in: matchedCategoryIds };
    }

    const products = await Product.find(popQuery)
      .populate('category', 'name')
      .select('name description price stock ratingsAvg category discountPercent')
      .sort({ ratingsAvg: -1 })
      .limit(5)
      .lean();
    return products;
  }

  // 7. Compare Query Path
  if (isCompareQuery) {
    let productIds = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recentTurns = conversationHistory.slice(-4);
      const atcRe = /\/product\/([a-f0-9]{24})/g;
      for (const turn of recentTurns) {
        let match;
        while ((match = atcRe.exec(turn.content)) !== null) {
          productIds.push(match[1]);
        }
      }
    }
    productIds = [...new Set(productIds)];

    let products = [];
    if (productIds.length > 0) {
      products = await Product.find({ _id: { $in: productIds } })
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .lean();
    }

    if (products.length < 2) {
      let categoryId = null;
      if (products.length > 0) {
        categoryId = products[0].category?._id;
      } else {
        const { matchedCategoryIds } = await getHistoryContext();
        if (matchedCategoryIds.length > 0) {
          categoryId = matchedCategoryIds[0];
        }
      }

      const extraQuery = { stock: { $gt: 0 } };
      if (categoryId) {
        extraQuery.category = categoryId;
      }
      if (products.length > 0) {
        extraQuery._id = { $ne: products[0]._id };
      }

      const extraProducts = await Product.find(extraQuery)
        .populate('category', 'name')
        .select('name description price stock ratingsAvg category discountPercent')
        .limit(5 - products.length)
        .lean();
      
      products = [...products, ...extraProducts];
    }
    return products;
  }

  // 8. Browse All Query Path
  if (isBrowseAllQuery) {
    const products = await Product.find({ stock: { $gt: 0 } })
      .populate('category', 'name')
      .select('name description price stock ratingsAvg category discountPercent')
      .sort({ ratingsAvg: -1 })
      .limit(6)
      .lean();
    return products;
  }

  // 9. Cart Query Path — when searchProducts is called for a cart message (e.g. as a guest),
  //    return popular in-stock items so Rex has something useful to work with.
  if (isCartQuery) {
    const products = await Product.find({ stock: { $gt: 0 } })
      .populate('category', 'name')
      .select('name description price stock ratingsAvg category discountPercent')
      .sort({ ratingsAvg: -1 })
      .limit(5)
      .lean();
    return products;
  }

  // --- Price constraint (numeric MongoDB filter) ---
  const priceFilter = parsePriceConstraints(message);

  // --- Keyword terms (text regex filter) ---
  const terms = message
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 4);

  // Build the final MongoDB query
  let query = {};
  const hasPriceFilter = priceFilter !== null;
  const hasKeywords = terms.length > 0;

  if (hasPriceFilter && hasKeywords) {
    const regexConditions = terms.flatMap(term => [
      { name: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } }
    ]);
    query = { $and: [{ $or: regexConditions }, { price: priceFilter }] };
  } else if (hasPriceFilter) {
    query = { price: priceFilter };
  } else if (hasKeywords) {
    const regexConditions = terms.flatMap(term => [
      { name: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } }
    ]);
    query = { $or: regexConditions };
  } else {
    // No usable keywords or price filter — return popular in-stock items as a safe fallback
    // so Rex always has context rather than a completely empty product list.
    return Product.find({ stock: { $gt: 0 } })
      .populate('category', 'name')
      .select('name description price stock ratingsAvg category discountPercent')
      .sort({ ratingsAvg: -1 })
      .limit(5)
      .lean();
  }

  const products = await Product.find(query)
    .populate('category', 'name')
    .select('name description price stock ratingsAvg category discountPercent')
    .limit(5)
    .lean();

  return products;
}

async function fetchUserOrders(userId) {
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('orderStatus paymentStatus totalAmount items createdAt')
    .lean();
  return orders;
}

async function fetchUserCart(userId) {
  const cart = await Cart.findOne({ user: userId })
    .populate('items.product')
    .lean();
  return cart;
}

/**
 * Fetches live catalog statistics: total product count and all category names.
 * Called unconditionally on every chat request so Rex always knows the real numbers.
 */
async function fetchCatalogStats() {
  const [totalProducts, categories] = await Promise.all([
    Product.countDocuments(),
    Category.find().select('name').sort('name').lean()
  ]);
  return {
    totalProducts,
    categoryNames: categories.map(c => c.name)
  };
}

// ---------------------------------------------------------------------------
// Context block formatters
// ---------------------------------------------------------------------------

function formatProductContext(products) {
  if (!products.length) return 'No matching products found in the store.';
  return products
    .map(
      p => {
        const stockLabel = p.stock > 0
          ? `✓ In Stock (${p.stock} units)`
          : '⚠️ OUT OF STOCK — do not recommend as available';

        let priceStr = `Price: ₹${p.price.toFixed(2)}`;
        if (p.discountPercent && p.discountPercent > 0) {
          const originalPrice = p.price / (1 - p.discountPercent / 100);
          priceStr = `Price: ₹${p.price.toFixed(2)} (${p.discountPercent}% OFF - Original Price: ₹${originalPrice.toFixed(2)})`;
        }

        return (
          `• ${p.name} | ID: ${p._id} | Category: ${p.category?.name || 'N/A'} | ` +
          `${priceStr} | AVAILABILITY: ${stockLabel} | ` +
          `Rating: ${p.ratingsAvg.toFixed(1)}/5`
        );
      }
    )
    .join('\n');
}

function formatOrderContext(orders) {
  if (!orders.length) return 'No recent orders found for this user.';
  return orders
    .map((o, i) => {
      const itemSummary = o.items
        .slice(0, 3)
        .map(it => `${it.name} ×${it.quantity}`)
        .join(', ');
      const date = new Date(o.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      return (
        `Order ${i + 1}: Placed on ${date} | ` +
        `Status: ${o.orderStatus} | Payment: ${o.paymentStatus} | ` +
        `Total: ₹${o.totalAmount.toFixed(2)} | Items: ${itemSummary}`
      );
    })
    .join('\n');
}

function formatCartContext(cart) {
  if (!cart || !cart.items || cart.items.length === 0) {
    return 'Your shopping cart is currently empty.';
  }
  const itemsText = cart.items
    .filter(item => item.product)
    .map((item, i) => {
      const p = item.product;
      return `• ${p.name} | ID: ${p._id} | Price: ₹${p.price.toFixed(2)} | Quantity: ${item.quantity} | Total: ₹${(p.price * item.quantity).toFixed(2)}`;
    })
    .join('\n');
  
  const grandTotal = cart.items
    .filter(item => item.product)
    .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  return `USER'S SHOPPING CART ITEMS:\n${itemsText}\nCart Grand Total: ₹${grandTotal.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemInstruction(productContext, orderContext, cartContext, isAuthenticated, catalogStats) {
  // Build a live catalog summary line from DB-queried stats (never hardcoded)
  const catalogLine = catalogStats
    ? `The Cartex store currently stocks **${catalogStats.totalProducts} products** across **${catalogStats.categoryNames.length} categories**: ${catalogStats.categoryNames.join(', ')}.`
    : 'The Cartex store carries a wide range of products across multiple categories.';

  return `You are Rex, a friendly and knowledgeable AI shopping assistant for Cartex — a premium online store.
Your role is to help customers discover products, check prices and availability, track orders, view their shopping cart, and answer general shopping questions.

CATALOG OVERVIEW (live data — always use these exact numbers when answering catalog questions):
${catalogLine}

GUIDELINES:
- Be concise, warm, and helpful. Keep replies brief unless detail is genuinely useful.
- ONLY reference products, orders, and cart items from the CONTEXT DATA provided below. Never fabricate prices, stock levels, product names, order statuses, or cart contents.
- CATALOG FACTS: When asked "how many products do you have", "what categories do you sell", or similar catalog-overview questions, answer using the CATALOG OVERVIEW numbers above — they are queried live from the database and are always current.
- If the user asks about something not in the context, say you don't have that information and suggest they browse /shop or contact support.
- For product discovery, you can suggest the user browse /shop for full listings.
- For order tracking, direct users to /order-tracking for detailed tracking.
- Do not discuss competitors or unrelated topics.
- Format prices in Indian Rupees (₹).
- PRODUCT LINKS: Whenever you mention a product by name, always format it as a markdown link using its ID from the context, like this: [Product Name](/product/PRODUCT_ID). Use the exact ID from the context. Never write product names as plain text.
- STOCK RULE: NEVER recommend or suggest a product marked "⚠️ OUT OF STOCK" as if it were available for purchase. If an out-of-stock product is the only match, acknowledge it exists but is currently unavailable and offer to help find in-stock alternatives. Only proactively recommend products marked "✓ In Stock".
- SALE RULE: If ANY product in the PRODUCTS section of the context data contains "% OFF" in its price line, that product IS currently on sale. You MUST list those products when the user asks about sales, deals, or discounts. Never say there are no sale items if the context contains products with "% OFF". For each sale product, clearly state the discount percentage, the current sale price, and the original price.
- ADD-TO-CART: When a user clearly expresses intent to purchase or add a SPECIFIC in-stock product (e.g. "add that to cart", "I'll take it", "buy this one"), confirm which product you are acting on, then append this exact tag on its own line at the very end of your reply: <!--ATC:PRODUCT_ID--> replacing PRODUCT_ID with the product's ID from the context. Only include this tag for ONE specific in-stock product. Never include it for out-of-stock products. If the user's intent is ambiguous (multiple products), ask which one they mean instead of guessing.
- PRICES & DISCOUNTS: If a product in the context has a discount (e.g. "15% OFF"), mention the discount percentage, the current sale price, and original price clearly to highlight the deal.
${!isAuthenticated ? '- GUEST USER: This user is not logged in. If they ask about orders or their cart, politely inform them they need to log in to view that information. If they express cart/purchase intent, let them know they can browse and add to cart after logging in.' : ''}

--- CONTEXT DATA START ---

PRODUCTS (relevant matches from store):
${productContext}

${isAuthenticated ? `USER'S RECENT ORDERS:\n${orderContext}` : '(User is not logged in — order data unavailable)'}

${isAuthenticated ? `USER'S SHOPPING CART:\n${cartContext}` : '(User is not logged in — cart data unavailable)'}

--- CONTEXT DATA END ---

Answer the user's question using only the above context and the CATALOG OVERVIEW. If no relevant context exists, say so honestly.`;
}

// ---------------------------------------------------------------------------
// Map frontend history format → Gemini REST history format
// History roles: frontend uses 'user'/'assistant'; Gemini uses 'user'/'model'
// ---------------------------------------------------------------------------
function mapHistory(conversationHistory) {
  return (conversationHistory || [])
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const handleChat = async (req, res) => {
  const { message, conversationHistory } = req.body;

  // --- Input validation ---
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  const trimmedMessage = message.trim().slice(0, 1000); // hard cap
  const isAuthenticated = !!req.user;

  // --- RAG: parallel retrieval (catalog stats always fetched for accurate count/category answers) ---
  let productContext = 'Not searched (message not product-related).';
  let orderContext = isAuthenticated
    ? 'Not searched (message not order-related).'
    : '(User not logged in)';
  let cartContext = isAuthenticated
    ? 'Not searched (message not cart-related).'
    : '(User not logged in)';

  const [productHits, orderHits, cartHits, catalogStats] = await Promise.all([
    lowerIncludes(trimmedMessage, PRODUCT_KEYWORDS)
      ? searchProducts(trimmedMessage, conversationHistory)
      : Promise.resolve(null),
    lowerIncludes(trimmedMessage, ORDER_KEYWORDS) && isAuthenticated
      ? fetchUserOrders(req.user._id)
      : Promise.resolve(null),
    lowerIncludes(trimmedMessage, CART_KEYWORDS) && isAuthenticated
      ? fetchUserCart(req.user._id)
      : Promise.resolve(null),
    // Always fetch live catalog stats so Rex knows the real product count and categories
    fetchCatalogStats()
  ]);

  if (productHits !== null) {
    productContext = formatProductContext(productHits);

    const isSaleMsg = /(?:on\s+sale|deals?|offers?|discounts?|discounted|what['\u2019]s\s+on\s+sale|what\s+is\s+on\s+sale|any\s+sales)/i.test(trimmedMessage);
    if (isSaleMsg && productHits.some(p => p.discountPercent > 0)) {
      productContext = `⚠️ THE FOLLOWING PRODUCTS ARE CURRENTLY ON SALE WITH ACTIVE DISCOUNTS:\n\n${productContext}`;
    }
  }
  if (orderHits !== null) {
    orderContext = formatOrderContext(orderHits);
  }
  if (cartHits !== null) {
    cartContext = formatCartContext(cartHits);
  }

  // --- Build system instruction (passes live catalog stats) ---
  const systemInstruction = buildSystemInstruction(productContext, orderContext, cartContext, isAuthenticated, catalogStats);

  // --- SSE headers: set before any await that could fail ---
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if proxied
  res.flushHeaders();

  // Helper to write an SSE frame
  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // --- Build request to Gemini's REST streaming endpoint directly ---
    // (bypasses @google/genai SDK, which has a bug causing
    // ACCESS_TOKEN_TYPE_UNSUPPORTED errors on streamGenerateContent
    // even with a valid API key)
    const history = mapHistory((conversationHistory || []).slice(-8));
    // Message stuffing: for structured queries (sale, stock, popular, etc.) append the
    // retrieved DB data inline in the user message. Lite LLMs ground far more reliably
    // in the message being responded to than in system instructions or history.
    let stuffedMessage = trimmedMessage;

    // --- Catalog-count / category-overview message stuffing ---
    // Inject live DB stats directly into the user turn for maximum grounding reliability.
    const msgLowerCatalog = trimmedMessage.toLowerCase();
    const isCatalogCountQuery = /how\s+many\s+(?:products?|items?)/.test(msgLowerCatalog) ||
      /(?:total|number\s+of)\s+(?:products?|items?)/.test(msgLowerCatalog) ||
      /(?:product|item)\s+count/.test(msgLowerCatalog) ||
      /(?:catalog|catalogue)/.test(msgLowerCatalog);
    const isCategoryListQuery = /(?:what|which|list|show|tell)\s+.*categor/.test(msgLowerCatalog) ||
      /categor(?:ies|y)\s+(?:do\s+you|you\s+have|available|sell|carry)/.test(msgLowerCatalog) ||
      /what\s+(?:do\s+you\s+(?:sell|have|carry|offer)|(?:types?|kinds?)\s+of)/.test(msgLowerCatalog) ||
      /(?:store|shop)\s+overview/.test(msgLowerCatalog) ||
      lowerIncludes(trimmedMessage, CATALOG_KEYWORDS);

    if (catalogStats && (isCatalogCountQuery || isCategoryListQuery)) {
      const catList = catalogStats.categoryNames.join(', ');
      stuffedMessage =
        trimmedMessage +
        `\n\n[LIVE CATALOG DATA — queried from database right now]\n` +
        `Total products in store: ${catalogStats.totalProducts}\n` +
        `Number of categories: ${catalogStats.categoryNames.length}\n` +
        `Categories: ${catList}\n` +
        `[Answer using ONLY these exact numbers. Do not guess or use any other figures.]`;
    }

    if (productHits !== null && productHits.length > 0) {
      const msgLower = trimmedMessage.toLowerCase();
      const isSaleMsg = /(?:on\s+sale|deals?|offers?|discounts?|discounted)/.test(msgLower);
      const isStockMsg = /(?:in\s+stock|available)/.test(msgLower) && !isSaleMsg;
      const isPopularMsg = /(?:popular|trending|top.rated|best.seller)/.test(msgLower);
      const isBrowseMsg = /(?:browse|show\s+all|all\s+products)/.test(msgLower);
      const isCategoryMsg = /(?:categor)/.test(msgLower);
      const isSimilarMsg = /(?:similar|related|alternatives?)/.test(msgLower);
      const isCheaperMsg = /(?:cheaper|cheapest|lower\s+price|budget)/.test(msgLower);
      const isCompareMsg = /(?:compare|comparison)/.test(msgLower);

      let annotation = '';

      if (isSaleMsg) {
        const sp = productHits.filter(p => p.discountPercent > 0);
        if (sp.length > 0) {
          annotation = `\n\n[STORE DATA — ${sp.length} products currently on sale]\n` +
            sp.map(p => {
              const orig = (p.price / (1 - p.discountPercent / 100)).toFixed(2);
              return `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} — ${p.discountPercent}% OFF (was ₹${orig}) | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`;
            }).join('\n') +
            '\n[Use this data to answer. These ARE the sale items. Do not say there are none.]';
        }
      } else if (isStockMsg) {
        annotation = `\n\n[STORE DATA — in-stock products]\n` +
          productHits.filter(p => p.stock > 0).map(p =>
            `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} | ${p.stock} units in stock`
          ).join('\n');
      } else if (isPopularMsg || isBrowseMsg) {
        annotation = `\n\n[STORE DATA — available products]\n` +
          productHits.map(p =>
            `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} | Rating: ${p.ratingsAvg?.toFixed(1)}/5 | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`
          ).join('\n');
      } else if (isCategoryMsg) {
        annotation = `\n\n[STORE DATA — one product per category]\n` +
          productHits.map(p =>
            `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} | Category: ${p.category?.name || 'N/A'}`
          ).join('\n');
      } else if (isSimilarMsg) {
        annotation = `\n\n[STORE DATA — similar/related products]\n` +
          productHits.map(p =>
            `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} | Category: ${p.category?.name || 'N/A'} | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`
          ).join('\n');
      } else if (isCheaperMsg) {
        annotation = `\n\n[STORE DATA — budget/cheaper options sorted by price]\n` +
          productHits.map(p =>
            `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`
          ).join('\n');
      } else if (isCompareMsg) {
        annotation = `\n\n[STORE DATA — products to compare]\n` +
          productHits.map(p =>
            `- ${p.name} (ID:${p._id}): ₹${p.price.toFixed(2)} | Rating: ${p.ratingsAvg?.toFixed(1)}/5 | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`
          ).join('\n');
      }

      if (annotation) stuffedMessage = stuffedMessage + annotation;
    }

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: stuffedMessage }] }
    ];

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:streamGenerateContent?alt=sse',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.LLM_API_KEY
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.7
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini API error (${geminiResponse.status}): ${errText}`);
    }

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line for next chunk

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) sendEvent('token', { text });
          } catch (_) {
            // skip malformed/partial JSON lines
          }
        }
      }
    }

    // Signal completion
    sendEvent('done', { text: '' });
    res.end();
  } catch (err) {
    console.error('[Rex/chatController] Gemini error:', err.message || err);
    // Try to send an error event if headers already sent (SSE mode)
    try {
      sendEvent('error', { message: 'Rex encountered an error. Please try again.' });
      res.end();
    } catch (_) {
      // Response may already be closed — nothing we can do
    }
  }
};

// ---------------------------------------------------------------------------
// Add-to-Cart from chat
// POST /api/v1/chat/add-to-cart  (requires protect middleware)
// ---------------------------------------------------------------------------

const handleAddToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required.' });
    }

    const product = await Product.findById(productId).select('name stock price');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (product.stock === 0) {
      return res.status(400).json({
        success: false,
        message: `${product.name} is currently out of stock.`
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + Number(quantity);
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units available. You already have some in your cart.`
        });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        product: productId,
        quantity: Math.min(Number(quantity), product.stock)
      });
    }

    await cart.save();

    return res.json({
      success: true,
      productName: product.name,
      message: `${product.name} added to your cart!`
    });
  } catch (err) {
    console.error('[Rex/handleAddToCart]', err.message);
    return res.status(500).json({ success: false, message: 'Could not add to cart. Please try again.' });
  }
};

module.exports = { handleChat, handleAddToCart };