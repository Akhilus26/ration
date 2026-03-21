import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
  increment,
  type DocumentData
} from "firebase/firestore";
import emailjs from '@emailjs/browser';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAleZuZo53EAn5LG649erDfewR1jFMF0Pg",
  authDomain: "smartration-a3365.firebaseapp.com",
  projectId: "smartration-a3365",
  storageBucket: "smartration-a3365.firebasestorage.app",
  messagingSenderId: "1096841190876",
  appId: "1:1096841190876:web:2bb3413bb48be993d3c319"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export type UserRole = "beneficiary" | "shopkeeper" | "admin" | "delivery_boy";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  rationCardNumber?: string;
  category?: "AAY" | "PHH" | "NPHH";
  address?: string;
  aadhaar?: string;
  lat?: number;
  lng?: number;
  pincode?: string;
  ward?: string;
  assignedShopId?: string;
  balance?: number;
  phoneNumber?: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  serviceAreas: string[]; // List of pincodes or wards
  shopkeeperId?: string;
  status: "pending" | "approved" | "rejected" | "unassigned" | "ready";
  type: "ration" | "extra";
  gmail?: string;
  shopkeeperName?: string;
  openingTime?: string; // e.g. "09:00"
  closingTime?: string; // e.g. "17:00"
  lunchTime?: string; // e.g. "13:00 - 14:00"
  isManualOpen?: boolean;
}

export interface Stock {
  id: string;
  shopId: string;
  itemName: string;
  quantity: number;
  unit: string;
  limitPerCard?: number;
  price?: number;
}

export interface Order {
  id: string;
  userId: string;
  shopId: string;
  type: string;
  status: string;
  date: string;
  items: string;
  deliveryBoyId?: string;
  deliveryStatus?: "pending" | "assigned" | "out_for_delivery" | "delivered";
  deliveryType?: "pickup" | "delivery";
  cancelledBy?: "beneficiary" | "shopkeeper";
  cancellationReason?: string;
  lat?: number;
  lng?: number;
  address?: string;
  deliveryCharge?: number;
  petrolAllowance?: number;
  tipAmount?: number;
  totalAmount?: number;
}

export interface Purchase {
  id: string;
  userId: string;
  shopId: string;
  itemName: string;
  amount: number;
  unit: string;
  price: number;
  date: string;
  orderId?: string;
}

export interface Quota {
  id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  price: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'stock' | 'shop' | 'quota' | 'system';
}

export interface StockDelivery {
  id: string;
  shopId: string;
  items: { itemName: string; quantity: number; unit: string }[];
  status: "pending" | "accepted";
  date: string;
}

export interface StockRequest {
  id: string;
  shopId: string;
  shopName: string;
  items: { itemName: string; quantity: number; unit: string }[];
  status: "pending" | "approved" | "rejected" | "modified";
  date: string;
}

// Helper to remove undefined values from objects for Firestore
const clean = (obj: any) => {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key =>
    newObj[key] === undefined ? delete newObj[key] : {}
  );
  return newObj;
};

const mapDoc = (docSnapshot: any) => ({ ...docSnapshot.data() } as any);
const mapDocs = (snapshot: any) => snapshot.docs.map(mapDoc);

// Haversine distance formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const checkSeeded = async (key: string) => {
  const docRef = doc(db, "system_metadata", key);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() && docSnap.data().seeded === true;
};

const markSeeded = async (key: string) => {
  await setDoc(doc(db, "system_metadata", key), { seeded: true, timestamp: new Date().toISOString() });
};

