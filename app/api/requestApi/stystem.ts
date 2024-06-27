import myAxios from "@/app/utils/myaxios";

//Notice
export const reqNotice = (): Promise<string> => {
  return myAxios.get("/api/notice");
};

//Notice
export const reqStatus = (): Promise<SystemConfig> => {
  return myAxios.get("/api/status");
};

interface SystemConfig {
  chat_link: string;
  chat_link2: string;
  data_export_default_time: string;
  default_collapse_sidebar: boolean;
  display_in_currency: boolean;
  email_verification: boolean;
  enable_batch_update: boolean;
  enable_data_export: boolean;
  enable_drawing: boolean;
  enable_online_topup: boolean;
  footer_html: string;
  github_client_id: string;
  github_oauth: boolean;
  logo: string;
  min_topup: number;
  mj_notify_enabled: boolean;
  price: number;
  quota_per_unit: number;
  server_address: string;
  start_time: number;
  system_name: string;
  telegram_bot_name: string;
  telegram_oauth: boolean;
  top_up_link: string;
  turnstile_check: boolean;
  turnstile_site_key: string;
  wechat_login: boolean;
  wechat_qrcode: string;
}
