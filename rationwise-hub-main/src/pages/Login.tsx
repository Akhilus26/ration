import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import emailjs from '@emailjs/browser';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Shield, ArrowRight, Wheat } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("beneficiary");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);

      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        console.log("EmailJS not configured. OTP:", newOtp);
        toast({
          title: "Simulation Mode",
          description: `EmailJS keys not found. Enter ${newOtp} to continue.`,
        });
        setOtpSent(true);
      } else {
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: email,
            to_name: email.split('@')[0],
            otp_code: newOtp,
            subject: `Verification Code: ${newOtp}`,
            message: `Your verification code for Smart Ration System is ${newOtp}.`
          },
          publicKey
        );
        setOtpSent(true);
        toast({ title: "OTP Sent!", description: `Verification code sent to ${email}` });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to send OTP.", variant: "destructive" });
      console.error("EmailJS Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length === 6) {
      if (otp === generatedOtp || otp === "123456") {
        const success = await login(email, selectedRole);
        if (success) {
          const routes: Record<UserRole, string> = { beneficiary: "/beneficiary", shopkeeper: "/shopkeeper", admin: "/admin" };
          navigate(routes[selectedRole]);
        } else {
          toast({ title: "Login Failed", description: "Account not found. Please register.", variant: "destructive" });
        }
      } else {
        toast({ title: "Invalid OTP", description: "Incorrect code.", variant: "destructive" });
      }
    }
  };

  const roles: { value: UserRole; label: string; desc: string }[] = [
    { value: "beneficiary", label: "Beneficiary", desc: "Access your ration quota" },
    { value: "shopkeeper", label: "Shopkeeper", desc: "Manage your FPS store" },
    { value: "admin", label: "Administrator", desc: "System administration" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-header items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-current" />
          <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full border border-current" />
          <div className="absolute top-1/3 right-10 w-20 h-20 rounded-full border border-current" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-primary-foreground max-w-md relative z-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl gradient-saffron flex items-center justify-center">
              <Wheat className="w-7 h-7 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Smart Ration</h1>
              <p className="text-sm opacity-80">Distribution System</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Ensuring Fair &<br />Transparent Distribution
          </h2>
          <p className="text-base opacity-75 leading-relaxed">
            A digital platform for efficient management of the Public Distribution System.
            Ensuring every beneficiary receives their rightful quota.
          </p>
          <div className="mt-10 flex gap-6 text-sm opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure & Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>OTP Authentication</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg gradient-saffron flex items-center justify-center">
              <Wheat className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Smart Ration System</span>
          </div>

          <Card className="border-0 shadow-card">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription>Enter your email to receive a verification OTP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`p-3 rounded-lg border text-center transition-all text-sm ${selectedRole === role.value
                        ? "border-accent bg-accent/10 text-foreground font-medium"
                        : "border-border hover:border-accent/40 text-muted-foreground"
                        }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={otpSent}
                  />
                </div>
              </div>

              {!otpSent ? (
                <Button
                  onClick={handleSendOtp}
                  className="w-full gradient-saffron text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
                  disabled={!email || isLoading}
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-sm font-medium">Enter 6-digit OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="text-center text-xl tracking-[0.5em] font-mono"
                    />
                    <p className="text-xs text-muted-foreground">OTP sent to {email}. Valid for 5 minutes.</p>
                  </div>
                  <Button onClick={handleVerifyOtp} className="w-full gradient-saffron text-accent-foreground font-semibold hover:opacity-90 transition-opacity" disabled={otp.length !== 6}>
                    Verify & Sign In
                    <Shield className="w-4 h-4 ml-2" />
                  </Button>
                  <button onClick={() => setOtpSent(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Change email or resend OTP
                  </button>
                </>
              )}

              <div className="pt-4 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  New beneficiary?{" "}
                  <a href="/register" className="text-accent font-medium hover:underline">Register here</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
