/* LittleBits w30 Bluetooth Low-Energy module
 *
 * This library can be used to interact with a BLE bit from with a web
 * application.
 *
 * This code was not created by littleBits Electronics Inc. and is provided
 * with no warranty. It may damage your device if you use it.
 */

window.W30Bit = (function() {

const SERVICE_ID = '0705d0c0-c8d8-41c9-ae15-52fad5358b8a';
const BITSNAP_CHAR = '0705d0c2-c8d8-41c9-ae15-52fad5358b8a';
const SETTINGS_CHAR = '0705d0c3-c8d8-41c9-ae15-52fad5358b8a';
const SEQUENCER_CHAR = '0705d0c5-c8d8-41c9-ae15-52fad5358b8a';

const _Connections = {};
const _Listeners = [];

function _sendUpdate(label) {
    if (!_Listeners) {
        return;
    }
    const state = getConnectionState(label);
    _Listeners.forEach(listener => {
        listener(label, state);
    });
}

function connectBit(label, defaultValue) {
    _Connections[label] = {
        name: null,
        id: null,
        log: [],
        state: "Disconnected",
        connected: false,
        _device: null,
        _characteristic: null,
        error: null,
    };
    const conn = _Connections[label];
    _sendUpdate(label);

    if (window.location.href.indexOf("dummy=1") >= 0) {
        // Swap in a dummy implementation for testing
        conn.state = "Pairing";
    	conn.log.push('Pairing with dummy device...');
        _sendUpdate(label);

        // Wait a second before reporting "connected" status
        window.setTimeout(() => {
            conn.id = Math.random().toString(36).substring(2, 7);
            conn.name = "dummy-" + conn.id;
            conn.state = "Connected";
            conn.connected = true;
            conn._device = {
                gatt: {
                    disconnect: () => {
                        conn.state = "Disconnected";
                        conn.connected = false;
                        conn._device = null;
                        conn._characteristic = null;
            			conn.log.push('Disconnected from server.');
                        _sendUpdate(label);
                    }
                }
            };
            conn._characteristic = {
                writeValue: (val) => null,
            };
    		conn.log.push('Connected!');
            writeValue(label, defaultValue);
        }, 1000);
        return;
    }

    if (!navigator.bluetooth) {
        conn.error = 'Bluetooth is not support on this device.';
        conn.log.push(conn.error);
        _sendUpdate(label);
        return;
    }

    conn.state = "Pairing";
	conn.log.push('Requesting any Bluetooth Device with ' + SERVICE_ID + '...');
    _sendUpdate(label);

	navigator.bluetooth.requestDevice({
		filters: [{ services: [SERVICE_ID] }]
	}).then(device => {
        conn._device = device;
        conn.name = device.name;
        conn.id = device.id;
        conn.state = "Connecting";
		conn.log.push('Found ' + device.name + ' (' + device.id + '). Connecting to GATT Server...');
        _sendUpdate(label);

		device.addEventListener('gattserverdisconnected', () => {
            conn.state = "Disconnected";
            conn.connected = false;
            conn._device = null;
            conn._characteristic = null;
			conn.log.push('Disconnected from server.');
            _sendUpdate(label);
		});
		return device.gatt.connect();
	}).then(server => {
		conn.log.push('Getting service ' + SERVICE_ID + '...');
        _sendUpdate(label);
		return server.getPrimaryService(SERVICE_ID);
	})
	.then(service => {
		conn.log.push('Getting descriptor for ' + BITSNAP_CHAR + '...');
        _sendUpdate(label);
		return service.getCharacteristic(BITSNAP_CHAR);
	})
	.then(characteristic => {
        conn.state = "Connected";
        conn.connected = true;
        conn._characteristic = characteristic;
		conn.log.push('Connected!');
        writeValue(label, defaultValue);
	})
	.catch(error => {
        conn.state = "Disconnected";
        conn.error = error;
        if (conn._device) {
            conn._device.gatt.disconnect();
        }
        conn._device = null;
        conn.log.push('Error! ' + error);
        _sendUpdate(label);
	});
}

function disconnectBit(label) {
    if (!_Connections[label]) {
        return;
    }
    const conn = _Connections[label];
    if (conn._device) {
        conn._device.gatt.disconnect();
    }
}

function getConnectionState(label) {
    if (!_Connections[label]) {
        return {
            name: null,
            id: null,
            log: [],
            state: "Disconnected",
            connected: false,
            error: null,
        };
    }
    const conn = _Connections[label];
    return {
        name: conn.name,
        id: conn.id,
        log: conn.log,
        state: conn.state,
        connected: conn.connected,
        error: conn.error,
    };
}

function writeValue(label, val) {
	if (!_Connections[label] || !_Connections[label].connected) {
        return;
    }

    const conn = _Connections[label];
	conn.log.push('Writing value ' + val);
    _sendUpdate(label);

	var bytesToWrite = Uint8Array.of(0, 2, val);
	conn._characteristic.writeValue(bytesToWrite);
}

function addConnectionUpdateHandler(handler) {
    _Listeners.push(handler);
}

function removeConnectionUpdateHandler(handler) {
    const idx = _Listeners.indexOf(handler);
    if (idx >= 0) {
        _Listeners.splice(idx, 1);
    }
}

return {
    connectBit,
    disconnectBit,
    getConnectionState,
    writeValue,
    addConnectionUpdateHandler,
    removeConnectionUpdateHandler,
}

})();
