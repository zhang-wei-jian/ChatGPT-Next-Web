/* eslint-disable @next/next/no-img-element */
import { ChatMessage, ModelType, useAppConfig, useChatStore } from "../store";
import Locale from "../locales";
import styles from "./exporter.module.scss";
import stylesLogin from "./stylesLogin.module.scss";
import {
  List,
  ListItem,
  ModalMini,
  Select,
  showImageModal,
  showModal,
  showToast,
  // PasswordInput,
  PasswordInputWeb,
  Popover,
} from "./ui-lib";
import { IconButton } from "./button";
import {
  copyToClipboard,
  downloadAs,
  getMessageImages,
  useMobileScreen,
} from "../utils";

import CopyIcon from "../icons/copy.svg";
import LoadingIcon from "../icons/three-dots.svg";
import ChatGptIcon from "../icons/chatgpt.png";
import ShareIcon from "../icons/share.svg";
import BotIcon from "../icons/bot.png";

import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";

import DownloadIcon from "../icons/download.svg";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSelector, useMessageSelector } from "./message-selector";
import { Avatar, AvatarPicker } from "./emoji";
import dynamic from "next/dynamic";
import NextImage from "next/image";

import { toBlob, toPng } from "html-to-image";
import { DEFAULT_MASK_AVATAR } from "../store/mask";

import { prettyObject } from "../utils/format";
import { EXPORT_MESSAGE_CLASS_NAME, ModelProvider } from "../constant";
import { getClientConfig } from "../config/client";
import { ClientApi } from "../client/api";
import { getMessageTextContent } from "../utils";

import { useAccessStore } from "../store";

import { Button } from "@nextui-org/react";
import { Input } from "@nextui-org/react";
import { RadioGroup, Radio } from "@nextui-org/react";

import {
  reqLogin,
  reqSign,
  reqSelf,
  reqTopUp,
  reqPay,
} from "@/app/api/requestApi/user";
import type { loginType, selfType, PayType } from "@/app/api/requestApi/user";
import Clipboard from "clipboard";

// const accessStore = useAccessStore();

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

export function PayMoneyMessageModal(props: { onClose: () => void }) {
  return (
    <div className="modal-mask">
      <ModalMini
        title={Locale.PayMoney.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {}}
          />,
        ]}
        footer={
          <div
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: 14,
              opacity: 0.5,
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* {Locale.Exporter.Description.Title} */}
            {/* 底部 */}
          </div>
        }
      >
        <div style={{ minHeight: "40vh" }}>
          <MessageLogin onClose={props.onClose} />

          {/* 账号 <input
            type="text"


          ></input>

          <Input></Input>

          <br></br>
          <br></br>
          密码 <input
            type="text"
          ></input>

          <Button>Ai 启动</Button> */}
        </div>
      </ModalMini>
    </div>
  );
}

function useSteps(
  steps: Array<{
    name: string;
    value: string;
  }>,
) {
  const stepCount = steps.length;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const nextStep = () =>
    setCurrentStepIndex((currentStepIndex + 1) % stepCount);
  const prevStep = () =>
    setCurrentStepIndex((currentStepIndex - 1 + stepCount) % stepCount);

  return {
    currentStepIndex,
    setCurrentStepIndex,
    nextStep,
    prevStep,
    currentStep: steps[currentStepIndex],
  };
}

function Steps<
  T extends {
    name: string;
    value: string;
  }[],
