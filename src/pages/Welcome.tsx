import { useNavigate } from "react-router-dom";
import { Heart, Users } from "lucide-react";
import { RoleCard } from "@/components/RoleCard";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="max-w-5xl w-full space-y-12 animate-in fade-in duration-1000">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-6">
            <Heart className="w-16 h-16 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            Welcome to SafeSpace
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A warm, supportive community where students and mentors connect in a safe, anonymous environment
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <RoleCard
            title="I'm a Student"
            description="Connect with mentors who understand and support you on your journey"
            icon={Users}
            onClick={() => navigate("/student/auth")}
          />
          <RoleCard
            title="I'm a Mentor"
            description="Share your wisdom and provide guidance to those who need it"
            icon={Heart}
            onClick={() => navigate("/mentor/auth")}
          />
        </div>

        {/* Footer message */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground italic">
            Your privacy and comfort are our top priorities
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
