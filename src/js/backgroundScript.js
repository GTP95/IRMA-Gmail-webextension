import {encrypt} from "./crypto";
import {decrypt} from "./crypto";

chrome.runtime.onConnect.addListener(function (port) {
        console.assert(port.name==="cryptoPort");
        port.onMessage.addListener(function (message) {
            let readableStream, writableStream, output;
            console.log("Incoming message: ", message)
            switch (message.request){
                case "encrypt":
                    //Create ReadableStream and WritableStream to be used for the encryption
                    readableStream = new ReadableStream({
                        start: (controller) => {
                            const encoded = new TextEncoder().encode(message.plaintext);    //put inside the stream the plaintext grabbed form the contentScript
                            controller.enqueue(encoded);
                            controller.close();
                        },
                    });
                    output = new Uint8Array(0);
                    writableStream = new WritableStream({
                        write: (chunk) => {
                            output = new Uint8Array([...output, ...chunk]);
                        },
                    });

                    encrypt(readableStream, writableStream, "Alice").then(
                        () => {
                            let responseObject = {
                                ciphertext: output,
                                successful: true
                            };
                            console.log(responseObject);
                            port.postMessage(responseObject);
                        },
                        () => {
                            let responseObject = {
                                ciphertext: "NOT ENCRYPTED",
                                successful: false
                            }
                            console.log("Encryption failed")
                            port.postMessage(responseObject)
                        });
                    break

                case "decrypt":
                    console.log("Received decryption request: ", message)
                    //Create ReadableStream and WritableStream to be used for the decryption
                    readableStream = new ReadableStream({
                        start: (controller) => {
                            const encoded = new TextEncoder().encode(message.ciphertext);    //put inside the stream the plaintext grabbed form the contentScript
                            controller.enqueue(encoded);
                            controller.close();
                        },
                    });
                    output = new Uint8Array(0);
                    writableStream = new WritableStream({
                        write: (chunk) => {
                            output = new Uint8Array([...output, ...chunk]);
                        },
                    });

                    decrypt(readableStream, writableStream, "Alice").then(
                        () => {
                            let responseObject = {
                                plaintext: output,
                                successful: true
                            };
                            console.log(responseObject)
                            port.postMessage(responseObject)
                        },
                        () => {
                            let responseObject = {
                                plaintext: "NOT DECRYPTED",
                                successful: false
                            }
                            console.log("Decryption failed")
                            port.postMessage(responseObject)
                        }
                    )
            }

        });









});

