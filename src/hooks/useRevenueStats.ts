import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export type DateRange = 'today' | 'week' | 'month' | 'all';

interface RevenueStats {
  totalRevenue: number;
  todayRevenue: number;
  periodRevenue: number;
  todayCustomers: number;
  totalCustomers: number;
  newCustomersToday: number;
  reservationsWithRevenue: number;
  totalReservationCount: number;
  periodReservationCount: number;
  todayReservationCount: number;
}

export const useRevenueStats = (dateRange: DateRange = 'month') => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['revenue-stats', user?.id, dateRange],
    queryFn: async (): Promise<RevenueStats> => {
      if (!user?.id) {
        return {
          totalRevenue: 0,
          todayRevenue: 0,
          periodRevenue: 0,
          todayCustomers: 0,
          totalCustomers: 0,
          newCustomersToday: 0,
          reservationsWithRevenue: 0,
          totalReservationCount: 0,
          periodReservationCount: 0,
          todayReservationCount: 0
        };
      }
      
      const now = new Date();
      const todayStart = format(startOfDay(now), 'yyyy-MM-dd');
      const todayEnd = format(endOfDay(now), 'yyyy-MM-dd');
      
      // Calculate period dates
      let periodStart: string;
      let periodEnd: string = format(now, 'yyyy-MM-dd');
      
      switch (dateRange) {
        case 'today':
          periodStart = todayStart;
          break;
        case 'week':
          periodStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          periodEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'month':
          periodStart = format(startOfMonth(now), 'yyyy-MM-dd');
          periodEnd = format(endOfMonth(now), 'yyyy-MM-dd');
          break;
        case 'all':
        default:
          periodStart = '1970-01-01';
          break;
      }
      
      // Get all reservations with product info for revenue calculation
      // Only count completed or confirmed reservations
      // Using explicit type since price_paid and product_id are new columns
      interface ReservationWithProduct {
        id: string;
        reservation_date: string;
        customer_phone: string | null;
        customer_email: string | null;
        price_paid: number | null;
        product_id: string | null;
        party_size: number;
        status: string;
        created_at: string;
      }
      
      const { data: allReservations } = await supabase
        .from('reservations')
        .select('id, reservation_date, customer_phone, customer_email, price_paid, product_id, party_size, status, created_at')
        .eq('user_id', user.id)
        .in('status', ['completed', 'confirmed']) as { data: ReservationWithProduct[] | null };
      
      // Get products for price lookup
      const { data: products } = await supabase
        .from('products')
        .select('id, price')
        .eq('user_id', user.id);
      
      const productPriceMap = new Map(products?.map(p => [p.id, Number(p.price)]) || []);
      
      // Calculate revenues
      let totalRevenue = 0;
      let todayRevenue = 0;
      let periodRevenue = 0;
      let reservationsWithRevenue = 0;
      let totalReservationCount = 0;
      let periodReservationCount = 0;
      let todayReservationCount = 0;
      
      const todayCustomerSet = new Set<string>();
      const allCustomerSet = new Set<string>();
      const newCustomersTodaySet = new Set<string>();
      
      allReservations?.forEach(r => {
        const partySize = r.party_size || 1;
        
        // Get price per person: use price_paid if set, otherwise look up product price
        const pricePerPerson = r.price_paid != null 
          ? Number(r.price_paid) 
          : (r.product_id ? productPriceMap.get(r.product_id) || 0 : 0);
        
        // Total revenue = price × party_size (for group bookings)
        const totalPrice = pricePerPerson * partySize;
        
        if (totalPrice > 0) {
          totalRevenue += totalPrice;
          reservationsWithRevenue += partySize; // Count each person as a reservation
          
          // Period revenue
          if (r.reservation_date >= periodStart && r.reservation_date <= periodEnd) {
            periodRevenue += totalPrice;
            periodReservationCount += partySize;
          }
          
          // Today revenue
          if (r.reservation_date === todayStart) {
            todayRevenue += totalPrice;
            todayReservationCount += partySize;
          }
        }
        
        // Total reservation count (by party_size)
        totalReservationCount += partySize;
        
        // Customer tracking (use phone or email as identifier)
        // Count party_size as number of customers
        const customerKey = r.customer_phone || r.customer_email;
        if (customerKey) {
          allCustomerSet.add(customerKey);
          
          if (r.reservation_date === todayStart) {
            todayCustomerSet.add(customerKey);
          }
        }
      });
      
      // Get contacts count for total customers
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Get new contacts created today
      const { count: newContactsToday } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(todayStart).toISOString())
        .lt('created_at', new Date(new Date(todayStart).getTime() + 24 * 60 * 60 * 1000).toISOString());
      
      return {
        totalRevenue,
        todayRevenue,
        periodRevenue,
        todayCustomers: todayCustomerSet.size,
        totalCustomers: totalContacts || allCustomerSet.size,
        newCustomersToday: newContactsToday || newCustomersTodaySet.size,
        reservationsWithRevenue,
        totalReservationCount,
        periodReservationCount,
        todayReservationCount
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });
};
