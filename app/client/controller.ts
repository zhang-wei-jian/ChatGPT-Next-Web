// 这段代码定义了一个名为 ChatControllerPool 的对象，用于管理消息流控制器（AbortController）的池子。主要功能包括：

// controllers 属性：一个记录消息流控制器的对象，键为 sessionId 和 messageId 的组合，值为对应的 AbortController。

// addController 方法：用于向池子中添加消息流控制器。它接受 sessionId、messageId 和控制器对象作为参数，将控制器存储在 controllers 对象中，并返回一个唯一的键。

// stop 方法：用于停止特定 sessionId 和 messageId 对应的消息流控制器。它通过键来获取对应的控制器，并调用其 abort 方法终止请求。

// stopAll 方法：用于停止所有消息流控制器。它遍历 controllers 对象的值，并调用每个控制器的 abort 方法。

// hasPending 方法：用于检查是否存在待处理的消息流控制器。如果 controllers 对象中存在控制器，则返回 true，否则返回 false。

// remove 方法：用于从池子中移除特定 sessionId 和 messageId 对应的消息流控制器。它通过键来删除对应的控制器。

// key 方法：用于生成 sessionId 和 messageId 的组合作为键，以便在 controllers 对象中存储和访问消息流控制器。

// 通过这个对象，您可以方便地管理消息流控制器，例如添加、停止、移除等操作，并检查池子中是否存在待处理的控制器。

// To store message streaming controller
export const ChatControllerPool = {
  controllers: {} as Record<string, AbortController>,

  addController(
    sessionId: string,
    messageId: string,
    controller: AbortController,
  ) {
    const key = this.key(sessionId, messageId);
    this.controllers[key] = controller;
    return key;
  },

  stop(sessionId: string, messageId: string) {
    const key = this.key(sessionId, messageId);
    const controller = this.controllers[key];
    controller?.abort();
  },

  stopAll() {
    Object.values(this.controllers).forEach((v) => v.abort());
  },

  hasPending() {
    return Object.values(this.controllers).length > 0;
  },

  remove(sessionId: string, messageId: string) {
    const key = this.key(sessionId, messageId);
    delete this.controllers[key];
  },

  key(sessionId: string, messageIndex: string) {
    return `${sessionId},${messageIndex}`;
  },
};
