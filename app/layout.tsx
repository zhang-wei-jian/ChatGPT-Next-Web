/* eslint-disable @next/next/no-page-custom-font */
import "./styles/globals.scss";
import "./styles/markdown.scss";
import "./styles/highlight.scss";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { getClientConfig } from "./config/client";
import { type Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getServerSideConfig } from "./config/server";
import { GoogleTagManager } from "@next/third-parties/google";
import { Providers } from "./providers";

const serverConfig = getServerSideConfig();

export const metadata: Metadata = {
  // title: "NextChat",
  title: "AI助手",
  description: "Your personal ChatGPT Chat Bot.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
  ],
  appleWebApp: {
    title: "NextChat",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <meta name="config" content={JSON.stringify(getClientConfig())} />
        <link rel="manifest" href="/site.webmanifest"></link>
        <script src="/serviceWorkerRegister.js" defer></script>
      </head>

      <body>
        {/* <Providers> */}
        <ToastContainer />
        <div id="imageBG">
          {/* <img src="/colorBG.png" alt="" /> */}
          <img
            src="https://static.xiedaimala.com/xdml/image/5939aa7c-d446-47c4-a9c1-ea1e52b10249/MjAyMy00LTIwLTIwLTE2LTQ3LTY5OQ==.png"
            alt=""
          />
        </div>
        {children}
        {serverConfig?.isVercel && (
          <>
            <SpeedInsights />
          </>
        )}
        {serverConfig?.gtmId && (
          <>
            <GoogleTagManager gtmId={serverConfig.gtmId} />
          </>
        )}

        {/* </Providers> */}
      </body>
    </html>
  );
}
