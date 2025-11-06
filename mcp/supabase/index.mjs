import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

const server = new Server({ name: "supabase-mcp", version: "0.1.0" });

server.tool(
  "select",
  {
    description: "Run a SELECT on a table. Example input: { \"table\": \"profiles\", \"columns\": [\"id\"], \"limit\": 5 }",
    inputSchema: {
      type: "object",
      required: ["table"],
      properties: {
        table: { type: "string" },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Columns to select (default: all)"
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            required: ["column", "operator", "value"],
            properties: {
              column: { type: "string" },
              operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike"] },
              value: {}
            }
          },
          description: "Optional filter clauses"
        },
        limit: { type: "integer", minimum: 1, maximum: 1000, default: 50 }
      }
    }
  },
  async (input) => {
    const { table, columns, filters = [], limit = 50 } = input;
    let query = supabase.from(table).select(columns?.length ? columns.join(",") : "*").limit(limit);

    for (const { column, operator, value } of filters) {
      if (!column || !operator) continue;
      query = query[operator](column, value);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`${error.message}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "rpc",
  {
    description: "Call a Supabase RPC (Postgres function)",
    inputSchema: {
      type: "object",
      required: ["fn"],
      properties: {
        fn: { type: "string", description: "Function name" },
        args: { type: "object", description: "Arguments passed to the RPC" }
      }
    }
  },
  async ({ fn, args = {} }) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      throw new Error(`${error.message}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }
);

server.start();
