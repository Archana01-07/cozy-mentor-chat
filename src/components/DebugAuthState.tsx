// components/DebugAuthState.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DebugAuthState = () => {
  const [authState, setAuthState] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getAuthState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      setUser(user);
      setAuthState({
        user,
        session,
        isAuthenticated: !!user,
        userRole: user?.user_metadata?.role,
        userId: user?.id
      });
    };

    getAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      getAuthState();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs">{JSON.stringify(authState, null, 2)}</pre>
      </CardContent>
    </Card>
  );
};
