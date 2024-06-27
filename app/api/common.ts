// 这段代码是一个用于代理 OpenAI 请求的函数，它接受一个 Next.js 的请求对象 req，并返回一个 Next.js 的响应对象。主要的功能包括：

// 解析请求头部，从中提取认证信息（如 API key）和路径信息。
// 构建代理请求的 URL 和请求选项，包括请求头部和请求方法等。
// 发出代理请求，并处理响应，删除一些不必要的响应头部，并返回处理后的响应对象。
// 在代理请求的过程中，还包括了一些特殊的处理逻辑，例如：

// 设置超时机制，防止请求长时间未返回导致阻塞。
// 根据配置信息，处理特定的路径和请求方法。
// 根据请求体中的信息，进行特定的处理，例如过滤不允许的模型请求。
// 这段代码比较复杂，涉及了很多细节和特殊情况的处理。

// 这段代码实现了对 OpenAI 请求的二次封装，并在其中包含了一些拦截器的逻辑。

// 在函数 requestOpenai 中，有以下几个部分是拦截器的功能：

// 请求拦截器：

// 在函数开始处，根据服务器配置信息和请求头部提取认证信息，并构建代理请求的 URL 和请求选项。
// 在构建请求选项时，根据请求体中的信息进行特定的处理，例如过滤不允许的模型请求。
// 响应拦截器：

// 在发出代理请求后，处理代理服务器返回的响应。
// 删除一些不必要的响应头部，并返回处理后的响应对象。
// 此外，该函数还包括了一些其他的拦截器相关的功能，例如设置超时机制、处理特定的路径和请求方法等。

// 因此，这段代码可以看作是对 OpenAI 请求的二次封装，其中包含了拦截器的功能，用于在请求发出前和响应返回后进行特定的处理。
import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "../config/server";
import { DEFAULT_MODELS, OPENAI_BASE_URL, GEMINI_BASE_URL } from "../constant";
import { collectModelTable } from "../utils/model";
import { makeAzurePath } from "../azure";

const serverConfig = getServerSideConfig();

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();

  var authValue,
    authHeaderName = "";
  if (serverConfig.isAzure) {
    authValue =
      req.headers
        .get("Authorization")
        ?.trim()
        .replaceAll("Bearer ", "")
        .trim() ?? "";

    authHeaderName = "api-key";
  } else {
    authValue = req.headers.get("Authorization") ?? "";
    authHeaderName = "Authorization";
  }

  let path = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/openai/",
    "",
  );

  let baseUrl =
    serverConfig.azureUrl || serverConfig.baseUrl || OPENAI_BASE_URL;

  // return Promise.reject(JSON.stringify(serverConfig.baseUrl))
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);
  // this fix [Org ID] undefined in server side if not using custom point
  if (serverConfig.openaiOrgId !== undefined) {
    console.log("[Org ID]", serverConfig.openaiOrgId);
  }

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  if (serverConfig.isAzure) {
    if (!serverConfig.azureApiVersion) {
      return NextResponse.json({
        error: true,
        message: `missing AZURE_API_VERSION in server env vars`,
      });
    }
    path = makeAzurePath(path, serverConfig.azureApiVersion);
  }

  const fetchUrl = `${baseUrl}/${path}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      [authHeaderName]: authValue,
      ...(serverConfig.openaiOrgId && {
        "OpenAI-Organization": serverConfig.openaiOrgId,
      }),
    },
    method: req.method,
    body: req.body,
    // to fix #2485: https://stackoverflow.com/questions/55920957/cloudflare-worker-typeerror-one-time-use-body
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  // #1815 try to refuse gpt4 request
  if (serverConfig.customModels && req.body) {
    try {
      const modelTable = collectModelTable(
        DEFAULT_MODELS,
        serverConfig.customModels,
      );
      const clonedBody = await req.text();
      fetchOptions.body = clonedBody;

      const jsonBody = JSON.parse(clonedBody) as { model?: string };

      // not undefined and is false
      if (modelTable[jsonBody?.model ?? ""].available === false) {
        return NextResponse.json(
          {
            error: true,
            message: `you are not allowed to use ${jsonBody?.model} model`,
          },
          {
            status: 403,
          },
        );
      }
    } catch (e) {
      console.error("[OpenAI] gpt4 filter", e);
    }
  }

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    // The latest version of the OpenAI API forced the content-encoding to be "br" in json response
    // So if the streaming is disabled, we need to remove the content-encoding header
    // Because Vercel uses gzip to compress the response, if we don't remove the content-encoding header
    // The browser will try to decode the response with brotli and fail
    newHeaders.delete("content-encoding");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
