import axios from "axios";
// import { useUserStore } from '../store/user.js'
// import { reqLogin, reqUserInfo } from "@/api/login"
// import router from '../router/index.js'
import {
  ApiPath,
  DEFAULT_API_HOST,
  DEFAULT_MODELS,
  OpenaiPath,
  REQUEST_TIMEOUT_MS,
  ServiceProvider,
} from "@/app/constant";

import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";
// import { getServerSideConfig } from "@/app/config/server";
import {
  List,
  ListItem,
  Modal,
  ModalMini,
  Select,
  showImageModal,
  showModal,
  showToast,
  // PasswordInput,
  PasswordInputWeb,
} from "@/app/components/ui-lib";

import getConfig from "next/config";
// const { publicRuntimeConfig } = getConfig();

// const serverConfig = getServerSideConfig();

const instance = axios.create({
  // baseURL: '/proxy',
  // baseURL: baseUrl,
  // headers: {
  //   Accept: 'fz56yse2881nd2r0fz56yse2881nd2r0'
  // }
});

instance.interceptors.request.use(
  function (config) {
    const accessStore = useAccessStore.getState();

    let baseUrl = accessStore.openaiUrl;
    // 没有设置OPENAI的URL
    if (baseUrl === "/api/openai") {
      baseUrl = "";
    }
    // console.log("baseUrl", accessStore.base_url);

    // 如果前端输入了就使用前端，不然使用node后端的环境来请求的后端axios地址
    config.baseURL = baseUrl || accessStore.base_url;

    // config.baseURL = "/api/openai/"

    if ("/api/add_article_model" === config.url) {
    }

    // console.log("env_BASEURL=", process.env.NEXT_PUBLIC_BASE_URL);

    console.log(config.url, "=>config.url");

    // Do something before request is sent
    // const access_token = localStorage.getItem('userAzure');
    const access_token = accessStore.accessToken;
    if (access_token) {
      // config.headers['Authorization'] = `Bearer ${access_token}`;
      config.headers["Authorization"] = `${access_token}`;
    }

    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  function (response) {
    // Do something with response data
    console.log(response, "响应体");
    // return response.data.data;
    if (response?.data?.url) {
      response.data.data.url = response?.data?.url;
    }

    if (response?.data?.success === false) {
      console.log("paochucuowu ");
      showToast(response.data.message);
      return Promise.reject(response.data.message);
    }
    if (response?.data?.message !== "") {
      showToast(response.data.message);
    }

    return response.data.data;
  },
  function (error) {
    const message = error?.response.data?.message || "授权过期，重新登陆";

    // const userStore = useUserStore()
    console.log(error, "error");

    const accessStore = useAccessStore.getState();
    if (error?.response?.status === 401) {
      // userStore.removeUserStore()
      // alert('授权过期，重新登陆');

      // showToast("授权过期，重新登陆" + message)
      showToast(message);
      // router.push('/login')
      // 更新apiKey
      // 弹出登录框
      accessStore.update((access) => (access.showLogin = true));
      // 关闭其他框
      accessStore.update((access) => (access.showUserInfo = false));
      accessStore.update((access) => (access.showPayMoney = false));

      accessStore.update((access) => (access.openaiApiKey = ""));

      // 更新web登录令牌
      accessStore.update((access) => (access.accessToken = ""));
      // 更新user信息
      accessStore.update((access) => (access.userName = ""));
    } else if (error.response.status === 403) {
      alert("禁止访问");
    } else if (error.response.status === 404) {
      alert("错误访问");
    } else if (error.response.status === 429) {
      // alert('请求频繁，稍后再试')
      showToast("请求频繁，稍后再试");
    } else if (error.response.status === 500) {
      alert("服务器出错");
    }

    // console.log("caoniam", error);

    // Do something with response error
    return Promise.reject(error);
  },
);

export default instance;
