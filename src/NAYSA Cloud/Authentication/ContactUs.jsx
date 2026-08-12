import React from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import {
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ContactUs = ({
  supportEmail = "support@nsihelpdesk.freshdesk.com",
  phoneNumber = "(02) 8531-2056",
  officeHours = "Mon - Fri, 8:30 AM - 5:30 PM",
  officeAddress = "Unit 7H 7th Floor, Vernida 1 Building, No. 12 Amorsolo Street, Brgy. San Lorenzo, Legaspi Village, 1229 Makati City, Philippines",
  websiteUrl = "https://www.naysasolutions.com",
  facebookUrl = "https://www.facebook.com/NSI.PH/",
  youtubeUrl = "https://www.youtube.com/",
  linkedinUrl = "https://www.linkedin.com/",
}) => {
  const navigate = useNavigate();

  const openExternal = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const contactItems = [
    {
      title: "Support Email",
      value: supportEmail,
      note: "Send your concern with complete details and screenshots.",
      icon: Mail,
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
      actionLabel: "Send Email",
      onClick: () => {
        window.location.href = `mailto:${supportEmail}`;
      },
    },
    {
      title: "Telephone",
      value: phoneNumber,
      note: officeHours,
      icon: Phone,
      iconClass:
        "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
      actionLabel: "Call Now",
      onClick: () => {
        window.location.href = `tel:${phoneNumber}`;
      },
    },
    {
      title: "Office Address",
      value: officeAddress,
      note: "Visit our office during regular business hours.",
      icon: MapPin,
      iconClass:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
      actionLabel: "",
      onClick: null,
    },
    {
      title: "Official Website",
      value: websiteUrl,
      note: "Learn more about NAYSA Solutions and our products.",
      icon: Globe,
      iconClass:
        "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300",
      actionLabel: "Visit Website",
      onClick: () => openExternal(websiteUrl),
    },
  ];

  const socialLinks = [
    {
      label: "Facebook",
      url: facebookUrl,
      icon: FaFacebookF,
      className: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "YouTube",
      url: youtubeUrl,
      icon: FaYoutube,
      className: "bg-red-600 hover:bg-red-700",
    },
    {
      label: "LinkedIn",
      url: linkedinUrl,
      icon: FaLinkedinIn,
      className: "bg-sky-700 hover:bg-sky-800",
    },
  ];

  return (
    <div className="min-h-full w-full bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 lg:px-5">
      <div className="w-full">
        <div className="mb-5 flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => navigate("/help-support")}
            className="mt-1 rounded-full p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
            title="Back to Help & Support"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-500/10 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                Contact Center
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Contact Us
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Reach the NAYSA support team through your preferred channel.
            </p>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.14em]">
                  NAYSA Support
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                We make life easier through business applications.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
                Contact our support team for technical concerns, product
                assistance, implementation questions, and other service needs.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {contactItems.map(
                  ({
                    title,
                    value,
                    note,
                    icon: Icon,
                    iconClass,
                    actionLabel,
                    onClick,
                  }) => (
                    <button
                      key={title}
                      type="button"
                      onClick={onClick || undefined}
                      className={`group flex min-h-[170px] w-full flex-col rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-left transition dark:border-slate-800 dark:bg-slate-950/60 ${
                        onClick
                          ? "hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg dark:hover:border-blue-800 dark:hover:bg-slate-900"
                          : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>

                        {onClick && (
                          <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />
                        )}
                      </div>

                      <div className="mt-4 text-sm font-black text-slate-900 dark:text-white">
                        {title}
                      </div>

                      <div className="mt-1 break-words text-sm font-semibold text-blue-600 dark:text-blue-300">
                        {value}
                      </div>

                      {note && (
                        <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {note}
                        </div>
                      )}

                      {actionLabel && (
                        <div className="mt-auto pt-4 text-xs font-bold uppercase tracking-wide text-slate-400 transition group-hover:text-blue-600">
                          {actionLabel}
                        </div>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-6 shadow-inner dark:border-slate-800 dark:from-slate-950 dark:to-cyan-950/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-200/60 dark:shadow-none">
                  <Clock3 className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                  Office Hours
                </h3>

                <p className="mt-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                  {officeHours}
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Messages received outside office hours will be reviewed on
                  the next business day.
                </p>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Follow NAYSA Solutions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Visit our official social media pages for updates,
                  announcements, and product information.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {socialLinks.map(
                    ({ label, url, icon: Icon, className }) => (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        aria-label={label}
                        onClick={() => openExternal(url)}
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm transition hover:-translate-y-1 hover:shadow-md ${className}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactUs;