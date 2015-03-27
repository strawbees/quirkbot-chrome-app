(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var arraysEqual = function(a1, a2) {
  if (a1.length != a2.length) {
    return false;
  }

  for (var i = 0; i < a1.length; i++) {
    if (a1[i] != a2[i]) {
      return false;
    }
  }

  return true;
}

var hasPrefix = function(candidate, prefix) {
  if (candidate.length < prefix.length) {
    return false;
  }

  for (var i = 0; i < prefix.length; i++) {
    if (prefix[i] != candidate[i]) {
      return false;
    }
  }

  return true;
}

exports.hasPrefix = hasPrefix;
exports.arraysEqual = arraysEqual;

},{}],2:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var clock = require("./clock.js");
var Status = require("./status.js").Status;
var logging = require("./logging.js");
var binary = require("./binary.js");

var hexToBin = binary.hexToBin;
var binToHex = binary.binToHex;
var hexRep = binary.hexRep;
var storeAsTwoBytes = binary.storeAsTwoBytes;

var log = logging.log;
var kDebugError = logging.kDebugError;
var kDebugNormal = logging.kDebugNormal;
var kDebugFine = logging.kDebugFine;
var kDebugVeryFine = logging.kDebugVeryFine;

// Board API (in progress):
//
// Connect
// ReadFlash
// WriteFlash

// API
function NewAvr109Board(serial, pageSize) {
  if (typeof(serial) === "undefined") {
    return { status: Status.Error("serial is undefined") }
  }

  if (typeof(pageSize) === "undefined") {
    return { status: Status.Error("pageSize is undefined") }
  }

  return { status: Status.OK,
           board: new Avr109Board(serial, pageSize) };
};

Avr109Board.prototype.connect = function(deviceName, doneCb) {
  this.connectImpl_(deviceName, doneCb);
}

Avr109Board.prototype.writeFlash = function(boardAddress, data, doneCb) {
  this.writeFlashImpl_(boardAddress, data, doneCb);
}

Avr109Board.prototype.readFlash = function(boardAddress, length, doneCb) {
  this.readFlashImpl_(boardAddress, length, doneCb);
}

// IMPLEMENTATION

Avr109Board.State = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected"
};

var AVR = {
  SOFTWARE_VERSION: 0x56,
  ENTER_PROGRAM_MODE: 0x50,
  LEAVE_PROGRAM_MODE: 0x4c,
  SET_ADDRESS: 0x41,
  WRITE: 0x42, // TODO: WRITE_PAGE
  TYPE_FLASH: 0x46,
  EXIT_BOOTLOADER: 0x45,
  CR: 0x0D,
  READ_PAGE: 0x67,

  MAGIC_BITRATE: 1200,
};

function Avr109Board(serial, pageSize) {
  this.init_();

  this.serial_ = serial;
  this.pageSize_ = pageSize;
};

Avr109Board.prototype.init_ = function() {
  this.serialListener_ = null;
  this.pageSize_ = -1;
  this.serial_ = null;
  this.state_ = Avr109Board.State.DISCONNECTED;
  this.connectionId_ = -1;
  this.clock_ = new clock.RealClock;
  this.readHandler_ = null;
}

Avr109Board.prototype.connectImpl_ = function(deviceName, doneCb) {
  // TODO: Validate doneCb
  // TODO: Validate deviceName?

  if (this.state_ != Avr109Board.State.DISCONNECTED) {
    doneCb(Status.Error("Can't connect. Current state: " + this.state_));
    return;
  }

  this.readHandler_ = null;
  this.state_ = Avr109Board.State.CONNECTING;
  this.kickBootloader_(deviceName, doneCb);
};

Avr109Board.prototype.writeFlashImpl_ = function(boardAddress, data, doneCb) {
  if (this.state_ != Avr109Board.State.CONNECTED) {
    return doneCb(Status.Error("Not connected to board: " + this.state_));
  };

  if (boardAddress % this.pageSize_ != 0) {
    return doneCb(Status.Error(
      "boardAddress must be alligned to page size of " + this.pageSize_
        + " (" + boardAddress + " % " + this.pageSize_ + " == "
        + (boardAddress % this.pageSize_) + ")"));
  }

  if (data.length % this.pageSize_ != 0) {
    return doneCb(Status.Error(
      "data size must be alligned to page size of " + this.pageSize_
        + " (" + data.length + " % " + this.pageSize_ + " == "
        + (data.length % this.pageSize_) + ")"));
  }

  var board = this;
  this.writeAndGetReply_(
    [AVR.ENTER_PROGRAM_MODE],
    function(response) {
      var hexResponse = binToHex(response.data);
      if (hexResponse.length == 1 && hexResponse[0] == 0x0D) {
        board.beginProgramming_(boardAddress, data, doneCb)
      } else {
        return doneCb(Status.Error(
          "Error entering program mode: " + hexRep(hexResponse)));
      }
    });
};

Avr109Board.prototype.readFlashImpl_ = function(boardAddress, length, doneCb) {
  if (this.state_ != Avr109Board.State.CONNECTED) {
    doneCb({
      status: Status.Error("Not connected to board: " + this.state_) });
  } else {
    doneCb({
      status: Status.Error("Not implemented")});
  }
};

Avr109Board.prototype.readDispatcher_ = function(readArg) {
  if (this.readHandler_ != null) {
    log(kDebugFine, "Dispatching read...");
    this.readHandler_(readArg);
    return;
  }

  log(kDebugNormal, "No read handler for: " + JSON.stringify(readArg));
}

Avr109Board.prototype.kickBootloader_ = function(originalDeviceName, doneCb) {
  var oldDevices = [];
  var serial = this.serial_;
  var board = this;

  serial.getDevices(function(devicesArg) {
    oldDevices = devicesArg;
    serial.connect(originalDeviceName, {bitrate: AVR.MAGIC_BITRATE }, function(connectArg) {
      setTimeout(function() {
        log(kDebugFine, "CONNECT: " + JSON.stringify(connectArg));

        serial.disconnect(connectArg.connectionId, function(disconnectArg) {
          log(kDebugFine, "DISCONNECT: " + JSON.stringify(disconnectArg));
          board.waitForNewDevice_(
            oldDevices, doneCb, board.clock_.nowMillis() + 1000);
        });
      }, 100);
    });
  });
}

function findMissingIn(needles, haystack) {
  var haystack2 = [];
  for (var i = 0; i < haystack.length; ++i) {
    haystack2.push(haystack[i].path);
  }

  var r = [];
  for (var i = 0; i < needles.length; ++i) {
    if (haystack2.indexOf(needles[i].path) == -1) {
      r.push(needles[i].path);
    }
  }

  return r;
}

Avr109Board.prototype.waitForNewDevice_ = function(oldDevices, doneCb, deadline) {
  var serial = this.serial_;
  var board = this;

  if (this.clock_.nowMillis() > deadline) {
    doneCb(Status.Error("Deadline exceeded while waiting for new devices"));
    return;
  }

  var found = false;
  serial.getDevices(function(newDevices) {
    log(kDebugFine, "WND: " + JSON.stringify(newDevices));
    var appeared = findMissingIn(newDevices, oldDevices);
    var disappeared = findMissingIn(oldDevices, newDevices);
 
    for (var i = 0; i < disappeared.length; ++i) {
      log(kDebugFine, "Disappeared: " + disappeared[i]);
    }
    for (var i = 0; i < appeared.length; ++i) {
      log(kDebugFine, "Appeared: " + appeared[i]);
    }

    if (appeared.length == 0 && disappeared.length == 0 ) {
      setTimeout(function() {
        board.waitForNewDevice_(newDevices, doneCb, deadline);
      }, 100);
    } else {
      var device = appeared[0] ? appeared[0] : disappeared[0];
      log(kDebugNormal, "Aha! Connecting to: " + device);
      // I'm not 100% sure why we need this setTimeout
      setTimeout(function() {
        log(kDebugFine, "Reconnecting...");
        serial.connect(device, { bitrate: 57600 }, function(connectArg) {
          
          board.serialConnected_(connectArg, doneCb);
        });
      }, 2000);
    }
  });
}

Avr109Board.prototype.serialConnected_ = function(connectArg, doneCb) {
  log(kDebugFine, "serialConnected");
  // TODO: test this?
  if (typeof(connectArg) == "undefined" ||
      typeof(connectArg.connectionId) == "undefined" ||
      connectArg.connectionId == -1) {
    doneCb(Status.Error("Couldn't connect to board. " + connectArg + " / " + connectArg.connectionId));
    return;
  }

  this.connectionId_ = connectArg.connectionId;
  // TODO: be more careful about removing this listener
  this.serialListener_ = this.readDispatcher_.bind(this);
  this.serial_.onReceive.addListener(this.serialListener_);

  this.startCheckSoftwareVersion_(doneCb);
}

Avr109Board.prototype.writeAndGetReply_ = function(payload, handler) {  
  log(kDebugFine, "writeAndGetReply");
  this.setReadHandler_(handler);
  this.write_(payload);
};

Avr109Board.prototype.write_ = function(payload) {
  this.serial_.send(
    this.connectionId_, hexToBin(payload), function(writeArg) {
      log(kDebugFine, "did write: " + JSON.stringify(writeArg));
      // TODO: verify writeArg
    });
}


Avr109Board.prototype.setReadHandler_ = function(handler) {
  log(kDebugFine, "setReadHandler");
  this.readHandler_ = handler;
};

Avr109Board.prototype.startCheckSoftwareVersion_ = function(doneCb) {
  log(kDebugFine, "startCheckSoftwareVersion");
  var board = this;
  this.writeAndGetReply_(
    [ AVR.SOFTWARE_VERSION ],
    function(readArg) {
      board.finishCheckSoftwareVersion_(readArg, doneCb);
    });
}

Avr109Board.prototype.finishCheckSoftwareVersion_ = function(readArg, doneCb) {
  log(kDebugFine, "finishCheckSoftwareVersion");
  var hexData = binToHex(readArg.data);
  // TODO: actually examine response
  if (hexData.length == 2) {
    this.state_ = Avr109Board.State.CONNECTED;
    log(kDebugNormal, "Connected");
    doneCb(Status.OK);
  } else {
    log(kDebugError, "Connection error.");
    doneCb(Status.Error("Unexpected software version response: " + hexRep(hexData)));
  }

  // TODO: Deadline?
};


Avr109Board.prototype.beginProgramming_ = function(boardAddress, data, doneCb) {
  log(kDebugFine, "Begin programming.");
  var board = this;
  var addressBytes = storeAsTwoBytes(boardAddress);
  this.writeAndGetReply_(
    // TODO: endianness
    [AVR.SET_ADDRESS, addressBytes[1], addressBytes[0]],
    function(readArg) {
      var hexData = binToHex(readArg.data);
      if (hexData.length == 1 && hexData[0] == 0x0D) {
        board.writePage_(0, data, doneCb);
      } else {
        return doneCb(Status.Error("Error setting address for programming."));
      }
    });
}

Avr109Board.prototype.writePage_ = function(pageNo, data, doneCb) {
  log(kDebugFine, "Write page");
  var numPages = data.length / this.pageSize_;
  if (pageNo == 0 || pageNo == numPages - 1 || (pageNo + 1) % 5 == 0) {
    log(kDebugFine, "Writing page " + (pageNo + 1) + " of " + numPages);
  }

  var board = this;
  var pageSize = this.pageSize_;

  var payload = data.slice(pageNo * this.pageSize_,
                           (pageNo + 1) * this.pageSize_);

  var sizeBytes = storeAsTwoBytes(this.pageSize_);

  // TODO: endianness
  var writeMessage = [AVR.WRITE, sizeBytes[0], sizeBytes[1], AVR.TYPE_FLASH];
  writeMessage = writeMessage.concat(payload);

  this.writeAndGetReply_(
    writeMessage,
    function(readArg) {
      var hexData = binToHex(readArg.data);
      if (hexData.length == 1 && hexData[0] == 0x0D) {
        if (pageSize * (pageNo + 1) >= data.length) {
          // TODO(mrjones): get board address from beginProgramming
          var boardAddress = 0;
          return board.beginVerification_(boardAddress, data, doneCb);
//          return board.exitProgramMode_(doneCb);
        }
        board.writePage_(pageNo + 1, data, doneCb);
      } else {
        return doneCb(Status.Error("Error writing page " + pageNo + ": " +
                                   hexRep(hexData)));
      }
    });
}

Avr109Board.prototype.beginVerification_ = function(boardAddress, data, doneCb) {
  var board = this;
  var addressBytes = storeAsTwoBytes(boardAddress);
  this.writeAndGetReply_(
    [AVR.SET_ADDRESS, addressBytes[1], addressBytes[0]],
    function(readArg) {
      var hexData = binToHex(readArg.data);
      if (hexData.length == 1 && hexData[0] == 0x0D) {
        board.verifyPage_(0, data, doneCb);
      } else {
        return doneCb(Status.Error("Error setting address for verification."));
      }

    });
}

Avr109Board.prototype.verifyPage_ = function(pageNo, data, doneCb) {
  var numPages = data.length / this.pageSize_;
//  if (pageNo == 0 || pageNo == numPages - 1 || (pageNo + 1) % 5 == 0) {
    log(kDebugFine, "Verifying page " + (pageNo + 1) + " of " + numPages);
//  }

  var board = this;
  var pageSize = this.pageSize_;
  var expected = data.slice(pageNo * this.pageSize_,
                            (pageNo + 1) * this.pageSize_);
  var sizeBytes = storeAsTwoBytes(this.pageSize_);

  var pageOffset = 0;
  this.writeAndGetReply_(
    [AVR.READ_PAGE, sizeBytes[0], sizeBytes[1], AVR.TYPE_FLASH],
    // TODO(mrjones): test for handling fragmented response payloads
    function(readArg) {
      var hexData = binToHex(readArg.data);
//      log(kDebugFine, "Got " + hexData.length + " bytes to verify");
      if (pageOffset + hexData.length > pageSize) {
        doneCb(Status.Error("Error verifying. Page #" + pageNo + ". Read too long (" + hexData.length + " vs. page size: " + pageSize));
        return;
      }
      for (var i = 0; i < hexData.length; i++) {
        if (hexData[i] != data[pageSize * pageNo + pageOffset]) {
          doneCb(Status.Error("Error verifying. Page #" + pageNo + ". Data mismatch at offset " + pageOffset + "(expected: " + data[pageSize * pageNo + pageOffset] + ", actual:" + hexData[i] + ")"));
          return;
        }
        pageOffset++;
      }

      if (pageOffset == pageSize) {
        if (pageSize * (pageNo + 1) >= data.length) {
          return board.exitProgramMode_(doneCb);
        }
        board.verifyPage_(pageNo + 1, data, doneCb);
      } else {
//        log(kDebugFine, "Waiting for " + (pageSize - pageOffset) + " more bytes...");
      }
    });
}

Avr109Board.prototype.exitProgramMode_ = function(doneCb) {
  var board = this;
  this.writeAndGetReply_(
    [AVR.LEAVE_PROGRAM_MODE],
    function(readArg) {
      var hexData = binToHex(readArg.data);
      if (hexData.length == 1 && hexData[0] == AVR.CR) {
        board.exitBootloader_(doneCb);
      } else {
        doneCb(Status.Error("Error leaving program mode: " + hexRep(hexData)));
      }
    });
};

Avr109Board.prototype.exitBootloader_ = function(doneCb) {
  this.writeAndGetReply_(
    [AVR.EXIT_BOOTLOADER],
    function(readArg) {
      var hexData = binToHex(readArg.data);
      if (hexData.length == 1 && hexData[0] == AVR.CR) {
        // TODO: add a "disconnect" method, and call it everywhere
        this.serial_.onReceive.removeListener(this.serialListener_);

        // TODO: don't forget to disconnect in all the error cases (yuck)
        this.serial_.disconnect(this.connectionId_, function(disconnectArg) {
          doneCb(Status.OK);
        });
      } else {
        doneCb(Status.Error("Error leaving bootloader: " + hexRep(hexData)));
      }
    });
}

exports.NewAvr109Board = NewAvr109Board;
exports.AVR = AVR;

},{"./binary.js":3,"./clock.js":4,"./logging.js":6,"./status.js":7}],3:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

function binToHex(bin) {
  var bufferView = new Uint8Array(bin);
  var hexes = [];
  for (var i = 0; i < bufferView.length; ++i) {
    hexes.push(bufferView[i]);
  }
  return hexes;
}

function hexToBin(hex) {
  var buffer = new ArrayBuffer(hex.length);
  var bufferView = new Uint8Array(buffer);
  for (var i = 0; i < hex.length; i++) {
    bufferView[i] = hex[i];
  }

  return buffer;
}

function hexRep(intArray) {
  var buf = "[";
  var sep = "";
  for (var i = 0; i < intArray.length; ++i) {
    var h = intArray[i].toString(16);
    if (h.length == 1) { h = "0" + h; }
    buf += (sep + "0x" + h);
    sep = ",";
  }
  buf += "]";
  return buf;
}

function storeAsTwoBytes(n) {
  var lo = (n & 0x00FF);
  var hi = (n & 0xFF00) >> 8;
  return [hi, lo];
}

exports.binToHex = binToHex;
exports.hexToBin = hexToBin;
exports.hexRep = hexRep;
exports.storeAsTwoBytes = storeAsTwoBytes;

},{}],4:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var RealClock = function() { };

RealClock.prototype.nowMillis = function() {
  return new Date().getTime();
}

exports.RealClock = RealClock;

},{}],5:[function(require,module,exports){
/*
 Portions copyright 2013 Julian Fernando Vidal | https://github.com/poisa/JVIntelHex
 Version 1.0

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * Lightweight implementation of the Intel HEX format
 *
 * @param data    an array of bytes
 * @param int     byteCount Usually 16 or 32
 * @param byte    startAddress
 * @param bool    useRecordHeader Whether to prefix records with a colon ":" or not
 * @returns IntelHEX
 *
 * OR
 *
 * @param data    a string of a HEX file to be parsed
 * @returns IntelHEX
 */
function IntelHEX(data, byteCount, startAddress, useRecordHeader)
{
    this.data = data;
    if (arguments.length > 1) {
      this.byteCount = byteCount;
      this.startAddress = startAddress;
      this.records = [];
      this.useRecordHeader = useRecordHeader;
    } else {
      this.records = data.split("\n");
    }

    this.RECORD_TYPE_DATA = '00';
    this.RECORD_TYPE_EOF  = '01';
};

IntelHEX.prototype.createRecords = function()
{
    if (!this.records.length) {
      var data = this.data;
      var offset = 0;
      var currentAddress = this.startAddress;

      while (data.length > 0) {

          currentAddress = this.startAddress + offset;

          var rowByteCount = 0;
          var checksum     = 0;
          var recordData   = '';
          var record       = '';

          for (var i = 0; i < this.byteCount; i++) {
              var byte = data.shift();
              if (byte != undefined) {
                  recordData += this.decToHex(byte);
                  checksum += byte;
                  rowByteCount++;
              }
          }

          // Add MSB and LSB of address rather than entire address
          checksum += (currentAddress & 0xFF) + ((currentAddress & 0xFF00) >> 8);
          checksum += parseInt(this.RECORD_TYPE_DATA, 16);
          checksum += rowByteCount;

          if (this.useRecordHeader) {
              record += ':';
          }

          record += this.decToHex(rowByteCount) +
                    this.decToHex(currentAddress, 4) +
                    this.decToHex(this.RECORD_TYPE_DATA) +
                    recordData +
                    this.decToHex(this.calculateChecksum(checksum));

          record = record.toUpperCase();
          this.records.push(record);

          // Calculate next address
          offset += rowByteCount;
      }

      // Create EOF record
      record = '';
      if (this.useRecordHeader) {
          record += ':';
      }
      record += '00' +                 // byte count
                '0000' +               // address
                this.RECORD_TYPE_EOF + // record type
                'FF';                  // checksum

      this.records.push(record);
    }
};

/**
 * Calculate the checksum for the passed data. The checksum is basically
 * the two's complement of just the 8 LSBs.
 *
 * @param int data
 * @returns int
 */
IntelHEX.prototype.calculateChecksum = function(data)
{
    checksum = data;
    checksum = checksum & 255; // grab 8 LSB
    checksum = ~checksum + 1;  // two's complement
    checksum = checksum & 255; // grab 8 LSB
    return checksum;
};

/**
 * Converts a decimal number to an hexadecimal string including leading 0s if required
 *
 * @param int d         Decimal number
 * @param int padding   Required padding (optional)
 * @returns string
 */
IntelHEX.prototype.decToHex = function(d, padding)
{

    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return hex;
};

IntelHEX.prototype.hexToDec = function(h) {
  if (!h.match("^[0-9A-Fa-f]*$")) {
    console.log("Invalid hex chars: " + h);
    return -1;
  }
  return parseInt(h, 16);
}

IntelHEX.prototype.hexCharsToByteArray = function(hc) {
  if (hc.length % 2 != 0) {
    console.log("Need 2-char hex bytes");
    return -1; // :(
  }

  var bytes = [];
  for (var i = 0; i < hc.length / 2; ++i) {
    var hexChars = hc.substring(i * 2, (i * 2) + 2);
    var byte = this.hexToDec(hexChars);
    if (byte == -1) {
      return -1;
    }
    bytes.push(byte);
  }
  return bytes;
}

/**
 * Returns a formatted HEX string that can be saved to a HEX file.
 *
 * Eg:
 *  :10C00000576F77212044696420796F7520726561CC
 *  :10C010006C6C7920676F207468726F756768206137
 *  :10C020006C6C20746869732074726F75626C652023
 *  :10C03000746F207265616420746869732073747210
 *  :04C040007696E67397
 *  :00000001FF

 * @param string lineSeparator
 * @returns string
 */
IntelHEX.prototype.getHEXFile = function(lineSeparator)
{
    if (typeof lineSeparator === 'undefined') {
        lineSeparator = "\n";
    }

    returnValue = '';
    for (i = 0; i < this.records.length; i++) {
       returnValue += this.records[i] + lineSeparator;
    }
    return returnValue;
};

/**
 * Returns all the data in a big array of bytes.
 *
 * Eg:
 *    array(32, 1, 255, 34, 15, etc, etc);
 *
 * @returns array
 */
IntelHEX.prototype.getHEXAsByteArray = function()
{
    var data = this.getHEXFile('').replace(/:/g, '');
    var dataLength = data.length;

    byteArray = [];

    for (i = 0; i < dataLength; i += 2) {
        byte = data[i] + data[i + 1];
        byteArray.push(parseInt(byte, 16));
    }
    return byteArray;
};

/**
 * Returns all the data as a string of 1s and 0s
 *
 * Eg:
 *    10000111001000101010101111111010000, etc, etc
 *
 * @param bool prettyOutput Wheter to format the string with human readable spaces
 * @returns string
 */
IntelHEX.prototype.getHEXAsBinaryString = function(prettyOutput)
{
    if (typeof prettyOutput === 'undefined') {
        prettyOutput = false;
    }

    byteArray = this.getHEXAsByteArray();
    byteArrayLength = byteArray.length;
    binaryString = '';

    for (var currentByte = 0; currentByte < byteArrayLength; currentByte++)
    {
        for (var currentBit = 7; currentBit >= 0; currentBit--) {
            var bitMask = 1 << currentBit;
            if (byteArray[currentByte] & bitMask) {
                binaryString += '1';
            } else {
                binaryString += '0';
            }

            if (currentBit == 4 && prettyOutput) {
                binaryString += ' ';
            }

        }
        if (prettyOutput) {
            binaryString += '  ';
        }
    }

    return binaryString;
};

IntelHEX.prototype.parse = function() {
  var kStartcodeBytes = 1;
  var kSizeBytes = 2;
  var kAddressBytes = 4;
  var kRecordTypeBytes = 2;
  var kChecksumBytes = 2;

  var inputLines = this.records;

  var out = [];

  var nextAddress = 0;

  for (var i = 0; i < inputLines.length; ++i) {
    var sum = 0;
    var line = inputLines[i];

    //
    // Startcode
    //
    if (line[0] != ":") {
      console.log("Bad line [" + i + "]. Missing startcode: " + line);
      return "FAIL";
    }

    //
    // Data Size
    //
    var ptr = kStartcodeBytes;
    if (line.length < kStartcodeBytes + kSizeBytes) {
      console.log("Bad line [" + i + "]. Missing length bytes: " + line);
      return "FAIL";
    }
    var dataSizeHex = line.substring(ptr, ptr + kSizeBytes);
    ptr += kSizeBytes;
    var dataSize = this.hexToDec(dataSizeHex);
    sum += dataSize;

    //
    // Address
    //
    if (line.length < ptr + kAddressBytes) {
      console.log("Bad line [" + i + "]. Missing address bytes: " + line);
      return "FAIL";
    }
    var addressHex = line.substring(ptr, ptr + kAddressBytes);
    ptr += kAddressBytes;
    var address = this.hexToDec(addressHex);
    sum += this.hexCharsToByteArray(addressHex).reduce(function(a,b){return a+b;});


    //
    // Record Type
    //
    if (line.length < ptr + kRecordTypeBytes) {
      console.log("Bad line [" + i + "]. Missing record type bytes: " + line);
      return "FAIL";
    }
    var recordTypeHex = line.substring(ptr, ptr + kRecordTypeBytes);
    ptr += kRecordTypeBytes;
    sum += this.hexToDec(recordTypeHex);

    //
    // Data
    //
    var dataChars = 2 * dataSize;  // Each byte is two chars
    if (line.length < (ptr + dataChars)) {
      console.log("Bad line [" + i + "]. Too short for data: " + line);
      return "FAIL";
    }
    var dataHex = line.substring(ptr, ptr + dataChars);
    ptr += dataChars;
    if (dataHex) {
      sum += this.hexCharsToByteArray(dataHex).reduce(function(a,b){return a+b;});
    }

    //
    // Checksum
    //
    if (line.length < (ptr + kChecksumBytes)) {
      console.log("Bad line [" + i + "]. Missing checksum: " + line);
      return "FAIL";
    }
    var checksumHex = line.substring(ptr, ptr + kChecksumBytes);
    var checksumCalc = this.decToHex(this.calculateChecksum(sum)).toUpperCase();

    if (checksumCalc != checksumHex) {
      console.log("Bad checksum '" + checksumHex + "' on line [" + i + "]. Expected '" + checksumCalc + "'");
      return "FAIL";
    }

    //
    // Permit trailing whitespace
    //
    if (line.length > ptr + kChecksumBytes + 1) {
      var leftover = line.substring(ptr, line.length);
      if (!leftover.match("$\w+^")) {
          console.log("Bad line [" + i + "]. leftover data: " + line);
          return "FAIL";
      }
    }

    if (recordTypeHex == this.RECORD_TYPE_EOF) {
      return out;
    } else if (recordTypeHex == this.RECORD_TYPE_DATA) {
      if (address != nextAddress) {
        console.log("I need contiguous addresses");
        return "FAIL";
      }
      nextAddress = address + dataSize;

      var bytes = this.hexCharsToByteArray(dataHex);
      if (bytes == -1) {
        console.log("Couldn't parse hex data: " + dataHex);
        return "FAIL";
      }
      out = out.concat(bytes);
    } else {
      console.log("I can't handle records of type: " + recordTypeHex);
      return "FAIL";
    }
  }

  console.log("Never found EOF!");
  return "FAIL";
}

exports.IntelHEX = IntelHEX;

},{}],6:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var kDebugError = 0;
var kDebugNormal = 1;
var kDebugFine = 2;
var kDebugVeryFine = 3;

var visibleLevel = kDebugNormal;
var consoleLevel = kDebugVeryFine;

var visibleLoggingDiv_ = "";

function configureVisibleLogging(divName) {
  visibleLoggingDiv_ = divName;
}

function timestampString() {
  var now = new Date();
  var pad = function(n, width) {
    var acc = n;
    while (n < Math.pow(10, width - 1)) {
      acc = "0" + acc;
      width = width - 1;
    }
    return acc;
  }
  return pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2) + ":" + pad(now.getSeconds(), 2) + "." + pad(now.getMilliseconds(), 3);
}

function visibleLog(message) {
  if (visibleLoggingDiv_ != "") {
    document.getElementById(visibleLoggingDiv_).innerHTML =
      "[" + timestampString() + "] " + message + 
      "<br/>" + document.getElementById(visibleLoggingDiv_).innerHTML;
  }
}

function consoleLog(message) {
  console.log(message);
  if (chrome.extension.getBackgroundPage()) {
    chrome.extension.getBackgroundPage().log(message);
  }
}

function setConsoleLogLevel(level) {
  consoleLevel = level;
}

function setVisibleLogLevel(level) {
  visibleLevel = level;
}

function log(level, message) {
  if (level <= consoleLevel) {
    console.log(message);
  }
  if (level <= visibleLevel) {
    visibleLog(message);
  }
}

exports.log = log;
exports.kDebugError = kDebugError;
exports.kDebugNormal = kDebugNormal;
exports.kDebugFine = kDebugFine;
exports.kDebugVeryFine = kDebugVeryFine;
exports.setVisibleLogLevel = setVisibleLogLevel;
exports.setConsoleLogLevel = setConsoleLogLevel;
exports.configureVisibleLogging = configureVisibleLogging;

},{}],7:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

function Status(ok, errorMessage) {
  this.ok_ = ok;
  this.errorMessage_ = errorMessage;
};

Status.prototype.ok = function() { return this.ok_; }
Status.prototype.errorMessage = function() { return this.errorMessage_; }

Status.prototype.toString = function() {
  if (this.ok_) {
    return "OK";
  } else {
    return "ERROR: '" + this.errorMessage_ + "'";
  }
}

Status.OK = new Status(true, null);

Status.Error = function(message) {
  return new Status(false, message);
}

exports.Status = Status;

},{}],8:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var Status = require("./status.js").Status;
var logging = require("./logging.js");
var binary = require("./binary.js");

var hexToBin = binary.hexToBin;
var hexRep = binary.hexRep;
var binToHex = binary.binToHex;
var log = logging.log;
var kDebugError = logging.kDebugError;
var kDebugNormal = logging.kDebugNormal;
var kDebugFine = logging.kDebugFine;
var kDebugVeryFine = logging.kDebugVeryFine;

//
// API
//
function NewStk500Board(serial, pageSize, opt_options) {
  if (typeof(serial) === "undefined") {
    return { status: Status.Error("serial is undefined") }
  }

  if (typeof(pageSize) === "undefined") {
    return { status: Status.Error("pageSize is undefined") }
  }

  return { status: Status.OK, board: new Stk500Board(serial, pageSize, opt_options) }
}

Stk500Board.prototype.connect = function(deviceName, doneCb) {
  this.connectImpl_(deviceName, doneCb);
};

Stk500Board.prototype.writeFlash = function(boardAddress, data, doneCb) {
  this.writeFlashImpl_(boardAddress, data, doneCb);
};

