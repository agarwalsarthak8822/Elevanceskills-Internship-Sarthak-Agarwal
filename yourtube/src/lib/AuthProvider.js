import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth, firebaseSignOut, getFirebaseAuthErrorMessage } from "./firebase";
import axiosInstance from "./axiosinstance";
import { UserContext } from "./user-context";
import { toast } from "sonner";

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState("signin");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("manual");
  const [upgradePlan, setUpgradePlan] = useState("gold");
  const syncingRef = useRef(false);

  const openUpgradeDialog = (reason = "manual", plan = "gold") => {
    setUpgradeReason(reason);
    setUpgradePlan(plan);
    setUpgradeOpen(true);
  };

  const closeUpgradeDialog = () => {
    setUpgradeOpen(false);
  };

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const loginWithToken = (userdata, token) => {
    localStorage.setItem("authToken", token);
    login(userdata);
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  };

  const syncUserWithBackend = async (firebaseUser) => {
    if (syncingRef.current) return null;

    syncingRef.current = true;
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const response = await axiosInstance.post("/user/sync", { idToken });
      login(response.data.result);
      return response.data.result;
    } finally {
      syncingRef.current = false;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      clearSession();
    }
  };

  const openAuthDialog = (mode = "signin") => {
    setAuthDialogMode(mode);
    setAuthDialogOpen(true);
  };

  const closeAuthDialog = () => {
    setAuthDialogOpen(false);
  };

  useEffect(() => {
    const authToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (authToken && storedUser) {
      setUser(JSON.parse(storedUser));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        const authToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");
        if (authToken && storedUser) {
          setUser(JSON.parse(storedUser));
          setLoading(false);
          return;
        }
        clearSession();
        setLoading(false);
        return;
      }

      try {
        await syncUserWithBackend(firebaseUser);
      } catch (error) {
        console.error("Failed to sync user:", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Could not connect your account. Please try again.";
        toast.error(message);
        await firebaseSignOut();
        clearSession();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async (firebaseUser) => {
    try {
      await syncUserWithBackend(firebaseUser);
      closeAuthDialog();
      toast.success("Signed in successfully");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        getFirebaseAuthErrorMessage(error) ||
        "Failed to complete sign in";
      toast.error(message);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithToken,
        logout,
        openAuthDialog,
        closeAuthDialog,
        authDialogOpen,
        authDialogMode,
        handleAuthSuccess,
        upgradeOpen,
        upgradeReason,
        upgradePlan,
        openUpgradeDialog,
        closeUpgradeDialog,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
