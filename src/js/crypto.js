// @ts-check


import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";


const url="https://main.irmaseal-pkg.ihub.ru.nl"
let module, mpk;    //Need those as global variables to have the initialize function initialize them and then use them in other functions

async function initialize(){
    // Load the WASM module.
    module = await import("@e4a/irmaseal-wasm-bindings")
    console.log(module)
// Retrieve the public key from PKG API:
    const resp = await fetch(`${url}/v2/parameters`);
    mpk = await resp.json().then((r) => r.publicKey);
    console.log("Using key: ", mpk)
}

/**
 *
 * @param {Uint8Array} content
 * @returns {ReadableStream<any>}
 */
function createReadableStream(content){
    console.log("Type: ", typeof content)
    return  new ReadableStream({
        start: (controller) => {
            controller.enqueue(content);
            controller.close();
        },
    });
}

/**
 * Encrypt a ReadableStream into a WritableStream using IRMA
 * @param readable {ReadableStream}
 * @param writable {WritableStream}
 * @param identifier {String}
 * @returns {Promise<void>}
 */
export async function encrypt(readable, writable, identifier) {
// We provide the policies which we want to use for encryption.
    const policies = {
        [identifier]: {
            ts: Math.round(Date.now() / 1000),
            con: [{ t: "irma-demo.gemeente.personalData.fullname", v: identifier }],
        },
    };
    console.log("Encrypting using policies: ", policies);

// The following call reads data from a `ReadableStream` and seals it into `WritableStream`.
// Make sure that only chunks of type `Uint8Array` are enqueued to `readable`.
    await module.seal(mpk, policies, readable, writable);
}

/**
 * Decrypt a ReadableStream into a WritableStream using IRMA
 * @param readable {ReadableStream}
 * @param writable {WritableStream}
 * @param usk {String}
 * @returns {Promise<void>} //It's just an empty promise... :D
 */
export async function decrypt(readable, writable, usk) {
    try {

        const unsealer = await module.Unsealer.new(readable);
        // Unseal the contents of the IRMAseal packet, writing the plaintext to a `WritableStream`.
        await unsealer.unseal("recipient_1", usk, writable)

    }
catch
        (error){
            console.log(error)
        }

}

    export async function getHiddenPolicies(ciphertext) {
        let unsealerReadable = createReadableStream(ciphertext)
        let unsealer = await module.Unsealer.new(unsealerReadable);
        const hidden = unsealer.get_hidden_policies();
        return hidden
    }

initialize().then(() => console.log("Crypto module initialized"));