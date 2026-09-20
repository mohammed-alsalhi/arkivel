import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import DocumentTitle from "@/components/layout/DocumentTitle";
import LayoutShell from "@/components/layout/LayoutShell";
import OverlayScrollbar from "@/components/OverlayScrollbar";
import { AdminProvider } from "@/components/AdminContext";
import { SkinProvider } from "@/components/SkinContext";
import { ToastProvider } from "@/components/Toast";
import { MaintenanceBanner, ReadOnlyBanner } from "@/components/SiteBanner";
import { config, type WikiSkin } from "@/lib/config";
import { SKIN_COOKIE, isWikiSkin } from "@/lib/skin";
import { EnabledModulesProvider } from "@/modules/client";
import { getEnabledModules } from "@/modules/enabled";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { cache } from "react";
import MediaShell from "@/components/media/MediaShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Page backgrounds per skin (see styles/tokens.css) for the browser chrome color.
const SKIN_THEME_COLORS: Record<WikiSkin, { light: string; dark: string }> = {
  wiki: { light: "#f8f9fa", dark: "#181a1b" },
  folio: { light: "#f6f7f9", dark: "#0b0b0c" },
};

// One session lookup per request, shared by the layout and the skin resolver.
const getRequestSession = cache(async () => {
  const { getSession } = await import("@/lib/auth");
  return getSession().catch(() => null);
});

// Wiki skin resolution order: the skin cookie (set when a reader picks a skin
// in settings), else the signed-in user's saved preference, else the env
// default. Cached per request so generateViewport and the layout agree.
const resolveRequestSkin = cache(async (): Promise<WikiSkin> => {
  const cookieSkin = (await cookies()).get(SKIN_COOKIE)?.value;
  if (isWikiSkin(cookieSkin)) return cookieSkin;

  const session = await getRequestSession();
  if (session) {
    const { default: prisma } = await import("@/lib/prisma");
    const pref = await prisma.userPreference
      .findUnique({ where: { userId: session.id }, select: { data: true } })
      .catch(() => null);
    const saved =
      pref && typeof pref.data === "object" && pref.data !== null
        ? (pref.data as Record<string, unknown>).skin
        : undefined;
    if (isWikiSkin(saved)) return saved;
  }

  return config.wikiSkin;
});

export async function generateViewport(): Promise<Viewport> {
  const base: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
  // The media library is dark; the wiki follows the selected color scheme.
  if (config.siteMode === "media") {
    return { ...base, themeColor: "#111113" };
  }
  const colors = SKIN_THEME_COLORS[await resolveRequestSkin().catch(() => config.wikiSkin)];
  return {
    ...base,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: colors.light },
      { media: "(prefers-color-scheme: dark)", color: colors.dark },
    ],
  };
}

// Apply the persisted theme before first paint so dark-mode readers do not get
// a white flash. The focused shell itself has no persisted layout state.
const bootstrapScript = `(function(){try{var r=document.documentElement;var t=localStorage.getItem("theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(config.baseUrl),
    title: {
      default: config.name,
      template: `${config.name} - %s`,
    },
    description: config.description,
    icons: {
      icon: [{ url: "/brand/arkivel-favicon.svg", sizes: "any", type: "image/svg+xml" }],
      apple: [{ url: config.appIcon, sizes: "512x512", type: "image/png" }],
    },
    openGraph: {
      title: config.name,
      description: config.description,
      images: [{ url: config.logo, width: 1254, height: 1254, alt: `${config.name} logo` }],
    },
  };
}

// These run on every request for every page; the data is global (not
// per-user) and changes rarely, so cache it briefly across requests.
const getShellData = unstable_cache(
  async () => {
    const { default: prisma } = await import("@/lib/prisma");
    const [allCategories, articleCount, maintenanceRecord, readOnlyRecord] = await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            orderBy: { sortOrder: "asc" },
          },
        },
      }).catch(() => []),
      prisma.article.count({ where: { published: true, status: "published" } }).catch(() => 0),
      prisma.systemSetting.findUnique({ where: { id: "maintenance_mode" } }).catch(() => null),
      prisma.systemSetting.findUnique({ where: { id: "read_only_mode" } }).catch(() => null),
    ]);
    return {
      categories: allCategories.filter((category) => !category.parentId),
      articleCount,
      maintenanceMode: maintenanceRecord?.enabled ?? false,
      readOnlyMode: readOnlyRecord?.enabled ?? false,
    };
  },
  ["layout-shell-data"],
  { revalidate: 60 },
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAdmin } = await import("@/lib/auth");

  if (config.siteMode === "media") {
    // The library shell: media navigation and pages over the same
    // backend, providers, and account pages. Always dark; no skin switch.
    const [mediaAdmin, mediaSession, mediaModules] = await Promise.all([
      isAdmin().catch(() => false),
      getRequestSession(),
      getEnabledModules(),
    ]);
    return (
      <html lang="en" data-site-mode="media" data-theme="dark" data-skin="folio">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <a href="#main-content" className="skip-to-content">Skip to content</a>
          <EnabledModulesProvider modules={mediaModules}>
          <SkinProvider skin="folio">
          <AdminProvider initialAuth={{ admin: mediaAdmin, loggedIn: Boolean(mediaSession) }}>
          <ToastProvider>
            <MediaShell>{children}</MediaShell>
            <DocumentTitle appName={config.name} />
          </ToastProvider>
          </AdminProvider>
          </SkinProvider>
          </EnabledModulesProvider>
        </body>
      </html>
    );
  }

  const [{ categories, articleCount, maintenanceMode, readOnlyMode }, initialAdmin, initialSession, skin, modules] =
    await Promise.all([
      getShellData().catch(() => ({
        categories: [],
        articleCount: 0,
        maintenanceMode: false,
        readOnlyMode: false,
      })),
      isAdmin().catch(() => false),
      getRequestSession(),
      resolveRequestSkin().catch(() => config.wikiSkin),
      getEnabledModules(),
    ]);
  const initialAuth = { admin: initialAdmin, loggedIn: Boolean(initialSession) };
  const feedsEnabled = modules.includes("feeds");
  const collections = modules.includes("collections")
    ? await import("@/modules/collections/queries")
        .then(({ listCollections }) => listCollections())
        .then((list) =>
          list.map((collection) => ({
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            categoryId: collection.category?.id ?? null,
          })),
        )
        .catch(() => [])
    : [];

  return (
    <html
      lang="en"
      data-skin={skin}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
        {feedsEnabled && (
          <>
            <link rel="alternate" type="application/rss+xml" title={`${config.name} RSS Feed`} href="/feed.xml" />
            <link rel="alternate" type="application/atom+xml" title={`${config.name} Atom Feed`} href="/feed/atom" />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-to-content">skip to content</a>
        <EnabledModulesProvider modules={modules}>
        <SkinProvider skin={skin}>
        <AdminProvider initialAuth={initialAuth}>
        <ToastProvider>
          <LayoutShell>
            <Sidebar
              articleCount={articleCount}
              brandName={config.name}
              categories={categories}
              collections={collections}
              logoMark={config.logoMark}
            />

            <div className="wiki-content-shell">
              {maintenanceMode && <MaintenanceBanner />}
              {readOnlyMode && <ReadOnlyBanner />}
              <main id="main-content" className="wiki-main-content">
                {children}
              </main>
            </div>
          </LayoutShell>
          <DocumentTitle appName={config.name} />
          <OverlayScrollbar />
        </ToastProvider>
        </AdminProvider>
        </SkinProvider>
        </EnabledModulesProvider>
      </body>
    </html>
  );
}
