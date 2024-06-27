import { type OpenAIListModelResponse } from "@/app/client/platforms/openai";
import { getServerSideConfig } from "@/app/config/server";
import { ModelProvider, OpenaiPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";

const ALLOWD_PATH = new Set(Object.values(OpenaiPath));

async function handle(req: NextRequest, res: NextResponse) {
  const serverConfig = getServerSideConfig();

  // Promise.reject("ss")
  let baseUrl =
    serverConfig.azureUrl || serverConfig.baseUrl || "https://api.openai.com";

  // return Promise.reject(JSON.stringify(serverConfig.baseUrl))
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  // console.log("Node。serverConfig.baseUrl!@!!!!!!!!!!!!!!!!!!!？？", serverConfig.baseUrl);
  // console.log("Node!process.env.BASE_URL@!!!!!!!!!!!!!!!!!!!？？", process.env.BASE_URL);
  console.log("[Node_ENV_baseUr]", baseUrl);

  // const baseURL = process.env.MY_VARIABLE
  // return new Response("fuckYYUUYUU", {
  //   status: res.status,
  //   statusText: res.statusText,
  // });
  const BASE_URL = baseUrl;
  const REPLACE_ENV_BASE_URL = process.env.REPLACE_ENV_BASE_URL;

  return new Response(
    JSON.stringify({
      ENV_BASE_URL: BASE_URL,
      REPLACE_ENV_BASE_URL: REPLACE_ENV_BASE_URL,
    }),
    {
      status: res.status,
      statusText: res.statusText,
    },
  );
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
export const preferredRegion = [
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "iad1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
];
