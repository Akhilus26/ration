import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";

const NotificationsPage = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">Stay updated on your ration distribution</p>
      </motion.div>

      <Card className="shadow-card">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-base font-medium">No notifications</p>
            <p className="text-sm mt-1">You'll be notified about quota availability and order updates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
