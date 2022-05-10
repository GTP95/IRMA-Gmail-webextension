// @ts-check


import {encrypt, decrypt, getHiddenPolicies} from "./crypto";





chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "crypto");
    port.onMessage.addListener(async function (msg) {
        let writableStream, readableStream, result;
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

        switch (msg.request) {
            case "encrypt":
                encrypt(readableStream, writableStream, msg.identifier).then(
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
                break

            case "decrypt":
                //Temporary hack to test decryption of something I'm encrypting myself: reassign readableStream
                let array=Uint8Array.from(Object.values(msg.content))  //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
                console.log("type of ciphertext passed to unsealer: ", typeof array)
                console.log("ciphertext passed to unsealer: ", array)
                readableStream = new ReadableStream({
                    start: (controller) => {
                        const encoded = array
                        controller.enqueue(encoded);
                        controller.close();
                    },
                });
                decrypt(readableStream, writableStream, msg.usk, msg.identity).then(
                    () =>{
                        result=(new TextDecoder()).decode(result)
                        console.log("Decrypted plaintext: ", result)
                        port.postMessage(   //Decryption successful
                        {
                            plaintext: result,
                            type: "plaintext"
                        }
                    )
                    },
                    () => port.postMessage(   //Decryption unsuccessful
                        {
                            plaintext: "NOT DECRYPTED!",
                            type: "error"
                        }
                    )
                )
                break

            case "hidden policies":
                let uint8array=Uint8Array.from(Object.values(msg.content))  //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
                getHiddenPolicies(uint8array).then(
                    (hidden)=>port.postMessage(
                        {
                            content: hidden,
                            type: "hidden policies"
                        }
                    )
                ).catch((err)=> {

                        console.log("Error in getting hidden policies: ", err)
                    }
                )

        }


    });
});

