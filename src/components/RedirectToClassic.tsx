import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const RedirectToClassic = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Preserve query parameters and fragments when redirecting
    const searchParams = location.search;
    const hash = location.hash;
    navigate(`/customize/classic${searchParams}${hash}`, { replace: true });
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Classic Designer...</p>
      </div>
    </div>
  );
};

export default RedirectToClassic;