Stk500Board.prototype.readFlash = function(boardAddress, length, doneCb) {
  this.readFlashImpl_(boardAddress, length, doneCb);
};

//
// IMPLEMENTATION
//

var STK = {
  OK: 0x10,
  IN_SYNC: 0x14,
  CRC_EOP: 0x20,
  GET_SYNC: 0x30,
  GET_PARAMETER: 0x41,
  FLASH_MEMORY: 0x46,
  ENTER_PROGMODE: 0x50,
  LEAVE_PROGMODE: 0x51,
  LOAD_ADDRESS: 0x55,
  PROGRAM_PAGE: 0x64,
  READ_PAGE: 0x74,
  HW_VER: 0x80,
  SW_VER_MAJOR: 0x81,
  SW_VER_MINOR: 0x82,
  
  BYTES_PER_WORD: 2,
};

Stk500Board.State = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected"
};

Stk500Board.prototype.init_ = function() {
  this.connectionId_ = -1;
  this.pageSize_ = -1;
  this.readHandler_ = null;
  this.serial_ = null;
  this.serialListener_ = null;
  this.state_ = Stk500Board.State.DISCONNECTED;
  this.connectionDelayMs_ = 2000;
}

function Stk500Board(serial, pageSize, opt_options) {
  this.init_();
  this.serial_ = serial;
  this.pageSize_ = pageSize;
  this.readHandler_ = this.discardData_;

  if (typeof(opt_options) != "undefined") {
    if (typeof(opt_options) != "undefined") {
      this.connectDelayMs_ = opt_options.connectDelayMs;
    }
  }
};

//
// COMMON FUNCTIONALITY
//

Stk500Board.prototype.writeAndGetFixedSizeReply_ = function(writePayload, replyBytes, readHandler) {  
  this.setReadHandler_(this.waitForNBytes_(replyBytes, readHandler));
  this.write_(writePayload);
};

Stk500Board.prototype.setReadHandler_ = function(handler) {
  this.readHandler_ = handler;
};

Stk500Board.prototype.handleRead_ = function(readArg) {
  log(kDebugFine, "STK500::HandleRead: " + hexRep(binToHex(readArg.data).slice(0,10)));
  if (this.readHandler_ != null) {
    this.readHandler_(readArg);
    return;
  }

  log(kDebugError, "No read handler for: " + JSON.stringify(readArg));
}

Stk500Board.prototype.write_ = function(payload) {
  log(kDebugFine, "STK500::Writing " + hexRep(payload.slice(0,10)) + " -> " + this.connectionId_);
  this.serial_.send(
    this.connectionId_, hexToBin(payload), function(writeArg) {
      // log(kDebugVeryFine, "WRITE: " + JSON.stringify(writeArg));
      // TODO: veridy writeArg
    });
}

// TODO(mrjones): set a watchdog timeout, so that we can return
// something, rather than hanging forever if we don't get n bytes.
Stk500Board.prototype.waitForNBytes_ = function(n, onFull) {
  var buffer = [];

  return function(readArg) {
    var d = binToHex(readArg.data);
    buffer = buffer.concat(d);

    log(kDebugVeryFine, "Buffered " + d.length + " new bytes. Total is now " +
        buffer.length + ", and waiting for " + n);
    if (buffer.length >= n) {
      // If any data comes in while we're not expecting it, just drop
      // it on the floor.
      this.readHandler_ = this.discardData_;
      onFull({data: buffer});
    }
  }
}

Stk500Board.prototype.discardData_ = function(readArg) {
  log(kDebugError, "STK500::Got data from board when none was expected: " +
      binToHex(readArg));
}

//
// CONNECTION ESTABLISHMENT
//
Stk500Board.prototype.connectImpl_ = function(deviceName, doneCb) {
  // TODO: Validate doneCb
  // TODO: Validate deviceName?
  if (this.state_ != Stk500Board.State.DISCONNECTED) {
    doneCb(Status.Error("Can't connect. Current state: " + this.state_));
    return;
  }

  log(kDebugFine, "STK500::Connecting");
  this.state_ = Stk500Board.State.CONNECTING;

  var board = this;
  // NOTE: 115200 turns out to be the magic number! It didn't work with
  // other values.
  this.serial_.connect(deviceName, { bitrate: 115200 }, function(connectArg) {
    board.serialConnected_(connectArg, doneCb);
  });
}

Stk500Board.prototype.serialConnected_ = function(connectArg, doneCb) {
  if (typeof(connectArg) == "undefined" ||
      typeof(connectArg.connectionId) == "undefined" ||
      connectArg.connectionId == -1) {
    doneCb(Status.Error("Unable to connect to device!"));
    return;
  }

  log(kDebugVeryFine, "STK500::SerialConnected " + connectArg.connectionId);

  this.connectionId_ = connectArg.connectionId;

  // TODO: be more careful about removing this listener
  this.serialListener_ = this.handleRead_.bind(this);
  this.serial_.onReceive.addListener(this.serialListener_);

  this.twiddleControlLines_(doneCb);
}

Stk500Board.prototype.twiddleControlLines_ = function(doneCb) {
  var cid = this.connectionId_;
  var serial = this.serial_;
  var board = this;
  log(kDebugNormal, "STK500::WaitingToTwiddleControlLines (2 seconds)");
  setTimeout(function() {
    log(kDebugFine, "STK500::TwiddlingControlLines");
    serial.setControlSignals(cid, {dtr: false, rts: false}, function(ok) {
      if (!ok) {
        board.disconnectAndReturn_(doneCb, Status.Error("Couldn't set dtr/rts low"));
        return;
      }
      log(kDebugVeryFine, "STK500::DTR is false");
      setTimeout(function() {
        serial.setControlSignals(cid, {dtr: true, rts: true}, function(ok) {
          if (!ok) {
            board.disconnectAndReturn_(doneCb, Status.Error("Couldn't set dtr/rts high"));
            return;
          }
          log(kDebugVeryFine, "STK500::DTR is true");
          setTimeout(function() { board.getSync_(doneCb, 0); }, 250);
        });
      }, 250);
    });
  }, this.connectDelayMs_);
}

