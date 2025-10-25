import os from 'node:os';
import dgram from 'node:dgram';
import 'dotenv/config';

type NATMessage = {
	type: number;
	externalPort: number;
	externalAddress: number;
	localAddress: number;
};

// * No real need for a full blown config manager here
// TODO - Currently assumes both IPs point to the same server. Support a mode where only 1 address is needed, for cases where 2 entirely different servers are used
const NNCS1_IP_ADDRESS = process.env.PN_NNCS1_IP_ADDRESS;
const NNCS2_IP_ADDRESS = process.env.PN_NNCS2_IP_ADDRESS;

if (!NNCS1_IP_ADDRESS?.trim()) {
	throw new Error('PN_NNCS1_IP_ADDRESS environment variable not set');
}

if (!NNCS2_IP_ADDRESS?.trim()) {
	throw new Error('PN_NNCS2_IP_ADDRESS environment variable not set');
}

if (NNCS1_IP_ADDRESS === NNCS2_IP_ADDRESS) {
	throw new Error('PN_NNCS1_IP_ADDRESS and PN_NNCS2_IP_ADDRESS may not be the same address. Must use 2 different public IP addresses');
}

const LOCAL_IP = getLocalIPAddress();
const LOCAL_IP_INT = ip2int(LOCAL_IP);

const PRIMARY_PORT = 10025;
const SECONDARY_PORT = 10125;
const UNKNOWN_PORT_33334 = 33334; // * Unknown uses
const UNKNOWN_PORT_33335 = 33335; // * Unknown uses

const PRIMARY_SOCKET_NNCS1 = dgram.createSocket('udp4');
const PRIMARY_SOCKET_NNCS2 = dgram.createSocket('udp4');
const SECONDARY_SOCKET_NNCS1 = dgram.createSocket('udp4');
const SECONDARY_SOCKET_NNCS2 = dgram.createSocket('udp4');

// * Message types 2, 3 and 102 send responses back from random ports. So
// * create "alternate" sockets for these message types
const ALTERNATE_SOCKET_NNCS1 = dgram.createSocket('udp4');
const ALTERNATE_SOCKET_NNCS2 = dgram.createSocket('udp4');

// * NNCS1 gets messages on 2 ports with unknown uses. Just sinkholing them for now
// * so the client knows the ports are reachable
const PORT_33334_SOCKET = dgram.createSocket('udp4');
const PORT_33335_SOCKET = dgram.createSocket('udp4');

const HANDLERS: Record<number, (message: any, rinfo: dgram.RemoteInfo, socket: dgram.Socket) => void> = {
	1: handleMessageType1,
	2: handleMessageType2,
	3: handleMessageType3,
	4: handleMessageType4,
	5: handleMessageType5,
	101: handleMessageType101,
	102: handleMessageType102,
	103: handleMessageType103
};

PRIMARY_SOCKET_NNCS1.bind(PRIMARY_PORT, NNCS1_IP_ADDRESS);
PRIMARY_SOCKET_NNCS2.bind(PRIMARY_PORT, NNCS2_IP_ADDRESS);
SECONDARY_SOCKET_NNCS1.bind(SECONDARY_PORT, NNCS1_IP_ADDRESS);
SECONDARY_SOCKET_NNCS2.bind(SECONDARY_PORT, NNCS2_IP_ADDRESS);
ALTERNATE_SOCKET_NNCS1.bind(0, NNCS1_IP_ADDRESS); // * Let the OS assign a random port
ALTERNATE_SOCKET_NNCS2.bind(0, NNCS2_IP_ADDRESS); // * Let the OS assign a random port
PORT_33334_SOCKET.bind(UNKNOWN_PORT_33334, NNCS1_IP_ADDRESS);
PORT_33335_SOCKET.bind(UNKNOWN_PORT_33335, NNCS1_IP_ADDRESS);

[PRIMARY_SOCKET_NNCS1, PRIMARY_SOCKET_NNCS2, SECONDARY_SOCKET_NNCS1, SECONDARY_SOCKET_NNCS2].forEach((socket) => {
	socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
		handleMessage(msg, rinfo, socket);
	});
});

PORT_33334_SOCKET.on('message', (_msg: Buffer, _rinfo: dgram.RemoteInfo) => {
	// * Do nothing, should be 16 null bytes. Just sinkhole it so the client knows the port is reachable
});

PORT_33335_SOCKET.on('message', (_msg: Buffer, _rinfo: dgram.RemoteInfo) => {
	// * Do nothing, just sinkhole it so the client knows the port is reachable.
	// * Seems to always be 56 bytes of mostly static data
	// * Bytes 0-7 seem to never change
	// * Bytes 8-13 seem to change, but not by much
	// * Bytes 14-39 seem to never change, and contains the ASCII string "Dummy"
	// * Bytes 40-55 Seem to change, maybe a hash like MD5? I couldn't find any combination of the message bytes that made this value though
	// TODO - Consume this?
});

function getLocalIPAddress(): string {
	const networkInterfaces = os.networkInterfaces();

	for (const interfaceName in networkInterfaces) {
		for (const interfaceInfo of networkInterfaces[interfaceName]!) {
			if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
				return interfaceInfo.address;
			}
		}
	}

	return '127.0.0.1';
}

function handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	const message = {
		type: msg.readUInt32BE(0),
		externalPort: msg.readUInt32BE(4),
		externalAddress: msg.readUInt32BE(8),
		localAddress: msg.readUInt32BE(12)
	};

	const handler = HANDLERS[message.type];

	if (!handler) {
		// * Just do nothing if not a valid message type
		return;
	}

	handler(message, rinfo, socket);
}

function createResponse(message: NATMessage, rinfo: dgram.RemoteInfo): Buffer {
	const response = Buffer.alloc(16);

	response.writeUInt32BE(message.type, 0);
	response.writeUInt32BE(rinfo.port, 4);
	response.writeUInt32BE(ip2int(rinfo.address), 8);
	response.writeUInt32BE(LOCAL_IP_INT, 12);

	return response;
}

function handleMessageType1(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to check if the NAT check server is reachable at all,
	// * to measure the time that it takes to receive a response,
	// * and to figure out its own external IP address and port.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType2(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from a different IP address and port.
	// * NEX uses this to determine the NAT filtering mode.
	// * It is assumed that "different IP" simply means "the other NNCS"
	if (socket.address().address === NNCS1_IP_ADDRESS) {
		ALTERNATE_SOCKET_NNCS2.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
	} else {
		ALTERNATE_SOCKET_NNCS1.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
	}
}

function handleMessageType3(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address but from a different port.
	// * NEX uses this to determine the NAT filtering mode.
	if (socket.address().address === NNCS1_IP_ADDRESS) {
		ALTERNATE_SOCKET_NNCS1.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
	} else {
		ALTERNATE_SOCKET_NNCS2.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
	}
}

function handleMessageType4(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to determine the NAT mapping mode.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType5(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to determine the NAT mapping mode.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType101(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType102(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address but from a different port.
	if (socket.address().address === NNCS1_IP_ADDRESS) {
		ALTERNATE_SOCKET_NNCS1.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
	} else {
		ALTERNATE_SOCKET_NNCS2.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
	}
}

function handleMessageType103(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function ip2int(ip: string): number {
	return Buffer.from(ip.split('.').map(Number)).readUInt32BE();
}
