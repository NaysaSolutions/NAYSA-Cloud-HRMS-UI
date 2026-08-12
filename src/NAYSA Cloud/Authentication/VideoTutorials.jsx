import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  LoaderCircle,
  Minimize2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useHelpSupportResources from "./useHelpSupportResources";

const gradients = [
  "from-blue-800 to-blue-500",
  "from-sky-800 to-sky-500",
  "from-indigo-800 to-indigo-500",
  "from-cyan-800 to-cyan-500",
  "from-blue-900 to-sky-600",
  "from-indigo-700 to-blue-500",
];

const toEmbedUrl = (rawUrl) => {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value, window.location.origin);
    const host = url.hostname.toLowerCase();

    if (
      host.includes("youtube.com") ||
      host.includes("youtube-nocookie.com")
    ) {
      if (url.pathname.startsWith("/embed/")) {
        return url.toString();
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/").filter(Boolean)[1];
        return id
          ? `https://www.youtube.com/embed/${id}?rel=0`
          : value;
      }

      const id = url.searchParams.get("v");
      return id
        ? `https://www.youtube.com/embed/${id}?rel=0`
        : value;
    }

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id
        ? `https://www.youtube.com/embed/${id}?rel=0`
        : value;
    }

    if (host.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id
        ? `https://player.vimeo.com/video/${id}`
        : value;
    }

    return value;
  } catch {
    return value;
  }
};

const VideoTutorials = () => {
  const navigate = useNavigate();
  const { videos, loading, error, refresh } =
    useHelpSupportResources();

  const [searchText, setSearchText] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedVideo, setSelectedVideo] = useState(null);

  const modules = useMemo(
    () =>
      Array.from(
        new Map(
          videos.map((item) => [
            item.moduleCode || item.module,
            item.module || item.moduleCode,
          ])
        ).entries()
      )
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [videos]
  );

  const filteredVideos = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return videos.filter((item) => {
      const matchesModule =
        selectedModule === "ALL" ||
        item.moduleCode === selectedModule ||
        item.module === selectedModule;

      const matchesSearch =
        !keyword ||
        [
          item.moduleCode,
          item.module,
          item.subMenu,
          item.menuCode,
          item.menuName,
          item.videoTutorial,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return matchesModule && matchesSearch;
    });
  }, [videos, searchText, selectedModule]);

  useEffect(() => {
    if (filteredVideos.length === 0) {
      setSelectedVideo(null);
      return;
    }

    const selectedStillExists = filteredVideos.some(
      (item) =>
        (item.id || item.menuCode) ===
        (selectedVideo?.id || selectedVideo?.menuCode)
    );

    if (!selectedStillExists) {
      setSelectedVideo(filteredVideos[0]);
    }
  }, [filteredVideos, selectedVideo]);

  const selectedEmbedUrl = useMemo(
    () => toEmbedUrl(selectedVideo?.videoTutorial),
    [selectedVideo]
  );

  const openFloatingVideo = (item = selectedVideo) => {
    if (!item?.videoTutorial) return;

    window.dispatchEvent(
      new CustomEvent("support:open", {
        detail: {
          type: "video",
          title: item.menuName || item.menuCode || "Video Tutorial",
          url: toEmbedUrl(item.videoTutorial),
          originalUrl: item.videoTutorial,
        },
      })
    );
  };

  const handleSelectVideo = (item) => {
    setSelectedVideo(item);
    openFloatingVideo(item);
  };

  return (
    <div className="min-h-full w-full bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 lg:px-5">
      <div className="w-full">
        <div className="mb-5 flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/help-support")}
              className="mt-1 rounded-full p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Learning Center</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Video Tutorials
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Preview a tutorial on the right, keep it open, and
                continue working in another transaction.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(380px,0.9fr)_minmax(620px,1.4fr)]">
          <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_200px] xl:grid-cols-1 2xl:grid-cols-[1fr_200px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(event.target.value)
                  }
                  placeholder="Search videos..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <select
                value={selectedModule}
                onChange={(event) =>
                  setSelectedModule(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="ALL">All Modules</option>

                {modules.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-3 text-sm text-slate-500">
                  Loading video tutorials...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <Video className="h-10 w-10 text-slate-400" />

                <h3 className="mt-4 font-semibold text-slate-800 dark:text-white">
                  No video tutorials found
                </h3>

                <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  Add the video URL to the
                  HS_MENU.video_tutorial column.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {filteredVideos.map((item, index) => {
                  const isSelected =
                    (selectedVideo?.id ||
                      selectedVideo?.menuCode) ===
                    (item.id || item.menuCode);

                  return (
                    <article
                      key={item.id || item.menuCode}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-slate-900 ${
                        isSelected
                          ? "border-blue-400 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-900/30"
                          : "border-slate-200 hover:border-blue-200 hover:shadow-md dark:border-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectVideo(item)}
                        className={`relative flex h-32 w-full overflow-hidden bg-gradient-to-br ${
                          gradients[index % gradients.length]
                        } p-4 text-left text-white`}
                      >
                        <div className="relative z-10 max-w-[80%] text-base font-bold leading-tight">
                          {item.menuName || item.menuCode}
                        </div>

                        <div className="absolute inset-0 bg-black/10" />

                        <div className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                          <Play className="ml-0.5 h-4 w-4 fill-white" />
                        </div>

                        <Eye className="absolute bottom-4 right-4 h-4 w-4 text-white/90" />
                      </button>

                      <div className="p-4">
                        <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {item.menuName || item.menuCode}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.module}
                          {item.subMenu ? ` • ${item.subMenu}` : ""}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0">
            <div className="sticky top-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                    Video Preview
                  </div>

                  <h2 className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">
                    {selectedVideo?.menuName ||
                      selectedVideo?.menuCode ||
                      "Select a video tutorial"}
                  </h2>

                  {selectedVideo?.videoTutorial && (
                    <p
                      className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                      title={selectedVideo.videoTutorial}
                    >
                      {selectedVideo.videoTutorial}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openFloatingVideo()}
                    disabled={!selectedEmbedUrl}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300"
                  >
                    <Minimize2 className="h-4 w-4" />
                    Keep Open
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        selectedVideo?.videoTutorial,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    disabled={!selectedVideo?.videoTutorial}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </button>
                </div>
              </div>

              <div className="aspect-video min-h-[460px] bg-black">
                {selectedEmbedUrl ? (
                  <iframe
                    key={selectedEmbedUrl}
                    src={selectedEmbedUrl}
                    title={
                      selectedVideo?.menuName ||
                      selectedVideo?.menuCode ||
                      "Video Tutorial"
                    }
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <Video className="h-14 w-14 text-slate-700" />

                    <h3 className="mt-4 text-base font-semibold text-white">
                      No video selected
                    </h3>

                    <p className="mt-2 max-w-sm text-sm text-slate-400">
                      Select a video tutorial from the list to
                      preview it here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VideoTutorials;