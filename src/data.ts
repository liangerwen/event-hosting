export default JSON.stringify([
  {
    id: "b65953b5-fa39-49af-bc7c-d465d744cb53",
    name: "HEAD",
    debugger: false,
    props: {},
    position: {
      x: 0,
      y: 0,
    },
    type: "HEAD",
    nextNode: {
      nextNodeId: "306a1181-fc41-47cf-898d-7c2eb1662c45",
    },
  },
  {
    id: "306a1181-fc41-47cf-898d-7c2eb1662c45",
    name: "sleep",
    debugger: true,
    props: {
      value: {
        value:
          "const time = Math.random() * 4000;\r\nconsole.log('当前等待时间', time);\r\nreturn time;",
        type: "function",
      },
    },
    position: {
      x: 0,
      y: 97,
    },
    type: "NORMAL",
    nextNode: {
      nextNodeId: "67b8f5f2-efce-4f6b-80f4-3a6ff7061000",
    },
  },
  {
    id: "67b8f5f2-efce-4f6b-80f4-3a6ff7061000",
    name: "console",
    debugger: false,
    props: {
      value: {
        value:
          "const html = await fetch(location.origin).then(res=>res.text());\r\nreturn html;",
        type: "function",
      },
    },
    position: {
      x: 0,
      y: 188,
    },
    type: "NORMAL",
  },
]);
