import { OpenCode, type OpenCodeClient } from "@opencode/client"
import { Service } from "@opencode/client/effect/service"
import { RefreshRpc } from "@opencode/schema/models-dev"
import { Effect } from "effect"
import { EOL } from "node:os"
import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { ServerConnection } from "../../services/server-connection"
import { waitForPlugins } from "../../services/plugin-startup"

export default Runtime.handler(
  Commands.commands.models,
  Effect.fn("cli.models")(function* (input: Runtime.Input<typeof Commands.commands.models>) {
    const server = yield* ServerConnection.resolve()
    const client = OpenCode.make({
      baseUrl: server.endpoint.url,
      headers: Service.headers(server.endpoint),
    })
    yield* waitForPlugins(client, process.cwd())
    if (input.refresh) yield* Effect.promise(() => refreshCatalog(client))
    const response = yield* Effect.promise(() => client.model.list({ location: { directory: process.cwd() } }))
    const models = response.data
      .map((model) => `${model.providerID}/${model.id}`)
      .toSorted((a, b) => a.localeCompare(b))
    if (models.length > 0) process.stdout.write(models.join(EOL) + EOL)
  }),
)

// The catalog refresh runs on the server and republishes the provider list from its own event,
// so wait for that event before reading the list. The wait is best effort: an unchanged catalog
// still refreshes and the event may take a moment, but it must not hang the command.
async function refreshCatalog(client: OpenCodeClient) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)
  const stream = client.event.subscribe({ signal: controller.signal })[Symbol.asyncIterator]()
  const reloaded = (async () => {
    for (;;) {
      const next = await stream.next()
      if (next.done) return
      if (next.value.type === "provider.updated") return
    }
  })().catch(() => undefined)
  await Promise.all([client.rpc(RefreshRpc).refresh({}, { location: { directory: process.cwd() } }), reloaded])
  clearTimeout(timer)
}