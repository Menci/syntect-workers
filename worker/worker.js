/**
 * @param {string} input
 * @return {Promise<string>}
 */
async function hash(input) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(result))
    .map(x => x.toString(16).padStart(2, ""))
    .join("");
}

const cached = (() => {
  const cacheSet = "CACHE";
  const getCacheKey = (key) => `https://cache.example.com/${encodeURIComponent(key)}`;
  const cache = {
    /**
     * @param {string} key
     * @param {string | Response} value
     */
    set: async (key, value) => {
      const cache = await caches.open(cacheSet);
      await cache.put(
        getCacheKey(key),
        typeof value === "string" ? new Response(value, {
          headers: { "Content-Type": "application/json" }
        }) : value
      );
    },
    /**
     * @param {string} key
     * @return {Promise<string | Response>}
     */
    get: async key => {
      const cache = await caches.open(cacheSet);
      const response = await cache.match(getCacheKey(key));
      return response && (await response.text());
    }
  };

  /**
   * @param {object} keyObject
   * @param {() => Promise<string | Response>} callback
   * @return {Promise<string | Response>}
   */
  return async (keyObject, callback) => {
    const key = JSON.stringify(keyObject);
    let value = await cache.get(key);
    if (!value) {
      value = await callback();
      await cache.set(key, value);
    }
    return value;
  };
})();

////////////////////////////////////////////////////////////////////////////

const cacheHeaders = {
  "Cache-Control": "public, max-age=604800, s-maxage=43200"
};

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
});

const { highlight, get_css } = wasm_bindgen;
const instance = wasm_bindgen(wasm);

/**
 * @param {Request} request
 */
async function handleRequest(request) {
  const error = message => new Response(message, { status: 400 });

  try {
    await instance;

    const url = new URL(request.url);
    if (url.pathname === "/css" && (request.method === "POST" || request.method === "GET")) {
      let themeData, prefix;
      if (request.method === "POST") {
        const body = await request.json() || {};
        themeData = body.themeData;
        prefix = body.prefix || "";
  
        if (typeof themeData !== "string") return error("Body parameter 'themeData' must be a string");
      } else {
        const themeUrl = url.searchParams.get("themeUrl");
        if (typeof themeUrl !== "string") return error("Query parameter 'themeUrl' must be a string");

        try {
          themeData = await (await fetch(themeUrl)).text();
        } catch (e) {
          return error(`Failed to fetch theme: ${e.message}`);
        }

        prefix = url.searchParams.get("prefix") || "";
      }

      if (prefix.length > 32) return error("Prefix too long! Max allowed is 32");

      const result = get_css(themeData, prefix);
      if (result.error)
        return error(`Failed to generate theme CSS: ${result.error}`);
      else
        return new Response(result.css, {
          headers: {
            "Content-Type": "text/css",
            ...cacheHeaders
          }
        });
    } else if (url.pathname === "/highlight" && request.method === "POST") {
      const body = await request.json() || {};

      const { code, language } = body;
      const prefix = typeof body.prefix === "string" ? body.prefix : "";
      const verbose = !!body.verbose;

      if (typeof code !== "string") return error("Body parameter 'code' must be a string");
      if (typeof language !== "string") return error("Body parameter 'language' must be a string");
      if (prefix.length > 32) return error("Prefix too long! Max allowed is 32");

      return new Response(
        await cached({ codeHash: await hash(code), language, prefix, verbose }, async () => {
          const result = highlight(code, language, prefix);
          return !verbose ? result.html : JSON.stringify({ html: result.html, language: result.language });
        }),
        {
          headers: {
            "Content-Type": !verbose ? "text/html" : "application/json",
            ...cacheHeaders
          }
        }
      );
    }

    return new Response("", {
      status: 302,
      headers: {
        Location: "https://github.com/Menci/syntect-workers"
      }
    });  
  } catch (e) {
    return new Response(e.stack, { status: 500 });
  }
}
