const SYSTEM_PROMPT =
  "You are a medical assistant. Provide general health advice only. Do not diagnose, prescribe medicine, or replace professional medical care.";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function getGroqApiKey() {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROQ_KEY ||
    process.env.API_KEY ||
    process.env.GROQ ||
    ""
  ).trim();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: jsonHeaders,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const GROQ_API_KEY = getGroqApiKey();

  if (!GROQ_API_KEY) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error:
          "Missing Groq API key. Set GROQ_API_KEY in Netlify environment variables and redeploy."
      })
    };
  }

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!query) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Query is required" })
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.4,
        max_tokens: 600
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const details = data?.error?.message || data?.message || "Groq API request failed";
      return {
        statusCode: response.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: "Groq API error",
          details
        })
      };
    }

    const aiReply = data?.choices?.[0]?.message?.content?.trim();

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        reply: aiReply || "AI response not available."
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: "Server error while contacting Groq",
        details: error.message
      })
    };
  }
};
