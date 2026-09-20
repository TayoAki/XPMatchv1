// Stand-in for Resend's REST API: accepts POST /emails like the real thing (bearer key required)
// and keeps every message in memory so a spec can read what the app sent (GET /emails?to=...).
import http from "node:http";

const PORT = Number(process.env.PORT || 4548);
const JSON_HEADERS = { "Content-Type": "application/json" };
const emails = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.method === "POST" && url.pathname === "/emails") {
    if (!/^Bearer .+/.test(req.headers.authorization ?? "")) {
      res.writeHead(401, JSON_HEADERS);
      return res.end(JSON.stringify({ statusCode: 401, message: "Missing API key" }));
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let mail;
      try {
        mail = JSON.parse(body);
      } catch {
        res.writeHead(400, JSON_HEADERS);
        return res.end(JSON.stringify({ statusCode: 400, message: "Invalid JSON" }));
      }
      const id = `email_${emails.length + 1}`;
      emails.push({ id, ...mail, receivedAt: new Date().toISOString() });
      console.log(`[mock resend] ${mail.subject} -> ${[].concat(mail.to).join(", ")}`);
      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify({ id }));
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/emails") {
    const to = (url.searchParams.get("to") ?? "").toLowerCase();
    const list = to ? emails.filter((e) => [].concat(e.to).some((addr) => String(addr).toLowerCase() === to)) : emails;
    res.writeHead(200, JSON_HEADERS);
    return res.end(JSON.stringify({ emails: list }));
  }
  res.writeHead(404, JSON_HEADERS);
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(PORT, () => console.log(`[mock resend] listening on ${PORT}`));