>(props: { steps: T; onStepChange?: (index: number) => void; index: number }) {
  const steps = props.steps;
  const stepCount = steps.length;

  return (
    <div className={styles["steps"]}>
      <div className={styles["steps-progress"]}>
        <div
          className={styles["steps-progress-inner"]}
          style={{
            width: `${((props.index + 1) / stepCount) * 100}%`,
          }}
        ></div>
      </div>
      <div className={styles["steps-inner"]}>
        {steps.map((step, i) => {
          return (
            <div
              key={i}
              className={`${styles["step"]} ${
                styles[i <= props.index ? "step-finished" : ""]
              } ${i === props.index && styles["step-current"]} clickable`}
              onClick={() => {
                props.onStepChange?.(i);
              }}
              role="button"
            >
              <span className={styles["step-index"]}>{i + 1}</span>
              <span className={styles["step-name"]}>{step.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MessageLogin(props: { onClose: () => void }) {
  const accessStore = useAccessStore();

  const steps = [
    {
      name: Locale.PayMoney.Steps.Select,
      value: "select",
    },
    {
      name: Locale.PayMoney.Steps.Preview,
      value: "preview",
    },
  ];
  const { currentStep, setCurrentStepIndex, currentStepIndex } =
    useSteps(steps);
  const formats = ["text", "image", "json"] as const;
  type ExportFormat = (typeof formats)[number];

  const [exportConfig, setExportConfig] = useState({
    format: "image" as ExportFormat,
    includeContext: true,
  });

  function updateExportConfig(updater: (config: typeof exportConfig) => void) {
    const config = { ...exportConfig };
    updater(config);
    setExportConfig(config);
  }

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const { selection, updateSelection } = useMessageSelector();
  const selectedMessages = useMemo(() => {
    const ret: ChatMessage[] = [];
    if (exportConfig.includeContext) {
      ret.push(...session.mask.context);
    }
    ret.push(...session.messages.filter((m) => selection.has(m.id)));
    return ret;
  }, [
    exportConfig.includeContext,
    session.messages,
    session.mask.context,
    selection,
  ]);
  function preview() {
    if (exportConfig.format === "text") {
      return (
        <MarkdownPreviewer messages={selectedMessages} topic={session.topic} />
        // <div></div>
      );
    } else if (exportConfig.format === "json") {
      return (
        <JsonPreviewer messages={selectedMessages} topic={session.topic} />
        // <div></div>
      );
    } else {
      return (
        <ImagePreviewer messages={selectedMessages} topic={session.topic} />
      );
    }
  }

  // login
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
  });
  const [payForm, setPayForm] = useState({
    amount: "",
    top_up_code: "",
    payment_method: "zfb",
  });
  const [selected, setSelected] = useState("wx");

  const onLoginOut = async () => {
    var res: loginType;
    try {
      // res = await reqLogin(userForm)
      props.onClose();
      // console.log(res, "res");

      // 更新apiKey
      accessStore.update((access) => (access.openaiApiKey = ""));

      // 更新web登录令牌
      accessStore.update((access) => (access.accessToken = ""));
      // 更新user信息
      accessStore.update((access) => (access.userName = ""));
      //  更新余额
      accessStore.update((access) => (access.quota = ""));

      showToast("退出成功");

      // localStorage.setItem("user", JSON.stringify(res))
      // localStorage.setItem("userAzure", res.access_token)
    } catch (error) {
      alert(error);
    }
  };
  const [isLoading, setIsloading] = useState(false);

  // sign
  const [signForm, setSignForm] = useState({
    key: "",
  });

  const onTopUp = async () => {
    if (signForm.key.trim() === "") {
      showToast("兑换码不能为空");
      return;
    }
    setIsloading(true);
    try {
      const res = await reqTopUp(signForm);

      showToast("兑换成功！");
    } catch (error) {}

    setIsloading(false);
  };
  // 支付
  const onTopUpLink = async () => {
    if (parseInt(payForm.amount) <= 0 || payForm.amount.trim() === "") {
      showToast("最少充值1");
      return;
    }
    setIsloading(true);
    try {
      const data = await reqPay({
        ...payForm,
        amount: parseInt(payForm.amount),
      });
      // showInfo(message);
      console.log(data, "data");

      let params = data;
      let url = data.url;
      let form = document.createElement("form");
      form.action = url;
      form.method = "POST";
      // 判断是否为safari浏览器
      let isSafari =
        navigator.userAgent.indexOf("Safari") > -1 &&
        navigator.userAgent.indexOf("Chrome") < 1;
      if (!isSafari) {
        form.target = "_blank";
      }
      for (let key in params) {
        if (key === "url") {
          continue;
        }
        let input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = params[key as keyof PayType]; //断言迭代key是PayType的类型，而不是any
        form.appendChild(input);

        // console.log(input.value, "!!!!!!!!!!params[key]");
      }
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      // showToast("兑换成功！")
    } catch (error) {
      console.log(error);
    }

    setIsloading(false);
  };
  const copy = async (text: string) => {
    // api后台的方法，可能会失败不够严谨
    // let okay = true;
    // try {
    //   await navigator.clipboard.writeText(text);
    // } catch (e) {
    //   okay = false;
    //   console.error(e);
    // }
    // return okay;

    // next-web方法
    try {
      if (window.__TAURI__) {
        window.__TAURI__.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      showToast(Locale.Copy.Success);
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        showToast(Locale.Copy.Success);
      } catch (error) {
        showToast(Locale.Copy.Failed);
      }
      document.body.removeChild(textArea);
    }

    // // csdn
    // var clipBoard = new Clipboard('.copyBtn')
    // clipBoard.on('success', function () {
    //   clipBoard.destroy() // 销毁上一次的复制内容
    //   clipBoard = new Clipboard('#btn')
    //   showToast(Locale.Copy.Success);
    // })
    // clipBoard.on('error', function () {
    //   showToast(Locale.Copy.Failed);
    // })
  };

  const handleAffLinkClick = async () => {
    // console.log(e);
    // e.target.select();
    // await copy(e.target.value);
    await copy(affLink);

    // showToast("邀请链接已复制到剪切板")
  };

  // console.log("accessStore.aff_codeaccessStore.aff_codeaccessStore.aff_code", accessStore.aff_code);

  const [userInfo, setUserInfo] = useState<selfType>();
  // const [affLink, setAffLink] = useState(`${accessStore.openaiUrl}/register?aff=${accessStore.aff_code}`);
  const [affLink, setAffLink] = useState(
    `${window.location.origin}?aff=${accessStore.aff_code}`,
  );

  const getSelf = async () => {
    try {
      const res = await reqSelf();
      setUserInfo(res);

      //  更新余额
      accessStore.update((access) => (access.quota = String(res.quota)));
      //  更新邀请链接
      accessStore.update((access) => (access.aff_code = String(res.aff_code)));

      let link = `${window.location.origin}?aff=${res.aff_code}`;
      setAffLink(link);
    } catch (error) {}
  };

  const config = useAppConfig();
  const updateConfig = config.update;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    getSelf();
  }, []);

  // 监视aff_code 自动改变
  useEffect(() => {
    setAffLink(`${window.location.origin}?aff=${accessStore.aff_code}`);
  }, [accessStore.aff_code]);

  return (
    <>
      <Steps
        steps={steps}
        index={currentStepIndex}
        onStepChange={setCurrentStepIndex}
      />
      <div
        className={stylesLogin["loginBox"]}
        style={currentStep.value !== "select" ? { display: "none" } : {}}
      >
        {/* page2Oone */}

        {/*  */}

        <div className={stylesLogin["loginBox"]}>
          <div>你好 ，{accessStore.userName}</div>

          <div>
            {accessStore.quota && (
              // 在这里使用 userInfo
              <></>
            )}
          </div>

          <div className={stylesLogin["inputrow"]}>
            <IconButton
              text={" 余额：" + accessStore.quota + ""}
              onClick={() => null}
              shadow
            />
          </div>

          <div className={stylesLogin["inputrow"]}>
            <input
              type="text"
              value={payForm.amount}
              placeholder="充值数量，最低1$"
              onChange={(e) =>
                setPayForm({ ...payForm, amount: e.target.value })
              }
            />
          </div>

          <div className={stylesLogin["inputrow"]}></div>

          <div className={stylesLogin["inputrow"]}>
            <div></div>
            {/* <IconButton
                className="copyBtn"
                text={" 我的邀请码" + affLink}
                onClick={handleAffLinkClick}
                shadow
              /> */}
          </div>

          <div>
            <RadioGroup
              // label="支付方式"
              label=""
              defaultValue="zfb"
              color="secondary"
              value={payForm.payment_method}
              onValueChange={(v) =>
                setPayForm({ ...payForm, payment_method: v })
              }
            >
              <Radio value="zfb">支付宝</Radio>
              <Radio value="wx">微信</Radio>
            </RadioGroup>
          </div>

          <br></br>
          <div className={stylesLogin["inputrow"]}>
            {/* <Button color="danger" onClick={onLoginOut} className={stylesLogin["btn"]} >退出登录</Button> */}
            <Button
              className={stylesLogin["btn"]}
              color="secondary"
              onClick={onTopUpLink}
              isLoading={isLoading}
            >
              充值
            </Button>
          </div>
        </div>
      </div>
      {currentStep.value === "preview" && (
        // <div className={styles["message-exporter-body"]}>{preview()}</div>

        <>
          {/* <div>page2</div> */}
          {/* <Input type="password" label="确认密码" variant={"bordered"} value={signForm.password2} onChange={(e) => setSignForm({ ...signForm, password2: e.target.value })} /> */}

          <div className={stylesLogin["loginBox"]}>
            <div className={stylesLogin["label"]}>兑换码</div>

            <div className={stylesLogin["inputrow"]}>
              <input
                type="text"
                value={signForm.key}
                placeholder="输入您的兑换码"
                onChange={(e) =>
                  setSignForm({ ...signForm, key: e.target.value })
                }
              />
            </div>

            <br></br>
            <div className={stylesLogin["inputrow"]}>
              {/* <Button color="success" onClick={onSign} className={stylesLogin["btn"]}>注册</Button> */}
              <Button
                className={stylesLogin["btn"]}
                color="secondary"
                onClick={onTopUp}
                isLoading={isLoading}
              >
                兑换
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function RenderExport(props: {
  messages: ChatMessage[];
  onRender: (messages: ChatMessage[]) => void;
}) {
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!domRef.current) return;
    const dom = domRef.current;
    const messages = Array.from(
      dom.getElementsByClassName(EXPORT_MESSAGE_CLASS_NAME),
    );

    if (messages.length !== props.messages.length) {
      return;
    }

    const renderMsgs = messages.map((v, i) => {
      const [role, _] = v.id.split(":");
      return {
        id: i.toString(),
        role: role as any,
        content: role === "user" ? v.textContent ?? "" : v.innerHTML,
        date: "",
      };
    });

    props.onRender(renderMsgs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={domRef}>
      {props.messages.map((m, i) => (
        <div
          key={i}
          id={`${m.role}:${i}`}
          className={EXPORT_MESSAGE_CLASS_NAME}
        >
          <Markdown content={getMessageTextContent(m)} defaultShow />
        </div>
      ))}
    </div>
  );
}

export function PreviewActions(props: {
  download: () => void;
  copy: () => void;
  showCopy?: boolean;
  messages?: ChatMessage[];
}) {
  const [loading, setLoading] = useState(false);
  const [shouldExport, setShouldExport] = useState(false);
  const config = useAppConfig();
  const onRenderMsgs = (msgs: ChatMessage[]) => {
    setShouldExport(false);

    var api: ClientApi;
    if (config.modelConfig.model.startsWith("gemini")) {
      api = new ClientApi(ModelProvider.GeminiPro);
    } else {
      api = new ClientApi(ModelProvider.GPT);
    }

    api
      .share(msgs)
      .then((res) => {
        if (!res) return;
        showModal({
          title: Locale.PayMoney.Share,
          children: [
            <input
              type="text"
              value={res}
              key="input"
              style={{
                width: "100%",
                maxWidth: "unset",
              }}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            ></input>,
          ],
          actions: [
            <IconButton
              icon={<CopyIcon />}
              text={Locale.Chat.Actions.Copy}
              key="copy"
              onClick={() => copyToClipboard(res)}
            />,
          ],
        });
        setTimeout(() => {
          window.open(res, "_blank");
        }, 800);
      })
      .catch((e) => {
        console.error("[Share]", e);
        showToast(prettyObject(e));
      })
      .finally(() => setLoading(false));
  };

  const share = async () => {
    if (props.messages?.length) {
      setLoading(true);
      setShouldExport(true);
    }
  };

  return (
    <>
      <div className={styles["preview-actions"]}>
        {props.showCopy && (
          <IconButton
            text={Locale.PayMoney.Copy}
            bordered
            shadow
            icon={<CopyIcon />}
            onClick={props.copy}
          ></IconButton>
        )}
        <IconButton
          text={Locale.PayMoney.Download}
          bordered
          shadow
          icon={<DownloadIcon />}
          onClick={props.download}
        ></IconButton>
        <IconButton
          text={Locale.PayMoney.Share}
          bordered
          shadow
          icon={loading ? <LoadingIcon /> : <ShareIcon />}
          onClick={share}
        ></IconButton>
      </div>
      <div
        style={{
          position: "fixed",
          right: "200vw",
          pointerEvents: "none",
        }}
      >
        {shouldExport && (
          <RenderExport
            messages={props.messages ?? []}
            onRender={onRenderMsgs}
          />
        )}
      </div>
    </>
  );
}

function ExportAvatar(props: { avatar: string }) {
  if (props.avatar === DEFAULT_MASK_AVATAR) {
    return (
      <img
        src={BotIcon.src}
        width={30}
        height={30}
        alt="bot"
        className="user-avatar"
      />
    );
  }

  return <Avatar avatar={props.avatar} />;
}

export function ImagePreviewer(props: {
  messages: ChatMessage[];
  topic: string;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const mask = session.mask;
  const config = useAppConfig();

  const previewRef = useRef<HTMLDivElement>(null);

  const copy = () => {
    showToast(Locale.PayMoney.Image.Toast);
    const dom = previewRef.current;
    if (!dom) return;
    toBlob(dom).then((blob) => {
      if (!blob) return;
      try {
        navigator.clipboard
          .write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ])
          .then(() => {
            showToast(Locale.Copy.Success);
            refreshPreview();
          });
      } catch (e) {
        console.error("[Copy Image] ", e);
        showToast(Locale.Copy.Failed);
      }
    });
  };

  const isMobile = useMobileScreen();

  const download = async () => {
    showToast(Locale.PayMoney.Image.Toast);
    const dom = previewRef.current;
    if (!dom) return;

    const isApp = getClientConfig()?.isApp;

    try {
      const blob = await toPng(dom);
      if (!blob) return;

      if (isMobile || (isApp && window.__TAURI__)) {
        if (isApp && window.__TAURI__) {
          const result = await window.__TAURI__.dialog.save({
            defaultPath: `${props.topic}.png`,
            filters: [
              {
                name: "PNG Files",
                extensions: ["png"],
              },
              {
                name: "All Files",
                extensions: ["*"],
              },
            ],
          });

          if (result !== null) {
            const response = await fetch(blob);
            const buffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            await window.__TAURI__.fs.writeBinaryFile(result, uint8Array);
            showToast(Locale.Download.Success);
          } else {
            showToast(Locale.Download.Failed);
          }
        } else {
          showImageModal(blob);
        }
      } else {
        const link = document.createElement("a");
        link.download = `${props.topic}.png`;
        link.href = blob;
        link.click();
        refreshPreview();
      }
    } catch (error) {
      showToast(Locale.Download.Failed);
    }
  };

  const refreshPreview = () => {
    const dom = previewRef.current;
    if (dom) {
      dom.innerHTML = dom.innerHTML; // Refresh the content of the preview by resetting its HTML for fix a bug glitching
    }
  };

  return (
    <div className={styles["image-previewer"]}>
      <PreviewActions
        copy={copy}
        download={download}
        showCopy={!isMobile}
        messages={props.messages}
      />
      <div
        className={`${styles["preview-body"]} ${styles["default-theme"]}`}
        ref={previewRef}
      >
        <div className={styles["chat-info"]}>
          <div className={styles["logo"] + " no-dark"}>
            <NextImage
              src={ChatGptIcon.src}
              alt="logo"
              width={50}
              height={50}
            />
          </div>

          <div>
            <div className={styles["main-title"]}>NextChat</div>
            <div className={styles["sub-title"]}>
              github.com/Yidadaa/ChatGPT-Next-Web
            </div>
            <div className={styles["icons"]}>
              <ExportAvatar avatar={config.avatar} />
              <span className={styles["icon-space"]}>&</span>
              <ExportAvatar avatar={mask.avatar} />
            </div>
          </div>
          <div>
            <div className={styles["chat-info-item"]}>
              {Locale.Exporter.Model}: {mask.modelConfig.model}
            </div>
            <div className={styles["chat-info-item"]}>
              {Locale.Exporter.Messages}: {props.messages.length}
            </div>
            <div className={styles["chat-info-item"]}>
              {Locale.Exporter.Topic}: {session.topic}
            </div>
            <div className={styles["chat-info-item"]}>
              {Locale.Exporter.Time}:{" "}
              {new Date(
                props.messages.at(-1)?.date ?? Date.now(),
              ).toLocaleString()}
            </div>
          </div>
        </div>
        {props.messages.map((m, i) => {
          return (
            <div
              className={styles["message"] + " " + styles["message-" + m.role]}
              key={i}
            >
              <div className={styles["avatar"]}>
                <ExportAvatar
                  avatar={m.role === "user" ? config.avatar : mask.avatar}
                />
              </div>

              <div className={styles["body"]}>
                <Markdown
                  content={getMessageTextContent(m)}
                  fontSize={config.fontSize}
                  defaultShow
                />
                {getMessageImages(m).length == 1 && (
                  <img
                    key={i}
                    src={getMessageImages(m)[0]}
                    alt="message"
                    className={styles["message-image"]}
                  />
                )}
                {getMessageImages(m).length > 1 && (
                  <div
                    className={styles["message-images"]}
                    style={
                      {
                        "--image-count": getMessageImages(m).length,
                      } as React.CSSProperties
                    }
                  >
                    {getMessageImages(m).map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="message"
                        className={styles["message-image-multi"]}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MarkdownPreviewer(props: {
  messages: ChatMessage[];
  topic: string;
}) {
  const mdText =
    `# ${props.topic}\n\n` +
    props.messages
      .map((m) => {
        return m.role === "user"
          ? `## ${Locale.PayMoney.MessageFromYou}:\n${getMessageTextContent(m)}`
          : `## ${Locale.PayMoney.MessageFromChatGPT}:\n${getMessageTextContent(
              m,
            ).trim()}`;
      })
      .join("\n\n");

  const copy = () => {
    copyToClipboard(mdText);
  };
  const download = () => {
    downloadAs(mdText, `${props.topic}.md`);
  };
  return (
    <>
      <PreviewActions
        copy={copy}
        download={download}
        showCopy={true}
        messages={props.messages}
      />
      <div className="markdown-body">
        <pre className={styles["export-content"]}>{mdText}</pre>
      </div>
    </>
  );
}

export function JsonPreviewer(props: {
  messages: ChatMessage[];
  topic: string;
}) {
  const msgs = {
    messages: [
      {
        role: "system",
        content: `${Locale.FineTuned.Sysmessage} ${props.topic}`,
      },
      ...props.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
  };
  const mdText = "```json\n" + JSON.stringify(msgs, null, 2) + "\n```";
  const minifiedJson = JSON.stringify(msgs);

  const copy = () => {
    copyToClipboard(minifiedJson);
  };
  const download = () => {
    downloadAs(JSON.stringify(msgs), `${props.topic}.json`);
  };

  return (
    <>
      <PreviewActions
        copy={copy}
        download={download}
        showCopy={false}
        messages={props.messages}
      />
      <div className="markdown-body" onClick={copy}>
        <Markdown content={mdText} />
      </div>
    </>
  );
}
