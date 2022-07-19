// @ts-check

//Maybe I don't even need to load the workbox libraries, but leaving them there for now

import { encrypt, decrypt, getHiddenPolicies } from "./crypto";
import { objectToUInt8array } from "./helpers";
import parse from "emailjs-mime-parser";

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
      //Temporary hack to test decryption of something I'm encrypting myself: reassign readableStream TODO: remove? Probably I just have to not reassign it and it still works
      let array = objectToUInt8array(msg.content); //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
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
          console.log("Decrypted (but still encoded) plaintext: ", result);
          result = new TextDecoder().decode(result);
          console.log("Decrypted (and decoded) plaintext: ", result);

          const parsedEmail = parse(result);
          console.log("Parsed email: ", parsedEmail);

          sendResponse(
            //Decryption successful
            {
              plaintext: parsedEmail,
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
      let uint8array = objectToUInt8array(msg.content); //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
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
  return true;
});

console.log("Service worker started!");
