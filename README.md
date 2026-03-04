# Ration Management System (Ration)

A modern, digitized ration distribution platform designed to streamline the process for administrators, shopkeepers, and beneficiaries.

## 🚀 Overview

The Ration Management System is a comprehensive solution for managing public distribution services. It provides a transparent and efficient way to handle quotas, stock, and purchases, ensuring that essential goods reach those who need them most.

## ✨ Key Features

### 🔐 Multi-Role Access
- **Admin**: Manage shops, users, and national quota settings.
- **Shopkeeper**: Manage local stock, register new beneficiaries, and process sales.
- **Beneficiary**: View available quotas, track purchases, and manage their digital wallet.

### 🍱 Core Functionality
- **Quota Management**: Dynamic quota settings based on family size and items.
- **Stock Tracking**: Real-time stock levels for ration shops.
- **Digital Wallet**: Integrated wallet system for seamless transactions.
- **Delivery Tracking**: Map-based tracking for ration deliveries.
- **Notifications**: Stay updated with important alerts and announcements.

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **State/Database**: [Dexie.js](https://dexie.org/) (IndexedDB) for local data persistence.
- **Mapping**: [Leaflet](https://leafletjs.com/) for location-based features.
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation.
- **Icons**: [Lucide React](https://lucide.dev/).

## 🚦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm or bun

### Installation

1. Clone the repository:
   ```sh
   git clone <repository_url>
   cd ration-main
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

## 📁 Project Structure

- `src/pages`: Main application views (Admin, Shopkeeper, Beneficiary).
- `src/components`: Reusable UI components and layout elements.
- `src/hooks`: Custom React hooks for business logic.
- `src/db`: Database schema and Dexie.js configuration.
- `src/utils`: Helper functions and constants.

---
Built with ❤️ for efficient ration distribution.
