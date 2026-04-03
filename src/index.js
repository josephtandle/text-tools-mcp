#!/usr/bin/env node

import { createServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "text-tools-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──

const TOOLS = [
  {
    name: "slugify",
    description: "Convert text to a URL-safe slug",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to slugify" },
      },
      required: ["text"],
    },
  },
  {
    name: "word_count",
    description:
      "Count words, characters, sentences, and estimate reading time",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to analyze" },
      },
      required: ["text"],
    },
  },
  {
    name: "case_convert",
    description:
      "Convert text between cases: camelCase, snake_case, kebab-case, UPPER, lower, Title Case",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to convert" },
        target: {
          type: "string",
          enum: ["camel", "snake", "kebab", "upper", "lower", "title"],
          description: "Target case format",
        },
      },
      required: ["text", "target"],
    },
  },
  {
    name: "base64_encode",
    description: "Encode text to Base64",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to encode" },
      },
      required: ["text"],
    },
  },
  {
    name: "base64_decode",
    description: "Decode Base64 string to text",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Base64 string to decode" },
      },
      required: ["text"],
    },
  },
  {
    name: "url_encode",
    description: "URL-encode a string",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to URL-encode" },
      },
      required: ["text"],
    },
  },
  {
    name: "url_decode",
    description: "URL-decode a string",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "URL-encoded text to decode" },
      },
      required: ["text"],
    },
  },
  {
    name: "markdown_to_html",
    description: "Convert basic Markdown to HTML",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Markdown text to convert" },
      },
      required: ["text"],
    },
  },
  {
    name: "truncate",
    description: "Truncate text to N characters with ellipsis",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to truncate" },
        length: {
          type: "number",
          description: "Maximum character length (default 100)",
        },
        suffix: {
          type: "string",
          description: "Suffix to append (default '...')",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "reverse",
    description: "Reverse a string",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to reverse" },
      },
      required: ["text"],
    },
  },
  {
    name: "extract_emails",
    description: "Extract email addresses from text",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to search for emails" },
      },
      required: ["text"],
    },
  },
  {
    name: "extract_urls",
    description: "Extract URLs from text",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to search for URLs" },
      },
      required: ["text"],
    },
  },
  {
    name: "count_occurrences",
    description: "Count occurrences of a substring in text",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to search in" },
        substring: { type: "string", description: "Substring to count" },
        case_sensitive: {
          type: "boolean",
          description: "Case sensitive (default true)",
        },
      },
      required: ["text", "substring"],
    },
  },
  {
    name: "pad_string",
    description: "Pad a string to a target length",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to pad" },
        length: { type: "number", description: "Target length" },
        char: { type: "string", description: "Pad character (default ' ')" },
        side: {
          type: "string",
          enum: ["left", "right", "both"],
          description: "Which side to pad (default 'right')",
        },
      },
      required: ["text", "length"],
    },
  },
  {
    name: "repeat",
    description: "Repeat a string N times",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to repeat" },
        count: { type: "number", description: "Number of repetitions" },
        separator: {
          type: "string",
          description: "Separator between repetitions (default '')",
        },
      },
      required: ["text", "count"],
    },
  },
  {
    name: "strip_html",
    description: "Remove HTML tags from text",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "HTML text to strip" },
      },
      required: ["text"],
    },
  },
  {
    name: "lorem_ipsum",
    description: "Generate placeholder lorem ipsum text",
    inputSchema: {
      type: "object",
      properties: {
        paragraphs: {
          type: "number",
          description: "Number of paragraphs (default 1)",
        },
        sentences_per_paragraph: {
          type: "number",
          description: "Sentences per paragraph (default 5)",
        },
      },
    },
  },
];

// ── Tool implementations ──

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;
  const readingTimeMin = Math.ceil(words.length / 200);
  return { words: words.length, characters: chars, characters_no_spaces: charsNoSpaces, sentences, reading_time_minutes: readingTimeMin };
}

