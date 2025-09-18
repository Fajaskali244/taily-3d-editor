// Hook to handle migration of guest data to authenticated user account
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getGuestDataForMigration, clearAllGuestData } from '@/lib/guestStorage';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useGuestMigration = () => {
  const { user } = useAuth();

  useEffect(() => {
    const migrateGuestData = async () => {
      if (!user) return;

      const guestData = getGuestDataForMigration();
      const hasGuestData = guestData.cart.length > 0 || guestData.designs.length > 0;

      if (!hasGuestData) return;

      try {
        // Migrate guest designs to authenticated user's designs
        if (guestData.designs.length > 0) {
          const designsToInsert = guestData.designs.map(design => ({
            user_id: user.id,
            name: design.name,
            params: design.params,
            preview_url: design.previewUrl,
            created_at: design.createdAt
          }));

          const { error: designsError } = await supabase
            .from('designs')
            .insert(designsToInsert);

          if (designsError) {
            console.error('Error migrating guest designs:', designsError);
            return;
          }
        }

        // Migrate guest cart to authenticated user's cart
        if (guestData.cart.length > 0) {
          // First, get the actual design IDs from the database for cart items
          const cartItemsToInsert = [];
          
          for (const item of guestData.cart) {
            // For guest cart items, we need to find the actual design in the database
            // or skip if it doesn't exist (guest design)
            if (!item.designId.startsWith('guest_')) {
              cartItemsToInsert.push({
                user_id: user.id,
                design_id: item.designId,
                quantity: item.quantity
              });
            }
          }

          if (cartItemsToInsert.length > 0) {
            const { error: cartError } = await supabase
              .from('cart_items')
              .insert(cartItemsToInsert);

            if (cartError) {
              console.error('Error migrating guest cart:', cartError);
              return;
            }
          }
        }

        // Clear guest data after successful migration
        clearAllGuestData();
        
        const itemCount = guestData.designs.length + guestData.cart.length;
        toast.success(`Successfully migrated ${itemCount} item(s) to your account!`);

      } catch (error) {
        console.error('Error during guest data migration:', error);
        toast.error('Failed to migrate your saved data. Please try again.');
      }
    };

    migrateGuestData();
  }, [user]);
};