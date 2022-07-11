/**
 * Message passing messes up with types (I get a "generic" object instead of an array) plus the UInt8Array.from() method
 * fails silently when I try to use it to convert the object back to an Uint8Array. So I have to use the following.
 * @param object {Object}
 * @returns {Uint8Array}
 */
export function objectToUInt8array(object) {
  return Uint8Array.from(Object.values(object));
}

/**
 * Converts an array to it's base64 representation.
 * Code adapted from https://tutorial.eyehunts.com/js/byte-array-to-base64-javascript-examples-code/
 * @param {Uint8Array} array
 * @returns {string}
 */
function uint8ArrayToBase64(array) {
  let binary = "";
  const bytes = array;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64-encoded string to it's UInt8Array equivalent
 * Adapted from here: https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
 * @param base64
 * @returns {ArrayBufferLike}
 * @private
 */
function base64ToUInt8Array(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
