# OTLP Platformatic Backend

Exposes an OTLP HTTP endpoint (`PUT /v1/traces`) to receive traces as HTTP with protobuf payload and preprocess them to save the path to a Redis instance

The paths are put on redis with keys:

- `paths:<path>`: the path counter

Paths are in the form: `<method>/<path>;<service>:<method>/<path>;<service>`, e.g: `GET/testA;A:GET/testB;B`

Redis is also used to temporary store the traces before processing them. This is necessary because we receive spans of the same trace across multiple calls from the different services.
Traces keys are in the form: `traces:<traceId>` and expires in 120 seconds or after TRACE_ID_EXPIRE seconds (if configured as plugin option)
