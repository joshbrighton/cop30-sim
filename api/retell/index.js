import WebSocket from "ws";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    // Create streaming session
    const sessionRes = await fetch("https://api.retellai.com/v1/streaming/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        bot_id: "conversation_flow_2c3b3c08bcc0",
        modalities: ["audio"],
        sample_rate: 16000,
      }),
    });

    const session = await sessionRes.json();

    // Establish WebSocket connection with Retell
    const retellSocket = new WebSocket(session.url, {
      headers: {
        "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
      },
    });

    // Upgrade the Vercel request to a WebSocket
    const upgrade = res.socket.server;
    if (!upgrade) {
      res.status(500).send("WebSocket upgrade not available.");
      return;
    }

    upgrade.on("upgrade", (req2, socket, head) => {
      const wsServer = new WebSocket.Server({ noServer: true });

      wsServer.handleUpgrade(req2, socket, head, (clientSocket) => {
        // Forward audio from browser → Retell
        clientSocket.on("message", (data) => {
          if (retellSocket.readyState === WebSocket.OPEN) {
            retellSocket.send(data);
          }
        });

        // Forward audio Retell → browser
        retellSocket.on("message", (retellData) => {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(retellData);
          }
        });

        // Cleanup
        clientSocket.on("close", () => retellSocket.close());
        retellSocket.on("close", () => clientSocket.close());
      });
    });

    res.end();
  } catch (err) {
    console.error("Retell WebSocket error:", err);
    res.status(500).send("Internal Server Error");
  }
}
