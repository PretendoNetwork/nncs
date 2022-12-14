const dgram = require('dgram');
const ip = require('ip');

const LOCAL_IP = ip.address();
const LOCAL_IP_INT = ip2int(LOCAL_IP);

const PRIMARY_PORT = 10025;
const SECONDARY_PORT = 10125;

PRIMARY_SOCKET = dgram.createSocket('udp4');
SECONDARY_SOCKET = dgram.createSocket('udp4');

PRIMARY_SOCKET.bind(PRIMARY_PORT);
SECONDARY_SOCKET.bind(SECONDARY_PORT);

PRIMARY_SOCKET.on('message', handleMessage);

const HANDLERS = {
	1: handleMessageType1,
	2: handleMessageType2,
	3: handleMessageType3,
	4: handleMessageType4,
	5: handleMessageType5,
	101: handleMessageType101,
	102: handleMessageType102,
	103: handleMessageType103,
};

function handleMessage(msg, rinfo) {
	const message = {
		type: msg.readUInt32BE(),
		externalPort: msg.readUInt32BE(),
		externalAddress: msg.readUInt32BE(),
		localAddress: msg.readUInt32BE()
	};

	const handler = HANDLERS[message.type];

	if (!handler) {
		throw new Error(`Unknown NNCS message type ${message.type}`);
	}

	handler(message, rinfo);
}

function handleMessageType1(message, rinfo) {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to check if the NAT check server is reachable at all,
	// * to measure the time that it takes to receive a response,
	// * and to figure out its own external IP address and port.
	// TODO - Implement this
}

function handleMessageType2(message, rinfo) {
	// * The server replies from a different IP address and port.
	// * NEX uses this to determine the NAT filtering mode.
	// TODO - Implement this
}

function handleMessageType3(message, rinfo) {
	// * The server replies from its regular IP address but from a different port.
	// * NEX uses this to determine the NAT filtering mode.
	// TODO - Implement this
}

function handleMessageType4(message, rinfo) {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to determine the NAT mapping mode.
	// TODO - Implement this
}

function handleMessageType5(message, rinfo) {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to determine the NAT mapping mode.
	// TODO - Implement this
}

function handleMessageType101(message, rinfo) {
	// * The server replies from its regular IP address and port.
	const { address, port } = rinfo;

	const response = Buffer.alloc(16);

	response.writeUInt32BE(id, 0);
	response.writeUInt32BE(port, 4);
	response.writeUInt32BE(ip2int(address), 8);
	response.writeUInt32BE(LOCAL_IP_INT, 12);

	PRIMARY_SOCKET.send(response, port, address);
}

function handleMessageType102(message, rinfo) {
	// * The server replies from its regular IP address but from a different port.
	const { address, port } = rinfo;

	const response = Buffer.alloc(16);

	response.writeUInt32BE(id, 0);
	response.writeUInt32BE(port, 4);
	response.writeUInt32BE(ip2int(address), 8);
	response.writeUInt32BE(LOCAL_IP_INT, 12);

	SECONDARY_SOCKET.send(response, port, address);
}

function handleMessageType103(message, rinfo) {
	// * The server replies from its regular IP address and port.
	const { address, port } = rinfo;

	const response = Buffer.alloc(16);

	response.writeUInt32BE(id, 0);
	response.writeUInt32BE(port, 4);
	response.writeUInt32BE(ip2int(address), 8);
	response.writeUInt32BE(LOCAL_IP_INT, 12);

	PRIMARY_SOCKET.send(response, port, address);
}

function int2ip(int) {
	return `${int >>> 24}.${int >> 16 & 255}.${int >> 8 & 255}.${int & 255}`;
}

function ip2int(ip) {
	return Buffer.from(ip.split('.')).readUInt32BE();
}