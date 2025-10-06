import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import StudentAuth from "./pages/StudentAuth";
import MentorAuth from "./pages/MentorAuth";
import StudentChat from "./pages/StudentChat";
import MentorChat from "./pages/MentorChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/student/auth" element={<StudentAuth />} />
          <Route path="/mentor/auth" element={<MentorAuth />} />
          <Route path="/student/chat" element={<StudentChat />} />
          <Route path="/mentor/chat" element={<MentorChat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
