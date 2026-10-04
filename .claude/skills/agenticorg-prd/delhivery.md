# Delhivery: real API and what to mock

Sources: the B2C Last-Mile API reference at `delhivery-express-api-doc.readme.io` (public), Delhivery One help docs at `help.delhivery.com`, read 2026-10-04. The newer developer portal (`one.delhivery.com/developer-portal`) needs a client login, so the readme.io reference is the contract to copy.

Hosts: staging `https://staging-express.delhivery.com`, production `https://track.delhivery.com`. Auth header `Authorization: Token <api_token>`. Tokens come from the client's Delhivery business contact, not self-serve.

The brief says the mock must use **the same endpoint names, request fields and response fields**. Copy paths exactly, trailing slashes and the odd `/.json` included.

## The documented endpoints

| API | Method and path | Key inputs | Key outputs and quirks |
| --- | --- | --- | --- |
| Pincode serviceability | `GET /c/api/pin-codes/json/?filter_codes=<pin>` | pincode | `delivery_codes[].postal_code` with `pre_paid`, `cod`, `pickup`, `repl`, `remarks` (`Embargo` when blocked). Empty `delivery_codes` means not serviceable. |
| Bulk waybill | `GET /waybill/api/bulk/json/?count=N` | count | Comma-separated waybills. Optional; create can generate one. |
| Fetch waybill | `GET /waybill/api/fetch/json/?cl=<client>` | client name | One waybill |
| Create / manifest shipment | `POST /api/cmu/create.json`, body `format=json&data={...}` (form-encoded JSON string) | `shipments[]` (name, add, pin, phone, order, payment_mode Prepaid/COD/Pickup, cod_amount, total_amount, weight, products_desc, waybill optional), `pickup_location.name` | `success`, `packages[]` with `status`, `waybill`, `remarks`. Common failures: "format key missing in the post", "ClientWarehouse matching query doesn't exist" (wrong `pickup_location`), "Unable to consume waybill", duplicate order id. Five special characters are rejected unless URL-encoded. |
| Track | `GET /api/v1/packages/json/?waybill=<w>` or `?ref_ids=<order>` | up to **30** waybills per call | `ShipmentData[].Shipment` with `Status` (`Status`, `StatusType`, `StatusCode`, `StatusDateTime`, `StatusLocation`), `Scans[]`, `ExpectedDeliveryDate` |
| Push tracking (webhook) | Delhivery POSTs scans to your URL | | Set up by Delhivery, takes 5 to 6 working days, needs live waybills. A mock can simulate it. |
| Edit shipment | `POST /api/p/edit` | `waybill` plus fields (name, add, phone, product details, weight, payment mode) | `status`, `remark` |
| Cancel shipment | `POST /api/p/edit` with `cancellation: "true"` | waybill | Prepaid/COD becomes "Returned", pickup becomes "Cancelled". Not allowed once delivered. |
| Shipping cost | `GET /api/kinko/v1/invoice/charges/.json?md=E\|S&cgm=<grams>&o_pin=&d_pin=&ss=Delivered\|RTO\|DTO&pt=Pre-paid\|COD` | mode, weight, pins, status, payment type | `total_amount`, `charge_*` breakdown, `zone`. Host is `track.delhivery.com` even in testing. |
| Packing slip / label | `GET /api/p/packing_slip?wbns=<w>` | waybills | JSON with label data and barcode; you render the PDF |
| Pickup request | `POST /fm/request/new/` | `pickup_location`, `pickup_date`, `pickup_time`, `expected_package_count` | `pickup_id`; error if one is already open for that slot |
| Warehouse create | `POST /api/backend/clientwarehouse/create/` | name, address, pin, phone, return address | One-time setup, optional (Delhivery can do it) |
| Warehouse edit | `POST /api/backend/clientwarehouse/edit/` | name plus changed fields | |
| NDR action | `POST /api/p/update` | `data[]` of `{waybill, act}`; `act` is `DEFER_DLV` (with `deferred_date` YYYY-MM-DD, max first pending date + 6 days), `EDIT_DETAILS` (name, add, phone) or `RE-ATTEMPT` | Returns a `request_id` (UPL id). Asynchronous. Only for packages in pending status with specific `StatusCode`s (for example EOD-74, EOD-15, EOD-11, EOD-3, EOD-16, EOD-6, ST-108 for deferral). |
| NDR status | `GET /api/cmu/get_bulk_upl/<UPL id>?verbose=true` | UPL id | Per-waybill result of the NDR action |

