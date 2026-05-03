import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClinicLogo } from "@/components/ClinicLogo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passSchema = z.string().min(6, "Min 6 characters").max(72);

export default function Auth() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("receptionist");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav("/", { replace: true }); }, [user, nav]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(email); passSchema.parse(password); } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    nav("/", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(email); passSchema.parse(password); } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
    setTab("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 clinic-soft">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <ClinicLogo size="lg" showText={false} />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Prime Poly Clinic</h1>
            <p className="text-sm text-muted-foreground mt-1">Clinic Management & POS System</p>
          </div>
        </div>
        <Card className="p-6 shadow-elevated border-border/60">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="pwd">Password</Label><Input id="pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sign In</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="lab_tech">Lab Technician</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Prime Poly Clinic</p>
      </div>
    </div>
  );
}
