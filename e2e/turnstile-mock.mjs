const verifyEndpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const fetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url === verifyEndpoint) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return fetch(input, init);
};
