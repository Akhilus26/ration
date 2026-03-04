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
  lat?: number;
  lng?: number;
  address?: string;
  deliveryCharge?: number;
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
}

export interface Quota {
  id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  price: number;
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
        status: "approved",
        type: "ration"
      },
      {
        id: "shop-2",
        name: "North Delhi Ration Center (Shop 2)",
        address: "Civil Lines, New Delhi",
        lat: 28.6814,
        lng: 77.2225,
        serviceAreas: ["110007", "110008", "North Delhi"],
        status: "approved",
        type: "ration"
      },
      {
        id: "shop-3",
        name: "West Delhi Distribution Hub (Shop 3)",
        address: "Dwarka, New Delhi",
        lat: 28.5823,
        lng: 77.0500,
        serviceAreas: ["110075", "110078", "West Delhi"],
        status: "approved",
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
  await setDoc(doc(db, "system_metadata", "settings"), { deliveryCharge: 10 });
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
  insertPurchase: async (purchase: Purchase) => {
    return await setDoc(doc(db, "purchases", purchase.id), purchase);
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
    const q = query(collection(db, "users"), where("role", "==", "beneficiary"));
    const snapshot = await getDocs(q);
    const users = mapDocs(snapshot);
    return {
      AAY: users.filter((u: any) => u.category === "AAY").length,
      PHH: users.filter((u: any) => u.category === "PHH").length,
      NPHH: users.filter((u: any) => u.category === "NPHH").length,
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
    return await updateDoc(doc(db, "quotas", id), quota);
  },
  getSystemSettings: async () => {
    const docRef = doc(db, "system_metadata", "settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return { deliveryCharge: 10 }; // Default
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
  }
};
