// Utility to get category icons based on category name or slug

export const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  // Enhanced icon mappings with better visual icons
  const iconMap: { [key: string]: string } = {
    // Electronics
    'electronics': '⚡',
    'phones': '📱',
    'mobile': '📱',
    'smartphone': '📱',
    'computers': '💻',
    'laptops': '💻',
    'tablets': '📱',
    'accessories': '🎧',
    'headphones': '🎧',
    'earphones': '🎧',
    'audio': '🔊',
    'camera': '📷',
    'tv': '📺',
    'television': '📺',
    'gaming': '🎮',
    'console': '🎮',
    
    // Fashion & Apparel
    'fashion': '�',
    'clothing': '👕',
    'clothes': '👕',
    'apparel': '👔',
    'shirts': '👕',
    'dress': '👗',
    'shoes': '👟',
    'footwear': '👟',
    'bags': '👜',
    'handbags': '👜',
    'backpack': '🎒',
    'watches': '⌚',
    'jewelry': '💎',
    'jewellery': '💎',
    'sunglasses': '🕶️',
    'fashion accessories': '👒',
    
    // Home & Living
    'home': '🏠',
    'furniture': '🛋️',
    'kitchen': '🍳',
    'cookware': '🍳',
    'appliances': '🔌',
    'home appliances': '🔌',
    'decor': '🖼️',
    'decoration': '🎨',
    'bedding': '🛏️',
    'mattress': '🛏️',
    'lighting': '💡',
    'lamp': '💡',
    'curtains': '🪟',
    'rugs': '🧶',
    'carpet': '🧶',
    
    // Baby & Kids
    'baby': '🍼',
    'kids': '🧸',
    'toys': '🧸',
    'baby items': '🍼',
    'baby-items': '🍼',
    'infant': '👶',
    'children': '🧒',
    'diapers': '🍼',
    'baby care': '🍼',
    'baby food': '🍼',
    'stroller': '🚼',
    
    // Sports & Outdoor
    'sports': '⚽',
    'fitness': '💪',
    'gym': '🏋️',
    'exercise': '🏃',
    'outdoor': '🏕️',
    'camping': '⛺',
    'hiking': '🥾',
    'cycling': '🚴',
    'bicycle': '🚲',
    'skateboard': '🛹',
    
    // Beauty & Health
    'beauty': '💄',
    'cosmetics': '💅',
    'makeup': '💄',
    'skincare': '🧴',
    'skin care': '🧴',
    'health': '💊',
    'wellness': '🧘',
    'medical': '⚕️',
    'pharmacy': '💊',
    'supplement': '💊',
    'vitamins': '💊',
    
    // Food & Grocery
    'food': '🍎',
    'grocery': '🛒',
    'groceries': '🛒',
    'beverages': '🥤',
    'drinks': '🥤',
    'snacks': '🍿',
    'fruits': '🍎',
    'vegetables': '🥗',
    'dairy': '🥛',
    'bakery': '🍞',
    'organic': '🌱',
    
    // Books & Stationery
    'books': '📚',
    'book': '📖',
    'stationery': '✏️',
    'office': '�',
    'office supplies': '📎',
    'pen': '✒️',
    'notebook': '📓',
    'paper': '📄',
    
    // Automotive
    'automotive': '🚗',
    'auto': '🚗',
    'car': '🚗',
    'vehicle': '🚙',
    'bike': '🏍️',
    'motorcycle': '🏍️',
    'parts': '🔧',
    'car parts': '🔧',
    'car accessories': '�',
    'tires': '�',
    
    // Pet Supplies
    'pets': '🐾',
    'pet': '🐾',
    'pet supplies': '🐾',
    'pet-supplies': '🐾',
    'dog': '🐕',
    'cat': '🐈',
    'pet food': '🦴',
    'aquarium': '🐠',
    
    // Tools & Hardware
    'tools': '🔨',
    'hardware': '🔩',
    'construction': '🏗️',
    'garden': '🌱',
    'gardening': '🌻',
    'power tools': '🔌',
    
    // Art & Craft
    'art': '🎨',
    'craft': '✂️',
    'painting': '🖌️',
    'drawing': '✏️',
    
    // Music & Instruments
    'music': '🎵',
    'instruments': '🎸',
    'guitar': '🎸',
    'piano': '🎹',
    
    // Others
    'gifts': '🎁',
    'gift': '🎁',
    'party': '🎉',
    'seasonal': '🎄',
    'other': '📦',
    'miscellaneous': '📦',
    'general': '📦',
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
    // Technology & Electronics
    'electronics': 'bg-blue-100 text-blue-700',
    'phone': 'bg-blue-100 text-blue-700',
    'mobile': 'bg-blue-100 text-blue-700',
    'computer': 'bg-indigo-100 text-indigo-700',
    'laptop': 'bg-indigo-100 text-indigo-700',
    'gaming': 'bg-purple-100 text-purple-700',
    'camera': 'bg-cyan-100 text-cyan-700',
    
    // Fashion & Apparel
    'fashion': 'bg-pink-100 text-pink-700',
    'clothing': 'bg-pink-100 text-pink-700',
    'apparel': 'bg-pink-100 text-pink-700',
    'shoe': 'bg-rose-100 text-rose-700',
    'bag': 'bg-fuchsia-100 text-fuchsia-700',
    'watch': 'bg-amber-100 text-amber-700',
    'jewelry': 'bg-yellow-100 text-yellow-700',
    
    // Home & Living
    'home': 'bg-green-100 text-green-700',
    'furniture': 'bg-emerald-100 text-emerald-700',
    'kitchen': 'bg-lime-100 text-lime-700',
    'appliance': 'bg-teal-100 text-teal-700',
    'decor': 'bg-green-100 text-green-700',
    
    // Baby & Kids
    'baby': 'bg-purple-100 text-purple-700',
    'infant': 'bg-purple-100 text-purple-700',
    'kid': 'bg-violet-100 text-violet-700',
    'toy': 'bg-pink-100 text-pink-700',
    'children': 'bg-violet-100 text-violet-700',
    
    // Sports & Fitness
    'sport': 'bg-orange-100 text-orange-700',
    'fitness': 'bg-red-100 text-red-700',
    'gym': 'bg-red-100 text-red-700',
    'outdoor': 'bg-green-100 text-green-700',
    'camping': 'bg-lime-100 text-lime-700',
    
    // Beauty & Health
    'beauty': 'bg-rose-100 text-rose-700',
    'cosmetic': 'bg-pink-100 text-pink-700',
    'makeup': 'bg-pink-100 text-pink-700',
    'skincare': 'bg-rose-100 text-rose-700',
    'health': 'bg-red-100 text-red-700',
    'wellness': 'bg-teal-100 text-teal-700',
    'medical': 'bg-red-100 text-red-700',
    
    // Food & Grocery
    'food': 'bg-yellow-100 text-yellow-700',
    'grocery': 'bg-amber-100 text-amber-700',
    'groceries': 'bg-amber-100 text-amber-700',
    'beverage': 'bg-cyan-100 text-cyan-700',
    'snack': 'bg-orange-100 text-orange-700',
    'organic': 'bg-green-100 text-green-700',
    
    // Books & Education
    'book': 'bg-indigo-100 text-indigo-700',
    'stationery': 'bg-blue-100 text-blue-700',
    'office': 'bg-slate-100 text-slate-700',
    'education': 'bg-indigo-100 text-indigo-700',
    
    // Automotive
    'automotive': 'bg-gray-100 text-gray-700',
    'auto': 'bg-gray-100 text-gray-700',
    'car': 'bg-slate-100 text-slate-700',
    'vehicle': 'bg-zinc-100 text-zinc-700',
    'motorcycle': 'bg-stone-100 text-stone-700',
    
    // Pet Supplies
    'pet': 'bg-teal-100 text-teal-700',
    'dog': 'bg-amber-100 text-amber-700',
    'cat': 'bg-orange-100 text-orange-700',
    
    // Tools & Hardware
    'tool': 'bg-gray-100 text-gray-700',
    'hardware': 'bg-stone-100 text-stone-700',
    'construction': 'bg-yellow-100 text-yellow-700',
    'garden': 'bg-green-100 text-green-700',
    
    // Art & Entertainment
    'art': 'bg-purple-100 text-purple-700',
    'craft': 'bg-pink-100 text-pink-700',
    'music': 'bg-violet-100 text-violet-700',
    
    // General
    'gift': 'bg-red-100 text-red-700',
    'party': 'bg-pink-100 text-pink-700',
  };
  
  // Try exact and partial matching
  for (const [key, color] of Object.entries(colorMap)) {
    if (name.includes(key) || key.includes(name)) {
      return color;
    }
  }
  
  // Default colors array for categories not matched
  const defaultColors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-pink-100 text-pink-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
  ];
  
  // Use category name to consistently pick a color
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return defaultColors[index % defaultColors.length];
};
