// @ts-check

//Maybe I don't even need to load the workbox libraries, but leaving them there for now

import { encrypt, decrypt, getHiddenPolicies } from "./crypto";

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log("Message listener invoked");

  let writableStream, readableStream, result;

  console.log("Received message: ", msg);

  readableStream = new ReadableStream({
    start: (controller) => {
      const encoded = new TextEncoder().encode(msg.content);
      controller.enqueue(encoded);
      controller.close();
    },
  });
  result = new Uint8Array(0);
  writableStream = new WritableStream({
    write: (chunk) => {
      result = new Uint8Array([...result, ...chunk]);
    },
  });

  switch (msg.request) {
    case "encrypt":
      encrypt(readableStream, writableStream, msg.identifiers)
        .then(() =>
          sendResponse(
            //Encryption successful
            {
              ciphertext: result,
              type: "ciphertext",
            }
          )
        )
        .catch((error) =>
          sendResponse({
            ciphertext: "Error: " + error,
            type: "error",
          })
        );
      break;

    case "decrypt":
      //Temporary hack to test decryption of something I'm encrypting myself: reassign readableStream
      let array = Uint8Array.from(Object.values(msg.content)); //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
      console.log("type of ciphertext passed to unsealer: ", typeof array);
      console.log("ciphertext passed to unsealer: ", array);
      readableStream = new ReadableStream({
        start: (controller) => {
          const encoded = array;
          controller.enqueue(encoded);
          controller.close();
        },
      });
      decrypt(readableStream, writableStream, msg.usk, msg.identity).then(
        () => {
          result = new TextDecoder().decode(result);
          console.log("Decrypted plaintext: ", result);
          sendResponse(
            //Decryption successful
            {
              plaintext: result,
              type: "plaintext",
            }
          );
        },
        () =>
          sendResponse(
            //Decryption unsuccessful
            {
              plaintext: "NOT DECRYPTED!",
              type: "error",
            }
          )
      );
      break;

    case "hidden policies":
      let uint8array = base64ToUInt8Array(msg.content); //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
      getHiddenPolicies(uint8array)
        .then((hidden) =>
          sendResponse({
            content: hidden,
            type: "hidden policies",
          })
        )
        .catch((err) => {
          console.log("Error in getting hidden policies: ", err);
        });
  }
});

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
  var binary_string = atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

console.log("Service worker started!");
