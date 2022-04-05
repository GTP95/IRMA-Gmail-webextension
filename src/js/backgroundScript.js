import {encrypt} from "./crypto";
import {decrypt} from "./crypto";

chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "crypto");
    port.onMessage.addListener(function (msg) {
        let writableStream, readableStream, result
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


        console.log(msg)
        if (msg.request === "encrypt") {
            encrypt(readableStream, writableStream, "Alice").then(
                () => port.postMessage(  //Encryption successful
                    {
                        ciphertext: result,
                        type: "ciphertext"
                    }
                ),
                () => port.postMessage(
                    {
                        ciphertext: "NOT ENCRYPTED!",
                        type: "error"
                    }
                )
            )
        }
        else if (msg.request === "decrypt"){
            decrypt(readableStream, writableStream, "Alice").then(
                ()=>port.postMessage(   //Decryption successful
                    {
                        plaintext: result,
                        type: "plaintext"
                    }
                ),
                ()=>port.postMessage(   //Decryption unsuccessful
                    {
                        plaintext: "NOT DECRYPTED!",
                        type: "error"
                    }
                )
            )
        }

    });
});

