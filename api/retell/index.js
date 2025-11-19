export const config = {
  runtime: "edge",
};

export default {
  async fetch(req) {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected a WebSocket request", { status: 400 });
    }

    // Create streaming session with Retell
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

    // Upgrade client connection to websocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Open websocket to Retell
    const retellSocket = new WebSocket(session.url, {
      headers: {
        "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
      },
    });

    // Forward audio from client → Retell
    socket.onmessage = (event) => {
      if (retellSocket.readyState === WebSocket.OPEN) {
        retellSocket.send(event.data);
      }
    };

    // Forward audio from Retell → client
    retellSocket.onmessage = (event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    // Cleanup when either side closes
    socket.onclose = () => retellSocket.close();
    retellSocket.onclose = () => socket.close();

    return response;
  },
};
