# Graph Report - tts-agent-1  (2026-11-01)

## Corpus Check
- 41 files · ~266,986 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 489 nodes · 1581 edges · 24 communities detected
- Extraction: 66% EXTRACTED · 34% INFERRED · 0% AMBIGUOUS · INFERRED: 535 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `connection()` - 71 edges
2. `one()` - 56 edges
3. `esc()` - 44 edges
4. `doAct()` - 36 edges
5. `result()` - 29 edges
6. `e()` - 29 edges
7. `many()` - 28 edges
8. `_loopback_or_404()` - 28 edges
9. `load_call()` - 25 edges
10. `patient()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `install_tools()` --calls--> `pop()`  [INFERRED]
  agent/configure_bolna.py → api/app/handoff_wait.py
- `metrics_page()` --calls--> `render()`  [INFERRED]
  api/app/routes.py → console/public/js/app.js
- `_write_booking()` --calls--> `audit()`  [INFERRED]
  api/app/tools/booking.py → console/public/js/app.js
- `_succeed()` --calls--> `audit()`  [INFERRED]
  api/app/tools/identity.py → console/public/js/app.js
- `register_patient()` --calls--> `audit()`  [INFERRED]
  api/app/tools/identity.py → console/public/js/app.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (80): cancel_booking(), create_booking(), day_label(), _fee_plan(), format_window(), get_available_windows(), get_booking_status(), get_doctor_delay() (+72 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (79): bearer(), caller_call_id(), desk_token_from(), digest_equal(), internal_authorized(), is_loopback(), issue_caller_token(), new_desk_session() (+71 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (38): BaseHTTPRequestHandler, canonical_json(), canonicalize(), json_safe(), Return the first mismatch, or None when the chain is intact., record_hash(), redact_args(), sha256_text() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (34): applyLive(), bookableLabels(), bookingDrawer(), dayClosed(), dayLabel(), dayNum(), defaultLabel(), drawer() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): Button(), CallbackRow(), CallNextButton(), cx(), DeskSwitch(), DoctorChip(), EmergencyBanner(), Glyph() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (24): apply_ambient(), apply_voice(), Bolna, die(), ensure_extractions(), female_kalpa_voice(), install_tools(), link_number() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (29): badge(), callbacksScreen(), callBy(), callDetail(), callsScreen(), capWord(), card(), cbDetail() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (27): applyCancel(), audit(), blankForm(), booking(), bumpIdle(), callNext(), canAnswer(), doAct() (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (20): ack_alert(), after_call_next(), cancel_session(), console_bootstrap(), decide_refund(), _guard(), jobs_run(), refill_decision() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (17): auditPanel(), emergencyBanner(), esc(), field(), lockScreen(), pinPad(), recordCard(), recordField() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (5): MemoryKafka, MemoryRedis, socket(), index_envelope(), Indexer path: insert a trace that was published, ignoring duplicates.

### Community 11 - "Community 11"
Cohesion: 0.26
Nodes (12): banners(), cbBy(), emergencyChip(), failedMsgs(), norm(), openCallbacks(), rail(), searchPatients() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.36
Nodes (9): _age(), bootstrap(), _duration(), _hm(), _pid(), _range(), Shape the live database into the console's sample-data fields., _transcript_lines() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (2): _fmt(), Metrics

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (5): bookingsScreen(), cellBookings(), dayGrid(), passFilters(), weekGrid()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (1): env()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (1): Builds agent/functions.json: the Bolna custom-function definitions for every too

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (1): Static checks that keep the Bolna agent config in step with the backend and free

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): psycopg async connections do not run on Windows ProactorEventLoop., selector_factory()

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): Print the shortest https URL from a Vercel --json deploy log.

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): Policy amount only. The model cannot set the figure or a destination.

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (1): Bolna caller-data lookup. Runs before the welcome message on a phone call.

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (1): Bolna caller-data lookup. Runs before the welcome message on a phone call.

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): Tool sentences are spoken word for word (agent/system-prompt.txt), so each one m

## Knowledge Gaps
- **25 isolated node(s):** `Builds agent/functions.json: the Bolna custom-function definitions for every too`, `Push the buildathon agent settings to the live Bolna agent.  Reads the repo .env`, `Static checks that keep the Bolna agent config in step with the backend and free`, `Print the shortest https URL from a Vercel --json deploy log.`, `psycopg async connections do not run on Windows ProactorEventLoop.` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (5 nodes): `metrics.py`, `_fmt()`, `Metrics`, `.__init__()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (4 nodes): `config.py`, `_agent_id()`, `env()`, `_transfer_number()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (3 nodes): `build_functions.py`, `build()`, `Builds agent/functions.json: the Bolna custom-function definitions for every too`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `check_agent.py`, `check()`, `Static checks that keep the Bolna agent config in step with the backend and free`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `winloop.py`, `psycopg async connections do not run on Windows ProactorEventLoop.`, `selector_factory()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `vercel_url.py`, `Print the shortest https URL from a Vercel --json deploy log.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `Policy amount only. The model cannot set the figure or a destination.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `Bolna caller-data lookup. Runs before the welcome message on a phone call.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Bolna caller-data lookup. Runs before the welcome message on a phone call.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `Tool sentences are spoken word for word (agent/system-prompt.txt), so each one m`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `audit()` connect `Community 7` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **Why does `_write_booking()` connect `Community 0` to `Community 1`, `Community 7`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `connection()` connect `Community 1` to `Community 0`, `Community 2`, `Community 5`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Are the 69 inferred relationships involving `connection()` (e.g. with `run_tool()` and `_finish()`) actually correct?**
  _`connection()` has 69 INFERRED edges - model-reasoned connections that need verification._
- **Are the 55 inferred relationships involving `one()` (e.g. with `load_call()` and `settings_for()`) actually correct?**
  _`one()` has 55 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `result()` (e.g. with `run_tool()` and `get_clinic_info()`) actually correct?**
  _`result()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Builds agent/functions.json: the Bolna custom-function definitions for every too`, `Push the buildathon agent settings to the live Bolna agent.  Reads the repo .env`, `Static checks that keep the Bolna agent config in step with the backend and free` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._