export const seedQuotas = async () => {
  if (await checkSeeded("quotas_seeded")) return;

  const q = query(collection(db, "quotas"), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    const defaultQuotas: Quota[] = [
      { id: "1", category: "AAY", itemName: "Rice", amount: 20, unit: "kg", price: 3 },
      { id: "2", category: "AAY", itemName: "Wheat", amount: 15, unit: "kg", price: 2 },
      { id: "3", category: "AAY", itemName: "Sugar", amount: 1, unit: "kg", price: 13.5 },
      { id: "4", category: "PHH", itemName: "Rice", amount: 3, unit: "kg/person", price: 3 },
      { id: "5", category: "PHH", itemName: "Wheat", amount: 2, unit: "kg/person", price: 2 },
      { id: "6", category: "PHH", itemName: "Sugar", amount: 1, unit: "kg", price: 13.5 },
      { id: "7", category: "NPHH", itemName: "Rice", amount: 3, unit: "kg/person", price: 10 },
      { id: "8", category: "NPHH", itemName: "Wheat", amount: 2, unit: "kg/person", price: 7 },
    ];
    const batch = writeBatch(db);
    defaultQuotas.forEach(quota => {
      batch.set(doc(db, "quotas", quota.id), quota);
    });
    await batch.commit();
    console.log("Default quotas seeded to Firestore");
  }
  await markSeeded("quotas_seeded");
};

export const seedShops = async () => {
  if (await checkSeeded("shops_seeded")) return;

  const q = query(collection(db, "shops"), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    const defaultShops: Shop[] = [
      {
        id: "shop-1",
        name: "Central Ration Store (Shop 1)",
        address: "Connaught Place, New Delhi",
        lat: 28.6289,
        lng: 77.2150,
        serviceAreas: ["110001", "110002", "Central Delhi"],
        status: "ready",
        type: "ration"
      },
      {
        id: "shop-2",
        name: "North Delhi Ration Center (Shop 2)",
        address: "Civil Lines, New Delhi",
        lat: 28.6814,
        lng: 77.2225,
        serviceAreas: ["110007", "110008", "North Delhi"],
        status: "ready",
        type: "ration"
      },
      {
        id: "shop-3",
        name: "West Delhi Distribution Hub (Shop 3)",
        address: "Dwarka, New Delhi",
        lat: 28.5823,
        lng: 77.0500,
        serviceAreas: ["110075", "110078", "West Delhi"],
        status: "ready",
        type: "ration"
      }
    ];
    const batch = writeBatch(db);
    defaultShops.forEach(shop => {
      batch.set(doc(db, "shops", shop.id), shop);
    });
    await batch.commit();
    console.log("Default shops seeded to Firestore");
  }
  await markSeeded("shops_seeded");
};

export const seedAdmin = async () => {
  if (await checkSeeded("admin_seeded")) return;

  const adminEmail = "akhilus321@gmail.com";
  const q = query(collection(db, "users"), where("email", "==", adminEmail), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    const id = crypto.randomUUID();
    await setDoc(doc(db, "users", id), {
      id,
      name: "Super Admin",
      email: adminEmail,
      role: "admin",
      password: "password123"
    });
    console.log("Default admin seeded to Firestore:", adminEmail);
  }
  await markSeeded("admin_seeded");
};

export const seedSystemSettings = async () => {
  if (await checkSeeded("settings_seeded")) return;
  await setDoc(doc(db, "system_metadata", "settings"), { deliveryCharge: 10, petrolAllowance: 50 });
  await markSeeded("settings_seeded");
};

export const initDb = async () => {
  await seedAdmin();
  await seedShops();
  await seedQuotas();
  await seedSystemSettings();
  console.log('Firebase Firestore initialized');
  return Promise.resolve();
};

