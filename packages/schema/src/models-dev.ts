export * as ModelsDev from "./models-dev.js"

import { Schema } from "effect"
import { ephemeral, inventory } from "./event.js"
import { Rpc } from "./rpc.js"

const Refreshed = ephemeral({
  type: "models-dev.refreshed",
  schema: {},
})
export const Event = { Refreshed, Definitions: inventory(Refreshed) }

/**
 * The catalog RPC. `refresh` fetches models.dev immediately instead of waiting for the periodic
 * refresh; clients pick the new provider and model lists up from `provider.updated`.
 */
export const RefreshRpc = Rpc.define({
  id: "opencode.models",
  methods: {
    refresh: {
      input: Schema.toStandardSchemaV1(Schema.Struct({})),
      output: Schema.toStandardSchemaV1(Schema.Struct({})),
    },
  },
  events: {},
})