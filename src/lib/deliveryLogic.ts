import { Order, calculateDistance, Shop } from "./db";

export interface DeliverySlot {
    start: string; // "10:00"
    end: string;   // "11:00"
    deliveryBoys: string[];
    orderIds: string[];
}

/**
 * Calculates the delivery slot for an order based on its creation time and shop opening time.
 * Shift: Orders in hour H (from shop open) are delivered in hour H+1.
 */
export const getDeliverySlot = (orderDate: string, shopOpeningTime: string = "09:00"): { start: string, end: string } => {
    const date = new Date(orderDate);
    const hour = date.getHours();
    
    // Shift logic: Deliver in the next hour
    const startHour = hour + 1;
    const endHour = hour + 2;
    
    return {
        start: `${startHour.toString().padStart(2, '0')}:00`,
        end: `${endHour.toString().padStart(2, '0')}:00`,
    };
};

/**
 * Clusters a batch of orders between delivery boys to avoid mixed locations.
 * Uses a simple geographic split based on the median coordinates.
 */
export const clusterOrders = (orders: Order[], numBoys: number): Order[][] => {
    if (orders.length === 0) return Array(numBoys).fill([]);
    if (numBoys <= 1) return [orders];

    // Calculate spread of lat and lng
    const lats = orders.map(o => o.lat || 0);
    const lngs = orders.map(o => o.lng || 0);
    
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);

    // Split based on whichever axis has more spread
    if (latRange > lngRange) {
        const sorted = [...orders].sort((a, b) => (a.lat || 0) - (b.lat || 0));
        return splitArray(sorted, numBoys);
    } else {
        const sorted = [...orders].sort((a, b) => (a.lng || 0) - (b.lng || 0));
        return splitArray(sorted, numBoys);
    }
};

const splitArray = <T>(arr: T[], parts: number): T[][] => {
    const result: T[][] = [];
    const size = Math.ceil(arr.length / parts);
    for (let i = 0; i < parts; i++) {
        result.push(arr.slice(i * size, (i + 1) * size));
    }
    return result;
};

/**
 * Optimizes the route for a set of orders using a Nearest Neighbor approach.
 * Starts from the shop location.
 */
export const optimizeRoute = (orders: Order[], shop: { lat: number, lng: number }): Order[] => {
    if (orders.length <= 1) return orders;

    const unvisited = [...orders];
    const optimized: Order[] = [];
    let currentPos = { lat: shop.lat, lng: shop.lng };

    while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const dist = calculateDistance(
                currentPos.lat, currentPos.lng,
                unvisited[i].lat || 0, unvisited[i].lng || 0
            );
            if (dist < minDistance) {
                minDistance = dist;
                nearestIdx = i;
            }
        }

        const nextOrder = unvisited.splice(nearestIdx, 1)[0];
        optimized.push(nextOrder);
        currentPos = { lat: nextOrder.lat || 0, lng: nextOrder.lng || 0 };
    }

    return optimized;
};

/**
 * Formats the lunch hour shift logic.
 * Shop Lunch: 1:00-2:00 -> Delivery Lunch: 2:00-3:00
 */
export const isDeliveryLunchTime = (shopLunchTime: string = "13:00 - 14:00"): boolean => {
    const parts = shopLunchTime.split("-").map(p => p.trim());
    if (parts.length < 2) return false;
    
    const shopStart = parseInt(parts[0].split(":")[0]);
    const shopEnd = parseInt(parts[1].split(":")[0]);
    
    const deliveryStart = shopStart + 1;
    const deliveryEnd = shopEnd + 1;
    
    const nowHour = new Date().getHours();
    return nowHour >= deliveryStart && nowHour < deliveryEnd;
};
