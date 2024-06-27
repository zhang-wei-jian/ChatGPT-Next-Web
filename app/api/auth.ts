// 这段代码是一个用于身份验证的函数，主要功能包括：

// 解析请求中的认证信息（Authorization 头部），判断是用户提供的 API key 还是访问码（access code）。
// 根据配置信息，验证访问码的有效性，并根据需要进行处理。
// 隐藏用户自己提供的 API key，如果配置为隐藏，则不允许用户使用自己的 API key 访问。
// 如果用户没有提供 API key，则注入系统默认的 API key。
// 返回身份验证结果，如果验证通过则返回 { error: false }，否则返回 { error: true, msg: errorMessage }。
// 这段代码中使用了 getServerSideConfig 函数获取服务器端配置信息，并根据配置信息进行身份验证。另外，使用了第三方库 spark-md5 来进行 MD5 哈希计算，用于对访问码进行哈希处理。
import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX, ModelProvider } from "../constant";

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  const isApiKey = !token.startsWith(ACCESS_CODE_PREFIX);

  return {
    accessCode: isApiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isApiKey ? token : "",
  };
}

export function auth(req: NextRequest, modelProvider: ModelProvider) {
  const authToken = req.headers.get("Authorization") ?? "";

  // check if it is openai api key or user token
  const { accessCode, apiKey } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  const serverConfig = getServerSideConfig();
  console.log("[Auth] allowed hashed codes: ", [...serverConfig.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  if (serverConfig.needCode && !serverConfig.codes.has(hashedCode) && !apiKey) {
    return {
      error: true,
      msg: !accessCode ? "empty access code" : "wrong access code",
    };
  }

  if (serverConfig.hideUserApiKey && !!apiKey) {
    return {
      error: true,
      msg: "you are not allowed to access with your own api key",
    };
  }

  // if user does not provide an api key, inject system api key
  if (!apiKey) {
    const serverConfig = getServerSideConfig();

    const systemApiKey =
      modelProvider === ModelProvider.GeminiPro
        ? serverConfig.googleApiKey
        : serverConfig.isAzure
        ? serverConfig.azureApiKey
        : serverConfig.apiKey;
    if (systemApiKey) {
      console.log("[Auth] use system api key");
      req.headers.set("Authorization", `Bearer ${systemApiKey}`);
    } else {
      console.log("[Auth] admin did not provide an api key");
    }
  } else {
    console.log("[Auth] use user api key");
  }

  return {
    error: false,
  };
}