function splitWords(text) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function caseConvert(text, target) {
  const words = splitWords(text);
  switch (target) {
    case "camel":
      return words
        .map((w, i) =>
          i === 0
            ? w.toLowerCase()
            : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    default:
      throw new Error(`Unknown target case: ${target}`);
  }
}

function markdownToHtml(md) {
  let html = md;
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = "<p>" + html + "</p>";
  html = html.replace(/<p>\s*<h([1-6])>/g, "<h$1>");
  html = html.replace(/<\/h([1-6])>\s*<\/p>/g, "</h$1>");
  return html;
}

function truncate(text, length = 100, suffix = "...") {
  if (text.length <= length) return text;
  return text.slice(0, length - suffix.length) + suffix;
}

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return matches || [];
}

function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s<>"']+/g);
  return matches || [];
}

function countOccurrences(text, substring, caseSensitive = true) {
  const t = caseSensitive ? text : text.toLowerCase();
  const s = caseSensitive ? substring : substring.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = t.indexOf(s, pos)) !== -1) {
    count++;
    pos += s.length;
  }
  return count;
}

function padString(text, length, char = " ", side = "right") {
  if (text.length >= length) return text;
  const padding = char.repeat(Math.ceil((length - text.length) / char.length));
  switch (side) {
    case "left":
      return (padding + text).slice(-length);
    case "right":
      return (text + padding).slice(0, length);
    case "both": {
      const totalPad = length - text.length;
      const leftPad = Math.floor(totalPad / 2);
      const rightPad = totalPad - leftPad;
      return char.repeat(leftPad) + text + char.repeat(rightPad);
    }
    default:
      return text;
  }
}

function repeatStr(text, count, separator = "") {
  return Array(count).fill(text).join(separator);
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, "");
}

const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
  "Nulla facilisi morbi tempus iaculis urna id volutpat lacus.",
  "Viverra accumsan in nisl nisi scelerisque eu ultrices vitae auctor.",
  "Eget nulla facilisi etiam dignissim diam quis enim lobortis.",
  "Adipiscing elit pellentesque habitant morbi tristique senectus et netus.",
  "Amet consectetur adipiscing elit ut aliquam purus sit amet luctus.",
];

function loremIpsum(paragraphs = 1, sentencesPerParagraph = 5) {
  const result = [];
  for (let p = 0; p < paragraphs; p++) {
    const sentences = [];
    for (let s = 0; s < sentencesPerParagraph; s++) {
      sentences.push(LOREM_SENTENCES[(p * sentencesPerParagraph + s) % LOREM_SENTENCES.length]);
    }
    result.push(sentences.join(" "));
  }
  return result.join("\n\n");
}

// ── Request handlers ──

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "slugify":
        result = slugify(args.text);
        break;
      case "word_count":
        result = wordCount(args.text);
        break;
      case "case_convert":
        result = caseConvert(args.text, args.target);
        break;
      case "base64_encode":
        result = Buffer.from(args.text).toString("base64");
        break;
      case "base64_decode":
        result = Buffer.from(args.text, "base64").toString("utf-8");
        break;
      case "url_encode":
        result = encodeURIComponent(args.text);
        break;
      case "url_decode":
        result = decodeURIComponent(args.text);
        break;
      case "markdown_to_html":
        result = markdownToHtml(args.text);
        break;
      case "truncate":
        result = truncate(args.text, args.length, args.suffix);
        break;
      case "reverse":
        result = [...args.text].reverse().join("");
        break;
      case "extract_emails":
        result = extractEmails(args.text);
        break;
      case "extract_urls":
        result = extractUrls(args.text);
        break;
      case "count_occurrences":
        result = countOccurrences(args.text, args.substring, args.case_sensitive);
        break;
      case "pad_string":
        result = padString(args.text, args.length, args.char, args.side);
        break;
      case "repeat":
        result = repeatStr(args.text, args.count, args.separator);
        break;
      case "strip_html":
        result = stripHtml(args.text);
        break;
      case "lorem_ipsum":
        result = loremIpsum(args.paragraphs, args.sentences_per_paragraph);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ── Start ──

const PORT = parseInt(process.env.PORT || "8080", 10);

async function main() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    // Health check
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "text-tools-mcp", version: "1.0.0" }));
      return;
    }

    // MCP endpoint
    if (req.url === "/mcp" || req.url === "/sse" || req.url === "/message") {
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  httpServer.listen(PORT, () => {
    console.log(`text-tools-mcp listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