Help-centre features with no public API: SmartNDR, RTO Predictor, COD remittance, rate cards, B2B serviceability (B2B has its own API at `apidocs.delhivery.in`: manifest, invoice, labels, POD).

## Package lifecycle

`StatusType` codes: **UD** (forward, in progress: Manifested, Not Picked, In Transit, Pending, Dispatched), **DL** (Delivered, end of forward), **RT** (returning), **PP** (pickup pending), **PU** (picked up), **CN** (cancelled). Closed states: Delivered, Cancelled, RTO (returned to origin), DTO (reverse delivered to origin). NDR (non-delivery report) happens when a delivery attempt fails: customer unavailable, address issue, refused, COD not ready.

## What Delhivery does not do (fair game for invented capabilities)

- **Hyperlocal, same-day or 30-minute delivery.** The B2C API is courier, days not minutes. Any "rider" in a PRD is an invention. This is where the brief's "no rider available" case lives.
- Kirana or neighbourhood-shop pickup on demand.
- Slot booking for a delivery window.
- Live rider location.

## Our mock (`baari-mock/lib/delhivery.js`)

Implements all paths above except packing slip and warehouse create/edit, plus one invention:

| Invented | Path | Outcomes |
| --- | --- | --- |
| Hyperlocal order (C10) | `POST /api/hyperlocal/v1/orders`, `GET /api/hyperlocal/v1/orders/{id}` | `RIDER_ASSIGNED`, `NO_RIDER_AVAILABLE`, `SLOT_UNAVAILABLE`, rider cancels after assign |

Built-in data: warehouses `sharma_kirana` and `baari_staples_hub`, pincode 110099 not serviceable, 110098 embargoed. A shipment's scans complete in 6 minutes so a demo fits in a recording.

Scenarios, set per endpoint through `POST /admin/scenario` (one-shot or counted), cover the brief's bad cases:

| Scenario | Effect |
| --- | --- |
| `timeout` | Hangs 25 s, then a 504 HTML page |
| `malformed` | 200 with a truncated JSON body |
| `html_error` | 502 HTML |
| `server_error` | 500 |
| `rate_limited` | 429 |
| `unauthorized` | 401 |
| `nsz` | Pincode comes back unserviceable |
| `duplicate_order` | Create fails with a duplicate order id |
| `delayed`, `ndr`, `rto` | Tracking shows a delay, a failed attempt, or a return |
| `pr_exist` | Pickup already open |
| `no_rider`, `slot_unavailable`, `rider_cancelled` | Hyperlocal failures |

The 11 MCP tools on `mcp_baari_delhivery`: `pincode_serviceability`, `fetch_waybill`, `create_shipment`, `track_shipment`, `calculate_shipping_cost`, `create_pickup_request`, `cancel_shipment`, `ndr_action`, `ndr_status`, `hyperlocal_create_order`, `hyperlocal_get_order`.

## PRD checklist for the Delhivery rail

- Check serviceability before creating anything.
- Handle `delivery_codes: []` and `Embargo` as different messages to the user.
- Treat `success: true` with a failed package inside as a failure. The real API does this.
- Don't retry create after a timeout without checking by `ref_ids`, or you double-ship.
- NDR actions are async: act, then poll status.
- Show the user Delhivery's expected delivery date, not a made-up one.
