/* eslint-disable @next/next/no-img-element */
import { ChatMessage, ModelType, useAppConfig, useChatStore } from "../store";
import Locale from "../locales";
import styles from "./exporter.module.scss";
import stylesLogin from "./stylesLogin.module.scss";
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
import Loading from "../icons/loading.svg";

import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";

import DownloadIcon from "../icons/download.svg";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSelector, useMessageSelector } from "./message-selector";
import { Avatar } from "./emoji";
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

import { reqLogin, reqSign } from "@/app/api/requestApi/user";
import type { loginType } from "@/app/api/requestApi/user";

// const accessStore = useAccessStore();

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

export function LoginMessageModal(props: { onClose: () => void }) {
  return (
    <div className="modal-mask">
      <ModalMini
        title={Locale.Login.Title}
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
      name: Locale.Login.Steps.Select,
      value: "select",
    },
    {
      name: Locale.Login.Steps.Preview,
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

  const [isLoading, setIsloading] = useState(false);
  // login
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
  });
  const onLogin = async () => {
    var res: loginType;
    try {
      setIsloading(true);
      //登录成功，修改apiKey和自定义的用户信息
      res = await reqLogin(userForm);
      props.onClose();
      console.log(res, "res");
      showToast(" 登录成功");

      // 更新apiKey
      accessStore.update(
        (access) => (access.openaiApiKey = "sk-" + res.token_default),
      );
      // console.log("!!!!!!!" + accessStore.openaiApiKey);

      // 更新web登录令牌
      accessStore.update((access) => (access.accessToken = res.access_token));
      // 更新user信息
      accessStore.update((access) => (access.userName = res.username));

      //  更新余额
      accessStore.update((access) => (access.quota = String(res.quota)));
      //  更新邀请链接
      accessStore.update((access) => (access.aff_code = String(res.aff_code)));

      localStorage.setItem("user", JSON.stringify(res));
      localStorage.setItem("userAzure", res.access_token);
    } catch (error) {
      // setIsloading(false)
      // alert(error)
    }

    setIsloading(false);
  };
  // sign
  const [signForm, setSignForm] = useState({
    username: "",
    password: "",
    password2: "",
    aff_code: "",
  });
  const loginBtnRef = useRef<HTMLButtonElement>(null);

  // 注册
  const onSign = async () => {
    // 获取地址栏中的查询参数
    const queryParams = new URLSearchParams(window.location.search);

    // 获取特定参数的值
    const affCode = queryParams.get("aff");

    console.log(affCode);

    var formBody = {
      ...signForm,
    };
    if (affCode) {
      formBody = {
        ...signForm,
        aff_code: affCode,
      };
    }

    try {
      setIsloading(true);
      const res = await reqSign(formBody);
      showToast(" 注册成功,请登录");
      // 进入登录页面

      setUserForm({ ...formBody });
      setCurrentStepIndex(0);
      setTimeout(() => {
        // loginBtnRef.current?.click()
      }, 1);
      // loginBtnRef.current?.click()
    } catch (error) {}
    setIsloading(false);
  };
  const passwordOnChange = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // setUserForm({ ...userForm, password: e.currentTarget.value })
    if (e.key === "Enter") {
      // 处理回车事件
      console.log(e, "e.key");
      onLogin();
    }
  };
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

        <div className={stylesLogin["loginBox"]}>
          {/* process.env.BASE_URL{process.env.BASE_URL} */}

          {/* <div>  NEXT_PUBLIC_BASE_URL={process.env.NEXT_PUBLIC_BASE_URL}</div> */}
          {/* <div>  NEXT_PUBLIC_BITCH={process.env.NEXT_PUBLIC_BITCH}</div> */}
          {/* <div>  NEXT_PUBLIC_BB={process.env.NEXT_PUBLIC_BB}</div> */}
          {/* <div>  MY_VARIABLE=={process.env.MY_VARIABLE}</div> */}
          {/* <div> ENV_BASE_URL!!=={process.env.ENV_BASE_URL}</div> */}
          {/* <div> NEXT_PUBLIC_BASE_URL={process.env.NEXT_PUBLIC_BASE_URL}</div> */}
          {/* <div> process.env.BASE_URL={process.env.BASE_URL}</div> */}
          {/* <div> CONST_ENV_BASE_URL={process.env.CONST_ENV_BASE_URL}</div> */}
          <div className={stylesLogin["label"]}>账号</div>

          <div className={stylesLogin["inputrow"]}>
            <input
              type="text"
              placeholder="输入你的账号"
              value={userForm.username}
              onChange={(e) =>
                setUserForm({ ...userForm, username: e.target.value })
              }
            />
          </div>
          <div className={stylesLogin["label"]}>密码</div>
          <div className={stylesLogin["inputrow"]}>
            {/* <Loading /> */}
            {/* <PasswordInputWeb type="password" placeholder="密码别忘喽" label="密码" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.currentTarget.value })} /> */}
            <PasswordInputWeb
              type="password"
              placeholder="密码别忘喽"
              label="密码"
              value={userForm.password}
              onKeyPress={(e) => passwordOnChange(e)}
              onChange={(e) =>
                setUserForm({ ...userForm, password: e.currentTarget.value })
              }
            />
          </div>

          <br></br>
          <div className={stylesLogin["inputrow"]}>
            <Button
              color="primary"
              onClick={onLogin}
              className={stylesLogin["btn"]}
              ref={loginBtnRef}
              isLoading={isLoading}
            >
              登录
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
            <div className={stylesLogin["label"]}>注册账号</div>

            <div className={stylesLogin["inputrow"]}>
              <input
                type="text"
                value={signForm.username}
                placeholder="起一个名字吧"
                onChange={(e) =>
                  setSignForm({ ...signForm, username: e.target.value })
                }
              />
            </div>
            <div className={stylesLogin["label"]}>确认密码</div>
            <div className={stylesLogin["inputrow"]}>
              <PasswordInputWeb
                type="password"
                label="密码"
                placeholder="设置8-20位密码"
                value={signForm.password}
                onChange={(e) =>
                  setSignForm({ ...signForm, password: e.currentTarget.value })
                }
              />
            </div>

            <br></br>
            <div className={stylesLogin["inputrow"]}>
              <Button
                color="success"
                onClick={onSign}
                className={stylesLogin["btn"]}
                isLoading={isLoading}
              >
                注册
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
          title: Locale.Login.Share,
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
            text={Locale.Login.Copy}
            bordered
            shadow
            icon={<CopyIcon />}
            onClick={props.copy}
          ></IconButton>
        )}
        <IconButton
          text={Locale.Login.Download}
          bordered
          shadow
          icon={<DownloadIcon />}
          onClick={props.download}
        ></IconButton>
        <IconButton
          text={Locale.Login.Share}
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
    showToast(Locale.Login.Image.Toast);
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
    showToast(Locale.Login.Image.Toast);
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
          ? `## ${Locale.Login.MessageFromYou}:\n${getMessageTextContent(m)}`
          : `## ${Locale.Login.MessageFromChatGPT}:\n${getMessageTextContent(
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
