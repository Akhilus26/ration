import Dexie, { type Table } from 'dexie';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "beneficiary" | "shopkeeper" | "admin";
  rationCardNumber?: string;
  category?: "AAY" | "PHH" | "NPHH";
  address?: string;
  aadhaar?: string;
  lat?: number;
  lng?: number;
  pincode?: string;
  ward?: string;
  assignedShopId?: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  serviceAreas: string[]; // List of pincodes or wards
  shopkeeperId?: string;
}

export interface Stock {
  id: string;
  shopId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface Order {
  id: string;
  userId: string;
  shopId: string;
  type: string;
  status: string;
  date: string;
  items: string;
}
export interface Purchase {
  id: string;
  userId: string;
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

export class RationDatabase extends Dexie {
  users!: Table<User>;
  orders!: Table<Order>;
  purchases!: Table<Purchase>;
  shops!: Table<Shop>;
  stock!: Table<Stock>;
  quotas!: Table<Quota>;

  constructor() {
    super('RationDatabase');
    this.version(4).stores({
      users: 'id, email, role, assignedShopId',
      orders: 'id, userId, shopId',
      purchases: 'id, userId, itemName',
      shops: 'id, name, shopkeeperId',
      stock: 'id, shopId, itemName',
      quotas: 'id, category, itemName'
    });
  }
}

export const db = new RationDatabase();

export const seedQuotas = async () => {
  const count = await db.quotas.count();
  if (count === 0) {
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
    await db.quotas.bulkAdd(defaultQuotas);
    console.log("Default quotas seeded");
  }
};

export const seedShops = async () => {
  const count = await db.shops.count();
  if (count === 0) {
    await db.shops.bulkAdd([
      {
        id: "shop-1",
        name: "Central Ration Store (Shop 1)",
        address: "Connaught Place, New Delhi",
        lat: 28.6289,
        lng: 77.2150,
        serviceAreas: ["110001", "110002", "Central Delhi"],
      },
      {
        id: "shop-2",
        name: "North Delhi Ration Center (Shop 2)",
        address: "Civil Lines, New Delhi",
        lat: 28.6814,
        lng: 77.2225,
        serviceAreas: ["110007", "110008", "North Delhi"],
      },
      {
        id: "shop-3",
        name: "West Delhi Distribution Hub (Shop 3)",
        address: "Dwarka, New Delhi",
        lat: 28.5823,
        lng: 77.0500,
        serviceAreas: ["110075", "110078", "West Delhi"],
      }
    ]);
    console.log("Default shops seeded");
  }
};

export const seedAdmin = async () => {
  const adminEmail = "akhilus321@gmail.com";
  const existing = await db.users.where({ email: adminEmail }).first();
  if (!existing) {
    await db.users.add({
      id: crypto.randomUUID(),
      name: "Super Admin",
      email: adminEmail,
      role: "admin",
      password: "password123"
    });
    console.log("Default admin seeded:", adminEmail);
  }
};

export const initDb = async () => {
  await seedAdmin();
  await seedShops();
  await seedQuotas();
  console.log('Database (Dexie) initialized with admin, shop, and quota check');
  return Promise.resolve();
};

export const sql = {
  insertUser: async (user: User) => {
    return await db.users.add(user);
  },
  getUserByEmail: async (email: string, role: string) => {
    return await db.users.where({ email, role }).first();
  },
  getPurchases: async (userId: string) => {
    return await db.purchases.where({ userId }).toArray();
  },
  insertPurchase: async (purchase: Purchase) => {
    return await db.purchases.add(purchase);
  },
  getAllUsers: async () => {
    return await db.users.toArray();
  },
  updateUser: async (id: string, user: Partial<User>) => {
    return await db.users.update(id, user);
  },
  deleteUser: async (id: string) => {
    return await db.users.delete(id);
  },
  getAllOrders: async () => {
    return await db.orders.toArray();
  },
  getCategoryCounts: async () => {
    const users = await db.users.where({ role: "beneficiary" }).toArray();
    return {
      AAY: users.filter(u => u.category === "AAY").length,
      PHH: users.filter(u => u.category === "PHH").length,
      NPHH: users.filter(u => u.category === "NPHH").length,
    };
  },
  getAllShops: async () => {
    return await db.shops.toArray();
  },
  getShopById: async (id: string) => {
    return await db.shops.get(id);
  },
  getShopByShopkeeperId: async (shopkeeperId: string) => {
    return await db.shops.where({ shopkeeperId }).first();
  },
  findShopByArea: async (area: string) => {
    const shops = await db.shops.toArray();
    return shops.find(s => s.serviceAreas.some(a => a.toLowerCase().includes(area.toLowerCase())));
  },
  insertShop: async (shop: Shop) => {
    return await db.shops.add(shop);
  },
  updateShop: async (id: string, shop: Partial<Shop>) => {
    return await db.shops.update(id, shop);
  },
  getAllQuotas: async () => {
    return await db.quotas.toArray();
  },
  updateQuota: async (id: string, quota: Partial<Quota>) => {
    return await db.quotas.update(id, quota);
  },
  resetQuotasToDefault: async () => {
    await db.quotas.clear();
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
    await db.quotas.bulkAdd(defaultQuotas);
  }
};