export const sql = {
  checkUserExistence: async (fields: { email?: string, aadhaar?: string, rationCardNumber?: string }) => {
    if (fields.email) {
      const q = query(collection(db, "users"), where("email", "==", fields.email), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return "Email already registered";
    }
    if (fields.aadhaar) {
      const q = query(collection(db, "users"), where("aadhaar", "==", fields.aadhaar), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return "Aadhaar number already registered";
    }
    if (fields.rationCardNumber) {
      const q = query(collection(db, "users"), where("rationCardNumber", "==", fields.rationCardNumber), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return "Ration Card number already registered";
    }
    return null;
  },
  insertUser: async (user: User) => {
    return await setDoc(doc(db, "users", user.id), clean(user));
  },
  getUserByEmail: async (email: string, role: string) => {
    const q = query(collection(db, "users"), where("email", "==", email), where("role", "==", role), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : mapDoc(snapshot.docs[0]);
  },
  createOrder: async (order: Order) => {
    return await setDoc(doc(db, "orders", order.id), order);
  },
  getPurchases: async (userId: string) => {
    const q = query(collection(db, "purchases"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot);
  },
  getCurrentMonthPurchases: async (userId: string) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = startOfMonth.toISOString();
    
    const q = query(collection(db, "purchases"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const allPurchases = mapDocs(snapshot);
    
    return allPurchases.filter((p: any) => p.date >= startOfMonthISO);
  },
  insertPurchase: async (purchase: Purchase) => {
    return await setDoc(doc(db, "purchases", purchase.id), purchase);
  },
  getAllPurchases: async () => {
    const snapshot = await getDocs(collection(db, "purchases"));
    return mapDocs(snapshot);
  },
  getAllUsers: async () => {
    const snapshot = await getDocs(collection(db, "users"));
    return mapDocs(snapshot);
  },
  updateUser: async (id: string, user: Partial<User>) => {
    return await updateDoc(doc(db, "users", id), clean(user));
  },
  updateBalance: async (id: string, amount: number) => {
    return await updateDoc(doc(db, "users", id), {
      balance: increment(amount)
    });
  },
  deleteUser: async (id: string) => {
    return await deleteDoc(doc(db, "users", id));
  },
  getAllOrders: async () => {
    const snapshot = await getDocs(collection(db, "orders"));
    return mapDocs(snapshot);
  },
  getCategoryCounts: async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const users = mapDocs(snapshot);
    const beneficiaries = users.filter((u: any) => u.role?.toLowerCase() === "beneficiary");
    return {
      AAY: beneficiaries.filter((u: any) => u.category === "AAY").length,
      PHH: beneficiaries.filter((u: any) => u.category === "PHH").length,
      NPHH: beneficiaries.filter((u: any) => u.category === "NPHH").length,
    };
  },
  getAllShops: async () => {
    const snapshot = await getDocs(collection(db, "shops"));
    return mapDocs(snapshot);
  },
  getPendingShops: async () => {
    const q = query(collection(db, "shops"), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot);
  },
  approveShop: async (id: string) => {
    return await updateDoc(doc(db, "shops", id), { status: "ready" });
  },
  rejectShop: async (id: string) => {
    return await updateDoc(doc(db, "shops", id), { status: "rejected" });
  },
  getShopById: async (id: string) => {
    const docRef = doc(db, "shops", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? mapDoc(docSnap) : null;
  },
  getShopByShopkeeperId: async (shopkeeperId: string) => {
    const q = query(collection(db, "shops"), where("shopkeeperId", "==", shopkeeperId), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : mapDoc(snapshot.docs[0]);
  },
  getDeliveryBoysByShop: async (shopId: string) => {
    const q = query(collection(db, "users"), where("role", "==", "delivery_boy"), where("assignedShopId", "==", shopId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot);
  },
  assignOrderToDeliveryBoy: async (orderId: string, deliveryBoyId: string) => {
    return await updateDoc(doc(db, "orders", orderId), {
      deliveryBoyId,
      deliveryStatus: "assigned"
    });
  },
  updateOrderStatus: async (orderId: string, status: string, deliveryStatus?: string) => {
    const update: any = { status };
    if (deliveryStatus) update.deliveryStatus = deliveryStatus;
    return await updateDoc(doc(db, "orders", orderId), update);
  },
  findShopByArea: async (area: string) => {
    const snapshot = await getDocs(collection(db, "shops"));
    const shops = mapDocs(snapshot);
    return shops.find((s: any) =>
      s.status === "ready" &&
      s.type === "ration" &&
      s.serviceAreas.some((a: string) => a.toLowerCase().includes(area.toLowerCase()))
    );
  },
  findShopsByArea: async (area: string) => {
    const snapshot = await getDocs(collection(db, "shops"));
    const shops = mapDocs(snapshot);
    return shops.filter((s: any) =>
      s.status === "ready" &&
      s.serviceAreas.some((a: string) => a.toLowerCase().includes(area.toLowerCase()))
    );
  },
  getRationShopsByArea: async (area: string) => {
    const snapshot = await getDocs(collection(db, "shops"));
    const shops = mapDocs(snapshot);
    return shops.filter((s: any) =>
      s.status === "ready" &&
      s.type === "ration" &&
      s.serviceAreas.some((a: string) => a.toLowerCase().includes(area.toLowerCase()))
    );
  },
  findShopsByRadius: async (lat: number, lng: number, radiusKm: number) => {
    const snapshot = await getDocs(collection(db, "shops"));
    const shops = mapDocs(snapshot);
    return shops
      .filter((s: any) => s.status === "ready")
      .map((s: any) => {
        const distance = calculateDistance(lat, lng, s.lat, s.lng);
        return { ...s, distance: Math.round(distance * 100) / 100 };
      })
      .filter((s: any) => s.distance <= radiusKm)
      .sort((a: any, b: any) => a.distance - b.distance);
  },
  insertShop: async (shop: Shop) => {
    return await setDoc(doc(db, "shops", shop.id), shop);
  },
  updateShop: async (id: string, shop: Partial<Shop>) => {
    return await updateDoc(doc(db, "shops", id), clean(shop));
  },
  deleteShop: async (id: string) => {
    const batch = writeBatch(db);
    const userQuery = query(collection(db, "users"), where("assignedShopId", "==", id));
    const userSnapshot = await getDocs(userQuery);
    userSnapshot.docs.forEach(uDoc => {
      batch.update(uDoc.ref, { assignedShopId: null });
    });
    const stockQuery = query(collection(db, "stock"), where("shopId", "==", id));
    const stockSnapshot = await getDocs(stockQuery);
    stockSnapshot.docs.forEach(sDoc => {
      batch.delete(sDoc.ref);
    });
    batch.delete(doc(db, "shops", id));
    return await batch.commit();
  },
  getAllStock: async () => {
    const snapshot = await getDocs(collection(db, "stock"));
    return mapDocs(snapshot);
  },
  getShopStock: async (shopId: string) => {
    const q = query(collection(db, "stock"), where("shopId", "==", shopId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot);
  },
  getOrdersByShop: async (shopId: string) => {
    const q = query(collection(db, "orders"), where("shopId", "==", shopId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot) as Order[];
  },
  getAssignedOrders: async (deliveryBoyId: string) => {
    const q = query(collection(db, "orders"), where("deliveryBoyId", "==", deliveryBoyId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot) as Order[];
  },
  getUserOrders: async (userId: string) => {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot) as Order[];
  },
  updateOrInsertStock: async (stock: Stock) => {
    return await setDoc(doc(db, "stock", stock.id), clean(stock), { merge: true });
  },
  deleteStock: async (id: string) => {
    return await deleteDoc(doc(db, "stock", id));
  },
  decrementStock: async (shopId: string, itemName: string, amount: number) => {
    const id = `stock-${shopId}-${itemName}`;
    const docRef = doc(db, "stock", id);
    return await updateDoc(docRef, {
      quantity: increment(-amount)
    });
  },
  unassignShopkeeperFromShop: async (shopkeeperId: string) => {
    const q = query(collection(db, "shops"), where("shopkeeperId", "==", shopkeeperId), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return await updateDoc(snapshot.docs[0].ref, {
        shopkeeperId: null,
        status: "unassigned"
      });
    }
  },
  getAllQuotas: async () => {
    const snapshot = await getDocs(collection(db, "quotas"));
    return mapDocs(snapshot);
  },
  updateQuota: async (id: string, quota: Partial<Quota>) => {
    return await updateDoc(doc(db, "quotas", id), clean(quota));
  },
  insertQuota: async (quota: Quota) => {
    return await setDoc(doc(db, "quotas", quota.id), clean(quota));
  },
  deleteQuota: async (id: string) => {
    return await deleteDoc(doc(db, "quotas", id));
  },
  getSystemSettings: async () => {
    const docRef = doc(db, "system_metadata", "settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return { deliveryCharge: 10, petrolAllowance: 50 }; // Default
  },
  updateSystemSettings: async (settings: any) => {
    return await setDoc(doc(db, "system_metadata", "settings"), settings, { merge: true });
  },
  resetQuotasToDefault: async () => {
    const snapshot = await getDocs(collection(db, "quotas"));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const defaultQuotas: Quota[] = [
      { id: "1", category: "AAY", itemName: "Rice", amount: 20, unit: "kg", price: 3 },
      { id: "2", category: "AAY", itemName: "Wheat", amount: 15, unit: "kg", price: 2 },
      { id: "3", category: "AAY", itemName: "Sugar", amount: 1, unit: "kg", price: 13.5 },
      { id: "4", category: "PHH", itemName: "Rice", amount: 3, unit: "kg/person", price: 3 },
      { id: "5", category: "PHH", itemName: "Wheat", amount: 2, unit: "kg/person", price: 2 },
      { id: "6", category: "PHH", itemName: "Sugar", amount: 1, unit: "kg", price: 13.5 },
      { id: "7", category: "NPHH", itemName: "Rice", amount: 3, unit: "kg/person", price: 10 },
      { id: "8", category: "NPHH", itemName: "Wheat", amount: 2, unit: "kg/person", price: 7 },
    ];
    const secondBatch = writeBatch(db);
    defaultQuotas.forEach(quota => {
      secondBatch.set(doc(db, "quotas", quota.id), quota);
    });
    return await secondBatch.commit();
  },
  getNotifications: async (userId: string) => {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot).sort((a: any, b: any) => b.date.localeCompare(a.date));
  },
  createNotification: async (notification: Notification) => {
    // 1. Save to Firestore
    await setDoc(doc(db, "notifications", notification.id), clean(notification));
    
    // 2. Automated Email via EmailJS
    try {
      const userRef = doc(db, "users", notification.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.email) {
              const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
              const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
              const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

              if (serviceId && templateId && publicKey) {
                  await emailjs.send(
                      serviceId,
                      templateId,
                      {
                          to_email: userData.email,
                          user_name: userData.name || "User",
                          subject: notification.title,
                          message: notification.message,
                          from_name: "RationWise System"
                      },
                      publicKey
                  );
              }
          }
      }
    } catch (err) {
        console.error("Email notification failed:", err);
    }
    return;
  },
  markNotificationAsRead: async (id: string) => {
    return await updateDoc(doc(db, "notifications", id), { read: true });
  },
  notifyNearbyUsers: async (lat: number, lng: number, radiusKm: number, title: string, message: string, type: 'stock' | 'shop' | 'quota' | 'system') => {
    const usersSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "beneficiary")));
    const beneficiaries = mapDocs(usersSnapshot);
    
    // Send standard notifications (each createNotification now triggers an email)
    for (const user of beneficiaries) {
        if (user.lat && user.lng) {
            const distance = calculateDistance(lat, lng, user.lat, user.lng);
            if (distance <= radiusKm) {
                await sql.createNotification({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    title,
                    message,
                    date: new Date().toISOString(),
                    read: false,
                    type
                });
            }
        }
    }
    return;
  },
  updateUserLocation: async (userId: string, lat: number, lng: number) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { lat, lng, lastLocationUpdate: new Date().toISOString() });
  },
  getOrdersCountInSlot: async (shopId: string, hour: number) => {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("shopId", "==", shopId),
      where("deliveryType", "==", "delivery"),
      where("status", "!=", "completed")
    );
    const snapshot = await getDocs(q);
    const orders = mapDocs(snapshot);
    // Filter by slot on the client side since Firestore query is limited for this specific case
    return orders.filter((o: any) => {
      const orderHour = new Date(o.date).getHours();
      return orderHour === hour;
    }).length;
  },
  getAverageOrdersPerHour: async (shopId: string) => {
    const q = query(
      collection(db, "orders"),
      where("shopId", "==", shopId),
      where("deliveryStatus", "==", "delivered")
    );
    const snapshot = await getDocs(q);
    const deliveredOrders = mapDocs(snapshot);

    if (deliveredOrders.length === 0) return 0;

    // Find the dates of the first and last delivered orders
    const dates = deliveredOrders.map((o: any) => new Date(o.date).getTime());
    const firstDate = Math.min(...dates);
    const lastDate = Math.max(...dates);
    
    // Calculate total hours between first and last order
    // Minimum 1 hour to avoid division by zero or infinity
    const diffMs = lastDate - firstDate;
    const diffHours = Math.max(1, diffMs / (1000 * 60 * 60));
    
    return deliveredOrders.length / diffHours;
  },
  isShopOpen: (shop: Shop) => {
    // Per user request, status is manually controlled by the shopkeeper.
    // Opening/Closing times are for display only.
    return shop.isManualOpen !== false;
  },
  createStockDelivery: async (delivery: StockDelivery) => {
    return await setDoc(doc(db, "stock_deliveries", delivery.id), clean(delivery));
  },
  getPendingStockDeliveries: async (shopId: string) => {
    const q = query(
      collection(db, "stock_deliveries"),
      where("shopId", "==", shopId),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    return mapDocs(snapshot) as StockDelivery[];
  },
  acceptStockDelivery: async (deliveryId: string, shopId: string, items: { itemName: string; quantity: number; unit: string }[]) => {
    const batch = writeBatch(db);
    
    batch.update(doc(db, "stock_deliveries", deliveryId), { status: "accepted" });
    
    for (const item of items) {
      const stockId = `stock-${shopId}-${item.itemName}`;
      const stockRef = doc(db, "stock", stockId);
      batch.set(stockRef, {
        id: stockId,
        shopId,
        itemName: item.itemName,
        unit: item.unit,
        quantity: increment(item.quantity)
      }, { merge: true });
    }
    
    return await batch.commit();
  },
  createStockRequest: async (request: StockRequest) => {
    return await setDoc(doc(db, "stock_requests", request.id), clean(request));
  },
  getAllStockRequests: async () => {
    const snapshot = await getDocs(collection(db, "stock_requests"));
    return mapDocs(snapshot) as StockRequest[];
  },
  getShopStockRequests: async (shopId: string) => {
    const q = query(collection(db, "stock_requests"), where("shopId", "==", shopId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot) as StockRequest[];
  },
  updateStockRequestStatus: async (requestId: string, status: "approved" | "rejected" | "modified", items?: any[]) => {
    const update: any = { status };
    if (items) update.items = items;
    return await updateDoc(doc(db, "stock_requests", requestId), update);
  },
  getPurchasesByOrderId: async (orderId: string) => {
    const q = query(collection(db, "purchases"), where("orderId", "==", orderId));
    const snapshot = await getDocs(q);
    return mapDocs(snapshot) as Purchase[];
  },
  cancelOrder: async (orderId: string, reason: string, cancelledBy: "beneficiary" | "shopkeeper") => {
    const batch = writeBatch(db);
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("Order not found");
    const order = orderSnap.data() as Order;

    // 1. Update order status
    batch.update(orderRef, {
      status: "cancelled",
      deliveryStatus: "cancelled",
      cancelledBy,
      cancellationReason: reason
    });

    // 2. Refund Wallet if applicable
    if (order.totalAmount && order.totalAmount > 0) {
      batch.update(doc(db, "users", order.userId), {
        balance: increment(order.totalAmount)
      });
    }

    // 3. Restore Stock and Quota
    const purchases = await sql.getPurchasesByOrderId(orderId);
    for (const p of purchases) {
      // Increment stock
      const stockId = `stock-${order.shopId}-${p.itemName}`;
      batch.update(doc(db, "stock", stockId), {
        quantity: increment(p.amount)
      });
      // Delete purchase record to restore quota
      batch.delete(doc(db, "purchases", p.id));
    }

    // 4. Create Notification
    const notifUserId = cancelledBy === "shopkeeper" ? order.userId : order.shopId; // Actually we should notify shopkeeper too if user cancels
    const title = cancelledBy === "shopkeeper" ? "Order Cancelled by Shop" : "Order Cancelled by User";
    const message = `Order #${orderId.slice(0, 8)} has been cancelled. Reason: ${reason}`;
    
    // We'll notify the beneficiary if shopkeeper cancelled
    if (cancelledBy === "shopkeeper") {
        await sql.createNotification({
            id: crypto.randomUUID(),
            userId: order.userId,
            title,
            message,
            date: new Date().toISOString(),
            read: false,
            type: "system"
        });
    }

    return await batch.commit();
  }
};
