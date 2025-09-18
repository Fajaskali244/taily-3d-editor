// Guest storage for anonymous users using localStorage
// Provides cart and design functionality without database access

export interface GuestCartItem {
  id: string;
  designId: string;
  quantity: number;
  designName: string;
  previewUrl?: string;
}

export interface GuestDesign {
  id: string;
  name: string;
  params: Record<string, any>;
  previewUrl?: string;
  createdAt: string;
}

const GUEST_CART_KEY = 'guest_cart_items';
const GUEST_DESIGNS_KEY = 'guest_designs';

// Guest Cart Functions
export const getGuestCart = (): GuestCartItem[] => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return [];
  }
};

export const setGuestCart = (items: GuestCartItem[]): void => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving guest cart:', error);
  }
};

export const addToGuestCart = (item: Omit<GuestCartItem, 'id'>): void => {
  const cart = getGuestCart();
  const existingIndex = cart.findIndex(i => i.designId === item.designId);
  
  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push({
      ...item,
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
  
  setGuestCart(cart);
};

export const updateGuestCartQuantity = (itemId: string, quantity: number): void => {
  const cart = getGuestCart();
  if (quantity <= 0) {
    removeFromGuestCart(itemId);
    return;
  }
  
  const index = cart.findIndex(item => item.id === itemId);
  if (index >= 0) {
    cart[index].quantity = quantity;
    setGuestCart(cart);
  }
};

export const removeFromGuestCart = (itemId: string): void => {
  const cart = getGuestCart();
  const filtered = cart.filter(item => item.id !== itemId);
  setGuestCart(filtered);
};

export const clearGuestCart = (): void => {
  localStorage.removeItem(GUEST_CART_KEY);
};

// Guest Designs Functions
export const getGuestDesigns = (): GuestDesign[] => {
  try {
    const stored = localStorage.getItem(GUEST_DESIGNS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading guest designs:', error);
    return [];
  }
};

export const setGuestDesigns = (designs: GuestDesign[]): void => {
  try {
    localStorage.setItem(GUEST_DESIGNS_KEY, JSON.stringify(designs));
  } catch (error) {
    console.error('Error saving guest designs:', error);
  }
};

export const saveGuestDesign = (design: Omit<GuestDesign, 'id' | 'createdAt'>): string => {
  const designs = getGuestDesigns();
  const newDesign: GuestDesign = {
    ...design,
    id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  
  designs.unshift(newDesign);
  setGuestDesigns(designs);
  return newDesign.id;
};

export const updateGuestDesign = (id: string, updates: Partial<GuestDesign>): void => {
  const designs = getGuestDesigns();
  const index = designs.findIndex(design => design.id === id);
  
  if (index >= 0) {
    designs[index] = { ...designs[index], ...updates };
    setGuestDesigns(designs);
  }
};

export const deleteGuestDesign = (id: string): void => {
  const designs = getGuestDesigns();
  const filtered = designs.filter(design => design.id !== id);
  setGuestDesigns(filtered);
};

export const clearGuestDesigns = (): void => {
  localStorage.removeItem(GUEST_DESIGNS_KEY);
};

// Migration helpers for when user logs in
export const getGuestDataForMigration = () => {
  return {
    cart: getGuestCart(),
    designs: getGuestDesigns()
  };
};

export const clearAllGuestData = (): void => {
  clearGuestCart();
  clearGuestDesigns();
};