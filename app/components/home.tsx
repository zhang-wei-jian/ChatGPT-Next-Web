"use client";

require("../polyfill");

import { useState, useEffect } from "react";

import styles from "./home.module.scss";

import BotIcon from "../icons/bot.svg";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, showNotice, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { ModelProvider, Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import { getISOLang, getLang } from "../locales";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { AuthPage } from "./auth";
import { getClientConfig } from "../config/client";
import { ClientApi } from "../client/api";
import { useAccessStore } from "../store";

import { reqNotice, reqStatus } from "@/app/api/requestApi/stystem";
import { marked } from "marked";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

function useHtmlLang() {
  useEffect(() => {
    const lang = getISOLang();
    const htmlLang = document.documentElement.lang;

    if (lang !== htmlLang) {
      document.documentElement.lang = lang;
    }
  }, []);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  const proxyFontUrl = "/google-fonts";
  const remoteFontUrl = "https://fonts.googleapis.com";
  const googleFontUrl =
    getClientConfig()?.buildMode === "export" ? remoteFontUrl : proxyFontUrl;
  linkEl.rel = "stylesheet";
  linkEl.href =
    googleFontUrl +
    "/css2?family=" +
    encodeURIComponent("Noto Sans:wght@300;400;700;900") +
    "&display=swap";
  document.head.appendChild(linkEl);
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isAuth = location.pathname === Path.Auth;
  const isMobileScreen = useMobileScreen();
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);

  useEffect(() => {
    loadAsyncGoogleFont();
  }, []);

  return (
    <div
      className={
        styles.container +
        ` ${shouldTightBorder ? styles["tight-container"] : styles.container} ${
          getLang() === "ar" ? styles["rtl-screen"] : ""
        }`
      }
    >
      {isAuth ? (
        <>
          <AuthPage />
        </>
      ) : (
        <>
          <SideBar className={isHome ? styles["sidebar-show"] : ""} />

          <div className={styles["window-content"]} id={SlotID.AppBody}>
            <Routes>
              <Route path={Path.Home} element={<Chat />} />
              <Route path={Path.NewChat} element={<NewChat />} />
              <Route path={Path.Masks} element={<MaskPage />} />
              <Route path={Path.Chat} element={<Chat />} />
              <Route path={Path.Settings} element={<Settings />} />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}

export function useLoadData() {
  const config = useAppConfig();

  var api: ClientApi;
  if (config.modelConfig.model.startsWith("gemini")) {
    api = new ClientApi(ModelProvider.GeminiPro);
  } else {
    api = new ClientApi(ModelProvider.GPT);
  }
  useEffect(() => {
    (async () => {
      const models = await api.llm.models();
      config.mergeModels(models);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Home() {
  const accessStore = useAccessStore();
  useSwitchTheme();
  useLoadData();
  useHtmlLang();

  useEffect(() => {
    console.log("[Config] got config from build time", getClientConfig());
    useAccessStore.getState().fetch();

    reqNextNode();
  }, []);
  const reqNextNode = async () => {
    // 使用node去帮忙获取当前系统环境变量BASE_URL
    const resdata = await fetch("/api/node");
    const res = await resdata.json();
    console.log(res);
    if (typeof res?.ENV_BASE_URL === "string" && res?.ENV_BASE_URL !== "") {
      accessStore.update((access) => (access.base_url = res.ENV_BASE_URL));
    }
    // 前端没有配置openaiUrl，使用node去获取
    if (
      accessStore.openaiUrl === "" ||
      accessStore.openaiUrl === "/api/openai"
    ) {
      // 配置了 "不" 替换前端地址暴露，不适用反向代理
      if (res?.REPLACE_ENV_BASE_URL === "0") {
        // 不做任何处理
      } else {
        // 默认替换，暴露请求地址，速度快，但是不能使用反向代理
        accessStore.update((access) => (access.openaiUrl = res.ENV_BASE_URL));
      }
    }

    getNotice();
    getStatus();
  };
  const getNotice = async () => {
    const data = await reqNotice();

    // const { success, message, data } = res.data;
    if (data) {
      // showNotice(data);
      let oldNotice = localStorage.getItem("notice");
      if (data !== oldNotice && data !== "") {
        // const htmlNotice = marked(data);
        const htmlNotice = await marked.parse(data);
        // const htmlNotice = data;
        showNotice(htmlNotice);
        localStorage.setItem("notice", data);
      }
    } else {
      // showError(message);
    }

    // const htmlNotice = await marked.parse(data);
    // showNotice(htmlNotice);
  };
  const getStatus = async () => {
    const data = await reqStatus();

    // 修改systemName
    document.title = data.system_name;
    accessStore.update((access) => (access.systemName = data.system_name));

    // 修改logo
    accessStore.update((access) => (access.logo = data.logo));
    // 获取当前页面的 favicon link 标签
    const favicon = document.querySelector('link[rel="icon"]');

    // 创建一个新的 link 元素
    const newFavicon = document.createElement("link");
    newFavicon.rel = "icon";
    newFavicon.type = "image/png"; // 指定图标类型
    newFavicon.href = data.logo; // 新图标的路径

    // 如果页面原先不存在 favicon，则直接插入新的 link 标签
    if (!favicon) {
      document.head.appendChild(newFavicon);
    } else {
      // 否则，替换原有的 favicon
      document.head.replaceChild(newFavicon, favicon);
    }

    // 修改页脚

    const htmlFooter = data.footer_html;
    const footerHtml = document.createElement("div");
    footerHtml.innerHTML = htmlFooter;
    footerHtml.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap; /* 不换行 */
`;
    // 将容器插入到整个 HTML 文档中的根元素中
    document.documentElement.appendChild(footerHtml);

    // const htmlNotice = await marked.parse(data);
    // showNotice(htmlNotice);
  };

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