Stk500Board.prototype.getSync_ = function(doneCb, attempts) {
  log(kDebugVeryFine, "STK500::GetSync #" + attempts);
  var board = this;
  this.writeAndGetFixedSizeReply_(
    [ STK.GET_SYNC, STK.CRC_EOP ],
    2,
    function(readArg) {
      var data = binToHex(readArg.data);
      if (data.length == 2 &&
          data[0] == STK.IN_SYNC && data[1] == STK.OK) {
        log(kDebugNormal, "In Sync.");
        board.validateVersion_(doneCb);
      } else {
        if (attempts < 10) {
          setTimeout(function() {
            board.getSync_(doneCb, attempts + 1);
          }, 50);
        } else {
          board.disconnectAndReturn(doneCb, Status.Error("Couldn't get sync"));
        }
      }
    });
}

Stk500Board.prototype.validateVersion_ = function(doneCb) {
  var board = this;
  
  // TODO(mrjones): Think about what to do here ... do we actually care
  // about HW/SW versions?
  this.writeAndGetFixedSizeReply_(
    [STK.GET_PARAMETER, STK.HW_VER, STK.CRC_EOP],
    3,
    function(readArg) {
      log(kDebugNormal, "Hardware version: " + binToHex(readArg.data));
      board.state_ = Stk500Board.State.CONNECTED;
      doneCb(Status.OK);
    });
}

//
// WRITE FLASH
//
Stk500Board.prototype.writeFlashImpl_ = function(boardAddress, data, doneCb) {
  if (this.state_ != Stk500Board.State.CONNECTED) {
    doneCb(Status.Error("Not connected to board: " + this.state_));
    return;
  }

  if (boardAddress % this.pageSize_ != 0) {
    doneCb(Status.Error(
      "boardAddress must be aligned to page size of " + this.pageSize_
        + " (" + boardAddress + " % " + this.pageSize_ + " == "
        + (boardAddress % this.pageSize_) + ")"));
    return;
  }

  if (data.length % this.pageSize_ != 0) {
    return doneCb(Status.Error(
      "data size must be aligned to page size of " + this.pageSize_
        + " (" + data.length + " % " + this.pageSize_ + " == "
        + (data.length % this.pageSize_) + ")"));
  }

  log(kDebugFine, "STK500::WriteFlash (" + data.length + " bytes)");

  var board = this;
  this.writeAndGetFixedSizeReply_(
    [STK.ENTER_PROGMODE, STK.CRC_EOP],
    2,
    function(readArg) {
      var d = binToHex(readArg.data);
      if (d.length == 2 && d[0] == STK.IN_SYNC && d[1] == STK.OK) {
        board.writePage_(boardAddress, data, 0, doneCb)
      } else {
        return doneCb(Status.Error(
          "Error entering program mode: " + hexRep(d)));
      }
    });
}

Stk500Board.prototype.writePage_ = function(dataStart, data, pageNo, doneCb) {
  log(kDebugNormal, "==== STK500::WritePage: " + pageNo);
  this.writePageAddress_(dataStart, data, pageNo, doneCb);
}

Stk500Board.prototype.writePageAddress_ = function(dataStart, data, pageNo, doneCb) {
  log(kDebugFine, "-- STK500::LoadAddress " + pageNo);
  var byteAddress = dataStart + (this.pageSize_ * pageNo);

  var wordAddress = byteAddress / STK.BYTES_PER_WORD;
  var addressLo = wordAddress & 0x00FF;
  var addressHi = (wordAddress & 0xFF00) >> 8;

  var board = this;
  this.writeAndGetFixedSizeReply_(
    [STK.LOAD_ADDRESS, addressLo, addressHi, STK.CRC_EOP],
    2,
    function(readArg) {
      var d = binToHex(readArg.data);
      if (d.length == 2 && d[0] == STK.IN_SYNC && d[1] == STK.OK) {
        board.writePageData_(dataStart, data, pageNo, doneCb);
      } else {
        doneCb(Status.Error(
          "Error loading address for page #" + pageNo + ": " + data));
      }
    });
}

Stk500Board.prototype.writePageData_ = function(dataStart, data, pageNo, doneCb) {
  log(kDebugFine, "-- STK500::WritePageData");
  var relativeOffset = this.pageSize_ * pageNo;
  var payload = data.slice(relativeOffset, relativeOffset + this.pageSize_);

  var sizeLo = (this.pageSize_ & 0x00FF);
  var sizeHi = (this.pageSize_ & 0xFF00) >> 8;

  var message = [ STK.PROGRAM_PAGE, sizeHi, sizeLo, STK.FLASH_MEMORY ];
  message = message.concat(payload);
  message.push(STK.CRC_EOP);

  var board = this;
  this.writeAndGetFixedSizeReply_(
    message,
    2,
    function(readArg) {
      var d = binToHex(readArg.data);
      if (d.length == 2 && d[0] == STK.IN_SYNC && d[1] == STK.OK) {
        if (relativeOffset + board.pageSize_ >= data.length) {
          return board.doneWriting_(doneCb);
        } else {
          return board.writePage_(dataStart, data, pageNo + 1, doneCb);
        }
      } else {
        doneCb(Status.Error(
          "Error flashing page #" + pageNo + ": " + data));
        return;
      }
    });
}

Stk500Board.prototype.doneWriting_ = function(doneCb) {
  var board = this;
  log(kDebugFine, "STK500::Leaving progmode")
  this.writeAndGetFixedSizeReply_(
    [ STK.LEAVE_PROGMODE, STK.CRC_EOP ],
    2,
    function(readArg) {
      board.disconnectAndReturn_(doneCb, Status.OK);
    });
}

Stk500Board.prototype.disconnectAndReturn_ = function(doneCb, status) {
  var board = this;
  log(kDebugFine, "STK500::Disconnecting")
  this.serial_.disconnect(this.connectionId_, function(disconnectArg) {
    log(kDebugFine, "STK500::Disconnected: " + JSON.stringify(disconnectArg));

    board.connectionId_ = -1;
    board.state_ = Stk500Board.State.DISCONNECTED; 
    board.readHandler_ = null
    board.serial_.onReceive.removeListener(board.serialListener_);
    board.SerialListener_ = null;

    doneCb(status);
  });
}

//
// READ FLASH
//
Stk500Board.prototype.readFlashImpl_ = function(boardAddress, length, doneCb) {
  log(kDebugNormal, "STK500::ReadFlash @" + boardAddress + "+" + length);
  if (this.state_ != Stk500Board.State.CONNECTED) {
    return {status: Status.Error("Not connected to board: " + this.state_), data: []}
  }

  var data = new Array(length);
  this.readChunkSetAddress_(data, boardAddress, length, 0, doneCb);
};

