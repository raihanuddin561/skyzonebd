// Utility to get category icons based on category name or slug

export const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  // Default icon mappings
  const iconMap: { [key: string]: string } = {
    // Electronics
    'electronics': '📱',
    'phones': '📱',
    'mobile': '📱',
    'computers': '💻',
    'laptops': '💻',
    'tablets': '📱',
    'accessories': '🎧',
    'headphones': '🎧',
    'audio': '🔊',
    
    // Fashion
    'fashion': '👔',
    'clothing': '👕',
    'shoes': '👟',
    'bags': '👜',
    'watches': '⌚',
    'jewelry': '💍',
    'sunglasses': '🕶️',
    
    // Home & Living
    'home': '🏠',
    'furniture': '🛋️',
    'kitchen': '🍳',
    'appliances': '🔌',
    'decor': '🖼️',
    'bedding': '🛏️',
    'lighting': '💡',
    
    // Baby & Kids
    'baby': '👶',
    'kids': '🧸',
    'toys': '🧸',
    'baby items': '👶',
    'baby-items': '👶',
    
    // Sports & Outdoor
    'sports': '⚽',
    'fitness': '🏋️',
    'outdoor': '🏕️',
    'camping': '⛺',
    
    // Beauty & Health
    'beauty': '💄',
    'cosmetics': '💅',
    'skincare': '🧴',
    'health': '💊',
    'wellness': '🧘',
    
    // Food & Grocery
    'food': '🍎',
    'grocery': '🛒',
    'beverages': '🥤',
    'snacks': '🍿',
    
    // Books & Stationery
    'books': '📚',
    'stationery': '📝',
    'office': '📎',
    
    // Automotive
    'automotive': '🚗',
    'car': '🚗',
    'bike': '🏍️',
    'motorcycle': '🏍️',
    
    // Pet Supplies
    'pets': '🐾',
    'pet supplies': '🐾',
    'pet-supplies': '🐾',
    
    // Others
    'gifts': '🎁',
    'other': '📦',
    'miscellaneous': '📦',
  };
  
  // Try exact match first
  if (iconMap[name]) {
    return iconMap[name];
  }
  
  // Try partial match
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key) || key.includes(name)) {
      return icon;
    }
  }
  
  // Default icon
  return '📦';
};

export const getCategoryColor = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  const colorMap: { [key: string]: string } = {
    'electronics': 'bg-blue-100 text-blue-600',
    'fashion': 'bg-pink-100 text-pink-600',
    'home': 'bg-green-100 text-green-600',
    'baby': 'bg-purple-100 text-purple-600',
    'sports': 'bg-orange-100 text-orange-600',
    'beauty': 'bg-red-100 text-red-600',
    'food': 'bg-yellow-100 text-yellow-600',
    'books': 'bg-indigo-100 text-indigo-600',
    'automotive': 'bg-gray-100 text-gray-600',
    'pets': 'bg-teal-100 text-teal-600',
  };
  
  for (const [key, color] of Object.entries(colorMap)) {
    if (name.includes(key) || key.includes(name)) {
      return color;
    }
  }
  
  return 'bg-gray-100 text-gray-600';
};
