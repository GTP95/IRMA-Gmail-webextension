import {encrypt} from "./crypto";
import {decrypt} from "./crypto";

chrome.runtime.onConnect.addListener(function (port) {
    if (port.name === "encryptionPort") {
        port.onMessage.addListener(function (request) {

            //Create ReadableStream and WritableStream to be used for the encryption
            const readableStream = new ReadableStream({
                start: (controller) => {
                    const encoded = new TextEncoder().encode(request.plaintext);    //put inside the stream the plaintext grabbed form the contentScript
                    controller.enqueue(encoded);
                    controller.close();
                },
            });
            let output = new Uint8Array(0);
            const writableStream = new WritableStream({
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
        });
    }
    if (port.name === "decryptionPort") {
        port.onMessage.addListener(
            (request) => {
                console.log("Received decryption request: ", request)
                //Create ReadableStream and WritableStream to be used for the decryption
                const readableStream = new ReadableStream({
                    start: (controller) => {
                        const encoded = new TextEncoder().encode(request.plaintext);    //put inside the stream the plaintext grabbed form the contentScript
                        controller.enqueue(encoded);
                        controller.close();
                    },
                });
                let output = new Uint8Array(0);
                const writableStream = new WritableStream({
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

            })

    }
});