Stk500Board.prototype.readChunkSetAddress_ = function(data, boardAddress, length, currentOffset, doneCb) {
  log(kDebugNormal, "STK500::ReadChunkSetAddress @" + boardAddress + "+" + length + " ... " + currentOffset);
  var board = this;
  var currentByteAddress = boardAddress + currentOffset;
  var currentWordAddress = currentByteAddress / STK.BYTES_PER_WORD
  var addressHi = (currentWordAddress & 0xFF00) >> 8;
  var addressLo = currentWordAddress & 0x00FF;
  this.writeAndGetFixedSizeReply_(
    [ STK.LOAD_ADDRESS, addressLo, addressHi, STK.CRC_EOP ],
    2,
    function(readArg) {
      var d = binToHex(readArg.data);
      if (d.length == 2 && d[0] == STK.IN_SYNC && d[1] == STK.OK) {
        board.readChunkReadData_(data, boardAddress, length, currentOffset, doneCb);
      } else {
        doneCb({status: Status.Error("Error loading address @" + address), data: []});
        return;
      }
    });
}

Stk500Board.prototype.readChunkReadData_ = function(data, address, length, currentOffset, doneCb) {
  var kChunkSize = 128;
  var readSize = Math.min(kChunkSize, (length - currentOffset));

  var sizeHi = (readSize & 0xFF00) >> 8;
  var sizeLo = readSize & 0x00FF;

  var board = this;
  this.writeAndGetFixedSizeReply_(
    [ STK.READ_PAGE, sizeHi, sizeLo, STK.FLASH_MEMORY, STK.CRC_EOP ],
    readSize + 2,
    function(readArg) {
      var d = binToHex(readArg.data);
      if (d[0] == STK.IN_SYNC && d[readSize + 1] == STK.OK) {
        for (var i = 0; i < readSize; i++) {
          data[currentOffset++] = d[i + 1];
        }

        if (currentOffset >= length) {
          doneCb({status: Status.OK, data: data});
        } else {
          board.readChunkSetAddress_(data, address, length, currentOffset, doneCb);
        }
      } else {
//        console.log(hexRep(d));
        doneCb({status: Status.Error(
          "Error reading data at [" + address + ", " + (address + readSize) + ")"), data: []});
        return;
      }
    });

}


exports.NewStk500Board = NewStk500Board;
exports.STK = STK;

},{"./binary.js":3,"./logging.js":6,"./status.js":7}],9:[function(require,module,exports){
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var IntelHEX = require("./intelhex.js").IntelHEX
var logging = require("./logging.js");
var stk500 = require("./stk500.js");
var avr109 = require("./avr109.js");
var binary = require("./binary.js");

var hexToBin = binary.hexToBin;
var binToHex = binary.binToHex;
var log = logging.log;
var kDebugError = logging.kDebugError;
var kDebugNormal = logging.kDebugNormal;
var kDebugFine = logging.kDebugFine;
var kDebugVeryFine = logging.kDebugVeryFine;

// API
//
// uploadCompiledSketch(parseHexfile(filename), serialportname) ??

function Uploader() {

}

Uploader.prototype.uploadSketch = function(deviceName, protocol, sketchUrl) {
  var uploader = this;
  var u2 = sketchUrl + "?bustcache=" + (new Date().getTime());
  log(kDebugNormal, "Uploading blink sketch from: " + u2);

  this.fetchProgram_(u2, function(programBytes) { 
    log(kDebugFine, "Fetched program. Uploading to: " + deviceName);
    log(kDebugFine, "Protocol: " + protocol);
    uploader.uploadCompiledSketch_(programBytes, deviceName, protocol);
  });
}


//
// IMPLEMENTATION
//
Uploader.prototype.fetchProgram_ = function(url, handler) {
  log(kDebugFine, "Fetching: " + url)
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        var programBytes = new IntelHEX(xhr.responseText).parse();
        if (programBytes != "FAIL") {
          log(kDebugFine, "Fetched Data:\n" + xhr.responseText);
          handler(programBytes);
        } else {
          log(kDebugFine, "Data parse failed.");
        }
      } else {
        log(kDebugError, "Bad fetch: " + xhr.status);
      }
    }
  };
  xhr.open("GET", url, true);
  xhr.send();
}

function pad(data, pageSize) {
  while (data.length % pageSize != 0) {
    data.push(0);
  }
  return data;
}

Uploader.prototype.uploadCompiledSketch_ = function(hexData, deviceName, protocol) {
  if (protocol == "stk500") {
    var boardObj = stk500.NewStk500Board(chrome.serial, 128);
    if (!boardObj.status.ok()) {
      log(kDebugError, "Couldn't create STK500 Board: " + boardObj.status.toString());
      return;
    }
    var board = boardObj.board;

    board.connect(deviceName, function(status) {
      if (status.ok()) {
        log(kDebugNormal, "STK500: connected.");
        board.writeFlash(0, pad(hexData, 128), function(status) {
          log(kDebugNormal, "STK programming status: " + status.toString());
        });
      } else {
        log(kDebugNormal, "STK: connection error: " + status.toString());
      }
    });
  } else if (protocol == "avr109") {
    var boardObj = avr109.NewAvr109Board(chrome.serial, 128);
    if (!boardObj.status.ok()) {
      log(kDebugError, "Couldn't create AVR109 Board: " + boardObj.status.toString());
      return;
    }
    var board = boardObj.board;
    board.connect(deviceName, function(status) {
      if (status.ok()) {
        log(kDebugNormal, "AVR109 Connected. Writing flash!");
        board.writeFlash(0, pad(hexData, 128), function(status) {
          log(kDebugNormal, "AVR programming status: " + status.toString());
        });
      } else {
        log(kDebugNormal, "AVR connection error: " + status.toString());
      }
    });

  } else {
    log(kDebugError, "Unknown protocol: "  + protocol);
  }
}

exports.pad = pad;
exports.Uploader = Uploader;

window.Uploader = Uploader;

},{"./avr109.js":2,"./binary.js":3,"./intelhex.js":5,"./logging.js":6,"./stk500.js":8}]},{},[1,2,3,4,5,6,7,8,9]);
