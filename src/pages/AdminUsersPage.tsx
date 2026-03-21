import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { sql, type User } from "@/lib/db";
import { User as UserIcon, Mail, Shield, UserCheck, Users, Trash2, Edit2, MapPin, Search, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminUsersPage = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        const allUsers = await sql.getAllUsers();
        setUsers(allUsers);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            console.log(`Attempting to delete user: ${userToDelete.name} (ID: ${userToDelete.id})`);

            // Clean up shop assignment if they were a shopkeeper
            await sql.unassignShopkeeperFromShop(userToDelete.id);

            await sql.deleteUser(userToDelete.id);
            toast({ title: "User Deleted", description: `${userToDelete.name} has been removed from the system.` });
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (error: any) {
            console.error("Failed to delete user:", error);
            toast({ title: "Error", description: error.message || "Failed to delete user. Check console for details.", variant: "destructive" });
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            const oldUser = users.find(u => u.id === editingUser.id);

            // If role changed from shopkeeper, unassign them from any shop
            if (oldUser && oldUser.role === "shopkeeper" && editingUser.role !== "shopkeeper") {
                await sql.unassignShopkeeperFromShop(editingUser.id);
                editingUser.assignedShopId = undefined;
            }

            await sql.updateUser(editingUser.id, editingUser);
            toast({ title: "Profile Updated", description: `Changes for ${editingUser.name} saved.` });
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return <Badge className="bg-primary hover:bg-primary/90"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
            case "shopkeeper":
                return <Badge variant="secondary"><UserCheck className="w-3 h-3 mr-1" /> Shopkeeper</Badge>;
            case "delivery_boy":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Truck className="w-3 h-3 mr-1" /> Delivery Boy</Badge>;
            default:
                return <Badge variant="outline"><UserIcon className="w-3 h-3 mr-1" /> Beneficiary</Badge>;
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rationCardNumber?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-muted-foreground mt-1">Manage all registered users in the system</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </motion.div>

            <Card className="shadow-card overflow-hidden">
                <CardHeader className="bg-secondary/20 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Registered Users ({filteredUsers.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">User Details</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Identification</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading users...</TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No users found</TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="group hover:bg-secondary/10 transition-colors">
                                        <TableCell className="pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{user.name}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {user.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>
                                            {user.category ? (
                                                <Badge variant="outline" className="font-mono bg-background/50 border-primary/20 text-primary">{user.category}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-mono text-[10px] text-muted-foreground">ID: {user.rationCardNumber || "N/A"}</span>
                                                {user.aadhaar && <span className="text-[10px] text-muted-foreground">ADR: ****{user.aadhaar.slice(-4)}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="h-8 text-primary hover:bg-primary/10" onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }}>
                                                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => { setUserToDelete({ id: user.id, name: user.name }); setIsDeleteModalOpen(true); }}>
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>System Role</Label>
                                    <Select
                                        value={editingUser.role}
                                        onValueChange={(val: any) => setEditingUser({ ...editingUser, role: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beneficiary">Beneficiary</SelectItem>
                                            <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
                                            <SelectItem value="delivery_boy">Delivery Boy</SelectItem>
                                            <SelectItem value="admin">Administrator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Quota Category</Label>
                                    <Select
                                        value={editingUser.category || "none"}
                                        onValueChange={(val: any) => setEditingUser({ ...editingUser, category: val === "none" ? undefined : val })}
                                        disabled={editingUser.role !== "beneficiary"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="AAY">AAY</SelectItem>
                                            <SelectItem value="PHH">PHH</SelectItem>
                                            <SelectItem value="NPHH">NPHH</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Ration Card Number</Label>
                                <Input value={editingUser.rationCardNumber || ""} onChange={(e) => setEditingUser({ ...editingUser, rationCardNumber: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button className="gradient-saffron text-accent-foreground font-semibold" onClick={handleUpdateUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete user <span className="font-bold text-foreground">"{userToDelete?.name}"</span>? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteUser}>Confirm Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminUsersPage;
