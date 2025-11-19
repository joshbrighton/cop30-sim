export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  // Create a streaming session with Retell
  const sessionRes = await fetch("https://api.retellai.com/v1/streaming/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
    },
    body: JSON.stringify({
      bot_id: "conversation_flow_2c3b3c08bcc0",
      modalities: ["audio"],
      sample_rate: 16000
    }),
  });

  const session = await sessionRes.json();

  const retellSocket = new WebSocket(session.url, {
    headers: {
      "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
    },
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  retellSocket.onmessage = (ev) => {
    writer.write(ev.data);
  };

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Connection": "keep-alive",
    },
  });
}
