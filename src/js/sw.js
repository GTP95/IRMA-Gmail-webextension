// @ts-check


importScripts("crypto.bundle.js")
function uint8ArrayToBase64(array) {   //Code adapted from https://tutorial.eyehunts.com/js/byte-array-to-base64-javascript-examples-code/
    let binary = '';
    const bytes = array;
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);

}

console.log("Worker started!")

//chrome.runtime.onMessageExternal.addListener(
//    function (msg, sender, sendResponse) {
//
//        let writableStream, readableStream, result;
//        readableStream = new ReadableStream({
//            start: (controller) => {
//                const encoded = new TextEncoder().encode(msg.content);
//                controller.enqueue(encoded);
//                controller.close();
//            },
//        });
//        result = new Uint8Array(0);
//        writableStream = new WritableStream({
//            write: (chunk) => {
//                result = new Uint8Array([...result, ...chunk]);
//            },
//        });
//
//
//        console.log(msg)
//
//        switch (msg.request) {
//            case "encrypt":
//                encrypt(readableStream, writableStream, msg.identifiers).then(
//                    () => sendResponse(  //Encryption successful
//                        {
//                            ciphertext: uint8ArrayToBase64(result),
//                            type: "ciphertext"
//                        }
//                    ),
//                    () => sendResponse(
//                        {
//                            ciphertext: "NOT ENCRYPTED!",
//                            type: "error"
//                        }
//                    )
//                )
//                break
//
//            case "decrypt":
//                //Temporary hack to test decryption of something I'm encrypting myself: reassign readableStream
//                let array = Uint8Array.from(Object.values(msg.content))  //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
//                console.log("type of ciphertext passed to unsealer: ", typeof array)
//                console.log("ciphertext passed to unsealer: ", array)
//                readableStream = new ReadableStream({
//                    start: (controller) => {
//                        const encoded = array
//                        controller.enqueue(encoded);
//                        controller.close();
//                    },
//                });
//                decrypt(readableStream, writableStream, msg.usk, msg.identity).then(
//                    () => {
//                        result = (new TextDecoder()).decode(result)
//                        console.log("Decrypted plaintext: ", result)
//                        sendResponse(   //Decryption successful
//                            {
//                                plaintext: result,
//                                type: "plaintext"
//                            }
//                        )
//                    },
//                    () => sendResponse(   //Decryption unsuccessful
//                        {
//                            plaintext: "NOT DECRYPTED!",
//                            type: "error"
//                        }
//                    )
//                )
//                break
//
//            case "hidden policies":
//                let uint8array = Uint8Array.from(Object.values(msg.content))  //Messaging messes up types, here I'm converting it back to the correct type: Uint8array
//                getHiddenPolicies(uint8array).then(
//                    (hidden) => sendResponse(
//                        {
//                            content: hidden,
//                            type: "hidden policies"
//                        }
//                    )
//                ).catch((err) => {
//
//                        console.log("Error in getting hidden policies: ", err)
//                    }
//                )
//
//        }
//    }
//)


