import React from "react";
import {
  BookOpen,
  Headphones,
  LoaderCircle,
  PlayCircle,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./AuthContext.jsx";
import useHelpSupportResources from "./useHelpSupportResources";

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { manuals, videos, loading } =
    useHelpSupportResources();

  const displayName =
    user?.USER_NAME ||
    user?.FULL_NAME ||
    user?.USER_CODE ||
    "USER";

  const cards = [
    {
      title: "USER MANUALS",
      description: "Browse complete system guides.",
      detail: `${manuals.length} manuals`,
      icon: BookOpen,
      route: "/help-support/manuals",
    },
    {
      title: "VIDEO TUTORIALS",
      description: "Watch step-by-step tutorials.",
      detail: `${videos.length} videos`,
      icon: PlayCircle,
      route: "/help-support/videos",
    },
    {
      title: "SUPPORT TICKET",
      description: "Create or monitor support requests.",
      detail: "Freshdesk support",
      icon: Ticket,
      route: "/help-support/ticket",
    },
    {
      title: "CONTACT US",
      description: "Reach the NAYSA support team.",
      detail: "Support assistance",
      icon: Headphones,
      route: "/help-support/contact",
    },
  ];

  return (
    <div
      className="relative min-h-[calc(100vh-56px)] w-full text-white"
      style={{
        backgroundImage: "url('/NAYSABG.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-slate-950/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-950/55 via-blue-800/55 to-blue-950/70" />
      <div className="pointer-events-none absolute inset-0 bg-blue-600/15" />

      <div className="relative flex min-h-[calc(100vh-56px)] w-full items-center justify-center px-5 py-10 sm:px-7 lg:px-10">
        <div className="w-full max-w-6xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/10 p-2.5 shadow-xl backdrop-blur-md sm:h-24 sm:w-24">
              <img
                src="/naysa_logo.png"
                alt="NAYSA Logo"
                className="max-h-full max-w-full object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,.40)]"
              />
            </div>

            <h1 className="mt-5 text-3xl font-light uppercase tracking-[0.045em] text-white drop-shadow-[0_4px_14px_rgba(0,0,0,.45)] sm:text-4xl lg:text-[44px]">
              Welcome,{" "}
              <span className="font-black">
                {String(displayName).toUpperCase()}
              </span>
            </h1>

            <p className="mt-2 text-sm font-medium text-white/90 sm:text-base">
              How can we support you today?
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-5">
            {cards.map(
              ({
                title,
                description,
                detail,
                icon: Icon,
                route,
              }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => navigate(route)}
                  className="group relative flex min-h-[200px] flex-col items-center overflow-hidden rounded-[20px] border border-white/20 bg-white/[0.09] px-4 py-5 text-center shadow-lg backdrop-blur-[5px] transition duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/[0.16] hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent opacity-0 transition group-hover:opacity-100" />

                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/[0.12] text-white shadow-md transition duration-300 group-hover:scale-105 group-hover:bg-white/[0.20]">
                    <Icon className="h-7 w-7" strokeWidth={1.7} />
                  </div>

                  <h2 className="relative mt-3.5 text-[13px] font-black tracking-[0.05em] text-white sm:text-sm">
                    {title}
                  </h2>

                  <p className="relative mt-2 flex max-w-[185px] flex-1 items-start justify-center text-[11px] leading-4.5 text-white/75 sm:text-xs">
                    {description}
                  </p>

                  <div className="relative mt-2 min-h-[16px] shrink-0 text-[10px] font-bold uppercase tracking-wide text-sky-100/90">
                    {loading &&
                    (title === "USER MANUALS" ||
                      title === "VIDEO TUTORIALS") ? (
                      <span className="inline-flex items-center gap-1">
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                        Loading
                      </span>
                    ) : (
                      detail
                    )}
                  </div>
                </button>
              )
            )}
          </div>

          <div className="mt-7 flex justify-center">
            <div className="max-w-2xl rounded-full border border-white/15 bg-slate-950/20 px-4 py-1.5 text-center text-[11px] font-medium text-white/75 backdrop-blur-md sm:text-xs">
              Manuals and video tutorials can remain open while you work on other transactions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;