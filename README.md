# NAT Check Server
Used to detect NAT properties to perform NAT traversal

Consoles require a primary and secondary server (`nncs1.app.nintendowifi.net` and `nncs2.app.nintendowifi.net` respectively), each with a primary and secondary port (`10025` and `10125` respectively) and each server MUST be differing public IP addresses.

Meaning the `nncs1.app.nintendowifi.net:10025`, `nncs1.app.nintendowifi.net:10125`, `nncs2.app.nintendowifi.net:10025`, and `nncs2.app.nintendowifi.net:10125` must all exist and `nncs1` and `nncs2` can _**NOT**_ point to the same IP address

## Implemented message types
See function comments for message type details

- [x] Message type 1
- [x] Message type 2
- [x] Message type 3
- [x] Message type 4
- [x] Message type 5
- [x] Message type 101
- [x] Message type 102
- [x] Message type 103

## Additional messages
Clients can also be seen sending messages to port `33334` and `33335` of NNCS1, however these messages never get replies. Because of the lack of responses, these messages are not handled here. Messages to port `33334` seem to always be 16 null bytes, whereas messages to port `33335` seem to always be 56 bytes of mostly static data.

## Configuration

Configurations are loaded through environment variables. `.env` files are supported. IP addresses are assumed to be pointing at the same server, though they must be different IP addresses, so both are required.

| Environment variable  | Description                     |
| --------------------- | ------------------------------- |
| `PN_NNCS1_IP_ADDRESS` | IP address for the NNCS1 server |
| `PN_NNCS2_IP_ADDRESS` | IP address for the NNCS2 server |
