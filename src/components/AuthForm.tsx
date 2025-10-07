import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

interface AuthFormProps {
  role: "student" | "mentor";
}

const MENTOR_EMAIL = "k.hemapriya@srmrmp.edu.in";
const DEFAULT_STUDENT_PASSWORD = "eecstudents123";

const studentEmailSchema = z.string().refine(
  (email) => {
    const match = email.match(/^310624150(\d{3})@eec\.srmrmp\.edu\.in$/);
    if (!match) return false;
    const num = parseInt(match[1]);
    return num >= 1 && num <= 61;
  },
  { message: "Invalid student email. Format: 310624150001 to 310624150061@eec.srmrmp.edu.in" }
);

export const AuthForm = ({ role }: AuthFormProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/${role}/auth`,
      });
      
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === "mentor") {
        if (formData.email !== MENTOR_EMAIL) {
          throw new Error("Invalid mentor credentials");
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            role: "mentor",
            real_name: "Dr. Hemapriya K",
            email: MENTOR_EMAIL,
          });

          // @ts-ignore - mentor_preferences table exists but types not regenerated yet
          await supabase.from("mentor_preferences").insert({
            user_id: data.user.id,
            nickname: "Mentor",
          });
        }

        toast.success("Welcome back!");
        navigate("/mentor/chat");
      } else {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (error) throw error;
          toast.success("Welcome back!");
          navigate("/student/chat");
        } else {
          const emailValidation = studentEmailSchema.safeParse(formData.email);
          if (!emailValidation.success) {
            throw new Error(emailValidation.error.errors[0].message);
          }

          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: DEFAULT_STUDENT_PASSWORD,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

          if (error) throw error;

          if (data.user) {
            await supabase.from("profiles").insert({
              id: data.user.id,
              role: "student",
              real_name: formData.name,
              email: formData.email,
            });

            await supabase.from("student_preferences").insert({
              user_id: data.user.id,
              display_mode: "anonymous",
            });

            toast.success(`Account created! Default password: ${DEFAULT_STUDENT_PASSWORD}`);
            navigate("/student/chat");
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <Card className="max-w-md w-full p-8 space-y-6 shadow-[var(--shadow-card)]">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {showForgotPassword 
              ? "Reset Password" 
              : role === "mentor"
              ? "Mentor Login"
              : isLogin 
              ? "Welcome Back" 
              : "Register as Student"}
          </h1>
          <p className="text-muted-foreground">
            {showForgotPassword
              ? "Enter your email to receive reset instructions"
              : role === "mentor"
              ? "Sign in with your mentor credentials"
              : isLogin
              ? "Sign in to your student account"
              : "Email format: 310624150001-061@eec.srmrmp.edu.in"}
          </p>
        </div>

        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handleForgotPassword} 
              className="w-full" 
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Reset Link
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowForgotPassword(false)}
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={role === "mentor" ? MENTOR_EMAIL : "310624150001@eec.srmrmp.edu.in"}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>

            <div className="space-y-2">
              {role === "student" && (
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:underline w-full"
                  disabled={loading}
                >
                  {isLogin
                    ? "Need an account? Register"
                    : "Already have an account? Sign in"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline w-full"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
