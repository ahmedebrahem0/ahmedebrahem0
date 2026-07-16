import React, { 
  memo, 
  useMemo, 
  useCallback, 
  useState, 
  useEffect, 
  useRef,
  lazy,
  Suspense,
  startTransition
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// ===== MEMOIZED COMPONENTS =====

// Optimized Product Card Component
const ProductCard = memo(({ product, onAddToCart, onToggleFavorite, isInCart, isFavorite }) => {
  // Memoize expensive calculations
  const discountedPrice = useMemo(() => {
    return product.discount 
      ? product.price * (1 - product.discount / 100)
      : product.price;
  }, [product.price, product.discount]);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(discountedPrice);
  }, [discountedPrice]);

  // Memoize event handlers
  const handleAddToCart = useCallback(() => {
    onAddToCart(product.id);
  }, [product.id, onAddToCart]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(product.id);
  }, [product.id, onToggleFavorite]);

  return (
    <div className="product-card border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <OptimizedImage
        src={product.image}
        alt={product.name}
        className="w-full h-48 object-cover rounded-t-lg"
        loading="lazy"
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-blue-600">{formattedPrice}</span>
          {product.discount && (
            <span className="text-sm text-red-500 bg-red-100 px-2 py-1 rounded">
              -{product.discount}%
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isInCart}
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              isInCart 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isInCart ? 'In Cart' : 'Add to Cart'}
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded transition-colors ${
              isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            ♥
          </button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// ===== OPTIMIZED IMAGE COMPONENT =====

const OptimizedImage = memo(({ src, alt, className, sizes = "100vw", ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  // Generate srcSet for responsive images
  const responsiveImages = useMemo(() => {
    const baseSrc = src.replace(/\.[^/.]+$/, "");
    const extension = src.split('.').pop();
    
    return {
      webp: `${baseSrc}.webp`,
      avif: `${baseSrc}.avif`,
      original: src
    };
  }, [src]);

  return (
    <div ref={imgRef} className={`image-container ${className}`}>
      {inView && (
        <picture>
          <source srcSet={responsiveImages.avif} type="image/avif" />
          <source srcSet={responsiveImages.webp} type="image/webp" />
          <img
            src={responsiveImages.original}
            alt={alt}
            className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            sizes={sizes}
            {...props}
          />
        </picture>
      )}
      {!loaded && !error && inView && (
        <div className="animate-pulse bg-gray-200 w-full h-full rounded" />
      )}
      {error && (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
          Failed to load
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ===== VIRTUALIZED PRODUCT LIST =====

const VirtualizedProductList = memo(({ products, onAddToCart, onToggleFavorite, cartItems, favorites }) => {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350, // Estimated height of each product card
    overscan: 5,
  });

  // Memoize cart and favorite lookups
  const cartItemsSet = useMemo(() => new Set(cartItems.map(item => item.id)), [cartItems]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const product = products[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ProductCard
                product={product}
                onAddToCart={onAddToCart}
                onToggleFavorite={onToggleFavorite}
                isInCart={cartItemsSet.has(product.id)}
                isFavorite={favoritesSet.has(product.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedProductList.displayName = 'VirtualizedProductList';

// ===== OPTIMIZED SEARCH COMPONENT =====

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const SearchProducts = memo(({ onSearch, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = React.useTransition();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      startTransition(() => {
        onSearch(debouncedSearchTerm);
      });
    }
  }, [debouncedSearchTerm, onSearch]);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Search products..."
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {(isLoading || isPending) && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
});

SearchProducts.displayName = 'SearchProducts';

// ===== LAZY LOADED MODAL =====

const Modal = lazy(() => import('./Modal'));

const LazyModal = memo(({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <Suspense 
      fallback={
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      }
    >
      <Modal onClose={onClose}>
        {children}
      </Modal>
    </Suspense>
  );
});

LazyModal.displayName = 'LazyModal';

// ===== OPTIMIZED FILTER COMPONENT =====

const ProductFilters = memo(({ filters, onFiltersChange, categories, priceRange }) => {
  const handleCategoryChange = useCallback((category) => {
    onFiltersChange(prev => ({
      ...prev,
      category
    }));
  }, [onFiltersChange]);

  const handlePriceChange = useCallback((field, value) => {
    onFiltersChange(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value
      }
    }));
  }, [onFiltersChange]);

  const handleSortChange = useCallback((sortBy) => {
    onFiltersChange(prev => ({
      ...prev,
      sortBy
    }));
  }, [onFiltersChange]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="font-semibold mb-4">Filters</h3>
      
      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Category</label>
        <select
          value={filters.category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceRange.min}
            onChange={(e) => handlePriceChange('min', e.target.value)}
            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceRange.max}
            onChange={(e) => handlePriceChange('max', e.target.value)}
            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Name</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Rating</option>
          <option value="newest">Newest</option>
        </select>
      </div>
    </div>
  );
});

ProductFilters.displayName = 'ProductFilters';

// ===== MAIN OPTIMIZED E-COMMERCE PAGE =====

const OptimizedECommercePage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: { min: '', max: '' },
    sortBy: 'name',
    search: ''
  });

  // Memoize expensive filtering and sorting operations
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Apply filters
    if (filters.search) {
      result = result.filter(product => 
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.category) {
      result = result.filter(product => product.categoryId === filters.category);
    }

    if (filters.priceRange.min) {
      result = result.filter(product => product.price >= parseFloat(filters.priceRange.min));
    }

    if (filters.priceRange.max) {
      result = result.filter(product => product.price <= parseFloat(filters.priceRange.max));
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, filters]);

  // Memoized event handlers
  const handleAddToCart = useCallback((productId) => {
    const product = products.find(p => p.id === productId);
    if (product && !cartItems.find(item => item.id === productId)) {
      setCartItems(prev => [...prev, product]);
    }
  }, [products, cartItems]);

  const handleToggleFavorite = useCallback((productId) => {
    setFavorites(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const handleSearch = useCallback((searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={[]} // Pass categories from your data
            priceRange={{ min: 0, max: 1000 }}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search */}
          <div className="mb-6">
            <SearchProducts
              onSearch={handleSearch}
              isLoading={loading}
            />
          </div>

          {/* Results Count */}
          <div className="mb-4 text-gray-600">
            {processedProducts.length} products found
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onToggleFavorite={handleToggleFavorite}
                isInCart={cartItems.some(item => item.id === product.id)}
                isFavorite={favorites.includes(product.id)}
              />
            ))}
          </div>

          {/* For very large lists, use virtualization */}
          {/* 
          <VirtualizedProductList
            products={processedProducts}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
            cartItems={cartItems}
            favorites={favorites}
          />
          */}
        </div>
      </div>
    </div>
  );
};

export default OptimizedECommercePage;

// ===== EXPORTS =====

export {
  ProductCard,
  OptimizedImage,
  VirtualizedProductList,
  SearchProducts,
  LazyModal,
  ProductFilters,
  useDebounce
};