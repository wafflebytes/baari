# V1 result: validator experiment (PRD 6.2)

Run 2026-10-04 ~17:05 IST by W1 against agent `Baari` (36ae8107), with `node ao.js check-tools`, which restores the tool list after each probe. Baari still has its original 13 tools.

## H1 is false

The validator does not split on `__` and check the bare name against the native index. Native-shaped names under our MCP connectors are rejected:

| Name | Result |
| --- | --- |
| `mcp_telegram__send_text_message` | rejected (422) |
| `mcp_baari_pinelabs__create_payment` | rejected |
| `mcp_baari_pinelabs__create_payment_link` | rejected |
| `mcp_baari_pinelabs__get_order_status` | rejected |
| `mcp_baari_pinelabs__check_payment_status` | rejected |
| `mcp_telegram__telegram_send_message` (real name) | rejected |
| `mcp_baari_pinelabs__fetch_sbmd_subscription` (real name) | rejected |

The error body is always `Invalid authorized_tools: <name>. Use GET /connectors/registry or GET /tools to discover valid tool names.`

## What the validator actually does

1. `GET /tools?detail=true` has 579 tools and no Delhivery connector. `track_shipment` and `hyperlocal_*` aren't in it. So it isn't the index the validator uses.
2. Even names that are in `/tools` get rejected when their connector isn't attached to the agent: `whatsapp__send_text_message`, `gmail__read_inbox`, `pinelabs_payment__create_payment`, and `agent_scheduler__schedule_agent_task`.
3. A name passes when the prefix is a connector in Baari's `connector_ids` and the bare name is in a hidden allowed set that contains the Delhivery names:

| Name | Result | Why |
| --- | --- | --- |
| `mcp_telegram__track_shipment` | accepted | attached prefix, Delhivery bare name, even though `mcp_telegram` doesn't serve that tool |
| `mcp_baari_pinelabs__track_shipment` | accepted | same |
| `mcp_baari_rails__track_shipment` | rejected | `mcp_baari_rails` is registered but not attached |
| `mcp_made_up__track_shipment` | rejected | no such connector |
| `mcp_telegram__speech_to_text` | rejected | `speech_to_text` is only allowed under the native ElevenLabs prefix |
| `elevenlabs_gnanibaari__list_voices` | accepted | native connector, attached |
| `knowledge_base_search` | accepted | built-in |
| `mcp_telegram:telegram_send_message`, `.telegram_send_message`, bare | rejected | colon, dot and bare forms don't help |

Renaming the Telegram and Pine Labs tools to native names doesn't get them past the validator. The only way through as MCP would be to name them after Delhivery tools, which would mislead the model and the judges, so we won't do it.

## Also found

- The CLI's CSRF header now gets a 403 on every PATCH. The `csrf_token` body field passes. Fixed in `ao.js`.
- The Telegram MCP connector is registered as `mcp_telegram`, not `mcp_baari_telegram` as PRD 6.1 says.
- `agent_scheduler__schedule_agent_task` is rejected on Baari today. PRD 5.3 option 1 (self-scheduling) isn't available until that changes, so the `baari-clock` Worker becomes the trigger.

## Next, waiting on Vinay's OK to register connectors on the tenant

The platform picks a native implementation by connector name prefix (`elevenlabs_gnanibaari` runs ElevenLabs code against our Base URL). The two probes to run next:

1. `pinelabs_payment_baari` (oauth2) with Base URL on rails. If it keeps the URL, rails translates `create_payment` and `check_payment_status` into Reserve Pay. That's PRD 6.2 step 4, and it's the cleanest Pine Labs story.
2. `whatsapp_notification_baari` (basic auth) with Base URL on rails. If it keeps the URL, `whatsapp_send_notification` relays to the real Telegram Bot API for outbound messages.

Inbound (reading votes and replies) has no native path yet. F1, the email to the organisers asking them to whitelist our MCP tools, goes out today regardless.
