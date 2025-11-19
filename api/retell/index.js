export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const apiKey = process.env.RETELL_API_KEY;

  if (!apiKey) {
    return new Response("Missing RETELL_API_KEY", { status: 500 });
  }

  const sessionRes = await fetch("https://api.retellai.com/v1/streaming/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      },
    body: JSON.stringify({
      bot_id: "conversation_flow_2c3b3c08bcc0",
      modalities: ["audio"],
      sample_rate: 16000
    }),
  });

  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    return new Response("Retell session error: " + err, { status: 500 });
  }

  const session = await sessionRes.json();

  const retellSocket = new WebSocket(session.url, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  retellSocket.onmessage = (event) => {
    writer.write(event.data);
  };

  retellSocket.onerror = () => writer.close();
  retellSocket.onclose = () => writer.close();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Connection": "keep-alive",
    },
  });
}
