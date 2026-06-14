# PixelLab Custom Connector

This folder adds **PixelLab** (pixel-art generation API) as a custom connector / MCP server.

## Instructions for Claude

When a user asks you to set up or use this connector:

1. **Ask the user for their PixelLab API key first.** Do not proceed without it. Say something like: *"Please paste your PixelLab API key (from your PixelLab account dashboard) so I can configure the connector."*
2. Once provided, take `connectors/pixellab-connector.json` and replace `YOUR_PIXELLAB_API_TOKEN` with the user's actual key.
3. **Never commit the real key back to the repo.** Keep it local / in the connector settings only.

## How to add it in Claude (claude.ai web / desktop)

1. Go to **Settings -> Connectors -> Add custom connector**.
2. Enter the server URL: `https://api.pixellab.ai/mcp`
3. Provide the Authorization header: `Bearer <your PixelLab API key>`
4. Save and enable the connector. PixelLab's pixel-art tools will then be available in your Claude conversations.

## Config format

The `pixellab-connector.json` uses the standard `mcpServers` shape, which also works as a `.mcp.json` for Claude Code:

```json
{
  "mcpServers": {
    "pixellab": {
      "url": "https://api.pixellab.ai/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer YOUR_PIXELLAB_API_TOKEN"
      }
    }
  }
}
```

> Note: the `/mcp` endpoint path and `Bearer` auth scheme should be confirmed against PixelLab's official API/MCP docs if the connector fails to validate.
