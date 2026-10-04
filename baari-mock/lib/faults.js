// Transport-level failures any mocked endpoint can be told to produce. They
// look the same whichever provider we are pretending to be.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const html = (status, body) => ({ status, headers: { "Content-Type": "text/html" }, body });

// Returns a response, or null when the scenario is not a transport fault.
async function fault(scenario) {
  switch (scenario) {
    case "timeout":
      // Hang longer than the platform's connector timeout, then fail the way
      // a gateway does.
      await sleep(Number(process.env.TIMEOUT_MS || 25000));
      return html(504, "<html><body><h1>504 Gateway Time-out</h1></body></html>");
    case "malformed":
      // 200 with a body cut off halfway, like a dropped connection.
      return { status: 200, headers: { "Content-Type": "application/json" }, body: '{"status":"Succ' };
    case "html_error":
      return html(502, "<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>");
    case "server_error":
      return { status: 500, body: { error: "Internal Server Error" } };
    case "rate_limited":
      return {
        status: 429,
        headers: { "Retry-After": "60" },
        body: { detail: "Request was throttled. Expected available in 60 seconds." },
      };
    case "unauthorized":
      return { status: 401, body: { detail: "Authentication credentials were not provided." } };
    default:
      return null;
  }
}

const FAULTS = ["timeout", "malformed", "html_error", "server_error", "rate_limited", "unauthorized"];

module.exports = { fault, FAULTS, sleep };
