const WebSocket = require("ws");
const ws = new WebSocket("ws://127.0.0.1:3000/ws");
ws.on("open", () => { console.log("OPEN"); ws.send(JSON.stringify({ type: "client.register", messageId: "1", timestamp: Date.now(), payload: { role: "ADVISOR", deviceName: "T" } })); });
ws.on("message", (d) => console.log("MSG:", d.toString().slice(0, 100)));
ws.on("error", (e) => console.log("ERROR:", e.message));
ws.on("close", (c, r) => console.log("CLOSE:", c, r.toString()));
setTimeout(() => { console.log("fin"); process.exit(0); }, 5000);
