# NAT Check Server
Used to detect NAT properties to perform NAT traversal

Consoles require a primary and secondary server (`nncs1.app.nintendowifi.net` and `nncs2.app.nintendowifi.net` respectively), each with a primary and secondary port (`10025` and `10125` respectively) and each server MUST be differing IP addresses.

Meaning the `nncs1.app.nintendowifi.net:10025`, `nncs1.app.nintendowifi.net:10125`, `nncs2.app.nintendowifi.net:10025`, and `nncs2.app.nintendowifi.net:10125` must all exist and `nncs1` and `nncs2` can _**NOT**_ point to the same IP address

## Implemented message types
See function comments for message type details

- [ ] Message type 1
- [ ] Message type 2
- [ ] Message type 3
- [ ] Message type 4
- [ ] Message type 5
- [x] Message type 101
- [x] Message type 102
- [x] Message type 103