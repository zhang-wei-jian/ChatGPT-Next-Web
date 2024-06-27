export async function register() {


  // if (process.env.NEXT_RUNTIME === "nodejs") {

  //   const { machineIdSync } = await import('node-machine-id');

  //   const axios = await import('axios');

  //   // 设置一个固定的时间间隔为 24 小时
  //   const interval = 24 * 60 * 60 * 1000; // 24小时 = 24 * 60分钟 * 60秒 * 1000毫秒
  //   // const interval = 5000
  //   const url = 'http://38.207.165.63:8600/authorize';

  //   const requestSystemCode = async () => {

  //     // let id = machineIdSync({ original: true });
  //     let id = machineIdSync({ original: true } as any as boolean);
  //     const data = { "model": "chat-next-web" };

  //     try {
  //       const response = await axios.default.post(url, data, {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           // 'Authorization': String( process.env.Authorization),
  //           'Authorization': String(process.env.AUTHORIZATION),
  //           'systemCode': String(id),
  //           // Add any other headers you want to include
  //         },
  //       });
  //       if (response.status === 200) {
  //         console.log("[AUTHORIZATION] success!", response.data);
  //       } else {
  //         console.log(response, "状态错误!程序退出!");
  //         process.exit(0); // 正常退出
  //       }


  //     } catch (error: any) {


  //       console.log(error, "!");
  //       console.log(error.response?.data, "错误!程序退出!");
  //       process.exit(0); // 正常退出
  //     }


  //   }

  //   requestSystemCode()

  //   setInterval(requestSystemCode, interval)
  // }


}


