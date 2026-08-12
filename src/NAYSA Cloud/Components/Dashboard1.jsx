import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../Authentication/AuthContext.jsx";
import { fetchData } from "../Configuration/BaseURL.jsx";

export default function Dashboard1({ user: propUser }) {
  const { user: ctxUser } = useAuth();

  // Use already-available user first
  const immediateUser = useMemo(() => propUser ?? ctxUser ?? null, [propUser, ctxUser]);

  // Only fetch if immediate user is missing OR if you really need to hydrate extra fields
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", immediateUser?.USER_CODE],
    queryFn: () => fetchData("getUser", { USER_CODE: immediateUser?.USER_CODE }),
    enabled: !!immediateUser?.USER_CODE && !propUser, 
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Prefer immediate user so page renders instantly
  const user = useMemo(
    () => immediateUser ?? userProfile ?? null,
    [immediateUser, userProfile]
  );

  const name = user?.USER_NAME || user?.USER_CODE || "User";

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 py-20">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl"
      >
        <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-14 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          
          {/* Subtle pulsing background orb */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5] 
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" 
          />

          <motion.div variants={itemVariants} className="mb-4">
            <p className="text-[21px] font-bold tracking-[0.25em] text-blue-600 dark:text-blue-400 uppercase mb-7">
              NAYSA Financials Cloud
            </p>
            <h1 className="text-[34px] font-light text-slate-900 dark:text-white tracking-tight">
              Hello,{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {name}
              </span>
            </h1>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-start mb-[25px] cursor-pointer" 
          >
            <img
              src="/NAYSA.jpg"
              alt="NAYSA Financials"
              className="w-[250px] select-none rounded-lg"
              draggable="false"
            />
          </motion.div>

          <motion.span variants={itemVariants} className="text-[15px] text-slate-400 block mb-10">
            We make life easier through business applications.
          </motion.span>
          
          {/* UPDATED: Footer area with App Version and User ID */}
          <motion.div variants={itemVariants} className="flex items-center gap-6 text-slate-400 dark:text-slate-600">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              APPLICATION DATE: {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'N/A'}
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              ID: {user?.USER_CODE || "—"}
            </span>
          </motion.div>
          
        </div>
      </motion.div>
    </section>
  );
}