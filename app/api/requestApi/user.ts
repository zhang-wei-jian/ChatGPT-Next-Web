import myAxios from "@/app/utils/myaxios";

// login
export const reqLogin = (body: {
  username: string;
  password: string;
  aff_code?: string;
}): Promise<loginType> => {
  return myAxios.post("/api/user/loginShop", body);
};

// sign
export const reqSign = (body: {
  username: string;
  password: string;
  password2: string;
}) => {
  return myAxios.post("/api/user/registerandcreatetoken", body);
};

// self
export const reqSelf = (): Promise<selfType> => {
  return myAxios.get("/api/user/self");
};

// Pay
export const reqPay = (body: {
  amount: number;
  top_up_code: string;
  payment_method: string;
}): Promise<PayType> => {
  return myAxios.post("/api/user/pay", body);
};

// 兑换券
export const reqTopUp = (body: { key: string }) => {
  return myAxios.post("/api/user/topup", body);
};

// 兑换券
export const reqTopUpLink = (body: { key: string }) => {
  return myAxios.post("/api/user/topup", body);
};

export type loginType = {
  id: number;
  username: string;
  password: string;
  display_name: string;
  role: number;
  status: number;
  email: string;
  github_id: string;
  wechat_id: string;
  telegram_id: string;
  verification_code: string;
  access_token: string;
  quota: number;
  used_quota: number;
  request_count: number;
  group: string;
  aff_code: string;
  aff_count: number;
  aff_quota: number;
  aff_history_quota: number;
  inviter_id: number;
  DeletedAt: string | null;
  token_default: string;
};
export type selfType = {
  id: number;
  username: string;
  password: string;
  display_name: string;
  role: number;
  status: number;
  email: string;
  github_id: string;
  wechat_id: string;
  telegram_id: string;
  verification_code: string;
  access_token: string;
  quota: number;
  used_quota: number;
  request_count: number;
  group: string;
  aff_code: string;
  aff_count: number;
  aff_quota: number;
  aff_history_quota: number;
  inviter_id: number;
  DeletedAt: string | null;
};

export type PayType = {
  device: string;
  money: string;
  name: string;
  notify_url: string;
  out_trade_no: string;
  pid: string;
  return_url: string;
  sign: string;
  sign_type: string;
  type: string;
  url: string;
};
